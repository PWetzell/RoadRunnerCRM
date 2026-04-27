import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/debug/sender-status?email=foo@bar.com
 *
 * Diagnostic for "why isn't <X> showing up in the Gmail import wizard?"
 * Returns the full picture for one email address:
 *
 *   {
 *     email,
 *     isContact,           // does a row exist in `contacts` for this email?
 *     contactDetails: [...],
 *     asSender: { count, recent: [...] },        // email_messages where from_email matches
 *     asRecipient: { count },                    // email_messages where to_emails includes this
 *     isNoiseFiltered,     // would the suggestions noise filter exclude this?
 *     wouldAppearInSuggestions, // composite verdict
 *     reason,              // human-readable verdict
 *   }
 *
 * Tries the user-session client first, falls back to service-role only on
 * error — same defensive pattern as every other refactored route.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch {
    return null;
  }
}

// Mirrors the noise filter in src/lib/gmail/suggestions.ts. Kept in lockstep
// so this debug endpoint reflects the same exclusion rules the wizard uses.
const NOISE_SUBSTRINGS = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'notifications', 'notification',
  'alerts', 'alert', 'mailer-daemon', 'postmaster', 'bounces', 'bounce', 'mailer',
  'auto-confirm', 'autoconfirm', 'receipts', 'receipt', 'notify', 'newsletter',
  'marketing', 'jobalerts', 'digest',
];
const NOISE_LOCAL_EXACT = new Set([
  'support', 'hello', 'info', 'billing', 'sales', 'contact', 'welcome', 'team',
  'help', 'updates', 'news', 'feedback', 'email', 'emails', 'offers', 'promo',
  'promotions', 'rewards',
]);
const NOISE_SUBDOMAINS = ['e', 'em', 'email', 'emails', 'mail', 'mailer', 'connect', 'news', 'newsletter', 'notifications', 'notify', 'noreply', 'alerts', 'marketing', 'promo', 'promos', 'offers', 'reply', 'send', 'hello'];
const NOISE_DOMAIN_SUBSTRINGS = ['noreply', 'no-reply', 'donotreply', 'mailer'];

function isNoiseSender(email: string): boolean {
  const [local, domain] = email.split('@');
  if (!local || !domain) return true;
  const ll = local.toLowerCase();
  if (NOISE_LOCAL_EXACT.has(ll)) return true;
  if (NOISE_SUBSTRINGS.some((s) => ll.includes(s))) return true;
  const dl = domain.toLowerCase();
  if (NOISE_DOMAIN_SUBSTRINGS.some((s) => dl.includes(s))) return true;
  const parts = dl.split('.');
  if (parts.length >= 3 && NOISE_SUBDOMAINS.includes(parts[0])) return true;
  return false;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const url = new URL(request.url);
  const emailRaw = url.searchParams.get('email')?.toLowerCase().trim();
  if (!emailRaw) return NextResponse.json({ error: 'email_required (use ?email=foo@bar.com)' }, { status: 400 });

  // 1. Is she a contact?
  type ContactRow = { id: string; email: string | null; name: string | null; source: string | null; created_at: string };
  async function lookupContacts(): Promise<ContactRow[]> {
    const r = await supabase
      .from('contacts')
      .select('id, email, name, source, created_at')
      .eq('user_id', user!.id)
      .ilike('email', emailRaw!);
    if (!r.error && r.data) return r.data as unknown as ContactRow[];
    const admin = trySvc();
    if (!admin) return [];
    const r2 = await admin
      .from('contacts')
      .select('id, email, name, source, created_at')
      .eq('user_id', user!.id)
      .ilike('email', emailRaw!);
    return (r2.data as unknown as ContactRow[]) ?? [];
  }

  // 2. As sender: how many email_messages have from_email matching?
  type MsgRow = { id: string; received_at: string; subject: string | null };
  async function lookupAsSender(): Promise<{ count: number; recent: MsgRow[] }> {
    const r = await supabase
      .from('email_messages')
      .select('id, received_at, subject', { count: 'exact' })
      .eq('user_id', user!.id)
      .ilike('from_email', emailRaw!)
      .order('received_at', { ascending: false })
      .limit(5);
    if (typeof r.count === 'number' && !r.error) {
      return { count: r.count, recent: (r.data as unknown as MsgRow[]) ?? [] };
    }
    const admin = trySvc();
    if (!admin) return { count: 0, recent: [] };
    const r2 = await admin
      .from('email_messages')
      .select('id, received_at, subject', { count: 'exact' })
      .eq('user_id', user!.id)
      .ilike('from_email', emailRaw!)
      .order('received_at', { ascending: false })
      .limit(5);
    return { count: r2.count ?? 0, recent: (r2.data as unknown as MsgRow[]) ?? [] };
  }

  // 3. As recipient: how many email_messages have to_emails containing this?
  async function lookupAsRecipient(): Promise<number> {
    const r = await supabase
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .contains('to_emails', [emailRaw!]);
    if (typeof r.count === 'number' && !r.error) return r.count;
    const admin = trySvc();
    if (!admin) return 0;
    const r2 = await admin
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .contains('to_emails', [emailRaw!]);
    return r2.count ?? 0;
  }

  const [contacts, asSender, asRecipientCount] = await Promise.all([
    lookupContacts(),
    lookupAsSender(),
    lookupAsRecipient(),
  ]);

  const isContact = contacts.length > 0;
  const noise = isNoiseSender(emailRaw);
  const wouldAppear = !isContact && !noise && asSender.count > 0;

  let reason = '';
  if (isContact) reason = `Already in your contacts table (${contacts.length} row${contacts.length === 1 ? '' : 's'}). The wizard intentionally hides existing contacts. Remove them from the Contacts grid (or via Settings → Gmail → Remove imported) and re-open the wizard.`;
  else if (noise) reason = 'The address matches the noise filter (newsletters/notifications/no-reply senders). The wizard hides these.';
  else if (asSender.count === 0 && asRecipientCount === 0) reason = 'No emails for this address are in email_messages. The Gmail sync hasn\u2019t pulled any messages from/to them yet — try Sync now in the wizard or Settings.';
  else if (asSender.count === 0 && asRecipientCount > 0) reason = `You\u2019ve received nothing FROM this address (only sent TO them). The wizard suggests senders, not recipients-only.`;
  else reason = 'Should appear in suggestions. If it\u2019s not, this is a bug — share this JSON.';

  return NextResponse.json({
    email: emailRaw,
    isContact,
    contactDetails: contacts,
    asSender,
    asRecipient: { count: asRecipientCount },
    isNoiseFiltered: noise,
    wouldAppearInSuggestions: wouldAppear,
    reason,
  });
}
