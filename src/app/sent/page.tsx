import { redirect } from 'next/navigation';

/**
 * Legacy redirect — the page formerly known as /sent moved to /bulk
 * as part of the "Manage Emails" nav restructure. Kept here so any
 * bookmarks or in-app links to /sent still resolve.
 */
export default function SentRedirect() {
  redirect('/bulk');
}
