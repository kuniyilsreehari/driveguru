'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

const globalWithApp = global as typeof globalThis & {
  _firebaseAdminApp?: App;
};

/**
 * Initializes and returns a Firebase Admin App instance.
 * Optimized for Studio environment to prevent token refresh errors.
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

  // Use explicit configuration to stabilize authorization in the Studio environment
  const config = {
    projectId: "studio-8621980584-11b8b",
    storageBucket: "studio-8621980584-11b8b.firebasestorage.app",
  };

  try {
    const newApp = initializeApp(config);
    globalWithApp._firebaseAdminApp = newApp;
    return newApp;
  } catch (e: any) {
    // Re-check apps in case of race conditions
    const apps = getApps();
    if (apps.length > 0) {
        globalWithApp._firebaseAdminApp = apps[0];
        return apps[0];
    }
    console.error("Firebase Admin SDK Initialization Error:", e);
    throw new Error(`CRITICAL: Backend authorization failed. ${e.message}`);
  }
}
