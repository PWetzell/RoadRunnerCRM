import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, getMessage, parseMessage } from '@/lib/gmail/client';

/**
 * GET — returns every email linked to a specific contact.
 *
 * An email belongs to a contact if ANY of these are true:
 *   1. email_messages.context_contact_id = :id  (origin-tag: the composer
 *      was opened from this contact's card — industry-standard association
 *      per HubSpot/Salesforce/Pipedrive).
 *   2. The contact id is a real Supabase UUID and appears in
 *      email_contact_matches (the recipient-address → contact join path).
 *   3. `?email=` is supplied and appears in from_email / to_emails /
 *      cc_emails (recipient-address fallback for demo contacts whose IDs
 *      don't correspond to any Supabase row).
 *
 * Predicate (1) is the reason "send from Aisha's card → see it on Aisha's
 * card" works even when you type a different email in the To field.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EmailAttachmentRow {
  filename?: string;
  mimeType?: string;
  size?: number;
  documentId?: string;
  gmailAttachmentId?: string;
}

interface EmailMessageRow {
  id: string;
  gmail_message_id: string;
  thread_id: string;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[] | null;
  cc_emails?: string[] | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string;
  open_count?: number | null;
  last_opened_at?: string | null;
  click_count?: number | null;
  last_clicked_at?: string | null;
  label_ids?: string[] | null;
  context_contact_id?: string | null;
  archived_at?: string | null;
  pinned_at?: string | null;
  tags?: string[] | null;
  attachments?: EmailAttachmentRow[] | null;
}

/**
 * Live-fetch attachment metadata from Gmail when the DB column hasn't
 * been populated yet (migration 0007 not applied / sync hasn't re-run).
 *
 * Same workaround as `/api/gmail/messages-by-sender`: read the user's
 * refresh token, swap for an access token, hit `users.messages.get` per
 * message_id with bounded concurrency, parse attachment parts. Forward-
 * compatible — once the DB column is populated, the trigger condition
 * (every row has zero attachments) becomes false and this becomes a
 * no-op.
 *
 * Why duplicated across two routes: each route returns a different DTO
 * shape and has its own error-recovery ladder, so a shared helper would
 * need a generic adapter that's longer than the duplicated code. The
 * Gmail call itself is identical (~10 lines).
 */
async function getRefreshAccessToken(
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
    console.warn('[contacts/emails] token refresh failed:', e);
    return null;
  }
}

interface LiveAttachment {
  filename: string;
  mimeType: string;
  size: number;
  gmailAttachmentId?: string;
}

