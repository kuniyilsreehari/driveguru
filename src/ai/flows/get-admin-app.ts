'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * Prioritizes environment discovery to avoid token refreshing errors in Cloud environments.
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
    // Attempt standard initialization first (best for App Hosting/Cloud Run)
    // This allows the SDK to automatically discover service account credentials.
    const newApp = initializeApp();
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;
  } catch (e: any) {
    try {
        // Fallback to explicit config for Studio/Workstation environments
        const newApp = initializeApp({
            projectId: "studio-8621980584-11b8b",
            storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
        });
        globalWithApp._firebaseAdminApp = newApp;
        return newApp;
    } catch (fallbackError: any) {
        console.error("Firebase Admin SDK Initialization Error:", e);
        throw new Error(`CRITICAL: Backend authorization failed. Error: ${e.message}`);
    }
  }
}
