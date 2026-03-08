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
    // credentials from the environment (ADC).
    const newApp = initializeApp();
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;

  } catch (e: any) {
    try {
        // 2. Fallback to explicit config if environment discovery fails.
        const newApp = initializeApp({
            projectId: "studio-8621980584-11b8b",
            storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
        });
        globalWithApp._firebaseAdminApp = newApp;
        return newApp;
    } catch (fallbackError: any) {
        console.error("Firebase Admin SDK Initialization Error:", fallbackError);
        
        // Provide explicit, user-friendly guidance for ADC/Auth issues seen in logs
        const msg = fallbackError.message || '';
        if (msg.includes('Could not find') || msg.includes('access token') || msg.includes('500') || msg.includes('metadata')) {
             throw new Error(
                `AUTHENTICATION ERROR: The server cannot authorize access to Firebase services. 
                 If you are developing locally, please run: 
                 'gcloud auth application-default login' 
                 in your terminal and restart the server.`
            );
        }
        throw new Error(`Firebase Admin SDK Error: ${fallbackError.message}`);
    }
  }
}
