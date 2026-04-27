import type { SupabaseClient } from '@supabase/supabase-js';

export interface SenderSuggestion {
  email: string;
  name: string | null;
  count: number;
  lastReceivedAt: string;
  /**
   * Total attachments across every message from this sender. Drives the
   * "Has attachments" filter in the import wizard and the paperclip
   * indicator on each row. 0 = no attachments anywhere from this sender.
   */
  attachmentCount: number;
  /**
   * Up to 3 attachment filenames as a preview for the row tooltip
   * ("Q3-Proposal.pdf, signed-NDA.pdf, +5 more"). Cheaper to compute
   * here than re-querying the messages table when the user hovers.
   */
  attachmentSample: string[];
}

/**
 * Stats returned alongside the suggestion list, used by the API to render
 * accurate empty-state copy. `noiseCount` is the killer: when it's high
 * and `suggestions` is empty, we KNOW the user has senders we just chose
 * to hide as automated noise — that's a totally different message than
 * "everyone is already a contact."
 */
export interface SuggestionsStats {
  /** Distinct sender emails seen in the scanned message window (after lower-case + skip-blank). */
  uniqueSenders: number;
  /** Of those, how many were dropped because they're already a contact (or the user themself). */
  filteredAsExisting: number;
  /** Of those, how many were dropped by the noise heuristic (newsletters, no-reply, etc). */
  filteredAsNoise: number;
}

/**
 * Aggregates `email_messages` for a user and returns top senders that are
 * NOT already in the `contacts` table. Excludes the user's own email so we
 * don't suggest them as a contact.
 *
 * PostgREST doesn't do GROUP BY cleanly, so we pull recent rows and
 * aggregate in JS. For ≤10k messages per user this is fine; at higher
 * scale swap in a Postgres RPC.
 *
 * `options.includeNoise=true` skips the bulk/automated-sender heuristic
 * (newsletters, no-reply, marketing). The wizard exposes this as a
 * "Show automated senders" escape hatch — without it, a user whose inbox
 * is mostly LinkedIn/Indeed/etc gets a "0 suggested" wall and no way
 * forward, which is exactly the bug Paul hit on 2026-04-27.
 */
