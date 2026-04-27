import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Dev-only: NOTIFY pgrst, 'reload schema'.
 *
 * After running a migration that adds columns, PostgREST keeps the old schema
 * cached and returns "column X does not exist" errors for up to ~10 minutes
 * until the cache refreshes. This endpoint forces an immediate reload.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }
  const admin = createServiceClient();
  const { error } = await admin.rpc('exec_sql', {
    sql_text: `notify pgrst, 'reload schema';`,
  });
  if (error) {
    return NextResponse.json({
      ok: false,
      fallback: 'paste_into_supabase_sql_editor',
      sqlToPaste: `notify pgrst, 'reload schema';`,
      rpc_error: error.message,
    });
  }
  return NextResponse.json({ ok: true });
}
