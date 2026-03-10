'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance.
 * Uses a singleton pattern to prevent multiple initializations.
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

  const config = {
    projectId: "studio-8621980584-11b8b",
    storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
  };

  try {
    // Standard initialization (works in App Hosting / Cloud Run)
    const newApp = initializeApp(config);
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;
  } catch (e: any) {
    console.error("Firebase Admin SDK Initialization Error:", e);
    throw new Error(`CRITICAL: Backend authorization failed. ${e.message}`);
  }
}
