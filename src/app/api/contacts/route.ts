import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, listMessageIds } from '@/lib/gmail/client';
import type { ContactWithEntries } from '@/types/contact';

/**
 * GET /api/contacts
 *
 * Returns the signed-in user's contacts in the `ContactWithEntries` shape
 * the Zustand store uses, so the UI can hydrate without refactoring.
 *
 * Auth pattern: tries the **user-session client first** (RLS policy
 * `auth.uid() = user_id` lets the owner read their own rows) and only
 * falls back to service-role if the user-session path errors. Same
 * defensive pattern as /api/gmail/{disconnect,suggestions,sync},
 * /api/contacts/batch, /api/contacts/by-source.
 *
 * Without this, importing a contact via the wizard appeared to succeed
 * (batch insert worked), but the post-import refresh of the contacts grid
 * silently 500'd against an "Unregistered API key" error from PostgREST,
 * leaving the grid showing stale seed data and making the new contact
 * look like it had vanished.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[contacts] service client unavailable:', e);
    return null;
  }
}

interface Row {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: 'person' | 'org';
  org_name: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ contacts: [], reason: 'unauthenticated' });

  // Try user session first — this is the path that survives a
  // broken/missing SUPABASE_SERVICE_ROLE_KEY. RLS already governs the read
  // correctly (`auth.uid() = user_id`).
  let rows: Row[] | null = null;
  let lastError: string | null = null;

  {
    const r = await supabase
      .from('contacts')
      .select('id, name, email, phone, type, org_name, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    if (!r.error) {
      rows = (r.data as unknown as Row[]) ?? [];
    } else {
      lastError = r.error.message;
      console.warn('[contacts] user-session select failed, trying service role:', lastError);
      const admin = trySvc();
      if (admin) {
        const r2 = await admin
          .from('contacts')
          .select('id, name, email, phone, type, org_name, title, created_at, updated_at')
          .eq('user_id', user.id)
          .order('name', { ascending: true });
        if (!r2.error) {
          rows = (r2.data as unknown as Row[]) ?? [];
          lastError = null;
        } else {
          lastError = `${lastError} (fallback also failed: ${r2.error.message})`;
        }
      }
    }
  }

  if (rows === null) {
    console.error('[contacts] both auth paths failed:', lastError);
    return NextResponse.json({ error: lastError ?? 'unknown' }, { status: 500 });
  }

  // Per-contact email-activity summary. Drives the contacts-grid Unread
  // column's "New" pill + paperclip indicator. Computed in a single
  // join query against email_contact_matches → email_messages, then
  // aggregated per contact_id in JS. One round-trip per page load —
  // cheaper than asking the grid to lazy-fetch per row, and the
  // aggregation is dwarfed by the contact list size at any realistic
  // scale (Paul has ~100 contacts, Roadrunner's mid-term ceiling is
  // ~10k).
  //
  // Failure here is non-fatal: if the query errors we just return the
  // contacts without the summary and the grid falls back to seed-only
  // signals. Worth logging though.
  const summary = await fetchEmailActivitySummary(supabase, user.id);

  // Live attachment-count fallback via Gmail's `has:attachment` search.
  // Only used to fill in `attachmentCount` for contacts whose summary
  // came back with 0 — which happens when the user's database doesn't
  // have the email_messages.attachments column populated (migration
  // 0007 not applied). One Gmail API call returns every attachment-
  // bearing message id in the user's account; we cross-reference with
  // email_contact_matches to count per-contact. Lets the paperclip
  // badge work without requiring a DB migration. ~500ms cost on first
  // page load.
  await fillAttachmentSummaryFromGmail(supabase, user.id, summary);

  const contacts: ContactWithEntries[] = rows.map((r) =>
    toContactWithEntries(r, user, summary.get(r.id))
  );
  return NextResponse.json({ contacts });
}

/**
 * Returns Map<contactId, { hasNew, hasAttachment, lastEmailAt }>.
 *
 * `hasNew` is true if any matched message arrived within the last 10
 * minutes. `hasAttachment` is true if any matched message has at
 * least one attachment. The 10-minute window matches the EmailsPanel's
 * "New" pill rule so the contacts-grid indicator and the per-contact
 * timeline indicator decay in lockstep — if the user sees "New" on
 * the grid row and clicks in, they'll see "New" on the email itself.
 *
 * Query strategy: PostgREST embedded select pulls `email_messages`
 * (only the columns we need) inside `email_contact_matches`, scoped
 * to the signed-in user via the embedded filter. The user-session
 * client is RLS-correct (matches' contact_id has its own RLS via
 * the contacts join). Service-role fallback for the same reasons as
 * everywhere else in this file.
 */
