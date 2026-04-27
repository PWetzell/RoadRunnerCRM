import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/** Dev-only: count rows in the 4 Gmail-sync tables for quick sanity checks. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }
  const admin = createServiceClient();

  const tables = ['contacts', 'gmail_connections', 'email_messages', 'email_contact_matches'];
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true });
    counts[t] = error ? -1 : (count ?? 0);
  }

  // Also surface the top 5 most-frequent senders in email_messages for insight
  const { data: messages } = await admin
    .from('email_messages')
    .select('from_email')
    .limit(500);
  const senderCounts: Record<string, number> = {};
  (messages ?? []).forEach((m) => {
    if (m.from_email) senderCounts[m.from_email] = (senderCounts[m.from_email] || 0) + 1;
  });
  const topSenders = Object.entries(senderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }));

  return NextResponse.json({ counts, topSenders });
}