export async function buildSuggestions(
  admin: SupabaseClient,
  userId: string,
  userEmail: string | null,
  limit: number,
  options: { includeNoise?: boolean } = {},
): Promise<{ suggestions: SenderSuggestion[]; stats: SuggestionsStats }> {
  // Try with `attachments` (JSONB, added in migration 0007). On any DB
  // that hasn't run that migration yet, the column-missing error
  // returned by PostgREST has a 42703 code and the message mentions
  // "attachments". Falling back to a select WITHOUT that column keeps
  // the suggestions list working — the user just won't get the
  // paperclip indicators or accordion attachment chips until the
  // migration runs. This was the bug Paul caught on 2026-04-27 where
  // the wizard returned 0 suggestions despite 152 synced messages: my
  // attachments-aware select silently produced `data: null` and the
  // loop never ran.
  async function fetchMessages() {
    const withAtt = await admin
      .from('email_messages')
      .select('from_email, from_name, received_at, attachments')
      .eq('user_id', userId)
      .not('from_email', 'is', null)
      .order('received_at', { ascending: false })
      .limit(2000);
    if (!withAtt.error) return withAtt.data ?? [];
    const msg = withAtt.error.message || '';
    const looksLikeMissingColumn = /attachments/i.test(msg) && /(does not exist|column|undefined)/i.test(msg);
    if (!looksLikeMissingColumn) {
      // A different error — RLS, timeout, etc. Log and surface empty
      // so the route's own error path can still classify it.
      console.warn('[buildSuggestions] message query failed:', msg);
      return [];
    }
    console.warn('[buildSuggestions] attachments column missing — falling back without it. Run migration 0007 to enable attachment indicators.');
    const noAtt = await admin
      .from('email_messages')
      .select('from_email, from_name, received_at')
      .eq('user_id', userId)
      .not('from_email', 'is', null)
      .order('received_at', { ascending: false })
      .limit(2000);
    if (noAtt.error) {
      console.warn('[buildSuggestions] fallback message query failed:', noAtt.error.message);
      return [];
    }
    return noAtt.data ?? [];
  }

  const [messages, { data: contacts }] = await Promise.all([
    fetchMessages(),
    admin
      .from('contacts')
      .select('email')
      .eq('user_id', userId)
      .not('email', 'is', null),
  ]);

  const existingEmails = new Set(
    (contacts ?? []).map((c: { email: string | null }) => (c.email || '').toLowerCase()),
  );
  if (userEmail) existingEmails.add(userEmail.toLowerCase());

  const agg: Record<string, SenderSuggestion> = {};
  // Per-sender bookkeeping for accurate stats: each email is counted
  // exactly once toward unique/noise/existing tallies regardless of how
  // many messages they sent. Without this, "152 messages from
  // newsletter@x.com" inflated `filteredAsNoise` to 152.
  const seen = new Set<string>();
  let uniqueSenders = 0;
  let filteredAsExisting = 0;
  let filteredAsNoise = 0;
  const includeNoise = options.includeNoise === true;

  for (const m of messages) {
    const raw = (m as { from_email?: string | null }).from_email;
    if (!raw) continue;
    const email = raw.toLowerCase();
    if (!seen.has(email)) {
      seen.add(email);
      uniqueSenders += 1;
      if (existingEmails.has(email)) filteredAsExisting += 1;
      else if (isNoiseSender(email)) filteredAsNoise += 1;
    }
    if (existingEmails.has(email)) continue;
    if (!includeNoise && isNoiseSender(email)) continue;

    const name = (m as { from_name?: string | null }).from_name || null;
    const received = (m as { received_at?: string }).received_at || '';

    // Defensive parse of the attachments JSONB. Postgres returns it as
    // a parsed array on the JS side already, but a malformed row (or a
    // pre-0007 row before the migration ran) could come back as null
    // or a string — coerce to an array of `{ filename }` so the rest
    // of the loop is uniform.
    const rawAttachments = (m as { attachments?: unknown }).attachments;
    const attachmentsArr: Array<{ filename?: string }> = Array.isArray(rawAttachments)
      ? (rawAttachments as Array<{ filename?: string }>)
      : [];
    const msgAttachmentCount = attachmentsArr.length;
    const msgFilenames = attachmentsArr
      .map((a) => (typeof a.filename === 'string' ? a.filename : ''))
      .filter(Boolean);

    const existing = agg[email];
    if (existing) {
      existing.count += 1;
      if (!existing.name && name) existing.name = name;
      if (received > existing.lastReceivedAt) existing.lastReceivedAt = received;
      existing.attachmentCount += msgAttachmentCount;
      // Keep up to 3 sample filenames — enough for the row tooltip,
      // cheap to ship in the API response. Earliest-seen wins so the
      // sample is stable across reloads (sort within a sender by
      // received-desc means newer attachments are seen first).
      for (const fn of msgFilenames) {
        if (existing.attachmentSample.length >= 3) break;
        if (!existing.attachmentSample.includes(fn)) existing.attachmentSample.push(fn);
      }
    } else {
      agg[email] = {
        email,
        name,
        count: 1,
        lastReceivedAt: received,
        attachmentCount: msgAttachmentCount,
        attachmentSample: msgFilenames.slice(0, 3),
      };
    }
  }

  const suggestions = Object.values(agg)
    .sort((a, b) => b.count - a.count || (b.lastReceivedAt > a.lastReceivedAt ? 1 : -1))
    .slice(0, limit);

  return {
    suggestions,
    stats: { uniqueSenders, filteredAsExisting, filteredAsNoise },
  };
}

const NOISE_SUBSTRINGS = [
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'notifications',
  'notification',
  'alerts',
  'alert',
  'mailer-daemon',
  'postmaster',
  'bounces',
  'bounce',
  'mailer',
  'auto-confirm',
  'autoconfirm',
  'receipts',
  'receipt',
  'notify',
  'newsletter',
  'marketing',
  'jobalerts',
  'digest',
];

const NOISE_LOCAL_EXACT = new Set([
  'support',
  'hello',
  'info',
  'billing',
  'sales',
  'contact',
  'welcome',
  'team',
  'help',
  'updates',
  'news',
  'feedback',
  'email',
  'emails',
  'offers',
  'promo',
  'promotions',
  'rewards',
]);

// Subdomains used almost exclusively for bulk/transactional sends.
const NOISE_SUBDOMAINS = ['e', 'em', 'email', 'emails', 'mail', 'mailer', 'connect', 'news', 'newsletter', 'notifications', 'notify', 'noreply', 'alerts', 'marketing', 'promo', 'promos', 'offers', 'reply', 'send', 'hello'];

// Domain-part substrings that indicate bulk-send infrastructure anywhere in the domain.
const NOISE_DOMAIN_SUBSTRINGS = ['noreply', 'no-reply', 'donotreply', 'mailer'];

function isNoiseSender(email: string): boolean {
  const [local, domain] = email.split('@');
  if (!local || !domain) return true;

  const localLower = local.toLowerCase();
  if (NOISE_LOCAL_EXACT.has(localLower)) return true;
  if (NOISE_SUBSTRINGS.some((s) => localLower.includes(s))) return true;

  const domainLower = domain.toLowerCase();
  if (NOISE_DOMAIN_SUBSTRINGS.some((s) => domainLower.includes(s))) return true;

  const domainParts = domainLower.split('.');
  if (domainParts.length >= 3 && NOISE_SUBDOMAINS.includes(domainParts[0])) return true;

  return false;
}
