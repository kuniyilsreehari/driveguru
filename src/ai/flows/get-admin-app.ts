
'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

/**
 * Initializes and returns a Firebase Admin App instance.
 * It ensures that the app is initialized only once (singleton pattern).
 * This function is for server-side use only.
 */
export function getAdminApp(): App {
  // If the app is already initialized, return the existing instance.
  const apps = getApps();
  if (apps.length) {
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
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e: any) {
    // If parsing fails, throw a more informative error.
    throw new Error(
      `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it's a valid JSON string. Error: ${e.message}`
    );
  }
}
