
'use server';
/**
 * @fileOverview A flow for handling payment gateway integration.
 *
 * - createPaymentOrder - A function that creates a payment order with a provider.
 * - CreatePaymentOrderInput - The input type for the createPaymentOrder function.
 * - CreatePaymentOrderOutput - The return type for the createPaymentOrder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';

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

// This function will call the payment gateway's API to create an order.
// IMPORTANT: Replace with your actual payment provider's logic.
async function createCashfreeOrder(input: CreatePaymentOrderInput): Promise<{ payment_link: string }> {
    // This is a placeholder. In a real application, you would use the Cashfree SDK
    // or make an HTTP request to their API with your credentials.
    console.log("Creating a mock payment order for:", input);

    // For demonstration, we'll return a placeholder URL.
    // In production, the payment gateway API would provide this.
    const mockPaymentUrl = `https://sandbox.cashfree.com/pg/orders/${uuidv4()}`;
    
    return { payment_link: mockPaymentUrl };
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
    // In a real-world scenario, you would call your payment provider's API here.
    // For now, we are using a placeholder function.
    const order = await createCashfreeOrder(input);

    if (!order.payment_link) {
      throw new Error("Failed to create payment link.");
    }
    
    // The flow returns the payment link provided by the payment gateway.
    return {
      payment_link: order.payment_link,
    };
  }
);
