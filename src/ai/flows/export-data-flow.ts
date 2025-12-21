
'use server';
/**
 * @fileOverview A flow for exporting all application data from Firestore.
 *
 * - exportAllData - A function that fetches all data and returns it as a JSON object.
 * - ExportDataOutput - The return type for the exportAllData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const UserSchema = z.any();
const CompanySchema = z.any();
const ReviewSchema = z.any();
const VacancySchema = z.any();
const AppConfigSchema = z.any();

const ExportDataOutputSchema = z.object({
  users: z.array(UserSchema),
  companies: z.array(CompanySchema),
  reviews: z.array(ReviewSchema),
  vacancies: z.array(VacancySchema),
  app_config: z.array(AppConfigSchema),
});
export type ExportDataOutput = z.infer<typeof ExportDataOutputSchema>;

// Initialize Firebase Admin SDK
function getAdminApp(): App {
    if (getApps().length) {
        return getApps()[0];
    }
    
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }

    try {
        return initializeApp({
            credential: cert(JSON.parse(serviceAccount))
        });
    } catch (error: any) {
        console.error("Error initializing Firebase Admin SDK with service account:", error.message);
        throw new Error("Failed to initialize Firebase Admin SDK. Please check your FIREBASE_SERVICE_ACCOUNT_KEY.");
    }
}


async function getAllFromCollection(collectionName: string) {
    const app = getAdminApp();
    const firestore = getFirestore(app);
    const snapshot = await firestore.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


export async function exportAllData(): Promise<ExportDataOutput> {
  return exportDataFlow();
}

const exportDataFlow = ai.defineFlow(
  {
    name: 'exportDataFlow',
    outputSchema: ExportDataOutputSchema,
  },
  async () => {
    
    const [users, companies, reviews, vacancies, app_config] = await Promise.all([
        getAllFromCollection('users'),
        getAllFromCollection('companies'),
        getAllFromCollection('reviews'),
        getAllFromCollection('vacancies'),
        getAllFromCollection('app_config'),
    ]);

    return {
      users,
      companies,
      reviews,
      vacancies,
      app_config,
    };
  }
);
