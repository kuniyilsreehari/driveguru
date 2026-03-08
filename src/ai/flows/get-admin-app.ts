'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

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
    // 1. Always attempt standard environment discovery first
    const newApp = initializeApp();
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;
  } catch (fallbackError: any) {
    try {
        // 2. Fallback to explicit configuration if discovery fails (common in local or Studio environments)
        const newApp = initializeApp({
            projectId: "studio-8621980584-11b8b",
            storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
        });
        globalWithApp._firebaseAdminApp = newApp;
        return newApp;
    } catch (e: any) {
        console.error("Firebase Admin SDK Initialization Error:", e);
        throw new Error(`CRITICAL: Backend authentication failed. Ensure environment is authorized. Error: ${e.message}`);
    }
  }
}
