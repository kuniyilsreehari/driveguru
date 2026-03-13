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
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [setInstallPrompt]);

  return null;
}
