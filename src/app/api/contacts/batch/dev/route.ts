import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { insertContactBatch, type BatchContactInput } from '@/lib/contacts/batch';

/** Dev-only mirror of POST /api/contacts/batch. Resolves user by email. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as {
    email?: string;
    contacts?: BatchContactInput[];
  } | null;
  if (!body?.email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
  if (!body.contacts?.length) return NextResponse.json({ error: 'contacts_required' }, { status: 400 });

  const admin = createServiceClient();
  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === body.email!.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const result = await insertContactBatch(admin, user.id, body.contacts);
  return NextResponse.json(result);
}
