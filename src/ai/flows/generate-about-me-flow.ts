
'use server';
/**
 * @fileOverview Generates an "About Me" bio for an expert based on their profile.
 *
 * - generateAboutMe - A function that takes expert details and returns a generated bio.
 * - GenerateAboutMeInput - The input type for the generateAboutMe function.
 * - GenerateAboutMeOutput - The return type for the generateAboutMe function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAboutMeInputSchema = z.object({
  firstName: z.string().describe("The expert's first name."),
  role: z.string().describe("The expert's role (e.g., Freelancer, Company)."),
  skills: z.string().describe("A comma-separated list of the expert's skills."),
  yearsOfExperience: z.number().describe("The expert's years of professional experience."),
  qualification: z.string().describe("The expert's highest qualification."),
});
export type GenerateAboutMeInput = z.infer<typeof GenerateAboutMeInputSchema>;

const GenerateAboutMeOutputSchema = z.object({
  aboutMe: z.string().describe('A generated "About Me" bio for the expert.'),
});
export type GenerateAboutMeOutput = z.infer<typeof GenerateAboutMeOutputSchema>;

export async function generateAboutMe(input: GenerateAboutMeInput): Promise<GenerateAboutMeOutput> {
  return generateAboutMeFlow(input);
}

const generateAboutMeFlow = ai.defineFlow(
  {
    name: 'generateAboutMeFlow',
    inputSchema: GenerateAboutMeInputSchema,
    outputSchema: GenerateAboutMeOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt: `You are an expert at writing compelling professional bios. 
      Generate a friendly and professional "About Me" section for an expert named ${input.firstName}.
      The bio should be concise (2-3 sentences) and highlight their key strengths.

      Here is their information:
      - Role: ${input.role}
      - Skills: ${input.skills}
      - Years of Experience: ${input.yearsOfExperience}
      - Qualification: ${input.qualification}

      Based on this, write a bio that would be appealing to potential clients.
      Start with a strong opening statement. Mention their experience and key skills.
      Keep the tone professional yet approachable.
      `,
      output: { schema: GenerateAboutMeOutputSchema },
    });
    
    return llmResponse.output!;
  }
);
