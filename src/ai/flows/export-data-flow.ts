
'use server';
/**
 * @fileOverview A flow for exporting all application data from Firestore.
 *
 * - exportAllData - A function that fetches all data and returns it as a JSON object.
 * - ExportDataOutput - The return type for the exportAllData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './get-admin-app';

const UserSchema = z.any();
const CompanySchema = z.any();
const VacancySchema = z.any();
const AppConfigSchema = z.any();
const PaymentSchema = z.any();

const ExportDataOutputSchema = z.object({
  users: z.array(UserSchema),
  companies: z.array(CompanySchema),
  vacancies: z.array(VacancySchema),
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
    
    const [users, companies, vacancies, app_config, payments] = await Promise.all([
        getAllFromCollection('users'),
        getAllFromCollection('companies'),
        getAllFromCollection('vacancies'),
        getAllFromCollection('app_config'),
        getAllFromCollection('payments'),
    ]);

    return {
      users,
      companies,
      vacancies,
      app_config,
      payments,
    };
  }
);
