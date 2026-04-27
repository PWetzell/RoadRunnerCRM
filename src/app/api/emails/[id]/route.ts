import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * PATCH /api/emails/:id — toggle archive / pin state.
 *
 * Body: { archived?: boolean, pinned?: boolean }
 *
 * Archived emails disappear from the per-contact Emails tab but remain in
 * the Activity Log (with an "archived" badge). Same pattern as Gmail's
 * archive button and HubSpot's timeline "Move to Archived".
 *
 * Pinned emails bubble to the top of the Emails tab regardless of date.
 * HubSpot / Folk pattern; Gmail stars do the same job.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const hasArchived = typeof body?.archived === 'boolean';
  const hasPinned = typeof body?.pinned === 'boolean';
  const hasTags = Array.isArray(body?.tags);
  if (!hasArchived && !hasPinned && !hasTags) {
    return NextResponse.json({ error: 'no_op' }, { status: 400 });
  }
  // Normalize: lowercase, trim, dedupe, cap length.
  const normalizedTags = hasTags
    ? Array.from(new Set(
        (body.tags as unknown[])
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 40)
      )).slice(0, 20)
    : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let db = supabase;
  try {
    const admin = createServiceClient();
    const probe = await admin.from('email_messages').select('id').eq('user_id', user.id).limit(1);
    if (!probe.error) db = admin;
  } catch {
    /* keep user session */
  }

  const update: Record<string, string | string[] | null> = {};
  if (hasArchived) update.archived_at = body.archived ? new Date().toISOString() : null;
  if (hasPinned) update.pinned_at = body.pinned ? new Date().toISOString() : null;
  if (normalizedTags) update.tags = normalizedTags;

  async function applyUpdate(u: Record<string, string | string[] | null>) {
    return db.from('email_messages').update(u).eq('id', id).eq('user_id', user!.id);
  }

  const { error } = await applyUpdate(update);

  if (error) {
    // Column-missing fallback: drop any field whose column is still absent.
    const msg = error.message || '';
    const retryUpdate = { ...update };
    let dropped = false;
    if (/pinned_at/i.test(msg) && 'pinned_at' in retryUpdate) { delete retryUpdate.pinned_at; dropped = true; }
    if (/\btags\b/i.test(msg) && 'tags' in retryUpdate) { delete retryUpdate.tags; dropped = true; }
    if (dropped && Object.keys(retryUpdate).length > 0) {
      const { error: retryErr } = await applyUpdate(retryUpdate);
      if (retryErr) return NextResponse.json({ error: retryErr.message }, { status: 500 });
      return NextResponse.json({
        ok: true,
        archived: hasArchived ? body.archived : undefined,
        pinned: hasPinned ? body.pinned : undefined,
        tags: normalizedTags ?? undefined,
        note: 'one or more optional columns missing; run latest migration',
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    archived: hasArchived ? body.archived : undefined,
    pinned: hasPinned ? body.pinned : undefined,
    tags: normalizedTags ?? undefined,
  });
}
