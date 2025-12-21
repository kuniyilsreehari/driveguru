'use server';
/**
 * @fileOverview An AI flow for handling user verification via Cashfree's Verification Suite.
 *
 * - verifyUser - A function that initiates a verification process for a user.
 * - VerifyUserInput - The input type for the verifyUser function.
 * - VerifyUserOutput - The return type for the verifyUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';

// Define the base URL for the Cashfree Verification API
const getBaseUrl = () => {
    const environment = process.env.CASHFREE_VERIFICATION_ENVIRONMENT;
    if (environment === 'production') {
        return 'https://api.cashfree.com/verification';
    }
    return 'https://sandbox.cashfree.com/verification';
};

const getHeaders = async () => {
    const clientId = process.env.CASHFREE_VERIFICATION_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_VERIFICATION_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Cashfree Verification credentials (CLIENT_ID or CLIENT_SECRET) are not set in environment variables.');
    }

    return {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2023-03-01', // Example version, check Cashfree docs for the latest
        'Content-Type': 'application/json',
    };
};

const VerifyUserInputSchema = z.object({
  userId: z.string().describe('The ID of the user to be verified.'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format.").describe('The PAN number to be verified.'),
});
export type VerifyUserInput = z.infer<typeof VerifyUserInputSchema>;

const VerifyUserOutputSchema = z.object({
  status: z.string().describe('The status of the verification request.'),
  referenceId: z.number().optional().describe('Cashfree reference ID for the verification.'),
  panStatus: z.string().optional().describe('The status of the PAN from the source (e.g., VALID).'),
  fullName: z.string().optional().describe('Full name associated with the PAN.'),
  message: z.string().describe('A message detailing the result of the verification.'),
});
export type VerifyUserOutput = z.infer<typeof VerifyUserOutputSchema>;

export async function verifyUser(input: VerifyUserInput): Promise<VerifyUserOutput> {
  return verifyUserFlow(input);
}

const verifyUserFlow = ai.defineFlow(
  {
    name: 'verifyUserFlow',
    inputSchema: VerifyUserInputSchema,
    outputSchema: VerifyUserOutputSchema,
  },
  async (input) => {
    console.log(`Starting PAN verification for user: ${input.userId}`);
    
    try {
        const headers = await getHeaders();
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/pan`;

        const response = await axios.post(url, {
            pan: input.panNumber,
            // verification_id is a unique ID you generate for the transaction
            verification_id: `verify_${input.userId}_${Date.now()}` 
        }, { headers });

        const { data } = response;
        
        if (response.status === 200) {
             return {
                status: 'success',
                referenceId: data.reference_id,
                panStatus: data.pan_status,
                fullName: data.full_name,
                message: 'PAN verification successful.',
            };
        } else {
             throw new Error(data.message || 'Unknown error from Cashfree API');
        }

    } catch (error: any) {
        console.error("Cashfree PAN Verification Error:", error.response?.data || error.message);
        return {
            status: 'failed',
            message: error.response?.data?.message || error.message || 'An unexpected error occurred during PAN verification.',
        };
    }
  }
);