async function fillMissingAttachments(
  rows: Array<{ id: string; gmail_message_id: string | null; attachments?: unknown }>,
  accessToken: string,
): Promise<Map<string, LiveAttachment[]>> {
  const out = new Map<string, LiveAttachment[]>();
  const needs = rows.filter((r) => {
    if (!r.gmail_message_id) return false;
    const existing = Array.isArray(r.attachments) ? r.attachments : [];
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
        out.set(
          row.id,
          parsed.attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            gmailAttachmentId: a.gmailAttachmentId,
          })),
        );
      } catch (e) {
        console.warn('[contacts/emails] live attachment fetch failed for', row.gmail_message_id, e);
        out.set(row.id, []);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, needs.length) }, worker));
  return out;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const emailParam = searchParams.get('email')?.trim().toLowerCase() || null;
  const includeArchived = searchParams.get('includeArchived') === '1';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ emails: [], reason: 'unauthenticated' });

  // Prefer service role; fall back to user session (RLS) if the key is rejected.
  let db = supabase;
  try {
    const admin = createServiceClient();
    const probe = await admin.from('email_messages').select('id').eq('user_id', user.id).limit(1);
    if (!probe.error) db = admin;
  } catch {
    /* keep user session */
  }

  const isUuid = UUID_RE.test(id);
  const baseCols = 'id, gmail_message_id, thread_id, from_email, from_name, to_emails, cc_emails, subject, snippet, body_text, received_at, open_count, last_opened_at, click_count, last_clicked_at, label_ids';
  // migration 0007 adds `attachments`. If it hasn't been applied yet, the
  // querySafely fallback below drops it before trying the older column set.
  const selectColsFullWithAtt = `${baseCols}, context_contact_id, archived_at, pinned_at, tags, attachments`;
  const selectColsFull = `${baseCols}, context_contact_id, archived_at, pinned_at, tags`;
  const selectCols = `${baseCols}, context_contact_id, archived_at`;
  const selectColsNoArchive = `${baseCols}, context_contact_id`;
  const selectColsBare = baseCols;

  // Build the OR filter. Origin-tag is always first.
  const orParts: string[] = [`context_contact_id.eq.${id}`];
  if (emailParam) {
    orParts.push(
      `from_email.eq.${emailParam}`,
      `to_emails.cs.{${emailParam}}`,
      `cc_emails.cs.{${emailParam}}`,
    );
  }

  async function runQuery(cols: string, withPin = false) {
    const base = db
      .from('email_messages')
      .select(cols)
      .eq('user_id', user!.id)
      .or(orParts.join(','));
    const ordered = withPin
      ? base.order('pinned_at', { ascending: false, nullsFirst: false })
      : base;
    return ordered.order('received_at', { ascending: false }).limit(200);
  }

  // Try with every optional column; degrade one at a time if a column is missing.
  // context_contact_id needs migration 0003, archived_at 0004, pinned_at 0005,
  // tags 0006, attachments 0007.
  async function querySafely(): Promise<{ data: unknown[] | null; error: { message?: string } | null }> {
    const withAtt = await runQuery(selectColsFullWithAtt, true);
    if (!withAtt.error) return { data: withAtt.data as unknown[] | null, error: null };
    const attMsg = withAtt.error.message || '';
    // Drop attachments and retry.
    const zero = /\battachments\b/i.test(attMsg)
      ? await runQuery(selectColsFull, true)
      : withAtt;
    if (!zero.error) return { data: zero.data as unknown[] | null, error: null };
    const zeroMsg = zero.error.message || '';
    // If tags or pinned_at column is missing, drop to the 0004-era cols (which
    // don't reference either). Further fallbacks live below.
    const first = /\btags\b/i.test(zeroMsg) || /pinned_at/i.test(zeroMsg)
      ? await runQuery(selectCols)
      : zero;
    if (!first.error) return { data: first.data as unknown[] | null, error: null };
    const msg = first.error.message || '';
    if (/archived_at/i.test(msg)) {
      const second = await db
        .from('email_messages')
        .select(selectColsNoArchive)
        .eq('user_id', user!.id)
        .or(orParts.join(','))
        .order('received_at', { ascending: false })
        .limit(200);
      if (!second.error) return { data: second.data as unknown[] | null, error: null };
      if (/context_contact_id/i.test(second.error.message || '')) {
        const third = await db
          .from('email_messages')
          .select(selectColsBare)
          .eq('user_id', user!.id)
          .or(orParts.filter((p) => !p.startsWith('context_contact_id')).join(',') || 'id.is.null')
          .order('received_at', { ascending: false })
          .limit(200);
        return { data: third.data as unknown[] | null, error: third.error };
      }
      return { data: null, error: second.error };
    }
    if (/context_contact_id/i.test(msg)) {
      const retry = await db
        .from('email_messages')
        .select(selectColsBare)
        .eq('user_id', user!.id)
        .or(orParts.filter((p) => !p.startsWith('context_contact_id')).join(',') || 'id.is.null')
        .order('received_at', { ascending: false })
        .limit(200);
      return { data: retry.data as unknown[] | null, error: retry.error };
    }
    return { data: null, error: first.error };
  }

  const queryResult = await querySafely();
  const initialRows = Array.isArray(queryResult.data) ? queryResult.data : [];
  const msgs: unknown[] = [...initialRows];
  const msgsErr = queryResult.error;

  // Back-compat: also consult email_contact_matches for real-UUID contacts.
  if (isUuid) {
    const { data: joined } = await db
      .from('email_contact_matches')
      .select(`match_type, email_messages!inner(${selectColsBare}, user_id)`)
      .eq('contact_id', id)
      .eq('email_messages.user_id', user.id);
    if (Array.isArray(joined)) {
      const existingIds = new Set(msgs.map((m) => (m as EmailMessageRow).id));
      for (const j of joined) {
        const row = (j as unknown as { email_messages: EmailMessageRow | null }).email_messages;
        if (row && !existingIds.has(row.id)) {
          msgs.push(row);
          existingIds.add(row.id);
        }
      }
    }
  }

  const rows = msgs as EmailMessageRow[];
  const filtered = includeArchived ? rows : rows.filter((r) => !r.archived_at);

  // Live-fetch attachments from Gmail when the DB column is empty for
  // every row (migration 0007 not applied / sync hasn't re-run with the
  // column present). Same workaround as `/api/gmail/messages-by-sender`.
  // Once the column is populated this path is skipped automatically.
  let liveAtt: Map<string, LiveAttachment[]> = new Map();
  if (filtered.length > 0) {
    const allEmpty = filtered.every((r) => {
      const a = Array.isArray(r.attachments) ? r.attachments : [];
      return a.length === 0;
    });
    if (allEmpty) {
      const accessToken = await getRefreshAccessToken(db, user.id);
      if (accessToken) {
        liveAtt = await fillMissingAttachments(
          filtered.map((r) => ({
            id: r.id,
            gmail_message_id: r.gmail_message_id,
            attachments: r.attachments,
          })),
          accessToken,
        );
      }
    }
  }

  const emails = filtered
    .map((row) => {
      const sent = Array.isArray(row.label_ids) && row.label_ids.includes('SENT');
      let direction: 'from' | 'to' | 'cc' | 'bcc';
      if (sent) {
        direction = emailParam && row.cc_emails?.includes(emailParam) ? 'cc' : 'to';
      } else {
        direction = 'from';
      }
      const dto = toEmailDto(row, direction);
      // If the DB had nothing but Gmail did, splice in the live results.
      if (dto.attachments.length === 0) {
        const live = liveAtt.get(row.id);
        if (live && live.length > 0) {
          dto.attachments = live.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            documentId: undefined,
            gmailAttachmentId: a.gmailAttachmentId,
          }));
        }
      }
      return dto;
    })
    .sort((a, b) => {
      // Pinned first (most recently pinned on top), then chrono desc.
      const aP = a.pinnedAt ? Date.parse(a.pinnedAt) : 0;
      const bP = b.pinnedAt ? Date.parse(b.pinnedAt) : 0;
      if (aP !== bP) return bP - aP;
      return a.receivedAt < b.receivedAt ? 1 : -1;
    });

  if (msgsErr) console.error('[contacts/emails] query error', msgsErr.message);

  return NextResponse.json({ emails });
}

