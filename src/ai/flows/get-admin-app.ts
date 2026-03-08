'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * Prioritizes environment-based initialization for better stability in cloud environments.
 */
export async function getAdminApp(): Promise<App> {
  if (globalWithApp._firebaseAdminApp) {
    return globalWithApp._firebaseAdminApp;
  }
  
  const apps = getApps();
  if (apps.length) {
    globalWithApp._firebaseAdminApp = apps[0];
    return apps[0];
  }

  try {
    // 1. Attempt standard initialization without arguments.
    // This is the most reliable way to pick up Project ID and Service Account
    // credentials from the environment (ADC) in App Hosting or Workstations.
    const newApp = initializeApp();
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;

  } catch (e: any) {
    try {
        // 2. Fallback to explicit config if environment discovery fails.
        // Using the Project ID from your environment configuration.
        const newApp = initializeApp({
            projectId: "studio-8621980584-11b8b",
            storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
        });
        globalWithApp._firebaseAdminApp = newApp;
        return newApp;
    } catch (fallbackError: any) {
        console.error("Firebase Admin SDK Initialization Error:", fallbackError);
        
        // Provide explicit guidance for Cloud authorization issues
        const msg = fallbackError.message || '';
        if (msg.includes('Could not find') || msg.includes('access token') || msg.includes('500')) {
             throw new Error(
                `AUTHORIZATION ERROR: The server cannot refresh its access token. 
                 This usually means the environment credentials are misconfigured. 
                 If developing locally, run 'gcloud auth application-default login'.`
            );
        }
        throw new Error(`Firebase Admin SDK Error: ${fallbackError.message}`);
    }
  }
}
