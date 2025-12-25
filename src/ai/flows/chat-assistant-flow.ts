
'use server';
/**
 * @fileOverview A conversational AI chat assistant for the DriveGuru app.
 *
 * - chat - The main function to interact with the chat assistant.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe("The user's message to the assistant."),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.array(z.object({ text: z.string() })),
      })
    )
    .optional()
    .describe('The conversation history.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  reply: z.string().describe("The assistant's reply to the user."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatAssistantFlow(input);
}

const chatAssistantFlow = ai.defineFlow(
  {
    name: 'chatAssistantFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async ({ message, history }) => {
    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt: message,
      history: history,
      system: `You are a helpful and friendly assistant for an app called DriveGuru.
               Your goal is to help users find experts or help experts manage their profiles.
               Keep your responses concise and professional.`,
    });

    return {
      reply: llmResponse.text,
    };
  }
);
