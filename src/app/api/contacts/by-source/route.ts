import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * /api/contacts/by-source
 *
 * Tools for surfaces that show "contacts that came from integration X."
 * Today only the Gmail import wizard ('gmail_import'), but the shape
 * generalizes to future sources.
 *
 *   GET  ?source=gmail_import[&previewLimit=20]
 *        → { count, preview: [{ id, name, email, created_at }] }
 *   DELETE  ?source=gmail_import
 *        → { ok: true, removed: N }
 *
 * Both verbs try the **user-session client first** (RLS lets the user read
 * + delete their own contacts) and only fall back to service-role if that
 * errors. Same pattern as /api/gmail/disconnect — survives a missing or
 * broken `SUPABASE_SERVICE_ROLE_KEY` in dev.
 */

const ALLOWED_SOURCES = new Set(['gmail_import', 'manual', 'csv_import']);

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[contacts/by-source] service client unavailable:', e);
    return null;
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') ?? '';
  const previewLimit = Math.max(0, Math.min(100, Number(searchParams.get('previewLimit') ?? 20)));
  if (!ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 400 });
  }

  // Count via user session first.
  let count = 0;
  let countErrMsg: string | null = null;
  {
    const r = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source', source);
    if (typeof r.count === 'number' && !r.error) {
      count = r.count;
    } else if (r.error) {
      countErrMsg = r.error.message;
      const admin = trySvc();
      if (admin) {
        const r2 = await admin
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('source', source);
        if (typeof r2.count === 'number' && !r2.error) {
          count = r2.count;
          countErrMsg = null;
        } else if (r2.error) {
          countErrMsg = r2.error.message;
        }
      }
    }
  }
  if (countErrMsg) {
    if (/\bsource\b/i.test(countErrMsg)) {
      return NextResponse.json({ error: 'source_column_missing', migration: '0008' }, { status: 409 });
    }
    return NextResponse.json({ error: countErrMsg }, { status: 500 });
  }

  let preview: Array<{ id: string; name: string; email: string; created_at: string }> = [];
  if (previewLimit > 0) {
    const r = await supabase
      .from('contacts')
      .select('id, name, email, created_at')
      .eq('user_id', user.id)
      .eq('source', source)
      .order('created_at', { ascending: false })
      .limit(previewLimit);
    if (r.error) {
      const admin = trySvc();
      if (admin) {
        const r2 = await admin
          .from('contacts')
          .select('id, name, email, created_at')
          .eq('user_id', user.id)
          .eq('source', source)
          .order('created_at', { ascending: false })
          .limit(previewLimit);
        if (!r2.error) preview = (r2.data as typeof preview) ?? [];
      }
    } else {
      preview = (r.data as typeof preview) ?? [];
    }
  }

  return NextResponse.json({ count, preview });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') ?? '';
  if (!ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 400 });
  }

  // Count first so we can report it back to the toast.
  let before = 0;
  {
    const r = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source', source);
    if (typeof r.count === 'number' && !r.error) {
      before = r.count;
    } else if (r.error) {
      if (/\bsource\b/i.test(r.error.message || '')) {
        return NextResponse.json({ error: 'source_column_missing', migration: '0008' }, { status: 409 });
      }
      const admin = trySvc();
      if (admin) {
        const r2 = await admin
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('source', source);
        before = r2.count ?? 0;
      }
    }
  }

  if (before === 0) return NextResponse.json({ ok: true, removed: 0 });

  // Delete via user session, fall back to service role.
  let delErrMsg: string | null = null;
  {
    const r = await supabase
      .from('contacts')
      .delete()
      .eq('user_id', user.id)
      .eq('source', source);
    if (r.error) {
      console.warn('[contacts/by-source] user-session delete failed, trying service role:', r.error.message);
      const admin = trySvc();
      if (!admin) {
        delErrMsg = r.error.message;
      } else {
        const r2 = await admin
          .from('contacts')
          .delete()
          .eq('user_id', user.id)
          .eq('source', source);
        if (r2.error) {
          delErrMsg = `${r.error.message} (fallback also failed: ${r2.error.message})`;
        }
      }
    }
  }
  if (delErrMsg) {
    console.error('[contacts/by-source] delete failed:', delErrMsg);
    return NextResponse.json({ error: delErrMsg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removed: before });
}
