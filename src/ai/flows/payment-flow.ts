
'use server';
/**
 * @fileOverview A flow for handling payment gateway integration.
 *
 * - createPaymentOrder - A function that creates a payment order.
 * - CreatePaymentOrderInput - The input type for the createPaymentOrder function.
 * - CreatePaymentOrderOutput - The return type for the createPaymentOrder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


const CreatePaymentOrderInputSchema = z.object({
  userId: z.string().describe("The ID of the user making the payment."),
  userEmail: z.string().describe("The email of the user."),
  userName: z.string().describe("The name of the user."),
  userPhone: z.string().describe("The phone number of the user."),
  plan: z.enum(['Premier', 'Super Premier', 'Verification']).describe("The product the user is paying for."),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderInputSchema>;

const CreatePaymentOrderOutputSchema = z.object({
  payment_link: z.string().describe('The URL to redirect the user to for payment.'),
});
export type CreatePaymentOrderOutput = z.infer<typeof CreatePaymentOrderOutputSchema>;


// Helper to initialize Firebase Admin SDK
function getAdminApp(): App {
    if (getApps().length) {
        return getApps()[0];
    }
    
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccount) {
        try {
            return initializeApp({
                credential: cert(JSON.parse(serviceAccount))
            });
        } catch (error) {
            console.error("Error initializing Firebase Admin SDK with service account:", error);
        }
    }
    
    console.log("Initializing Firebase Admin SDK with default credentials.");
    return initializeApp();
}


async function createCashfreeOrder(input: CreatePaymentOrderInput & { amount: number }): Promise<{ payment_link: string }> {
    const url = 'https://api.cashfree.com/pg/orders'; // Production URL
    const orderId = `order_${uuidv4()}`;
    
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/payment-status?order_id={order_id}&uid=${input.userId}&plan=${input.plan}`;

    const headers = {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID || '',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
    };

    const body = {
        order_id: orderId,
        order_amount: input.amount,
        order_currency: 'INR',
        customer_details: {
            customer_id: input.userId,
            customer_email: input.userEmail,
            customer_phone: input.userPhone.replace(/[^0-9]/g, ''), // Remove non-numeric characters
            customer_name: input.userName,
        },
        order_meta: {
            return_url: returnUrl,
        },
        order_note: `Payment for DriveGuru: ${input.plan}`,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Cashfree API Error:', errorBody);
            throw new Error(`Cashfree API responded with status ${response.status}: ${errorBody.message}`);
        }

        const data: any = await response.json();

        if (data && data.payment_link) {
            return { payment_link: data.payment_link };
        } else {
            throw new Error('Payment link not found in Cashfree response.');
        }

    } catch (error) {
        console.error('Failed to create Cashfree order:', error);
        throw error;
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
    
    const adminApp = getAdminApp();
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
    let amount = 0;
    if (input.plan === 'Premier') {
        amount = appConfig.premierPlanPrice || 0;
    } else if (input.plan === 'Super Premier') {
        amount = appConfig.superPremierPlanPrice || 0;
    } else if (input.plan === 'Verification') {
        amount = appConfig.verificationFee || 0;
    }

    if (amount <= 0) {
        throw new Error(`Invalid or missing price for ${input.plan} plan. Please set a price in the admin dashboard.`);
    }

    const orderInput = { ...input, amount };
    const order = await createCashfreeOrder(orderInput);

    if (!order.payment_link) {
      throw new Error("Failed to create dynamic payment link via API.");
    }
    
    return {
      payment_link: order.payment_link,
    };
  }
);
