import type { SupabaseClient } from '@supabase/supabase-js';

export interface BatchContactInput {
  email: string;
  name?: string | null;
  type?: 'person' | 'org';
}

export interface BatchContactResult {
  inserted: number;
  skipped: number;
  matchesLinked: number;
  contacts: Array<{ id: string; email: string; name: string }>;
}

/**
 * Inserts contacts in bulk for a user, skipping any whose email already
 * exists. Then rebuilds `email_contact_matches` rows for the newly-created
 * contacts by joining against `email_messages` — so the contact's timeline
 * is pre-populated with every prior email from/to them.
 */
export async function insertContactBatch(
  admin: SupabaseClient,
  userId: string,
  inputs: BatchContactInput[],
): Promise<BatchContactResult> {
  const normalized = inputs
    .map((c) => ({
      email: (c.email || '').trim().toLowerCase(),
      name: (c.name || '').trim() || c.email?.split('@')[0] || 'Unknown',
      type: c.type || 'person',
    }))
    .filter((c) => c.email && c.email.includes('@'));

  if (normalized.length === 0) {
    return { inserted: 0, skipped: 0, matchesLinked: 0, contacts: [] };
  }

  const emails = Array.from(new Set(normalized.map((c) => c.email)));

  const { data: existing } = await admin
    .from('contacts')
    .select('email')
    .eq('user_id', userId)
    .in('email', emails);
  const existingEmails = new Set(
    (existing ?? []).map((r: { email: string | null }) => (r.email || '').toLowerCase()),
  );

  const toInsert = normalized.filter((c) => !existingEmails.has(c.email));
  const skipped = normalized.length - toInsert.length;

  if (toInsert.length === 0) {
    return { inserted: 0, skipped, matchesLinked: 0, contacts: [] };
  }

  const now = new Date().toISOString();
  // Stamp every batch-inserted row with `source: 'gmail_import'`. This is what
  // Settings → Gmail → "Remove imported contacts" uses to find them later.
  // If 0008 hasn't been applied yet (column missing), we retry without the
  // field so dev environments that haven't run the migration still work.
  const rows = toInsert.map((c) => ({
    user_id: userId,
    name: c.name,
    email: c.email,
    phone: null,
    type: c.type,
    title: null,
    org_name: null,
    source: 'gmail_import',
    created_at: now,
    updated_at: now,
  }));

  let inserted: Array<{ id: string; email: string; name: string }> | null = null;
  {
    const r = await admin.from('contacts').insert(rows).select('id, email, name');
    if (r.error && /\bsource\b/i.test(r.error.message || '')) {
      // 0008 not applied — fall back to the pre-source schema.
      const fallbackRows = rows.map(({ source: _s, ...rest }) => rest);
      const r2 = await admin.from('contacts').insert(fallbackRows).select('id, email, name');
      if (r2.error) throw new Error(`batch_insert_failed: ${r2.error.message}`);
      inserted = r2.data ?? [];
    } else if (r.error) {
      throw new Error(`batch_insert_failed: ${r.error.message}`);
    } else {
      inserted = r.data ?? [];
    }
  }

  const matchesLinked = await linkPastMessages(admin, userId, inserted ?? []);

  return {
    inserted: inserted?.length ?? 0,
    skipped,
    matchesLinked,
    contacts: inserted ?? [],
  };
}



async function linkPastMessages(
  admin: SupabaseClient,
  userId: string,
  newContacts: Array<{ id: string; email: string; name: string }>,
): Promise<number> {
  if (newContacts.length === 0) return 0;
  const emailToId = new Map(newContacts.map((c) => [c.email.toLowerCase(), c.id]));
  const emails = Array.from(emailToId.keys());

  // Pull messages where any new contact appears as sender or recipient.
  const [fromRes, toRes] = await Promise.all([
    admin
      .from('email_messages')
      .select('id, from_email')
      .eq('user_id', userId)
      .in('from_email', emails),
    admin
      .from('email_messages')
      .select('id, to_emails, cc_emails')
      .eq('user_id', userId)
      .overlaps('to_emails', emails),
  ]);

  const matchRows: Array<{ message_id: string; contact_id: string; match_type: string }> = [];

  for (const m of fromRes.data ?? []) {
    const id = emailToId.get(((m as { from_email: string }).from_email || '').toLowerCase());
    if (id) matchRows.push({ message_id: (m as { id: string }).id, contact_id: id, match_type: 'from' });
  }

  for (const m of toRes.data ?? []) {
    const toEmails = ((m as { to_emails?: string[] }).to_emails || []).map((e) => e.toLowerCase());
    for (const e of toEmails) {
      const id = emailToId.get(e);
      if (id) matchRows.push({ message_id: (m as { id: string }).id, contact_id: id, match_type: 'to' });
    }
  }

  if (matchRows.length === 0) return 0;

  const { error: matchErr } = await admin
    .from('email_contact_matches')
    .upsert(matchRows, { onConflict: 'message_id,contact_id,match_type', ignoreDuplicates: true });
  if (matchErr) throw new Error(`batch_match_failed: ${matchErr.message}`);

  return matchRows.length;
}
