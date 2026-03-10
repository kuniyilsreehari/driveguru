'use server';
/**
 * @fileOverview A flow for handling payment gateway integration and verification.
 * Simplified to a 3-tier model: Verified, Premier, Super Premier.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './get-admin-app';
import { Cashfree } from 'cashfree-pg';
import axios from 'axios';

const CreatePaymentOrderInputSchema = z.object({
  userId: z.string(),
  userEmail: z.string(),
  userName: z.string(),
  userPhone: z.string(),
  plan: z.enum(['Premier', 'Super Premier', 'Verification']),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderInputSchema>;

const CreatePaymentOrderOutputSchema = z.object({
  payment_link: z.string().optional(),
  payment_session_id: z.string().optional(),
  error: z.string().optional(),
});
export type CreatePaymentOrderOutput = z.infer<typeof CreatePaymentOrderOutputSchema>;

const VerifyPaymentInputSchema = z.object({
  orderId: z.string(),
});
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentInputSchema>;

const VerifyPaymentOutputSchema = z.object({
  status: z.enum(['SUCCESS', 'FAILED', 'PENDING', 'ERROR']),
  message: z.string(),
  plan: z.string().optional(),
  userId: z.string().optional(),
});
export type VerifyPaymentOutput = z.infer<typeof VerifyPaymentOutputSchema>;

async function createCashfreeOrder(input: CreatePaymentOrderInput & { amount: number, orderId: string }): Promise<{ payment_link: string, payment_session_id: string }> {
    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecret = process.env.CASHFREE_SECRET;

    if (!cashfreeAppId || !cashfreeSecret) {
        throw new Error('Cashfree API credentials not found in environment.');
    }
    
    Cashfree.XClientId = cashfreeAppId;
    Cashfree.XClientSecret = cashfreeSecret;
    Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9004';
    const returnUrl = `${appUrl}/payment-status?order_id={order_id}`;
    
    const sanitizedPhone = input.userPhone.replace(/[^0-9]/g, '') || '9999999999';

    const request = {
        order_id: input.orderId,
        order_amount: input.amount,
        order_currency: 'INR',
        customer_details: {
            customer_id: input.userId,
            customer_email: input.userEmail || 'customer@example.com',
            customer_phone: sanitizedPhone,
            customer_name: input.userName || 'Guest User',
        },
        order_meta: {
            return_url: returnUrl,
        },
        order_note: `DriveGuru Upgrade: ${input.plan}`,
    };

    try {
        const response = await Cashfree.PGCreateOrder("2023-08-01", request);
        if (response.data && response.data.payment_session_id) {
            return { 
                payment_link: response.data.payment_link || '',
                payment_session_id: response.data.payment_session_id 
            };
        }
        throw new Error('Session ID missing in response');
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.message || 'Cashfree API Error');
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
    try {
        const adminApp = await getAdminApp();
        const firestore = getFirestore(adminApp);
        const appConfigSnap = await firestore.doc('app_config/homepage').get();
        const appConfig = appConfigSnap.data() || {};
        
        if (appConfig.isPaymentsEnabled === false) throw new Error("Payments are currently disabled.");

        // Priority: Link Method (The 3-Link model requested)
        if (appConfig.paymentMethod === 'Link') {
            let link = '';
            if (input.plan === 'Verification') link = appConfig.verificationPaymentLink;
            else if (input.plan === 'Premier') link = appConfig.premierPaymentLink;
            else if (input.plan === 'Super Premier') link = appConfig.superPremierPaymentLink;

            if (link) return { payment_link: link };
            throw new Error(`Checkout link for ${input.plan} is not configured in Admin.`);
        }

        // Automated API Method
        let amount = 0;
        if (input.plan === 'Verification') amount = appConfig.verificationFee || 49;
        else if (input.plan === 'Premier') amount = 499; // Default if API is used
        else amount = 999;

        const orderId = `order_${uuidv4()}`;
        const paymentRef = firestore.collection('payments').doc();
        
        await paymentRef.set({
            id: paymentRef.id,
            userId: input.userId,
            plan: input.plan,
            amount,
            currency: 'INR',
            orderId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const { payment_link, payment_session_id } = await createCashfreeOrder({ ...input, amount, orderId });
        return { payment_link, payment_session_id };

    } catch (error: any) {
        console.error("Payment Order Flow Failure:", error);
        return { error: error.message || "Could not initiate payment session." };
    }
  }
);

export async function verifyPaymentOrder(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    return verifyPaymentOrderFlow(input);
}

const verifyPaymentOrderFlow = ai.defineFlow(
    {
        name: 'verifyPaymentOrderFlow',
        inputSchema: VerifyPaymentInputSchema,
        outputSchema: VerifyPaymentOutputSchema,
    },
    async ({ orderId }) => {
        try {
            const adminApp = await getAdminApp();
            const firestore = getFirestore(adminApp);
            
            const paymentsSnap = await firestore.collection('payments').where('orderId', '==', orderId).limit(1).get();
            if (paymentsSnap.empty) return { status: 'ERROR', message: 'Order record not found.' };
            
            const paymentDoc = paymentsSnap.docs[0];
            const paymentData = paymentDoc.data();

            if (paymentData.status === 'successful') {
                return { status: 'SUCCESS', message: 'Payment already verified.', plan: paymentData.plan, userId: paymentData.userId };
            }

            const clientId = process.env.CASHFREE_APP_ID;
            const secret = process.env.CASHFREE_SECRET;

            const response = await axios.get(
                `https://sandbox.cashfree.com/pg/orders/${orderId}`,
                {
                    headers: {
                        'x-client-id': clientId,
                        'x-client-secret': secret,
                        'x-api-version': '2023-08-01'
                    }
                }
            );

            if (response.data.order_status === 'PAID') {
                await firestore.runTransaction(async (t) => {
                    t.update(paymentDoc.ref, { status: 'successful', updatedAt: new Date() });
                    const userRef = firestore.collection('users').doc(paymentData.userId);
                    if (paymentData.plan === 'Verification') {
                        t.update(userRef, { verified: true });
                    } else {
                        t.update(userRef, { tier: paymentData.plan });
                    }
                });
                return { status: 'SUCCESS', message: 'Payment confirmed.', plan: paymentData.plan, userId: paymentData.userId };
            }

            return { status: 'FAILED', message: `Payment status: ${response.data.order_status}` };

        } catch (error: any) {
            console.error("Verification Flow Error:", error);
            return { status: 'ERROR', message: error.message || "Failed to verify transaction." };
        }
    }
);
