
'use server';
/**
 * @fileOverview A flow for updating a user's profile photo by uploading it to Firebase Storage.
 *
 * - updateUserPhoto - A function that takes a user ID and a photo data URI, uploads it, and returns a public URL.
 * - UpdateUserPhotoInput - The input type for the updateUserPhoto function.
 * - UpdateUserPhotoOutput - The return type for the updateUserPhoto function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminApp } from './get-admin-app';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

const UpdateUserPhotoInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose photo is being updated.'),
  photoDataUri: z.string().describe("A photo of the user, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type UpdateUserPhotoInput = z.infer<typeof UpdateUserPhotoInputSchema>;

const UpdateUserPhotoOutputSchema = z.object({
  photoUrl: z.string().describe('The publicly accessible URL of the uploaded photo.'),
});
export type UpdateUserPhotoOutput = z.infer<typeof UpdateUserPhotoOutputSchema>;

export async function updateUserPhoto(input: UpdateUserPhotoInput): Promise<UpdateUserPhotoOutput> {
  return updateUserPhotoFlow(input);
}

const updateUserPhotoFlow = ai.defineFlow(
  {
    name: 'updateUserPhotoFlow',
    inputSchema: UpdateUserPhotoInputSchema,
    outputSchema: UpdateUserPhotoOutputSchema,
  },
  async ({ userId, photoDataUri }) => {
    const adminApp = await getAdminApp();
    const bucket = getStorage(adminApp).bucket();

    // Extract content type and base64 data from data URI
    const match = photoDataUri.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid data URI format.');
    }
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Define the path in Firebase Storage
    const filePath = `profile-photos/${userId}/${uuidv4()}`;
    const file = bucket.file(filePath);

    // Upload the file
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make the file public and get the URL
    await file.makePublic();
    
    const publicUrl = file.publicUrl();

    return {
      photoUrl: publicUrl,
    };
  }
);
