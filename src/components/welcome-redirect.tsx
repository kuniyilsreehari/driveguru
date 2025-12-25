
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * A client-only component that checks if a user has visited the welcome
 * page before. If not, it redirects them and sets a flag in localStorage.
 */
export function WelcomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // This code runs only on the client, after hydration.
    const hasVisited = localStorage.getItem('hasVisitedWelcome');
    if (!hasVisited) {
      localStorage.setItem('hasVisitedWelcome', 'true');
      router.push('/welcome');
    }
  }, [router]);

  // This component renders nothing.
  return null;
}
