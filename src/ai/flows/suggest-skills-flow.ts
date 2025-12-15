
'use server';
/**
 * @fileOverview Suggests skills for an expert based on their profile.
 *
 * - suggestSkills - A function that takes expert details and returns a list of suggested skills.
 * - SuggestSkillsInput - The input type for the suggestSkills function.
 * - SuggestSkillsOutput - The return type for the suggestSkills function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestSkillsInputSchema = z.object({
  role: z.string().describe("The expert's role (e.g., Freelancer, Developer)."),
  qualification: z.string().describe("The expert's highest qualification."),
  existingSkills: z.string().describe("A comma-separated list of the expert's current skills."),
});
export type SuggestSkillsInput = z.infer<typeof SuggestSkillsInputSchema>;

const SuggestSkillsOutputSchema = z.object({
  suggestedSkills: z.string().describe('A comma-separated list of suggested new skills.'),
});
export type SuggestSkillsOutput = z.infer<typeof SuggestSkillsOutputSchema>;

export async function suggestSkills(input: SuggestSkillsInput): Promise<SuggestSkillsOutput> {
  return suggestSkillsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSkillsPrompt',
  input: { schema: SuggestSkillsInputSchema },
  output: { schema: SuggestSkillsOutputSchema },
  prompt: `You are a career development expert. Based on the user's profile, suggest 5 additional, relevant skills.
  
  User Profile:
  - Role: {{{role}}}
  - Qualification: {{{qualification}}}
  - Current Skills: {{{existingSkills}}}

  Suggest new skills that complement their current skill set and role.
  Do not repeat any of the existing skills.
  Return the suggestions as a single comma-separated string.
  `,
});

const suggestSkillsFlow = ai.defineFlow(
  {
    name: 'suggestSkillsFlow',
    inputSchema: SuggestSkillsInputSchema,
    outputSchema: SuggestSkillsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
