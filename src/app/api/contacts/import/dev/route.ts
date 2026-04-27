import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { SEED_CONTACTS } from '@/lib/data/seed-contacts';
import type { ContactWithEntries, Person, Organization } from '@/types/contact';

/**
 * Dev-only contacts import. Flattens the Zustand `ContactWithEntries` shape
 * into the Supabase `contacts` table (id, name, email, org_name, title, phone, type).
 * Uses the service role to look up the user by email — gated on NODE_ENV.
 *
 * Body: { email: string }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const { email, extra }: {
    email?: string;
    extra?: Array<{ name: string; email?: string; type?: 'person' | 'org'; org_name?: string; title?: string; phone?: string }>;
  } = await request.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

  const admin = createServiceClient();

  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const rows = SEED_CONTACTS.map((c) => flatten(c, user.id)).filter((r) => r !== null);

  if (extra?.length) {
    const now = new Date().toISOString();
    extra.forEach((e) => {
      rows.push({
        user_id: user.id,
        name: e.name,
        email: e.email ? e.email.toLowerCase() : null,
        phone: e.phone ?? null,
        type: e.type ?? 'person',
        title: e.title ?? null,
        org_name: e.org_name ?? null,
        created_at: now,
        updated_at: now,
      });
    });
  }

  // Clear existing contacts for this user so this is idempotent. Email matches
  // in `email_contact_matches` cascade-delete via FK, so they'll rebuild on next sync.
  const { error: deleteErr } = await admin.from('contacts').delete().eq('user_id', user.id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message, step: 'delete' }, { status: 500 });

  const { data: inserted, error: insertErr } = await admin
    .from('contacts')
    .insert(rows as object[])
    .select('id, name, email, type');
  if (insertErr) return NextResponse.json({ error: insertErr.message, hint: insertErr.hint, step: 'insert' }, { status: 500 });

  const byType = (inserted ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    user_id: user.id,
    imported: inserted?.length ?? 0,
    by_type: byType,
    sample: (inserted ?? []).slice(0, 8).map((c) => ({ name: c.name, email: c.email, type: c.type })),
  });
}

function flatten(c: ContactWithEntries, userId: string) {
  const primaryEmail = c.entries?.emails?.find((e) => e.primary)?.value
    ?? c.entries?.emails?.[0]?.value
    ?? (c as Person).email
    ?? null;
  const primaryPhone = c.entries?.phones?.find((p) => p.primary)?.value
    ?? c.entries?.phones?.[0]?.value
    ?? (c as Person).phone
    ?? null;

  const base = {
    user_id: userId,
    name: c.name,
    email: primaryEmail ? primaryEmail.toLowerCase() : null,
    phone: primaryPhone,
    type: c.type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (c.type === 'person') {
    const p = c as Person;
    return { ...base, title: p.title ?? null, org_name: p.orgName ?? null };
  }
  const o = c as Organization;
  return { ...base, title: null, org_name: o.name };
}
