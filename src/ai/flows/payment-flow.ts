
'use server';
/**
 * @fileOverview A flow for handling payment gateway integration with transactional safety.
 *
 * This file defines a Genkit flow that manages the creation of payment orders.
 * It checks global payment settings, determines the payment method (API vs. link),
 * calculates the correct amount, creates a pending payment record in Firestore within
 * a transaction, and then generates a payment link via the Cashfree payment gateway API.
 *
 * - createPaymentOrder - The main function to create a payment order.
 * - CreatePaymentOrderInput - The Zod schema for the input required for payment creation.
 * - CreatePaymentOrderOutput - The Zod schema for the payment link output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './get-admin-app';
import { Cashfree } from 'cashfree-pg';


const CreatePaymentOrderInputSchema = z.object({
  userId: z.string().describe("The ID of the user making the payment."),
  userEmail: z.string().describe("The email of the user."),
  userName: z.string().describe("The name of the user."),
  userPhone: z.string().describe("The phone number of the user."),
  plan: z.enum(['Premier', 'Super Premier', 'Verification']).describe("The product the user is paying for."),
  billingCycle: z.enum(['daily', 'monthly', 'yearly', 'one-time']).describe("The billing cycle for the plan."),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderInputSchema>;

const CreatePaymentOrderOutputSchema = z.object({
  payment_link: z.string().describe('The URL to redirect the user to for payment.'),
});
export type CreatePaymentOrderOutput = z.infer<typeof CreatePaymentOrderOutputSchema>;


async function createCashfreeOrder(input: CreatePaymentOrderInput & { amount: number, orderId: string }): Promise<{ payment_link: string }> {
    
    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecret = process.env.CASHFREE_SECRET;

    if (!cashfreeAppId || !cashfreeSecret) {
        throw new Error('Cashfree credentials (CASHFREE_APP_ID or CASHFREE_SECRET) are not set in the environment variables.');
    }
    
    Cashfree.XClientId = cashfreeAppId;
    Cashfree.XClientSecret = cashfreeSecret;
    Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9004';
    const returnUrl = `${appUrl}/payment-status`;
    
    const sanitizedPhone = input.userPhone.replace(/[^0-9]/g, '');

    const request = {
        order_id: input.orderId,
        order_amount: input.amount,
        order_currency: 'INR',
        customer_details: {
            customer_id: input.userId,
            customer_email: input.userEmail,
            customer_phone: sanitizedPhone,
            customer_name: input.userName,
        },
        order_meta: {
            return_url: returnUrl,
        },
        order_note: `Payment for DriveGuru: ${input.plan} (${input.billingCycle})`,
    };

    try {
        const response = await Cashfree.PGCreateOrder("2023-08-01", request);
        const orderData = response.data;

        if (orderData && orderData.payment_link) {
            return { payment_link: orderData.payment_link };
        } else {
            throw new Error('Payment link not found in Cashfree response.');
        }
    } catch (error: any) {
        console.error('Failed to create Cashfree order:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create Cashfree order via API.');
    }
}


export async function createPaymentOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderOutput> {
  return createPaymentOrderFlow(input);
}


const createPaymentOrderFlow = ai.defineFlow(
  {
    name: 'createPaymentOrderFlow',
    inputSchema: CreatePaymentOrderInputSchema,
    outputSchema: CreatePaymentOrderOutputSchema,
  },
  async (input) => {
    
    const adminApp = await getAdminApp();
    const firestore = getFirestore(adminApp);
    const appConfigDocRef = firestore.doc('app_config/homepage');
    
    const appConfigSnap = await appConfigDocRef.get();
    
    if (!appConfigSnap.exists) {
        throw new Error("Application configuration not found.");
    }
    
    const appConfig = appConfigSnap.data();
    if (!appConfig) {
      throw new Error("Application configuration is empty.");
    }
    
    // 1. Check if payments are globally enabled
    if (!appConfig.isPaymentsEnabled) {
        throw new Error("Payments are currently disabled by the site administrator.");
    }

    // 2. Check the selected payment method
    if (appConfig.paymentMethod === 'Link') {
        let paymentLink = '';
        if (input.plan === 'Premier') paymentLink = appConfig.premierPaymentLink;
        if (input.plan === 'Super Premier') paymentLink = appConfig.superPremierPaymentLink;
        if (input.plan === 'Verification') paymentLink = appConfig.verificationPaymentLink;

        if (paymentLink) {
            return { payment_link: paymentLink };
        } else {
            throw new Error(`A static payment link for the ${input.plan} plan has not been configured. Please contact support.`);
        }
    }

    // 3. Fallback to dynamic API generation (Cashfree) if method is 'API'

    // This is the most likely cause of an Internal Server Error if not configured.
    const isCashfreeConfigured = process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET;

    if (!isCashfreeConfigured) {
        throw new Error("The Cashfree API payment method is not configured. Please add your API keys to the .env file or select the 'Payment Link' method in the admin dashboard.");
    }


    let amount = 0;
    if (input.plan === 'Verification') {
        amount = appConfig.verificationFee || 0;
    } else if (input.plan === 'Premier') {
        amount = appConfig.premierPlanPrices?.[input.billingCycle] || 0;
    } else if (input.plan === 'Super Premier') {
        amount = appConfig.superPremierPlanPrices?.[input.billingCycle] || 0;
    }


    if (amount <= 0) {
        throw new Error(`Invalid or missing price for ${input.plan} plan (${input.billingCycle}). Please set a price in the admin dashboard.`);
    }

    // 4. Create payment record in a transaction
    const paymentsCol = firestore.collection('payments');
    const orderId = `order_${uuidv4()}`;

    try {
        const payment_link = await firestore.runTransaction(async (transaction) => {
            // Check if there is already a pending payment for this user and plan
            const pendingPaymentQuery = paymentsCol
                .where('userId', '==', input.userId)
                .where('plan', '==', input.plan)
                .where('status', '==', 'pending');
            
            const pendingPayments = await transaction.get(pendingPaymentQuery);

            if (!pendingPayments.empty) {
                throw new Error(`You already have a pending payment for the ${input.plan} plan. Please complete or cancel it before creating a new one.`);
            }

            // Create new payment document
            const newPaymentRef = paymentsCol.doc();
            const paymentData = {
                id: newPaymentRef.id,
                userId: input.userId,
                plan: input.plan,
                billingCycle: input.billingCycle,
                amount,
                currency: 'INR',
                orderId,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            transaction.set(newPaymentRef, paymentData);

            // Create Cashfree order
            const orderInput = { ...input, amount, orderId };
            const { payment_link } = await createCashfreeOrder(orderInput);
            
            if (!payment_link) {
                throw new Error("Failed to create dynamic payment link via API.");
            }

            return payment_link;
        });

        return { payment_link };

    } catch (error: any) {
        console.error("Payment transaction failed:", error);
        throw new Error(error.message || "An error occurred during the payment process.");
    }
  }
);
