'use server';

import { initializeApp, getApps, App, credential } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
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
    // Attempt to initialize using Application Default Credentials
    const newApp = initializeApp({
      projectId: "studio-8621980584-11b8b",
      storageBucket: "studio-8621980584-11b8b.appspot.com",
    });

    globalWithApp._firebaseAdminApp = newApp;
    return newApp;

  } catch (e: any) {
    console.error("Firebase Admin SDK Initialization Error:", e);
    
    // Provide explicit guidance for ADC issues seen in the logs
    if (e.message?.includes('Could not find') || e.message?.includes('access token') || e.message?.includes('500')) {
         throw new Error(
            `AUTHENTICATION ERROR: Application Default Credentials (ADC) are missing or invalid.
             ACTION REQUIRED: Open your terminal and run:
             'gcloud auth application-default login'
             Then restart your development server to refresh the session.`
        );
    }
    throw new Error(`Firebase Admin SDK Error: ${e.message}`);
  }
}
