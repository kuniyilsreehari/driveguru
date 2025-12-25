
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

// This schema defines the parameters our AI can use for searching.
// It is the primary output we want from the AI.
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


/**
 * Defines a "tool" that the AI model can use. The AI's goal will be to figure out
 * what arguments to pass to this tool based on the user's query.
 */
const expertSearchTool = ai.defineTool(
    {
        name: 'expertSearch',
        description: 'Performs a search for experts based on various criteria.',
        inputSchema: ParseSearchQueryOutputSchema,
        outputSchema: z.void(), // We only care about the input the AI provides to the tool.
    },
    async (input) => {
      // This function is a placeholder. The AI will generate the `input` for this tool,
      // and we will capture that input to use as our search parameters.
    }
);


export async function parseSearchQuery(input: ParseSearchQueryInput): Promise<ParseSearchQueryOutput> {
  const result = await parseSearchQueryFlow(input);
  if (result.useUserLocation && input.userLat && input.userLon) {
    result.lat = input.userLat;
    result.lon = input.userLon;
  }
  return result;
}

const parseSearchQueryFlow = ai.defineFlow(
  {
    name: 'parseSearchQueryFlow',
    inputSchema: ParseSearchQueryInputSchema,
    outputSchema: ParseSearchQueryOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are an intelligent search assistant for a talent marketplace. 
               Your job is to parse a user's natural language query and use the expertSearch tool to find relevant experts.
               
               User Query: "${input.query}"
               
               Analyze the query and call the expertSearch tool with the appropriate parameters.
               - Extract the core profession, skill, qualification, or name (searchQuery).
               - Extract any specified location.
               - If the user asks for "verified" experts, set isVerified to true.
               - If they mention "available now", set isAvailable to true.
               - If they mention a search radius, extract it. If they say "near me" or "nearby", set useUserLocation to true and radius to 20km.
               - If they mention affordability (e.g., "cheap", "low cost"), set a reasonable maxRate like 500.
               `,
      tools: [expertSearchTool],
    });
    
    // Find the tool call request from the AI's response.
    const searchToolCall = llmResponse.toolRequests().find(tool => tool.name === 'expertSearch');

    if (searchToolCall) {
        // The arguments the AI decided to use for the tool are our structured search parameters.
        return searchToolCall.input as ParseSearchQueryOutput;
    }

    // Fallback if the AI doesn't use the tool (e.g., for a conversational query)
    return { searchQuery: input.query };
  }
);