async function fetchEmailActivitySummary(
  userClient: SupabaseClient,
  userId: string,
): Promise<Map<string, { hasNew: boolean; hasAttachment: boolean; attachmentCount: number; newAttachmentCount: number; unreadCount: number; unreadAttachmentCount: number; lastEmailAt: string | null }>> {
  const NEW_WINDOW_MS = 10 * 60 * 1000;
  const cutoff = Date.now() - NEW_WINDOW_MS;

  type EmbeddedRow = {
    contact_id: string;
    email_messages: {
      received_at: string | null;
      attachments?: unknown;
      label_ids?: string[] | null;
      user_id: string;
    } | null;
  };

  // Two-attempt query: first tries with the `attachments` column (fully-
  // featured response), and on the "attachments column missing" error
  // (migration 0007 not applied) retries without it. Same defensive
  // pattern the rest of the codebase uses for the same column.
  // `label_ids` always exists from migration 0001 so it's always
  // included — drives the per-contact unread count via Gmail's
  // UNREAD label.
  async function runOnce(client: SupabaseClient): Promise<EmbeddedRow[] | null> {
    const withAttach = await client
      .from('email_contact_matches')
      .select('contact_id, email_messages!inner(received_at, attachments, label_ids, user_id)')
      .eq('email_messages.user_id', userId);
    if (!withAttach.error) {
      return (withAttach.data as unknown as EmbeddedRow[]) ?? [];
    }
    if (/\battachments\b/i.test(withAttach.error.message || '')) {
      const noAttach = await client
        .from('email_contact_matches')
        .select('contact_id, email_messages!inner(received_at, label_ids, user_id)')
        .eq('email_messages.user_id', userId);
      if (noAttach.error) return null;
      return (noAttach.data as unknown as EmbeddedRow[]) ?? [];
    }
    return null;
  }

  let data = await runOnce(userClient);
  if (data === null) {
    const admin = trySvc();
    if (admin) data = await runOnce(admin);
  }

  const out = new Map<string, { hasNew: boolean; hasAttachment: boolean; attachmentCount: number; newAttachmentCount: number; unreadCount: number; unreadAttachmentCount: number; lastEmailAt: string | null }>();
  if (!data) return out;

  for (const row of data) {
    const m = row.email_messages;
    if (!m) continue;
    const cur = out.get(row.contact_id) ?? {
      hasNew: false,
      hasAttachment: false,
      attachmentCount: 0,
      newAttachmentCount: 0,
      unreadCount: 0,
      unreadAttachmentCount: 0,
      lastEmailAt: null as string | null,
    };
    const ts = m.received_at ? new Date(m.received_at).getTime() : 0;
    const isRecent = ts >= cutoff;
    if (isRecent) cur.hasNew = true;
    const isUnread = Array.isArray(m.label_ids) && m.label_ids.includes('UNREAD');
    const hasAttachments = Array.isArray(m.attachments) && m.attachments.length > 0;
    if (hasAttachments) {
      cur.hasAttachment = true;
      // Count EMAILS with attachments, not individual attachment files
      // (Paul's call on 2026-04-28: badge represents thread count, not
      // file count — aligns with detail-page tab badges and with how
      // people read the number).
      cur.attachmentCount += 1;
      if (isRecent) cur.newAttachmentCount += 1;
      // Unread + attached → drives the green paperclip on the grid.
      // "Fresh file waiting" signal. Decays automatically when the
      // user reads the email in Gmail (UNREAD label removed) and the
      // next sync picks up the new label state.
      if (isUnread) cur.unreadAttachmentCount += 1;
    }
    // Unread = Gmail's `UNREAD` label is still present on the message.
    // Same source of truth Gmail itself uses; once the user reads the
    // message in Gmail, Gmail removes the label and the next sync
    // tick clears the count here. This is the standard CRM-meets-
    // mailbox pattern (HubSpot/Folk/Attio all key off UNREAD).
    if (isUnread) cur.unreadCount += 1;
    if (m.received_at && (!cur.lastEmailAt || cur.lastEmailAt < m.received_at)) {
      cur.lastEmailAt = m.received_at;
    }
    out.set(row.contact_id, cur);
  }
  return out;
}

