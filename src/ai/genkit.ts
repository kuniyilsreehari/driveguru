
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Conditionally initialize the googleAI plugin only if the API key is provided.
// This prevents server crashes during local development or builds when the key is not set.
const genkitPlugins = [];
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  genkitPlugins.push(googleAI());
} else {
  console.warn("Genkit: GEMINI_API_KEY or GOOGLE_API_KEY is not set. AI features will be disabled.");
}

export const ai = genkit({
  plugins: genkitPlugins,
});
