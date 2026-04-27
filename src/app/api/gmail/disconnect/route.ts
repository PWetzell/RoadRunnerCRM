import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/gmail/disconnect
 *
 * The "Disconnect Gmail" action from Settings. Two intents:
 *
 *   { purge: false }  — default. Revoke Google's tokens and forget the
 *                       refresh token, but KEEP the synced messages and
 *                       contact match rows so the timeline / activity
 *                       history isn't suddenly empty. Reconnecting later
 *                       just resumes sync.
 *
 *   { purge: true }   — "Forget my email history." Same as above + delete
 *                       every `email_messages` and `email_contact_matches`
 *                       row owned by this user. Used when the user wants
 *                       to scrub the data, not just stop syncing.
 *
 * We DON'T touch `contacts` here — that's the separate "Remove imported
 * contacts" action. Contacts outlive any one Gmail connection.
 *
 * Implementation note: every read/write tries the **user-session client
 * first** (auth'd via the request cookie, governed by RLS) and only falls
 * back to the service-role client if RLS blocks the operation. Same pattern
 * as /api/gmail/status — keeps the route working even when
 * `SUPABASE_SERVICE_ROLE_KEY` is missing/misconfigured in dev, since the
 * RLS policy on these tables (`auth.uid() = user_id`) already permits the
 * owning user to do everything we need.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { purge }: { purge?: boolean } = await request.json().catch(() => ({}));

  // ── 1. Look up tokens (for Google revoke). ──
  type ConnRow = { provider_refresh_token: string | null; provider_access_token: string | null };
  let conn: ConnRow | null = null;
  {
    const r = await supabase
      .from('gmail_connections')
      .select('provider_refresh_token, provider_access_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (r.data) {
      conn = r.data as unknown as ConnRow;
    } else {
      const admin = trySvc();
      if (admin) {
        const r2 = await admin
          .from('gmail_connections')
          .select('provider_refresh_token, provider_access_token')
          .eq('user_id', user.id)
          .maybeSingle();
        conn = (r2.data as unknown as ConnRow) ?? null;
      }
    }
  }

  // ── 2. Best-effort revoke at Google. ──
  const tokenToRevoke = conn?.provider_refresh_token ?? conn?.provider_access_token ?? null;
  let revoked = false;
  if (tokenToRevoke) {
    try {
      const r = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      revoked = r.ok || r.status === 400; // 400 = already revoked, also fine
      if (!revoked) {
        console.warn('[gmail/disconnect] Google revoke returned', r.status, await r.text().catch(() => ''));
      }
    } catch (e) {
      console.warn('[gmail/disconnect] Google revoke threw:', e);
    }
  }

  // ── 3. Delete the gmail_connections row. ──
  let connDeleteErr: string | null = null;
  {
    const r = await supabase.from('gmail_connections').delete().eq('user_id', user.id);
    if (r.error) {
      console.warn('[gmail/disconnect] user-session delete failed, trying service role:', r.error.message);
      const admin = trySvc();
      if (!admin) {
        connDeleteErr = r.error.message;
      } else {
        const r2 = await admin.from('gmail_connections').delete().eq('user_id', user.id);
        if (r2.error) {
          connDeleteErr = `${r.error.message} (fallback also failed: ${r2.error.message})`;
        }
      }
    }
  }
  if (connDeleteErr) {
    console.error('[gmail/disconnect] gmail_connections delete failed:', connDeleteErr);
    return NextResponse.json({ error: `Could not disconnect: ${connDeleteErr}` }, { status: 500 });
  }

  // ── 4. Optional purge of synced messages. ──
  let purgedMessages = 0;
  if (purge) {
    let beforeCount = 0;
    {
      const r = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (typeof r.count === 'number') {
        beforeCount = r.count;
      } else {
        const admin = trySvc();
        if (admin) {
          const r2 = await admin
            .from('email_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          beforeCount = r2.count ?? 0;
        }
      }
    }

    if (beforeCount > 0) {
      let msgDeleteErr: string | null = null;
      const r = await supabase.from('email_messages').delete().eq('user_id', user.id);
      if (r.error) {
        const admin = trySvc();
        if (!admin) {
          msgDeleteErr = r.error.message;
        } else {
          const r2 = await admin.from('email_messages').delete().eq('user_id', user.id);
          if (r2.error) {
            msgDeleteErr = `${r.error.message} (fallback also failed: ${r2.error.message})`;
          }
        }
      }
      if (msgDeleteErr) {
        console.error('[gmail/disconnect] purge email_messages failed:', msgDeleteErr);
        return NextResponse.json(
          { error: `Disconnected, but purge failed: ${msgDeleteErr}` },
          { status: 500 },
        );
      }
      purgedMessages = beforeCount;
    }
  }

  return NextResponse.json({
    ok: true,
    revoked,
    purged: !!purge,
    purgedMessages,
  });
}

/**
 * Lazy service-role client. Returns null when env is missing/broken so the
 * route can fall through to the user-session path instead of crashing.
 */
function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[gmail/disconnect] service client unavailable:', e);
    return null;
  }
}
