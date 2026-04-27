import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { ContactWithEntries } from '@/types/contact';

/**
 * Dev-only mirror of GET /api/contacts. Resolves a user by email via the
 * service role (bypassing cookie auth) so the preview sandbox can verify the
 * Supabase→Zustand hydration shape end-to-end.
 *
 * Body: { email: string }
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

  const { data: rows, error } = await admin
    .from('contacts')
    .select('id, name, email, phone, type, org_name, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contacts: ContactWithEntries[] = (rows ?? []).map(toContactWithEntries);
  return NextResponse.json({ count: contacts.length, contacts });
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

function toContactWithEntries(r: Row): ContactWithEntries {
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

  const base = {
    id: r.id,
    name: r.name,
    status: 'active' as const,
    stale: false,
    aiStatus: 'verified' as const,
    lastUpdated,
    entries,
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
