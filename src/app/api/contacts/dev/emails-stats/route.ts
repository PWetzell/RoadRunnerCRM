import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Dev-only: returns aggregate counts of email_contact_matches rows for the
 * user, plus the top-10 contacts by match count. Lets the preview sandbox
 * quickly see whether retroactive linking from /api/contacts/batch actually
 * produced join rows without iterating 134 contacts one-by-one.
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
    .select('id, name')
    .eq('user_id', user.id);
  const contactIds = (contacts ?? []).map((c) => c.id);
  const nameById = new Map((contacts ?? []).map((c) => [c.id, c.name]));

  const { data: rawMatches } = await admin
    .from('email_contact_matches')
    .select('contact_id, message_id')
    .in('contact_id', contactIds.length > 0 ? contactIds : ['00000000-0000-0000-0000-000000000000']);

  const matches = rawMatches ?? [];
  const perContact = new Map<string, number>();
  for (const m of matches) {
    perContact.set(m.contact_id, (perContact.get(m.contact_id) ?? 0) + 1);
  }
  const top = Array.from(perContact.entries())
    .map(([id, count]) => ({ id, name: nameById.get(id) ?? '(unknown)', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const { count: totalMessages } = await admin
    .from('email_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return NextResponse.json({
    totalContacts: contactIds.length,
    totalMatches: matches.length,
    contactsWithMatches: perContact.size,
    totalMessages,
    top,
  });
}
