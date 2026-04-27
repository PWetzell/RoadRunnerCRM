import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshAccessToken, listMessageIds, getMessage, parseMessage, type ParsedEmail } from '@/lib/gmail/client';

/**
 * Pure sync core, decoupled from request auth. Used by both:
 *
 *   1. POST /api/gmail/sync — the user-clicked "Sync now" path. The
 *      route handler authenticates the session, looks up the user's
 *      gmail_connections row, and calls syncOneUser with that data.
 *
 *   2. GET /api/cron/gmail-sync — the Vercel-scheduled poll. The cron
 *      handler verifies the CRON_SECRET, iterates EVERY row in
 *      gmail_connections, and calls syncOneUser per user.
 *
 * Pulling these steps out of the route handler is what makes scheduled
 * server-side sync work without copy-pasting ~250 lines of message-
 * fetching and contact-matching logic. Industry-CRM peers
 * (HubSpot, Salesforce, Folk, Attio) all separate the per-user sync
 * worker from the trigger source for the same reason.
 *
 * NOTE on auth: this function takes a `client` (a Supabase client
 * pre-authenticated as either the user or service-role) and an
 * optional `admin` fallback. Reads/writes try `client` first; if the
 * user-session client errors (e.g. RLS edge cases), they retry on
 * `admin`. The cron path passes `client = admin = serviceClient` so
 * RLS isn't in the picture at all.
 */

export interface SyncOneOptions {
  /** Hard cap on messages fetched. Default: incremental safety cap (5,000). */
  pageSize?: number;
  /** ISO date — overrides the auto-computed window. Triggers exhaustive pagination. */
  since?: string;
  /** Explicit Gmail search query — overrides the auto-built `(in:inbox OR in:sent) after:…` */
  q?: string;
}

export interface SyncOneResult {
  synced: number;
  matched: number;
  lastSyncAt: string;
}

interface SyncOneArgs {
  client: SupabaseClient;
  admin: SupabaseClient | null;
  userId: string;
  refreshToken: string;
  lastSyncAt: string | null;
  options?: SyncOneOptions;
}