/**
 * Live-fetch attachment counts from Gmail when the
 * `email_messages.attachments` column hasn't been populated (migration
 * 0007 missing). Single Gmail API call (`has:attachment` search,
 * paginated to first 1000 message IDs — covers ~99% of accounts; the
 * tail beyond that just doesn't get counted, which is acceptable for
 * a contacts-grid badge), cross-referenced with email_contact_matches
 * to attribute counts to contacts.
 *
 * Mutates `summary` in place — for any contact whose attachmentCount
 * is currently 0, fills in the count of attachment-bearing messages
 * matched to them. Adds those contacts to the map if they weren't
 * present before. Doesn't touch hasNew / unreadCount / etc. — those
 * come from the email_messages query and are unaffected.
 *
 * Why this is the workaround instead of "just apply the migration":
 * Paul's database service-role key is currently rejected by Supabase
 * (intermittent / stale), so the in-app `/api/debug/run-migration-0007`
 * endpoint can't actually run the DDL. This Gmail-side path needs
 * zero schema changes — it works on whatever database state the user
 * happens to be in. Once the migration is applied (manually or via
 * fresh service key), this fallback becomes a no-op because the
 * non-zero counts from email_messages.attachments take precedence.
 */
async function fillAttachmentSummaryFromGmail(
  client: SupabaseClient,
  userId: string,
  summary: Map<string, { hasNew: boolean; hasAttachment: boolean; attachmentCount: number; newAttachmentCount: number; unreadCount: number; unreadAttachmentCount: number; lastEmailAt: string | null }>,
): Promise<void> {
  try {
    // 1. Get the user's Gmail refresh token.
    type ConnRow = { provider_refresh_token: string | null };
    let conn: ConnRow | null = null;
    const userRead = await client
      .from('gmail_connections')
      .select('provider_refresh_token')
      .eq('user_id', userId)
      .maybeSingle();
    if (userRead.data?.provider_refresh_token) {
      conn = userRead.data as ConnRow;
    } else {
      const admin = trySvc();
      if (admin) {
        const adminRead = await admin
          .from('gmail_connections')
          .select('provider_refresh_token')
          .eq('user_id', userId)
          .maybeSingle();
        if (adminRead.data?.provider_refresh_token) conn = adminRead.data as ConnRow;
      }
    }
    if (!conn?.provider_refresh_token) return;

    // 2. Fresh access token + paginated has:attachment search.
    const accessToken = await refreshAccessToken(conn.provider_refresh_token);
    const attachmentMsgIds: string[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const r = await listMessageIds(accessToken, {
        q: 'has:attachment',
        maxResults: 500,
        pageToken,
      });
      attachmentMsgIds.push(...r.ids);
      pageToken = r.nextPageToken;
      pages += 1;
      if (attachmentMsgIds.length >= 1000) break; // cap for first-paint cost
      if (pages >= 4) break;
    } while (pageToken);

    console.log(`[contacts/attachment-fallback] Gmail returned ${attachmentMsgIds.length} attachment-bearing message IDs`);
    if (attachmentMsgIds.length === 0) return;
    const attachmentSet = new Set(attachmentMsgIds);

    // 3. Strategy: pull every contact-matched email_messages row (the
    //    smaller universe — typically a few hundred even for power
    //    users), THEN intersect client-side with the attachment ID
    //    set. Avoids stuffing 1000 IDs into a PostgREST `.in()` clause
    //    which produces a URL longer than Supabase will accept (this
    //    was failing with "fetch failed" — the URL exceeded the
    //    proxy's max length, not a network issue).
    type EmbeddedMatchRow = {
      contact_id: string;
      email_messages: {
        gmail_message_id: string | null;
        user_id: string;
      } | null;
    };
    const matchesRes = await client
      .from('email_contact_matches')
      .select('contact_id, email_messages!inner(gmail_message_id, user_id)')
      .eq('email_messages.user_id', userId);
    if (matchesRes.error) {
      console.warn('[contacts/attachment-fallback] email_contact_matches lookup failed:', matchesRes.error.message);
      return;
    }
    const allMatches = (matchesRes.data as unknown as EmbeddedMatchRow[]) ?? [];
    console.log(`[contacts/attachment-fallback] pulled ${allMatches.length} total contact-matches`);

    // 4. Filter to only those whose gmail_message_id is in our
    //    attachment set, then aggregate per contact_id.
    const counts = new Map<string, number>();
    for (const row of allMatches) {
      const gid = row.email_messages?.gmail_message_id;
      if (!gid || !attachmentSet.has(gid)) continue;
      counts.set(row.contact_id, (counts.get(row.contact_id) ?? 0) + 1);
    }
    console.log(`[contacts/attachment-fallback] aggregated to ${counts.size} contacts with attachment counts:`, Array.from(counts.entries()));

    // 5. Merge into the summary, but ONLY when the existing count is
    //    0 — preserves precise counts from email_messages.attachments
    //    when the migration IS applied.
    const defaults = {
      hasNew: false,
      hasAttachment: false,
      attachmentCount: 0,
      newAttachmentCount: 0,
      unreadCount: 0,
      unreadAttachmentCount: 0,
      lastEmailAt: null as string | null,
    };
    for (const [contactId, count] of counts) {
      const cur = summary.get(contactId) ?? { ...defaults };
      if (cur.attachmentCount === 0 && count > 0) {
        cur.attachmentCount = count;
        cur.hasAttachment = true;
      }
      summary.set(contactId, cur);
    }
  } catch (e) {
    // Non-fatal: the badges just don't get the live fallback. Logged
    // for debugging but doesn't block /api/contacts from returning.
    console.warn('[contacts] attachment fallback failed:', e);
  }
}

