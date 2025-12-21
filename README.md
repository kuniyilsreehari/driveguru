## Error Type
Console GenkitError

## Error Message
FAILED_PRECONDITION: Please pass in the API key or set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
For more details see https://genkit.dev/docs/plugins/google-genai/


    at __TURBOPACK__module__evaluation__ (src/ai/genkit.ts:2:1)
    at __TURBOPACK__module__evaluation__ (src/ai/flows/ai-search-flow.ts:11:1)
    at __TURBOPACK__module__evaluation__ (about://React/Server/file:///home/user/studio/.next/server/chunks/ssr/%5Broot-of-the-server%5D__c3ddce67._.js?17:306:168)
    at __TURBOPACK__module__evaluation__ (about://React/Server/file:///home/user/studio/.next/server/chunks/ssr/%5Broot-of-the-server%5D__c3ddce67._.js?18:316:373)
    at Object.<anonymous> (.next/server/app/page.js:33:3)

## Code Frame
  1 | import {genkit} from 'genkit';
> 2 | import {googleAI} from '@genkit-ai/google-genai';
    | ^
  3 |
  4 | export const ai = genkit({
  5 |   plugins: [googleAI()],

Next.js version: 15.5.9 (Turbopack)
FileInputStream serviceAccount =
new FileInputStream("path/to/serviceAccountKey.json");

FirebaseOptions options = new FirebaseOptions.Builder()
  .setCredentials(GoogleCredentials.fromStream(serviceAccount))
  .build();

FirebaseApp.initializeApp(options);
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
