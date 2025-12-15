// This is an AI-powered location suggestion tool.
//
// It uses the user's past preferences, historical data, and real-time trends to suggest locations of interest.
//
// - suggestLocations - The main function to get location suggestions.
// - SuggestLocationsInput - Input type for suggestLocations function.
// - SuggestLocationsOutput - Output type for suggestLocations function.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLocationsInputSchema = z.object({
  userPreferences: z
    .string()
    .describe('The user\u0027s preferences, such as preferred cuisines, activities, and price ranges.'),
  historicalData: z
    .string()
    .describe(
      'Historical data about the user\u0027s past location visits and choices, including frequency, duration, and ratings.'
    ),
  realTimeTrends: z
    .string()
    .describe(
      'Real-time trends, such as popular locations, events happening nearby, and current ratings from other users.'
    ),
  userLocation: z.string().describe('The current location of the user.'),
});
export type SuggestLocationsInput = z.infer<typeof SuggestLocationsInputSchema>;

const SuggestLocationsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'A list of location suggestions based on the user\u0027s preferences, historical data, and real-time trends.'
    ),
});
export type SuggestLocationsOutput = z.infer<typeof SuggestLocationsOutputSchema>;

export async function suggestLocations(input: SuggestLocationsInput): Promise<SuggestLocationsOutput> {
  return suggestLocationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLocationsPrompt',
  input: {schema: SuggestLocationsInputSchema},
  output: {schema: SuggestLocationsOutputSchema},
  prompt: `You are a location suggestion expert.

Based on the user\u0027s preferences, historical data, real-time trends, and current location, suggest a list of locations that the user might be interested in visiting.

User Preferences: {{{userPreferences}}}
Historical Data: {{{historicalData}}}
Real-time Trends: {{{realTimeTrends}}}
Current Location: {{{userLocation}}}

Suggestions:`, // Make sure it ends with 'Suggestions:' so the AI knows what to output
});

const suggestLocationsFlow = ai.defineFlow(
  {
    name: 'suggestLocationsFlow',
    inputSchema: SuggestLocationsInputSchema,
    outputSchema: SuggestLocationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
