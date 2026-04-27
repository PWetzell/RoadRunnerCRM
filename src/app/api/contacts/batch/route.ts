import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { insertContactBatch, type BatchContactInput } from '@/lib/contacts/batch';

/**
 * POST /api/contacts/batch
 *
 * Bulk-creates contacts from the onboarding import wizard or the
 * Suggestions panel. Also rebuilds `email_contact_matches` so past emails
 * from these senders light up the new contact's timeline immediately.
 *
 * Body: { contacts: Array<{ email: string; name?: string | null; type?: 'person'|'org' }> }
 *
 * Auth pattern: tries the **user-session client first** (RLS policy
 * `auth.uid() = user_id` allows the owner to read/write their own rows)
 * and only falls back to service-role if the user-session path errors.
 * Same defense as /api/gmail/{disconnect,suggestions,sync} — keeps the
 * route working when SUPABASE_SERVICE_ROLE_KEY is missing or rejected.
 *
 * Without this, the import wizard's "Import N contacts" button silently
 * 500'd against an "Unregistered API key" error from PostgREST, which
 * surfaced only as a small inline message in the list area — easy to miss.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[contacts/batch] service client unavailable:', e);
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => null) as { contacts?: BatchContactInput[] } | null;
  if (!body?.contacts?.length) {
    return NextResponse.json({ error: 'contacts_required' }, { status: 400 });
  }

  // Try the user-session client first. This is the path that survives a
  // broken/missing SUPABASE_SERVICE_ROLE_KEY because RLS already governs the
  // operation correctly.
  try {
    const result = await insertContactBatch(supabase, user.id, body.contacts);
    return NextResponse.json(result);
  } catch (userErr) {
    const userMsg = userErr instanceof Error ? userErr.message : String(userErr);
    console.warn('[contacts/batch] user-session insert failed, trying service role:', userMsg);

    const admin = trySvc();
    if (!admin) {
      return NextResponse.json({ error: userMsg }, { status: 500 });
    }
    try {
      const result = await insertContactBatch(admin, user.id, body.contacts);
      return NextResponse.json(result);
    } catch (svcErr) {
      const svcMsg = svcErr instanceof Error ? svcErr.message : String(svcErr);
      console.error('[contacts/batch] service-role insert also failed:', svcMsg);
      return NextResponse.json(
        { error: `${userMsg} (service-role fallback also failed: ${svcMsg})` },
        { status: 500 },
      );
    }
  }
}
