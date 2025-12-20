
'use server';
/**
 * @fileOverview A flow for exporting all application data from Firestore.
 *
 * - exportAllData - A function that fetches all data and returns it as a JSON object.
 * - ExportDataOutput - The return type for the exportAllData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// Load the service account key
let serviceAccount: any;
try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
    }
    serviceAccount = JSON.parse(serviceAccountJson);
} catch (e) {
    console.error("Failed to parse Firebase service account key. Make sure it's a valid JSON string in the environment variable.", e);
    serviceAccount = null;
}

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

// Initialize Firebase Admin SDK with service account
function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    if (!serviceAccount) {
        throw new Error("Cannot initialize Firebase Admin SDK: Service account key is missing or invalid.");
    }
    return initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
    });
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
