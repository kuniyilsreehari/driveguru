
'use server';
/**
 * @fileOverview A flow for importing expert users from a CSV file.
 *
 * This file defines a Genkit flow that allows a Super Admin to bulk-import
 * users from a CSV file. It parses the CSV data, then either creates new user
 * accounts in Firebase Auth and Firestore or updates existing user profiles.
 *
 * - importUsers - The main function that handles the CSV parsing and user import process.
 * - ImportUsersInput - The Zod schema for the CSV file content input.
 * - ImportUsersOutput - The Zod schema for the summary of the import operation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './get-admin-app';

const ImportUsersInputSchema = z.object({
  csvData: z.string().describe('The full string content of the CSV file.'),
});
export type ImportUsersInput = z.infer<typeof ImportUsersInputSchema>;

const ImportUsersOutputSchema = z.object({
  processedCount: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  errors: z.array(z.string()),
});
export type ImportUsersOutput = z.infer<typeof ImportUsersOutputSchema>;


function parseCSV(csvData: string): Record<string, any>[] {
    const lines = csvData.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
            let value = values[j]?.trim();
            // Handle quoted strings that might contain commas
            if (value?.startsWith('"') && value?.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            obj[headers[j]] = value;
        }
        data.push(obj);
    }
    return data;
}

const convertToFirestoreTypes = (record: Record<string, any>) => {
    const newRecord = { ...record };
    for (const key in newRecord) {
        const value = newRecord[key];
        if (value === 'true') newRecord[key] = true;
        else if (value === 'false') newRecord[key] = false;
        else if (!isNaN(Number(value)) && value !== '') {
            if (key === 'hourlyRate' || key === 'yearsOfExperience') {
                newRecord[key] = Number(value);
            }
        }
    }
    return newRecord;
}


export async function importUsers(input: ImportUsersInput): Promise<ImportUsersOutput> {
  return importUsersFlow(input);
}

const importUsersFlow = ai.defineFlow(
  {
    name: 'importUsersFlow',
    inputSchema: ImportUsersInputSchema,
    outputSchema: ImportUsersOutputSchema,
  },
  async ({ csvData }) => {
    const adminApp = await getAdminApp();
    const firestore = getFirestore(adminApp);
    const auth = getAuth(adminApp);
    const users = parseCSV(csvData);

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const userRecord of users) {
        processedCount++;
        try {
            const data = convertToFirestoreTypes(userRecord);
            const { id, email, ...userData } = data;

            if (!id && !email) {
                errors.push(`Row ${processedCount}: Missing 'id' or 'email' for user.`);
                continue;
            }

            let userAuthRecord;
            let userId = id;

            // Find user by email if ID is missing
            if (!userId && email) {
                try {
                    userAuthRecord = await auth.getUserByEmail(email);
                    userId = userAuthRecord.uid;
                } catch (e) {
                    // User doesn't exist in Auth, will be created if password is provided
                }
            }

            const docRef = firestore.collection('users').doc(userId || email); // Use email as temp ID if needed

            if (userId) { // User exists, update them
                await docRef.set(userData, { merge: true });
                updatedCount++;
            } else { // User does not exist, create them
                if (!userData.password) {
                     errors.push(`Row ${processedCount}: New user with email ${email} requires a 'password' field in the CSV.`);
                     continue;
                }
                
                const newUserAuth = await auth.createUser({
                    email: email,
                    password: userData.password,
                    displayName: `${userData.firstName} ${userData.lastName}`,
                });

                // Set document with the new UID
                const newUserDocRef = firestore.collection('users').doc(newUserAuth.uid);
                delete userData.password; // Don't store password in Firestore
                await newUserDocRef.set({ ...userData, id: newUserAuth.uid, createdAt: Timestamp.now() });
                createdCount++;
            }

        } catch (error: any) {
            errors.push(`Row ${processedCount}: ${error.message}`);
        }
    }

    return {
      processedCount,
      createdCount,
      updatedCount,
      errors,
    };
  }
);
