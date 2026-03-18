'use client';

import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { installPromptAtom } from '@/lib/store';

/**
 * Listens for the browser's PWA install prompt event.
 */
export function PwaPromptListener() {
  const [, setInstallPrompt] = useAtom(installPromptAtom);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile automatically
      e.preventDefault();
      // Stash the event so it can be triggered by our "INSTALL APP" button
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register Service Worker for PWA compliance
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('PWA ServiceWorker registration issue: ', err);
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [setInstallPrompt]);

  return null;
}
