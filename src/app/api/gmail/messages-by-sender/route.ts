import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, getMessage, parseMessage } from '@/lib/gmail/client';

/**
 * GET /api/gmail/messages-by-sender?email=person@x.com&limit=25
 *
 * Returns the signed-in user's recent synced Gmail messages from any thread
 * the given email participates in — sender, recipient, or cc. Powers the
 * **inline message preview** under each suggestion row in the onboarding
 * import wizard, so a user staring at "100s of emails to figure out"
 * (Paul's words, 2026-04-27) can expand a row, see the full back-and-forth
 * with that person, and decide whether they belong in the CRM.
 *
 * Why thread-level (not just from_email):
 *   The earlier filter `from_email = email` only showed messages FROM
 *   the contact. Paul's request on 2026-04-27: "anything that is in a
 *   gmail thread I want to see it" — meaning his own replies, cc'd
 *   messages, and forwards. Mirrors Gmail's contact-card peek and
 *   HubSpot's contact timeline.
 *
 * Implementation:
 *   1. Find every thread_id where the email appears in from_email,
 *      to_emails, or cc_emails — these are "Holly threads."
 *   2. Return every message that belongs to one of those threads,
 *      newest-first, capped at `limit`.
 *   3. Fill in attachment metadata.
 *
 * Attachment fill-in — why we live-fetch from Gmail:
 *   The `email_messages.attachments` JSONB column lands in migration
 *   0007. Until that migration runs, sync's defensive fallback strips
 *   the attachments field before upsert (column doesn't exist), so
 *   every row in DB has zero attachment data. Paul (2026-04-27)
 *   wanted attachments visible NOW without pasting SQL or refreshing
 *   service-role keys.
 *
 *   Workaround: when the DB row reports zero attachments, we fall
 *   back to a live Gmail API fetch (`users.messages.get?format=full`)
 *   per `gmail_message_id`, parse out the attachment parts, and
 *   merge them into the response. Once migration 0007 lands and
 *   sync re-runs, the DB column wins and the live fetch becomes a
 *   no-op (cheap zero-iteration loop). Forward-compatible.
 *
 *   Cost: 25 messages × ~150ms parallel = ~300ms added latency on
 *   accordion open. Acceptable for a one-time-per-expand UX.
 *
 * Response shape:
 *   {
 *     messages: Array<{
 *       id: string;
 *       subject: string | null;
 *       snippet: string | null;
 *       receivedAt: string;
 *       fromEmail: string | null;
 *       fromName: string | null;
 *       attachments: Array<{ filename: string; size?: number; mimeType?: string }>;
 *     }>;
 *   }
 *
 * Auth: same user-session-first / service-role-fallback pattern as
 * /api/gmail/suggestions, so the route works whether the rows were
 * inserted via RLS-aware path or service-role sync.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[gmail/messages-by-sender] service client unavailable:', e);
    return null;
  }
}

interface RawAttachment {
  filename?: unknown;
  size?: unknown;
  mimeType?: unknown;
}

interface MessageRow {
  id: string;
  gmail_message_id: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string;
  thread_id: string | null;
  from_email: string | null;
  from_name: string | null;
  attachments: unknown;
}

interface ShapedAttachment {
  filename: string;
  size?: number;
  mimeType?: string;
}

function shapeAttachments(raw: unknown): ShapedAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ShapedAttachment[] = [];
  for (const a of raw) {
    const o = a as RawAttachment;
    const filename = typeof o.filename === 'string' ? o.filename : '';
    if (!filename) continue;
    const shaped: ShapedAttachment = { filename };
    if (typeof o.size === 'number') shaped.size = o.size;
    if (typeof o.mimeType === 'string') shaped.mimeType = o.mimeType;
    out.push(shaped);
  }
  return out;
}

/**
 * Step 1 — find thread_ids where the email appears in any header field.
 *
 * PostgREST .or() with array-contains (`cs`) handles the to/cc check;
 * `ilike` on from_email is more forgiving than `eq` if a row ever
 * landed un-lowercased (defensive — sync code lowercases, but a manual
 * import path might not).
 */
async function findThreadIds(
  db: SupabaseClient,
  userId: string,
  email: string,
): Promise<string[]> {
  const orFilter = `from_email.ilike.${email},to_emails.cs.{${email}},cc_emails.cs.{${email}}`;
  const r = await db
    .from('email_messages')
    .select('thread_id')
    .eq('user_id', userId)
    .or(orFilter)
    .not('thread_id', 'is', null)
    .limit(500);
  if (r.error) throw r.error;
  const ids = new Set<string>();
  for (const row of r.data ?? []) {
    const t = (row as { thread_id?: string | null }).thread_id;
    if (t) ids.add(t);
  }
  return Array.from(ids);
}

/**
 * Step 2 — fetch every message in those threads.
 *
 * Defensive `attachments`-column fallback (migration 0007 may not have
 * run yet on every dev DB). Same pattern as `buildSuggestions`.
 */