function toEmailDto(msg: EmailMessageRow, direction: 'from' | 'to' | 'cc' | 'bcc') {
  // Attachments come out of PostgREST as JSON (already parsed) — coerce to
  // array defensively in case the column wasn't present (older schema).
  const atts = Array.isArray(msg.attachments)
    ? msg.attachments
        .filter((a): a is EmailAttachmentRow => !!a && typeof a === 'object')
        .map((a) => ({
          filename: String(a.filename || ''),
          mimeType: String(a.mimeType || 'application/octet-stream'),
          size: Number(a.size ?? 0),
          documentId: a.documentId || undefined,
          gmailAttachmentId: a.gmailAttachmentId || undefined,
        }))
        .filter((a) => a.filename)
    : [];
  // Derive read state from Gmail's UNREAD label.
  //
  // Bug Paul caught on 2026-04-27: every incoming email rendered with the
  // "Unread" pill + bold typography even though he'd already read them in
  // Gmail. Root cause: this DTO never set `readAt`, so the panel saw
  // `undefined` → treated as null → unread for every row.
  //
  // Gmail's `UNREAD` label is the source of truth: when a user opens a
  // message in Gmail, the label is removed. We pull `label_ids` already,
  // so it's a free derivation. Sent messages are always "read" by the
  // sender — the panel itself short-circuits on direction !== 'from',
  // but we still emit a sensible value here for completeness.
  //
  // We use `received_at` as the readAt timestamp because we don't have a
  // real "when did they read it in Gmail" datapoint — Gmail doesn't
  // expose that. The only consumer of this field treats anything non-null
  // as "read," so the actual timestamp value is decorative; using
  // `received_at` keeps it monotonic and consistent.
  const labels = Array.isArray(msg.label_ids) ? msg.label_ids : [];
  const isGmailUnread = labels.includes('UNREAD');
  const readAt = direction === 'from'
    ? (isGmailUnread ? null : msg.received_at)
    : msg.received_at;
  return {
    id: msg.id,
    gmailMessageId: msg.gmail_message_id,
    threadId: msg.thread_id,
    fromEmail: msg.from_email,
    fromName: msg.from_name,
    toEmails: msg.to_emails || [],
    subject: msg.subject,
    snippet: msg.snippet,
    bodyText: msg.body_text,
    receivedAt: msg.received_at,
    direction,
    readAt,
    openCount: msg.open_count ?? 0,
    lastOpenedAt: msg.last_opened_at ?? null,
    clickCount: msg.click_count ?? 0,
    lastClickedAt: msg.last_clicked_at ?? null,
    archivedAt: msg.archived_at ?? null,
    pinnedAt: msg.pinned_at ?? null,
    tags: Array.isArray(msg.tags) ? msg.tags : [],
    attachments: atts,
  };
}
