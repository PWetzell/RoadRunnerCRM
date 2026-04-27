import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { syncOneUser } from '@/lib/gmail/sync-core';

/**
 * POST /api/gmail/sync
 *
 * User-triggered sync (the "Sync now" button in the banner, the import
 * wizard's deep pull). Authenticates the session, looks up the
 * caller's gmail_connections row, then delegates the actual sync work
 * to the shared `syncOneUser` core.
 *
 * The same `syncOneUser` is also called by GET /api/cron/gmail-sync
 * which iterates EVERY user's connection on the Vercel cron schedule
 * — that's how we get automatic sync without users having to click
 * the button. Keeping the per-user worker in `lib/gmail/sync-core.ts`
 * avoids duplicating ~250 lines of message-fetching and contact-
 * matching logic across the two trigger sources.
 *
 * Body: { pageSize?: number; since?: string ISO; q?: string }
 * Auth: Supabase session cookie.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[gmail/sync] service client unavailable:', e);
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { pageSize, since, q }: { pageSize?: number; since?: string; q?: string } =
    await request.json().catch(() => ({}));

  // Look up the refresh token. We try the user-session client first
  // (RLS path) and fall back to service-role only if that errors —
  // same defensive pattern used everywhere else in this codebase
  // for projects where SUPABASE_SERVICE_ROLE_KEY is missing or
  // rejected.
  type ConnRow = { provider_refresh_token: string | null; last_sync_at: string | null };
  const admin = trySvc();
  let conn: ConnRow | null = null;
  let lastError: string | null = null;
  {
    const r = await supabase
      .from('gmail_connections')
      .select('provider_refresh_token, last_sync_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!r.error) {
      conn = (r.data as ConnRow | null) ?? null;
    } else {
      lastError = r.error.message;
      if (admin) {
        const r2 = await admin
          .from('gmail_connections')
          .select('provider_refresh_token, last_sync_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!r2.error) {
          conn = (r2.data as ConnRow | null) ?? null;
          lastError = null;
        } else {
          lastError = `${lastError} (fallback also failed: ${r2.error.message})`;
        }
      }
    }
  }
  if (lastError) {
    console.error('[gmail/sync] connection lookup failed:', lastError);
    return NextResponse.json({ error: `connection_lookup_failed: ${lastError}` }, { status: 500 });
  }
  if (!conn?.provider_refresh_token) {
    return NextResponse.json({ error: 'no_gmail_connection' }, { status: 400 });
  }

  try {
    const result = await syncOneUser({
      client: supabase,
      admin,
      userId: user.id,
      refreshToken: conn.provider_refresh_token,
      lastSyncAt: conn.last_sync_at,
      options: { pageSize, since, q },
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[gmail/sync] sync failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