/**
 * POST /api/contacts
 *
 * Single-contact create — used by `/contacts/new/person` and
 * `/contacts/new/company`. Until this endpoint existed, those pages
 * called the Zustand `addContact` action, which only mutated client
 * state. Manually-added contacts vanished on reload (the GET above
 * re-hydrates from the DB).
 *
 * Body: { name, type: 'person'|'org', email?, phone?, orgName?, title? }
 *
 * Auth pattern: user-session-first (RLS lets the owner write their own
 * rows), service-role fallback only on error. Same shape as everywhere
 * else in this codebase.
 */
interface InsertBody {
  id?: string;
  name?: string;
  type?: 'person' | 'org';
  email?: string | null;
  phone?: string | null;
  orgName?: string | null;
  title?: string | null;
}

async function insertOnce(
  client: SupabaseClient,
  userId: string,
  body: InsertBody,
): Promise<{ data: Row | null; error: { message: string } | null }> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: userId,
    name: (body.name || '').trim() || 'Unnamed',
    type: body.type === 'org' ? 'org' : 'person',
    email: body.email ? body.email.trim().toLowerCase() : null,
    phone: body.phone ? body.phone.trim() : null,
    org_name: body.orgName ? body.orgName.trim() : null,
    title: body.title ? body.title.trim() : null,
    source: 'manual',
    created_at: now,
    updated_at: now,
  };
  // Allow caller-provided UUID so the wizard's optimistic UI keeps the
  // same id across the round-trip. If it collides with an existing row
  // RLS will reject — the user-session client only sees their own rows.
  if (body.id) payload.id = body.id;

  const r = await client
    .from('contacts')
    .insert(payload)
    .select('id, name, email, phone, type, org_name, title, created_at, updated_at')
    .single();

  // 0008 not applied (no `source` column) — retry without it.
  if (r.error && /\bsource\b/i.test(r.error.message || '')) {
    const { source: _s, ...fallback } = payload;
    const r2 = await client
      .from('contacts')
      .insert(fallback)
      .select('id, name, email, phone, type, org_name, title, created_at, updated_at')
      .single();
    return r2 as unknown as { data: Row | null; error: { message: string } | null };
  }
  return r as unknown as { data: Row | null; error: { message: string } | null };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => null) as InsertBody | null;
  if (!body || !body.name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const r1 = await insertOnce(supabase, user.id, body);
  if (!r1.error && r1.data) {
    return NextResponse.json({ contact: toContactWithEntries(r1.data, user) });
  }
  console.warn('[contacts POST] user-session insert failed, trying service role:', r1.error?.message);
  const admin = trySvc();
  if (!admin) {
    return NextResponse.json({ error: r1.error?.message ?? 'insert_failed' }, { status: 500 });
  }
  const r2 = await insertOnce(admin, user.id, body);
  if (r2.error || !r2.data) {
    return NextResponse.json(
      { error: `${r1.error?.message ?? 'insert_failed'} (service-role fallback also failed: ${r2.error?.message ?? 'no row'})` },
      { status: 500 },
    );
  }
  return NextResponse.json({ contact: toContactWithEntries(r2.data, user) });
}

