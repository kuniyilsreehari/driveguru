
'use server';
/**
 * @fileOverview An AI flow to parse natural language search queries into structured search parameters.
 *
 * - parseSearchQuery - A function that takes a user's query and returns structured search filters.
 * - ParseSearchQueryInput - The input type for the parseSearchQuery function.
 * - ParseSearchQueryOutput - The return type for the parseSearchQuery function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseSearchQueryInputSchema = z.object({
  query: z.string().describe("The user's natural language search query."),
  userLat: z.number().optional().describe("The user's current latitude, if available."),
  userLon: z.number().optional().describe("The user's current longitude, if available."),
});
export type ParseSearchQueryInput = z.infer<typeof ParseSearchQueryInputSchema>;

const ParseSearchQueryOutputSchema = z.object({
  searchQuery: z.string().optional().describe("The primary search term, skill, qualification, or keyword (e.g., 'Plumber', 'React Developer', 'B.Tech')."),
  location: z.string().optional().describe("The geographic location to search in (e.g., 'Mumbai', 'Bangalore')."),
  maxRate: z.number().optional().describe("An estimated maximum hourly rate if the user mentions terms like 'cheap' or 'affordable' (e.g., 500 for cheap, 1000 for mid-range)."),
  isVerified: z.boolean().optional().describe("Set to true if the user explicitly asks for 'verified' or 'trusted' experts."),
  isAvailable: z.boolean().optional().describe("Set to true if the user mentions 'available now' or 'immediately'."),
  radius: z.number().optional().describe("The search radius in kilometers if the user mentions a distance (e.g., 'within 20 km'). Default to 20 if a distance is mentioned but no specific number is given."),
  useUserLocation: z.boolean().optional().describe("Set to true if the user's query implies searching near their current location (e.g., 'near me', 'nearby')."),
  lat: z.number().optional(),
  lon: z.number().optional(),
});
export type ParseSearchQueryOutput = z.infer<typeof ParseSearchQueryOutputSchema>;

export async function parseSearchQuery(input: ParseSearchQueryInput): Promise<ParseSearchQueryOutput> {
  const result = await parseSearchQueryFlow(input);
  if (result.useUserLocation && input.userLat && input.userLon) {
    result.lat = input.userLat;
    result.lon = input.userLon;
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'parseSearchQueryPrompt',
  input: { schema: ParseSearchQueryInputSchema },
  output: { schema: ParseSearchQueryOutputSchema },
  prompt: `You are an intelligent search assistant for a talent marketplace. Your job is to parse a user's natural language query and extract structured search parameters.

  User Query: "{{{query}}}"
  
  Analyze the query and extract the following information:
  - The core profession, skill, qualification, or name the user is looking for (searchQuery).
  - Any specified location (location).
  - If the user mentions affordability (e.g., "cheap", "affordable", "low cost"), set a reasonable maxRate (e.g., 500).
  - If the user asks for "verified" or "trusted" experts, set isVerified to true.
  - If the user asks for someone "available now" or "immediately", set isAvailable to true.
  - If the user mentions a search radius like "within 10km" or "in a 5 km range", extract the number and set it as 'radius'. If they just say "nearby" or "near me", set 'useUserLocation' to true and set 'radius' to 20.
  
  Return the extracted parameters in the specified JSON format. If a parameter is not mentioned, omit it.
  `,
});

const parseSearchQueryFlow = ai.defineFlow(
  {
    name: 'parseSearchQueryFlow',
    inputSchema: ParseSearchQueryInputSchema,
    outputSchema: ParseSearchQueryOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are an intelligent search assistant for a talent marketplace. Your job is to parse a user's natural language query and extract structured search parameters.

      User Query: "${input.query}"
      
      Analyze the query and extract the following information:
      - The core profession, skill, qualification, or name the user is looking for (searchQuery).
      - Any specified location (location).
      - If the user mentions affordability (e.g., "cheap", "affordable", "low cost"), set a reasonable maxRate (e.g., 500).
      - If the user asks for "verified" or "trusted" experts, set isVerified to true.
      - If the user asks for someone "available now" or "immediately", set isAvailable to true.
      - If the user mentions a search radius like "within 10km" or "in a 5 km range", extract the number and set it as 'radius'. If they just say "nearby" or "near me", set 'useUserLocation' to true and set 'radius' to 20.
      
      Return the extracted parameters in the specified JSON format. If a parameter is not mentioned, omit it.`,
      output: { schema: ParseSearchQueryOutputSchema },
    });
    
    return llmResponse.output()!;
  }
);
