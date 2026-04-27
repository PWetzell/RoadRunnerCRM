import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/** GET — returns the signed-in user's Gmail connection status + last sync time. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, reason: 'unauthenticated' });

  // Read via user session first (RLS-protected). Fall back to service role if
  // RLS blocks the select (e.g., table has no user-read policy).
  let conn: { email: string | null; last_sync_at: string | null; connected_at: string | null; sync_enabled: boolean | null } | null = null;
  const { data: userRead, error: userReadErr } = await supabase
    .from('gmail_connections')
    .select('email, last_sync_at, connected_at, sync_enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  if (userReadErr || !userRead) {
    try {
      const admin = createServiceClient();
      const { data: adminRead } = await admin
        .from('gmail_connections')
        .select('email, last_sync_at, connected_at, sync_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      conn = adminRead;
    } catch {
      conn = userRead ?? null;
    }
  } else {
    conn = userRead;
  }

  if (!conn) return NextResponse.json({ connected: false, reason: 'no_connection' });

  let messageCount = 0;
  const { count: userCount } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (typeof userCount === 'number') {
    messageCount = userCount;
  } else {
    try {
      const admin = createServiceClient();
      const { count: adminCount } = await admin
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      messageCount = adminCount ?? 0;
    } catch {
      messageCount = 0;
    }
  }

  return NextResponse.json({
    connected: true,
    email: conn.email ?? user.email,
    lastSyncAt: conn.last_sync_at,
    connectedAt: conn.connected_at,
    syncEnabled: conn.sync_enabled,
    messageCount,
  });
}