async function fetchThreadMessages(
  db: SupabaseClient,
  userId: string,
  threadIds: string[],
  limit: number,
): Promise<MessageRow[]> {
  if (threadIds.length === 0) return [];
  const baseCols = 'id, gmail_message_id, subject, snippet, received_at, thread_id, from_email, from_name';
  const withAtt = await db
    .from('email_messages')
    .select(`${baseCols}, attachments`)
    .eq('user_id', userId)
    .in('thread_id', threadIds)
    .order('received_at', { ascending: false })
    .limit(limit);
  if (!withAtt.error) return (withAtt.data ?? []) as MessageRow[];

  const msg = withAtt.error.message || '';
  const looksLikeMissingColumn = /attachments/i.test(msg) && /(does not exist|column|undefined)/i.test(msg);
  if (!looksLikeMissingColumn) throw withAtt.error;

  const noAtt = await db
    .from('email_messages')
    .select(baseCols)
    .eq('user_id', userId)
    .in('thread_id', threadIds)
    .order('received_at', { ascending: false })
    .limit(limit);
  if (noAtt.error) throw noAtt.error;
  return (noAtt.data ?? []).map((r) => ({ ...(r as MessageRow), attachments: [] }));
}

/**
 * Run both steps with the chosen client. Returns null on failure so the
 * caller can decide whether to retry under a different auth context.
 */
async function loadConversation(
  db: SupabaseClient,
  userId: string,
  email: string,
  limit: number,
): Promise<MessageRow[] | null> {
  try {
    const threadIds = await findThreadIds(db, userId, email);
    if (threadIds.length === 0) return [];
    return await fetchThreadMessages(db, userId, threadIds, limit);
  } catch (e) {
    console.warn('[gmail/messages-by-sender] query failed:', e);
    return null;
  }
}

/**
 * Cache the refresh-token → access-token swap per request lifetime so we
 * only call Google's token endpoint once per accordion open. Module-level
 * memoization would be wrong (access tokens are short-lived and per-user),
 * so this is intentionally request-scoped.
 */
async function getAccessToken(
  db: SupabaseClient,
  userId: string,
): Promise<string | null> {
  type ConnRow = { provider_refresh_token: string | null };
  const r = await db
    .from('gmail_connections')
    .select('provider_refresh_token')
    .eq('user_id', userId)
    .maybeSingle();
  const row = (r.data ?? null) as ConnRow | null;
  const refresh = row?.provider_refresh_token;
  if (!refresh) return null;
  try {
    return await refreshAccessToken(refresh);
  } catch (e) {
    console.warn('[gmail/messages-by-sender] token refresh failed:', e);
    return null;
  }
}

/**
 * For each row whose stored attachments array is empty, fetch the
 * message live from Gmail and parse out attachment metadata.
 *
 * Done with bounded concurrency (8 parallel) — Gmail tolerates many
 * concurrent messages.get calls per user, but 8 is enough to keep the
 * accordion's perceived latency under ~500ms even for 25 messages
 * while staying well below per-user rate limits.
 */
async function fillMissingAttachments(
  rows: MessageRow[],
  accessToken: string,
): Promise<Map<string, ShapedAttachment[]>> {
  const out = new Map<string, ShapedAttachment[]>();
  const needs = rows.filter((r) => {
    if (!r.gmail_message_id) return false;
    const existing = shapeAttachments(r.attachments);
    return existing.length === 0;
  });
  if (needs.length === 0) return out;

  const CONCURRENCY = 8;
  let i = 0;
  async function worker() {
    while (i < needs.length) {
      const idx = i++;
      const row = needs[idx];
      if (!row.gmail_message_id) continue;
      try {
        const msg = await getMessage(accessToken, row.gmail_message_id);
        const parsed = parseMessage(msg);
        const shaped: ShapedAttachment[] = parsed.attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
        }));
        out.set(row.id, shaped);
      } catch (e) {
        // Per-message failure is non-fatal — render that row with no
        // attachments rather than failing the whole accordion.
        console.warn('[gmail/messages-by-sender] live attachment fetch failed for', row.gmail_message_id, e);
        out.set(row.id, []);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, needs.length) }, worker));
  return out;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 25));
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'email parameter required' }, { status: 400 });
  }

  let rows: MessageRow[] = (await loadConversation(supabase, user.id, email, limit)) ?? [];
  if (rows.length === 0) {
    const admin = trySvc();
    if (admin) {
      const adminRows = await loadConversation(admin, user.id, email, limit);
      if (adminRows && adminRows.length > 0) rows = adminRows;
    }
  }

  // Live-fetch attachments for any row that came back without them.
  // When migration 0007 lands and sync re-runs, the DB column will be
  // populated and `needs` will be empty — this loop becomes a no-op.
  let liveAtt: Map<string, ShapedAttachment[]> = new Map();
  if (rows.length > 0) {
    const allEmpty = rows.every((r) => shapeAttachments(r.attachments).length === 0);
    if (allEmpty) {
      const accessToken = await getAccessToken(supabase, user.id);
      if (accessToken) {
        liveAtt = await fillMissingAttachments(rows, accessToken);
      }
    }
  }

  return NextResponse.json({
    messages: rows.map((r) => {
      const stored = shapeAttachments(r.attachments);
      const attachments = stored.length > 0 ? stored : (liveAtt.get(r.id) ?? []);
      return {
        id: r.id,
        subject: r.subject,
        snippet: r.snippet,
        receivedAt: r.received_at,
        fromEmail: r.from_email,
        fromName: r.from_name,
        attachments,
      };
    }),
  });
}
