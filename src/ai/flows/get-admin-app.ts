
'use server';

import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';

// Use a global symbol to store the initialized app instance to prevent re-initialization
// during Next.js hot-reloading in development.
const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * This ensures that the app is initialized only once per server instance.
 * It uses Application Default Credentials (ADC) for authentication.
 * This function is for server-side use only.
 */
export async function getAdminApp(): Promise<App> {
  // If the app is already cached on the global object, return it.
  if (globalWithApp._firebaseAdminApp) {
    return globalWithApp._firebaseAdminApp;
  }
  
  // If not cached, check if any Firebase apps are initialized.
  const apps = getApps();
  if (apps.length) {
    globalWithApp._firebaseAdminApp = apps[0];
    return apps[0];
  }

  try {
    // Initialize the Firebase Admin App using Application Default Credentials.
    const newApp = initializeApp({
      credential: applicationDefault(),
      storageBucket: "studio-8621980584-11b8b.appspot.com",
    });

    // Cache the newly created app on the global object.
    globalWithApp._firebaseAdminApp = newApp;
    
    return newApp;

  } catch (e: any) {
    console.error("Firebase Admin SDK Initialization Error:", e);
    // Provide a more helpful error message for local development.
    if (e.message?.includes('Could not find')) {
         throw new Error(
            `Failed to initialize Firebase Admin SDK. Application Default Credentials are not configured for your local environment. Please run 'gcloud auth application-default login' in your terminal and try again. Original Error: ${e.message}`
        );
    }
    throw new Error(`Failed to initialize Firebase Admin SDK. Original Error: ${e.message}`);
  }
}
