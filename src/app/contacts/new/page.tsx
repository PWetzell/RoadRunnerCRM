'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The Add New Contact chooser is now rendered in a right-side slide panel
 * on /contacts. This page just redirects any direct hit (stale bookmark,
 * external link, older tour target) to /contacts?add=1 which auto-opens
 * the panel.
 */
export default function NewContactRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/contacts?add=1');
  }, [router]);
  return null;
}
