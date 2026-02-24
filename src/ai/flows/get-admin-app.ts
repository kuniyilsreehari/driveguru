'use server';

import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';

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
    const newApp = initializeApp({
      credential: applicationDefault(),
      projectId: "studio-8621980584-11b8b",
      storageBucket: "studio-8621980584-11b8b.appspot.com",
    });

    globalWithApp._firebaseAdminApp = newApp;
    return newApp;

  } catch (e: any) {
    console.error("Firebase Admin SDK Initialization Error:", e);
    // GUIDE THE USER ON ADC ISSUES
    if (e.message?.includes('Could not find') || e.message?.includes('access token')) {
         throw new Error(
            `AUTHENTICATION ERROR: Application Default Credentials (ADC) are missing or expired.
             ACTION REQUIRED: Open your terminal and run:
             'gcloud auth application-default login'
             Then restart your development server.`
        );
    }
    throw new Error(`Firebase Admin SDK Error: ${e.message}`);
  }
}
