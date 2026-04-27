import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Dev-only: retroactively builds `email_contact_matches` rows for every
 * existing contact of the given user. The normal batch-import path only
 * links messages for newly-inserted contacts, which leaves any pre-existing
 * contact with an empty activity timeline. This endpoint fills that gap so
 * the Activity tab renders real data for seeded / pre-existing contacts.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const { email }: { email?: string } = await request.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

  const admin = createServiceClient();
  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const { data: contacts } = await admin
    .from('contacts')
    .select('id, email')
    .eq('user_id', user.id);

  const withEmail = (contacts ?? []).filter(
    (c): c is { id: string; email: string } => typeof c.email === 'string' && c.email.includes('@'),
  );

  const inserted = await linkAll(admin, user.id, withEmail);

  return NextResponse.json({
    scannedContacts: contacts?.length ?? 0,
    contactsWithEmail: withEmail.length,
    matchesInserted: inserted,
  });
}

async function linkAll(
  admin: SupabaseClient,
  userId: string,
  contacts: Array<{ id: string; email: string }>,
): Promise<number> {
  if (contacts.length === 0) return 0;
  const emailToId = new Map(contacts.map((c) => [c.email.toLowerCase(), c.id]));
  const emails = Array.from(emailToId.keys());

  const [fromRes, toRes] = await Promise.all([
    admin
      .from('email_messages')
      .select('id, from_email')
      .eq('user_id', userId)
      .in('from_email', emails),
    admin
      .from('email_messages')
      .select('id, to_emails')
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

  const { error } = await admin
    .from('email_contact_matches')
    .upsert(matchRows, { onConflict: 'message_id,contact_id,match_type', ignoreDuplicates: true });
  if (error) throw new Error(`backfill_failed: ${error.message}`);

  return matchRows.length;
}
