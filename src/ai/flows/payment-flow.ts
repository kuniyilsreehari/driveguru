
'use server';
/**
 * @fileOverview A flow for handling payment gateway integration with Cashfree.
 *
 * - createPaymentOrder - A function that creates a payment order with Cashfree.
 * - CreatePaymentOrderInput - The input type for the createPaymentOrder function.
 * - CreatePaymentOrderOutput - The return type for the createPaymentOrder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const CreatePaymentOrderInputSchema = z.object({
  userId: z.string().describe("The ID of the user upgrading their plan."),
  userEmail: z.string().describe("The email of the user."),
  userName: z.string().describe("The name of the user."),
  userPhone: z.string().describe("The phone number of the user."),
  plan: z.enum(['Premier', 'Super Premier']).describe("The plan the user is upgrading to."),
  amount: z.number().describe("The amount to be charged."),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderInputSchema>;

const CreatePaymentOrderOutputSchema = z.object({
  payment_link: z.string().describe('The URL to redirect the user to for payment.'),
});
export type CreatePaymentOrderOutput = z.infer<typeof CreatePaymentOrderOutputSchema>;


async function createCashfreeOrder(input: CreatePaymentOrderInput): Promise<{ payment_link: string }> {
    const url = 'https://sandbox.cashfree.com/pg/orders'; // Sandbox URL, replace for production
    const orderId = `order_${uuidv4()}`;

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
            return_url: `https://YOUR_APP_URL/payment-status?order_id={order_id}`, // IMPORTANT: Replace with your actual return URL
        },
        order_note: `Upgrade to ${input.plan} plan`,
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
    
    const order = await createCashfreeOrder(input);

    if (!order.payment_link) {
      throw new Error("Failed to create payment link.");
    }
    
    return {
      payment_link: order.payment_link,
    };
  }
);
