
'use server';
/**
 * @fileOverview A flow for processing a referral code.
 *
 * - processReferral - A function that finds the referring user and increments their points.
 * - ProcessReferralInput - The input type for the processReferral function.
 * - ProcessReferralOutput - The return type for the processReferral function.
 */
import { config } from 'dotenv';
config();
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from './get-admin-app';

const ProcessReferralInputSchema = z.object({
  referralCode: z.string().describe('The referral code entered during signup.'),
});
export type ProcessReferralInput = z.infer<typeof ProcessReferralInputSchema>;

const ProcessReferralOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ProcessReferralOutput = z.infer<typeof ProcessReferralOutputSchema>;

export async function processReferral(input: ProcessReferralInput): Promise<ProcessReferralOutput> {
  return processReferralFlow(input);
}

const processReferralFlow = ai.defineFlow(
  {
    name: 'processReferralFlow',
    inputSchema: ProcessReferralInputSchema,
    outputSchema: ProcessReferralOutputSchema,
  },
  async ({ referralCode }) => {
    if (!referralCode) {
      return { success: true, message: 'No referral code provided.' };
    }

    try {
      const adminApp = await getAdminApp();
      const firestore = getFirestore(adminApp);
      
      // 1. Get the reward points from app config
      const appConfigDoc = await firestore.doc('app_config/homepage').get();
      const appConfig = appConfigDoc.data();
      const rewardPoints = appConfig?.referralRewardPoints || 1; // Default to 1 if not set

      // 2. Find the referring user
      const usersRef = firestore.collection('users');
      const q = usersRef.where('referralCode', '==', referralCode).limit(1);
      
      const querySnapshot = await q.get();
      
      if (querySnapshot.empty) {
        console.warn(`Referral code "${referralCode}" not found.`);
        return { success: false, message: 'Invalid referral code.' };
      }
      
      const referrerDoc = querySnapshot.docs[0];
      
      // 3. Increment the referralPoints by the configured amount
      await referrerDoc.ref.update({
        referralPoints: FieldValue.increment(rewardPoints)
      });

      return { success: true, message: `${rewardPoints} points awarded to user ${referrerDoc.id}.` };

    } catch (error: any) {
      console.error("Error processing referral:", error);
      return { success: false, message: `An unexpected server error occurred: ${error.message}` };
    }
  }
);
