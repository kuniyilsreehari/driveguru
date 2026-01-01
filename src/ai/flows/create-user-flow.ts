
'use server';
/**
 * @fileOverview A flow for a super admin to create a new user.
 *
 * - createUser - Creates a new user in Firebase Auth and Firestore.
 * - CreateUserInput - Input for the createUser function.
 * - CreateUserOutput - Output for the createUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from './get-admin-app';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["freelancer", "company", "authorized_pro", "manager", "super_admin"]),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  success: z.boolean(),
  userId: z.string().optional(),
  message: z.string(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}


export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    const adminApp = await getAdminApp();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    try {
      // 1. Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: `${input.firstName} ${input.lastName}`,
      });

      const userId = userRecord.uid;

      // 2. Create user document in Firestore
      const userDocRef = firestore.collection('users').doc(userId);
      const userData = {
        id: userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: input.role,
        createdAt: Timestamp.now(),
        verified: false,
        isAvailable: true,
        referralCode: generateReferralCode(),
        referralPoints: 0,
      };
      
      await userDocRef.set(userData);

       // 3. If the role is super_admin or manager, add them to the respective roles collection
      if (input.role === 'super_admin') {
        await firestore.collection('roles_super_admin').doc(userId).set({ uid: userId });
      }
      if (input.role === 'manager') {
         await firestore.collection('roles_manager').doc(userId).set({ uid: userId });
      }


      return {
        success: true,
        userId: userId,
        message: 'User created successfully.',
      };

    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/email-already-exists') {
        message = 'This email address is already in use by another account.';
      } else if (error.code) {
        message = error.message;
      }
      return {
        success: false,
        message: message,
      };
    }
  }
);
