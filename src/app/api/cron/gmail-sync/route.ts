import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { syncOneUser } from '@/lib/gmail/sync-core';

/**
 * GET /api/cron/gmail-sync
 *
 * Vercel-scheduled poll that pulls new mail for EVERY user with a
 * connected Gmail account. Replaces the manual-only "Sync now" model
 * with the always-on freshness Paul asked for on 2026-04-27 — the
 * EmailsPanel + ActivityLog already pick up the new messages
 * reactively because both subscribe to `gmail_connections.last_sync_at`
 * via the gmail-status-store, so this cron handler doesn't need to
 * push anything client-side.
 *
 * Cadence is set in vercel.json: every hour on the hour (`0 * * * *`).
 * Hourly is what Close uses on its base plan, and it's what Vercel's
 * Hobby tier allows for free — Pro is required for any sub-daily
 * cadence finer than this. We can drop to 5 minutes (Folk/Attio
 * cadence) by upgrading the Vercel plan and changing the schedule
 * string; nothing else in this file needs to change.
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` on every
 * scheduled invocation. We reject anything without that header so the
 * endpoint can't be DOS'd publicly. The secret is set in Vercel env
 * vars — without it, any anonymous caller could trigger a sync of
 * every user's mailbox.
 *
 * Failure semantics: each user's sync is wrapped in try/catch so a
 * single user's expired token / quota error / network blip doesn't
 * abort the whole batch. We aggregate per-user results into the
 * response body so the Vercel cron logs surface which users
 * succeeded vs failed, with reasons.
 *
 * Freshness guard: users whose `last_sync_at` is within the last 4
 * minutes are skipped. Two reasons —
 *   1. Saves Gmail API quota (250 req/sec/user) and Supabase row
 *      writes when the user just hit "Sync now" manually.
 *   2. If a previous cron run hung past its 5-min slot (long upstream
 *      Gmail latency), the next slot's run won't double-process the
 *      same window.
 * Window deliberately a touch under the 5-min cadence so users who
 * sync on the dot of every cron tick still get processed.
 */

const FRESHNESS_GUARD_MS = 4 * 60 * 1000;

export async function GET(request: Request) {
  // ─── 1. Verify the cron secret. ───
  // Vercel automatically passes this header on scheduled invocations
  // when the CRON_SECRET env var is set. Any other caller is rejected
  // with 401. This is the standard Vercel Cron auth pattern.
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ─── 2. Service-role client: cron runs with no user session. ───
  // We need to read every row in gmail_connections regardless of
  // whose row it is, so service-role is the only viable client here.
  // RLS would scope a user-session client to a single user, defeating
  // the point of a poll-everyone job.
  let admin;
  try {
    admin = createServiceClient();
  } catch (e) {
    console.error('[cron/gmail-sync] service client unavailable:', e);
    return NextResponse.json({ error: 'service_client_unavailable' }, { status: 500 });
  }

  // ─── 3. Pull every connection that has a refresh token. ───
  type ConnRow = {
    user_id: string;
    provider_refresh_token: string | null;
    last_sync_at: string | null;
  };
  const conns = await admin
    .from('gmail_connections')
    .select('user_id, provider_refresh_token, last_sync_at')
    .not('provider_refresh_token', 'is', null);

  if (conns.error) {
    console.error('[cron/gmail-sync] connection list failed:', conns.error.message);
    return NextResponse.json({ error: conns.error.message }, { status: 500 });
  }

  const rows = (conns.data as ConnRow[] | null) ?? [];

  // ─── 4. Sync each user. ───
  const startedAt = Date.now();
  const results: Array<{
    userId: string;
    status: 'synced' | 'skipped' | 'error';
    synced?: number;
    matched?: number;
    reason?: string;
  }> = [];

  for (const conn of rows) {
    if (!conn.provider_refresh_token) {
      results.push({ userId: conn.user_id, status: 'skipped', reason: 'no_refresh_token' });
      continue;
    }

    // Freshness guard — skip users whose last_sync_at is fresher than
    // FRESHNESS_GUARD_MS so we don't burn quota on accounts the user
    // just synced manually (or that a previous overrunning cron tick
    // already handled).
    if (conn.last_sync_at) {
      const lastMs = new Date(conn.last_sync_at).getTime();
      if (!Number.isNaN(lastMs) && Date.now() - lastMs < FRESHNESS_GUARD_MS) {
        results.push({ userId: conn.user_id, status: 'skipped', reason: 'recently_synced' });
        continue;
      }
    }

    try {
      const r = await syncOneUser({
        client: admin,
        admin,
        userId: conn.user_id,
        refreshToken: conn.provider_refresh_token,
        lastSyncAt: conn.last_sync_at,
      });
      results.push({
        userId: conn.user_id,
        status: 'synced',
        synced: r.synced,
        matched: r.matched,
      });
    } catch (e) {
      // Don't abort the batch on a single user's failure. Most common
      // causes: refresh-token revoked (user disconnected from Google
      // settings), Gmail quota burst (429), transient network. The
      // next cron tick will retry naturally.
      const reason = e instanceof Error ? e.message : String(e);
      console.warn(`[cron/gmail-sync] user ${conn.user_id} sync failed:`, reason);
      results.push({ userId: conn.user_id, status: 'error', reason });
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const synced = results.filter((r) => r.status === 'synced').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errored = results.filter((r) => r.status === 'error').length;

  console.log(
    `[cron/gmail-sync] users=${rows.length} synced=${synced} skipped=${skipped} errored=${errored} elapsed=${elapsedMs}ms`,
  );

  return NextResponse.json({
    users: rows.length,
    synced,
    skipped,
    errored,
    elapsedMs,
    results,
  });
}