/**
 * Minimal user shape we need to derive `createdBy`. We accept the full
 * Supabase user (`auth.getUser().data.user`) but only read the bits we
 * need so this stays decoupled from the SDK type.
 */
type OwnerInfo = {
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string } | null;
} | null | undefined;

/**
 * Derive a human-readable creator label for a contact. The DB doesn't
 * yet have a `created_by` column — RLS scopes every select to
 * `user_id = auth.uid()`, so for now the row's owner IS the row's
 * creator and we can pull the label from the signed-in user's
 * metadata. When the app becomes genuinely multi-user (shared
 * contacts, transferable ownership) this will need a real audit
 * column on the contacts table; until then this read-time derivation
 * is the right level of investment.
 *
 * Order of preference: explicit full_name → metadata name → email
 * username → raw email → 'Unknown'. Avoids ever showing the bare
 * Supabase UUID, which would be both ugly and useless to the user.
 */
function deriveCreatedBy(owner: OwnerInfo): string | undefined {
  if (!owner) return undefined;
  const meta = owner.user_metadata;
  if (meta?.full_name) return meta.full_name;
  if (meta?.name) return meta.name;
  if (owner.email) {
    // Strip the @domain so we display "pwentzell64" not the full email,
    // matching what the existing seed contacts use ("Paul Wentzell").
    // If the local part itself looks like a name (no digits, has dot)
    // titlecase it; otherwise fall back to the raw email so the user
    // at least has SOMETHING identifiable.
    const local = owner.email.split('@')[0] || '';
    if (/^[a-z]+\.[a-z]+$/.test(local)) {
      return local
        .split('.')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    }
    return owner.email;
  }
  return undefined;
}

function toContactWithEntries(
  r: Row,
  owner?: OwnerInfo,
  recentEmail?: { hasNew: boolean; hasAttachment: boolean; attachmentCount: number; newAttachmentCount: number; unreadCount: number; unreadAttachmentCount: number; lastEmailAt: string | null },
): ContactWithEntries {
  const lastUpdated = (r.updated_at || r.created_at || new Date().toISOString()).split('T')[0];
  const entries = {
    addresses: [],
    emails: r.email
      ? [{ id: `e-${r.id}`, type: 'Work', value: r.email, primary: true }]
      : [],
    phones: r.phone
      ? [{ id: `p-${r.id}`, type: 'Office', value: r.phone, primary: true }]
      : [],
    websites: [],
    names: [],
    identifiers: [],
    industries: [],
  };

  const createdBy = deriveCreatedBy(owner);

  const base = {
    id: r.id,
    name: r.name,
    status: 'active' as const,
    stale: false,
    aiStatus: 'verified' as const,
    lastUpdated,
    entries,
    createdBy,
    // Per-contact email-activity summary for the contacts-grid Unread
    // column. Optional — undefined when the user has no synced
    // email_messages yet. The grid falls back to seed-only signals
    // when undefined so demo contacts still light up.
    recentEmail,
  };

  if (r.type === 'person') {
    return {
      ...base,
      type: 'person',
      title: r.title ?? undefined,
      orgName: r.org_name ?? undefined,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
    } as ContactWithEntries;
  }

  return {
    ...base,
    type: 'org',
  } as ContactWithEntries;
}