export async function syncOneUser(args: SyncOneArgs): Promise<SyncOneResult> {
  const { client, admin, userId, refreshToken, lastSyncAt, options = {} } = args;
  const { pageSize, since, q } = options;

  // Helper: write first via primary client, fall back to admin on error.
  async function writeWithFallback<T>(
    fn: (c: SupabaseClient) => Promise<{ data: T | null; error: { message: string } | null }>,
  ): Promise<{ data: T | null; error: string | null }> {
    const r = await fn(client);
    if (!r.error) return { data: r.data, error: null };
    if (!admin) return { data: null, error: r.error.message };
    const r2 = await fn(admin);
    if (r2.error) return { data: null, error: `${r.error.message} (fallback also failed: ${r2.error.message})` };
    return { data: r2.data, error: null };
  }

  // Helper: read first via primary, fall back to admin on error.
  async function readWithFallback<T>(
    fn: (c: SupabaseClient) => Promise<{ data: T | null; error: { message: string } | null }>,
  ): Promise<{ data: T | null; error: string | null }> {
    const r = await fn(client);
    if (r.data && !r.error) return { data: r.data, error: null };
    if (!r.error) return { data: null, error: null };
    if (!admin) return { data: null, error: r.error.message };
    const r2 = await fn(admin);
    if (r2.error) return { data: null, error: `${r.error.message} (fallback also failed: ${r2.error.message})` };
    return { data: r2.data, error: null };
  }

  // ─── 1. Fresh access token from Google. ───
  const accessToken = await refreshAccessToken(refreshToken);

  // ─── 2. Build Gmail search query. ───
  // First-run vs incremental window:
  //   • First sync (last_sync_at is null) → pull 365 days. New users
  //     want their actual correspondence history showing up immediately.
  //     HubSpot/Folk/Close/Attio all do a 6–12 month deep pull on first
  //     connect.
  //   • Subsequent syncs → 30-day incremental window. Cron runs on a
  //     5-min cadence so 30 days is wildly more than enough; we keep
  //     the wide window only as a safety net for a user who hasn't
  //     opened the app in weeks.
  // The `since` option still wins over both — explicit caller control
  // beats heuristics.
  const isFirstSync = !lastSyncAt;
  const defaultDays = isFirstSync ? 365 : 30;
  const parts: string[] = [];
  if (q) parts.push(q);
  else {
    const afterDate = since ?? new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    parts.push(`after:${afterDate.replace(/-/g, '/')}`);
    parts.push('(in:inbox OR in:sent)');
  }
  const query = parts.join(' ');

  // ─── 3. Paginate the list call. ───
  // Three modes (preserved from the original POST /api/gmail/sync):
  //   1. Caller passed pageSize       → respect it as a hard cap.
  //   2. Caller passed `since` (deep) → unbounded.
  //   3. No pageSize, no since        → 5,000-message safety cap.
  const PER_PAGE = 500;
  const INCREMENTAL_CAP = 5000;
  const explicitSinglePage = typeof pageSize === 'number' && pageSize > 0 && pageSize < PER_PAGE;
  const effectivePageSize = explicitSinglePage ? pageSize : PER_PAGE;
  const maxMessages =
    typeof pageSize === 'number' && pageSize > 0
      ? pageSize
      : since
        ? Number.POSITIVE_INFINITY
        : INCREMENTAL_CAP;

  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const r = await listMessageIds(accessToken, {
      q: query,
      maxResults: effectivePageSize,
      pageToken,
    });
    ids.push(...r.ids);
    pageToken = r.nextPageToken;
    pages += 1;
    if (ids.length >= maxMessages) break;
    // Defensive ceiling: 100 pages × 500 = 50,000 IDs. Stops a buggy
    // Gmail response that always returns the same token from infinite-
    // looping us.
    if (pages >= 100) break;
  } while (pageToken);
  const idsCapped = Number.isFinite(maxMessages) ? ids.slice(0, maxMessages) : ids;

  // ─── 4. Batch the message-detail fetches. ───
  // 25 concurrent /messages/get calls per batch — empirically Gmail
  // handles 25-50 without rate-limiting; 25 keeps us safely under
  // the 250 req/sec per-user quota even when other tabs / cron
  // jobs are also calling.
  const BATCH = 25;
  const messages: ParsedEmail[] = [];
  for (let i = 0; i < idsCapped.length; i += BATCH) {
    const chunk = idsCapped.slice(i, i + BATCH);
    const batch = await Promise.all(chunk.map(async (id) => {
      try { return parseMessage(await getMessage(accessToken, id)); } catch { return null; }
    }));
    for (const m of batch) if (m) messages.push(m);
  }

  // Empty result short-circuit. Still stamp last_sync_at so we don't
  // re-process the same window forever.
  if (messages.length === 0) {
    const stampedAt = new Date().toISOString();
    await writeWithFallback((c) =>
      c.from('gmail_connections').update({ last_sync_at: stampedAt }).eq('user_id', userId) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
    );
    return { synced: 0, matched: 0, lastSyncAt: stampedAt };
  }

  // ─── 5. Upsert messages into email_messages. ───
  const rows = messages.map((m) => ({
    user_id: userId,
    gmail_message_id: m.gmailId,
    thread_id: m.threadId,
    from_email: m.from,
    from_name: m.fromName ?? null,
    to_emails: m.to,
    cc_emails: m.cc,
    subject: m.subject,
    body_text: m.bodyText,
    body_html: m.bodyHtml,
    snippet: m.snippet,
    label_ids: m.labelIds,
    received_at: m.receivedAt,
    attachments: m.attachments,
  }));

  type InsertedRow = { id: string; from_email: string | null; to_emails: string[] | null; cc_emails: string[] | null };

  async function upsertOnce(c: SupabaseClient, payload: typeof rows): Promise<{ data: InsertedRow[] | null; error: { message: string } | null }> {
    const r = await c
      .from('email_messages')
      .upsert(payload, { onConflict: 'user_id,gmail_message_id' })
      .select('id, from_email, to_emails, cc_emails');
    // If `attachments` column missing (migration 0007 not applied),
    // retry without it.
    if (r.error && /\battachments\b/i.test(r.error.message || '')) {
      const fallback = payload.map(({ attachments: _a, ...rest }) => rest);
      const r2 = await c
        .from('email_messages')
        .upsert(fallback, { onConflict: 'user_id,gmail_message_id' })
        .select('id, from_email, to_emails, cc_emails');
      return r2 as unknown as { data: InsertedRow[] | null; error: { message: string } | null };
    }
    return r as unknown as { data: InsertedRow[] | null; error: { message: string } | null };
  }

  const insertResult = await writeWithFallback<InsertedRow[]>((c) => upsertOnce(c, rows));
  if (insertResult.error) {
    throw new Error(`email_messages_upsert_failed: ${insertResult.error}`);
  }
  const inserted = insertResult.data ?? [];

  // ─── 6. Match new messages to existing contacts. ───
  const allEmails = new Set<string>();
  inserted.forEach((m) => {
    if (m.from_email) allEmails.add(m.from_email.toLowerCase());
    (m.to_emails || []).forEach((e) => allEmails.add(e.toLowerCase()));
    (m.cc_emails || []).forEach((e) => allEmails.add(e.toLowerCase()));
  });

  let matchedCount = 0;
  if (allEmails.size > 0) {
    type ContactRow = { id: string; email: string };
    const contactsRes = await readWithFallback<ContactRow[]>((c) =>
      c
        .from('contacts')
        .select('id, email')
        .eq('user_id', userId)
        .in('email', Array.from(allEmails)) as unknown as Promise<{ data: ContactRow[] | null; error: { message: string } | null }>,
    );
    const contacts = contactsRes.data ?? [];

    if (contacts.length > 0) {
      const contactByEmail = new Map(contacts.map((c) => [c.email.toLowerCase(), c.id]));
      const matches: Array<{ message_id: string; contact_id: string; match_type: string }> = [];
      inserted.forEach((m) => {
        const checkAndAdd = (email: string, type: string) => {
          const cid = contactByEmail.get(email.toLowerCase());
          if (cid) matches.push({ message_id: m.id, contact_id: cid, match_type: type });
        };
        if (m.from_email) checkAndAdd(m.from_email, 'from');
        (m.to_emails || []).forEach((e) => checkAndAdd(e, 'to'));
        (m.cc_emails || []).forEach((e) => checkAndAdd(e, 'cc'));
      });
      if (matches.length > 0) {
        await writeWithFallback((c) =>
          c.from('email_contact_matches').upsert(matches, { onConflict: 'message_id,contact_id,match_type' }) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
        );
        matchedCount = matches.length;
      }
    }
  }

  // ─── 7. Stamp last_sync_at. ───
  const stampedAt = new Date().toISOString();
  await writeWithFallback((c) =>
    c.from('gmail_connections').update({ last_sync_at: stampedAt }).eq('user_id', userId) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
  );

  return {
    synced: inserted.length,
    matched: matchedCount,
    lastSyncAt: stampedAt,
  };
}
