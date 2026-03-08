'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance using a robust singleton pattern.
 * Prioritizes explicit configuration to avoid metadata refreshing errors in Cloud environments.
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
    // In Studio/Workstation environments, explicit config is often required
    // to prevent the "Could not refresh access token" 500 error.
    const newApp = initializeApp({
        projectId: "studio-8621980584-11b8b",
        storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
    });
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;
  } catch (e: any) {
    try {
        // Fallback to environment discovery
        const newApp = initializeApp();
        globalWithApp._firebaseAdminApp = newApp;
        return newApp;
    } catch (fallbackError: any) {
        console.error("Firebase Admin SDK Initialization Error:", e);
        throw new Error(`CRITICAL: Backend authentication failed. Error: ${e.message}`);
    }
  }
}
