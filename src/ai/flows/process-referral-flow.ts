
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
  newUserUid: z.string().describe('The UID of the newly created user.'),
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
  async ({ newUserUid, referralCode }) => {
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

      // Use a transaction to ensure atomicity
      await firestore.runTransaction(async (transaction) => {
        // 2. Find the referring user
        const usersRef = firestore.collection('users');
        const q = usersRef.where('referralCode', '==', referralCode).limit(1);
        
        // Execute query within transaction
        const querySnapshot = await transaction.get(q);
        
        if (querySnapshot.empty) {
          // Note: Throwing an error inside a transaction will automatically roll it back.
          throw new Error(`Referral code "${referralCode}" not found.`);
        }
        
        const referrerDoc = querySnapshot.docs[0];
        const newUserDocRef = usersRef.doc(newUserUid);
        
        // 3. Increment the referralPoints on the referrer's document
        transaction.update(referrerDoc.ref, {
          referralPoints: FieldValue.increment(rewardPoints)
        });

        // 4. Mark the referral as processed on the new user's document to prevent re-processing
        transaction.update(newUserDocRef, {
          referredByCode: null
        });
      });

      return { success: true, message: `${rewardPoints} points awarded to user ${newUserUid}.` };

    } catch (error: any) {
      console.error("Error processing referral:", error);
      // If the error came from our check, use its message, otherwise a generic one.
      const errorMessage = error.message.startsWith('Referral code') 
        ? error.message 
        : `An unexpected server error occurred: ${error.message}`;
      return { success: false, message: errorMessage };
    }
  }
);
