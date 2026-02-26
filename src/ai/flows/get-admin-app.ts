'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * Provides explicit guidance for local authentication issues common in development environments.
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
    // Attempt to initialize using Application Default Credentials (ADC)
    // The environment should automatically pick up credentials in Firebase App Hosting
    // or from 'gcloud auth application-default login' locally.
    const newApp = initializeApp({
      projectId: "studio-8621980584-11b8b",
      storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
    });

    globalWithApp._firebaseAdminApp = newApp;
    return newApp;

  } catch (e: any) {
    console.error("Firebase Admin SDK Initialization Error:", e);
    
    // Provide explicit, user-friendly guidance for ADC/Auth issues seen in logs
    const msg = e.message || '';
    if (msg.includes('Could not find') || msg.includes('access token') || msg.includes('500') || msg.includes('metadata')) {
         throw new Error(
            `AUTHENTICATION ERROR: The server cannot authorize access to Firebase services. 
             If you are developing locally, please run: 
             'gcloud auth application-default login' 
             in your terminal and restart the server.`
        );
    }
    throw new Error(`Firebase Admin SDK Error: ${e.message}`);
  }
}
