'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance.
 * Uses a singleton pattern to prevent multiple initializations.
 * Explicitly handles configuration for the Studio/App Hosting environments.
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

  // Explicit configuration for the Studio environment
  const config = {
    projectId: "studio-8621980584-11b8b",
    storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
  };

  try {
    // In local development or Studio with ADC, initializeApp() without args often works
    // but providing explicit config is more reliable for token refreshes.
    const newApp = initializeApp(config);
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;
  } catch (e: any) {
    // Fallback if the default initialization fails (e.g. app already exists)
    const apps = getApps();
    if (apps.length > 0) {
        globalWithApp._firebaseAdminApp = apps[0];
        return apps[0];
    }
    console.error("Firebase Admin SDK Initialization Error:", e);
    throw new Error(`CRITICAL: Backend authorization failed. ${e.message}`);
  }
}
