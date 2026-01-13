
'use server';
/**
 * @fileOverview An AI flow for handling user verification via Cashfree's Liveliness Check API.
 *
 * This file defines a Genkit flow that takes a user's ID and a photo (as a data URI)
 * and sends it to the Cashfree Verification API to perform a liveliness check. This helps
 * confirm that the user is a real person.
 *
 * - verifyUserLiveliness - The main function to initiate the liveliness check.
 * - VerifyLivelinessInput - The Zod schema for the input to the function.
 * - VerifyLivelinessOutput - The Zod schema for the output from the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import FormData from 'form-data';

// Define the base URL for the Cashfree Verification API
const getBaseUrl = () => {
    const environment = process.env.CASHFREE_VERIFICATION_ENVIRONMENT;
    if (environment === 'production') {
        return 'https://api.cashfree.com/verification';
    }
    return 'https://sandbox.cashfree.com/verification';
};

const getHeaders = async (form?: FormData) => {
    const clientId = process.env.CASHFREE_VERIFICATION_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_VERIFICATION_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Cashfree Verification credentials (CLIENT_ID or CLIENT_SECRET) are not set in environment variables.');
    }
    
    const baseHeaders: Record<string, string> = {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2023-10-26', 
    };

    if (form) {
        return {
            ...baseHeaders,
            ...form.getHeaders(),
        };
    }

    return {
        ...baseHeaders,
        'Content-Type': 'application/json',
    };
};

const VerifyLivelinessInputSchema = z.object({
  userId: z.string().describe('The ID of the user to be verified.'),
  photoDataUri: z.string().describe("A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type VerifyLivelinessInput = z.infer<typeof VerifyLivelinessInputSchema>;

const VerifyLivelinessOutputSchema = z.object({
  status: z.string().describe('The status of the verification request.'),
  referenceId: z.number().optional().describe('Cashfree reference ID for the verification.'),
  livelinessScore: z.number().optional().describe('The calculated score for liveliness.'),
  message: z.string().describe('A message detailing the result of the verification.'),
});
export type VerifyLivelinessOutput = z.infer<typeof VerifyLivelinessOutputSchema>;

export async function verifyUserLiveliness(input: VerifyLivelinessInput): Promise<VerifyLivelinessOutput> {
  return verifyUserLivelinessFlow(input);
}

const verifyUserLivelinessFlow = ai.defineFlow(
  {
    name: 'verifyUserLivelinessFlow',
    inputSchema: VerifyLivelinessInputSchema,
    outputSchema: VerifyLivelinessOutputSchema,
  },
  async (input) => {
    console.log(`Starting Liveliness Check for user: ${input.userId}`);
    
    try {
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/liveliness`;

        const verificationId = `lively_${input.userId}_${Date.now()}`;
        
        // Convert data URI to Buffer
        const base64Data = input.photoDataUri.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const mimeType = input.photoDataUri.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
        const fileExtension = mimeType.split('/')[1] || 'jpg';
        
        const form = new FormData();
        form.append('verification_id', verificationId);
        form.append('image', imageBuffer, {
            filename: `liveliness.${fileExtension}`,
            contentType: mimeType,
        });

        const headers = await getHeaders(form);
        
        const response = await axios.post(url, form, { headers });

        const { data } = response;
        
        if (response.status === 200) {
             return {
                status: 'success',
                referenceId: data.reference_id,
                livelinessScore: data.liveliness_score,
                message: data.message || 'Liveliness check successful.',
            };
        } else {
             throw new Error(data.message || 'Unknown error from Cashfree API');
        }

    } catch (error: any) {
        console.error("Cashfree Liveliness Check Error:", error.response?.data || error.message);
        return {
            status: 'failed',
            message: error.response?.data?.message || error.message || 'An unexpected error occurred during liveliness check.',
        };
    }
  }
);
