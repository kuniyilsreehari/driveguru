'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * Priorities explicit configuration to avoid metadata refreshing errors in Cloud environments.
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
    // 1. Prioritize explicit config for stability in Studio/Hosting
    const newApp = initializeApp({
        projectId: "studio-8621980584-11b8b",
        storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
    });
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;

  } catch (e: any) {
    try {
        // 2. Fallback to standard environment discovery (ADC)
        const newApp = initializeApp();
        globalWithApp._firebaseAdminApp = newApp;
        return newApp;
    } catch (fallbackError: any) {
        console.error("Firebase Admin SDK Initialization Error:", fallbackError);
        throw new Error(`CRITICAL: Backend authentication failed. If developing locally, run 'gcloud auth application-default login'. Error: ${fallbackError.message}`);
    }
  }
}
