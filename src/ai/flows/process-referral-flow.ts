
'use server';
/**
 * @fileOverview A flow for processing a referral code.
 *
 * This file defines a Genkit flow that runs after a new user has been created.
 * It finds the user who owns the provided referral code and, within a Firestore
 * transaction, increments their referral points and mark the referral as processed.
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
      
      const appConfigDoc = await firestore.doc('app_config/homepage').get();
      const appConfig = appConfigDoc.data();
      const rewardPoints = appConfig?.referralRewardPoints || 50; 

      const message = await firestore.runTransaction(async (transaction) => {
        const usersRef = firestore.collection('users');
        const q = usersRef.where('referralCode', '==', referralCode).limit(1);
        
        const querySnapshot = await transaction.get(q);
        
        if (querySnapshot.empty) {
          throw new Error(`Referral code "${referralCode}" not found.`);
        }
        
        const referrerDoc = querySnapshot.docs[0];
        const newUserDocRef = usersRef.doc(newUserUid);
        
        // 3. Update the referrer with points and count
        transaction.update(referrerDoc.ref, {
          referralPoints: FieldValue.increment(rewardPoints),
          referralCount: FieldValue.increment(1)
        });

        // 4. Mark as processed on the new user doc
        transaction.update(newUserDocRef, {
          referredByCode: null
        });
        
        return `${rewardPoints} points and +1 join awarded to ${referrerDoc.data().firstName}.`;
      });

      return { success: true, message };

    } catch (error: any) {
      console.error("Error processing referral:", error);
      const errorMessage = error.message.startsWith('Referral code') 
        ? error.message 
        : `An unexpected error occurred: ${error.message}`;
      return { success: false, message: errorMessage };
    }
  }
);
