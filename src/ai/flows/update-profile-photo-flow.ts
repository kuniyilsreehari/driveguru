
'use server';
/**
 * @fileOverview A flow for updating a user's profile photo.
 *
 * - updateUserPhoto - A function that takes a user ID and a photo data URI and returns a URL.
 * - UpdateUserPhotoInput - The input type for the updateUserPhoto function.
 * - UpdateUserPhotoOutput - The return type for the updateUserPhoto function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
    // In a real-world scenario, you would upload the photo to a storage service
    // like Firebase Storage here and get a public URL.
    // For now, we will just return the data URI as the URL.
    
    // Example for future Firebase Storage integration:
    // const storage = getStorage();
    // const storageRef = ref(storage, `profile-photos/${userId}`);
    // await uploadString(storageRef, photoDataUri, 'data_url');
    // const downloadUrl = await getDownloadURL(storageRef);
    // return { photoUrl: downloadUrl };

    return {
      photoUrl: photoDataUri,
    };
  }
);
