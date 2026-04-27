import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * DELETE /api/contacts/[id]
 *
 * Permanently removes a contact row owned by the signed-in user.
 *
 * Why this route exists:
 * Until now, "Delete" in the contacts grid only mutated the Zustand store
 * client-side — the DB row was never touched. That meant:
 *   1. The contact disappeared from the grid for the current session.
 *   2. After a page reload, /api/contacts re-hydrated the store from the
 *      DB and the "deleted" contacts came back.
 *   3. The Gmail import wizard's exclusion logic (`buildSuggestions`
 *      filters out senders that match an existing contact email) kept
 *      hiding those senders forever, leading to the "0 suggested / all
 *      caught up" empty state even though the user had clearly deleted
 *      that person.
 *
 * Auth pattern: user-session client first (RLS policy `auth.uid() =
 * user_id` lets the owner delete their own rows), service-role fallback
 * only if the user-session path errors. Same defensive shape as
 * /api/contacts, /api/contacts/batch, /api/gmail/{disconnect,sync,suggestions}.
 *
 * We also clean up `email_contact_matches` rows that point at this
 * contact — without this, deleting the contact and re-importing them
 * would leave orphaned match rows linking nothing.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[contacts/[id]] service client unavailable:', e);
    return null;
  }
}

async function deleteContactRow(client: SupabaseClient, userId: string, id: string) {
  // Best-effort: clear matches first so we don't orphan rows. If the
  // matches table doesn't exist or this fails, we still want the contact
  // delete to proceed.
  await client
    .from('email_contact_matches')
    .delete()
    .eq('user_id', userId)
    .eq('contact_id', id);

  const r = await client
    .from('contacts')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  return r;
}

/**
 * PATCH /api/contacts/[id]
 *
 * Updates the DB-backed fields of a single contact. Until this existed,
 * every edit (rename, fix typo in email, change job title, etc.) only
 * mutated the Zustand store — so changes vanished on page reload.
 *
 * Accepts a subset of: { name, type, email, phone, orgName, title }.
 * Other fields (tags, visibility, overviewCards, hiddenCards,
 * avatarColor, entries) are UI-only — they live in Zustand/localStorage
 * and are intentionally NOT persisted because the contacts table
 * doesn't have columns for them yet.
 */
interface UpdateBody {
  name?: string;
  type?: 'person' | 'org';
  email?: string | null;
  phone?: string | null;
  orgName?: string | null;
  title?: string | null;
}

async function updateContactRow(
  client: SupabaseClient,
  userId: string,
  id: string,
  body: UpdateBody,
) {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name?.trim() || null;
  if (body.type !== undefined) updates.type = body.type === 'org' ? 'org' : 'person';
  if (body.email !== undefined) updates.email = body.email ? body.email.trim().toLowerCase() : null;
  if (body.phone !== undefined) updates.phone = body.phone ? body.phone.trim() : null;
  if (body.orgName !== undefined) updates.org_name = body.orgName ? body.orgName.trim() : null;
  if (body.title !== undefined) updates.title = body.title ? body.title.trim() : null;

  return client
    .from('contacts')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => null) as UpdateBody | null;
  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 });
  }

  const r1 = await updateContactRow(supabase, user.id, id, body);
  if (!r1.error) {
    if (!r1.data) return NextResponse.json({ updated: false, reason: 'not_found' });
    return NextResponse.json({ updated: true, id: r1.data.id });
  }
  console.warn('[contacts/[id] PATCH] user-session update failed, trying service role:', r1.error.message);
  const admin = trySvc();
  if (!admin) return NextResponse.json({ error: r1.error.message }, { status: 500 });

  const r2 = await updateContactRow(admin, user.id, id, body);
  if (r2.error) {
    return NextResponse.json(
      { error: `${r1.error.message} (service-role fallback also failed: ${r2.error.message})` },
      { status: 500 },
    );
  }
  if (!r2.data) return NextResponse.json({ updated: false, reason: 'not_found' });
  return NextResponse.json({ updated: true, id: r2.data.id });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Try the user-session path first. RLS already governs the operation
  // (contacts table has `auth.uid() = user_id` policy).
  const r1 = await deleteContactRow(supabase, user.id, id);
  if (!r1.error) {
    if (!r1.data) {
      // No row matched — either the id is wrong or it isn't owned by
      // this user. Either way, nothing to do; treat as success so the
      // optimistic UI doesn't roll back over a phantom row.
      return NextResponse.json({ deleted: false, reason: 'not_found' });
    }
    return NextResponse.json({ deleted: true, id: r1.data.id });
  }

  console.warn('[contacts/[id]] user-session delete failed, trying service role:', r1.error.message);
  const admin = trySvc();
  if (!admin) {
    return NextResponse.json({ error: r1.error.message }, { status: 500 });
  }
  const r2 = await deleteContactRow(admin, user.id, id);
  if (r2.error) {
    return NextResponse.json(
      { error: `${r1.error.message} (service-role fallback also failed: ${r2.error.message})` },
      { status: 500 },
    );
  }
  if (!r2.data) {
    return NextResponse.json({ deleted: false, reason: 'not_found' });
  }
  return NextResponse.json({ deleted: true, id: r2.data.id });
}
