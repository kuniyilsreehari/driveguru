'use server';
/**
 * @fileOverview A flow for exporting all application data from Firestore.
 *
 * This file defines a Genkit flow for Super Admins to perform a full backup
 * of key Firestore collections. It fetches all documents from specified collections
 * and returns them in a structured JSON object, which can then be saved as a file.
 *
 * - exportAllData - The main function to trigger the data export.
 * - ExportDataOutput - The Zod schema defining the structure of the exported JSON object.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './get-admin-app';

const UserSchema = z.any();
const CompanySchema = z.any();
const AppConfigSchema = z.any();
const PaymentSchema = z.any();

const ExportDataOutputSchema = z.object({
  users: z.array(UserSchema),
  companies: z.array(CompanySchema),
  app_config: z.array(AppConfigSchema),
  payments: z.array(PaymentSchema),
});
export type ExportDataOutput = z.infer<typeof ExportDataOutputSchema>;


async function getAllFromCollection(collectionName: string) {
    const app = await getAdminApp();
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
    
    const [users, companies, app_config, payments] = await Promise.all([
        getAllFromCollection('users'),
        getAllFromCollection('companies'),
        getAllFromCollection('app_config'),
        getAllFromCollection('payments'),
    ]);

    return {
      users,
      companies,
      app_config,
      payments,
    };
  }
);