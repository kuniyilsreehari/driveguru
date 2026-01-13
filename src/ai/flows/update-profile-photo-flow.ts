
'use server';
/**
 * @fileOverview A flow for updating a user's profile photo by uploading it to Firebase Storage.
 *
 * This file defines a Genkit flow that takes a user's ID and a photo (as a data URI),
 * uploads the photo to a dedicated path in Firebase Storage, makes it publicly accessible,
 * and returns the public URL.
 *
 * - updateUserPhoto - The main function to initiate the photo upload process.
 * - UpdateUserPhotoInput - The Zod schema for the input to the function.
 * - UpdateUserPhotoOutput - The Zod schema for the output from the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminApp } from './get-admin-app';
import { getStorage } from 'firebase-admin/storage';

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
    
    const fileExtension = contentType.split('/')[1] || 'jpg';
    const filePath = `profile-photos/${userId}/profile.${fileExtension}`;
    const file = bucket.file(filePath);

    // Upload the file
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
        // Add cache control to ensure the browser fetches the new image
        cacheControl: 'no-cache, max-age=0',
      },
    });

    // Make the file public and get the URL
    await file.makePublic();
    
    // Return the clean public URL. The client will handle cache-busting.
    return {
      photoUrl: file.publicUrl(),
    };
  }
);
