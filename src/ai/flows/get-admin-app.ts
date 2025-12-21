
'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// Use a global symbol to store the initialized app instance to prevent re-initialization
// during Next.js hot-reloading in development.
const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * This ensures that the app is initialized only once per server instance.
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

  // Retrieve the service account key from environment variables.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please check your environment configuration.'
    );
  }

  try {
    // The service account key is a JSON string, so we need to parse it.
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Initialize the Firebase Admin App with the parsed service account credentials.
    const newApp = initializeApp({
      credential: cert(serviceAccount),
    });

    // Cache the newly created app on the global object.
    globalWithApp._firebaseAdminApp = newApp;
    
    return newApp;

  } catch (e: any) {
    // If parsing fails, throw a more informative error.
    throw new Error(
      `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it's a valid JSON string. Error: ${e.message}`
    );
  }
}
