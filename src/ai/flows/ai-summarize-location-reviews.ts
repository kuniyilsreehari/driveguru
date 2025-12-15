'use server';
/**
 * @fileOverview Summarizes reviews for a given location.
 *
 * - summarizeLocationReviews - A function that takes location reviews as input and returns a summary.
 * - SummarizeLocationReviewsInput - The input type for the summarizeLocationReviews function.
 * - SummarizeLocationReviewsOutput - The return type for the summarizeLocationReviews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLocationReviewsInputSchema = z.object({
  locationReviews: z.string().describe('Reviews for the location.'),
});
export type SummarizeLocationReviewsInput = z.infer<typeof SummarizeLocationReviewsInputSchema>;

const SummarizeLocationReviewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the reviews.'),
});
export type SummarizeLocationReviewsOutput = z.infer<typeof SummarizeLocationReviewsOutputSchema>;

export async function summarizeLocationReviews(input: SummarizeLocationReviewsInput): Promise<SummarizeLocationReviewsOutput> {
  return summarizeLocationReviewsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeLocationReviewsPrompt',
  input: {schema: SummarizeLocationReviewsInputSchema},
  output: {schema: SummarizeLocationReviewsOutputSchema},
  prompt: `Summarize the following reviews for a location:\n\nReviews: {{{locationReviews}}}`,
});

const summarizeLocationReviewsFlow = ai.defineFlow(
  {
    name: 'summarizeLocationReviewsFlow',
    inputSchema: SummarizeLocationReviewsInputSchema,
    outputSchema: SummarizeLocationReviewsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
