import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Dev-only: applies 0007_email_attachments.sql via the service role.
 * Adds the `attachments jsonb` column + GIN index used by the email
 * composer (outbound Roadrunner Docs) and Gmail sync (inbound attachments).
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const admin = createServiceClient();
  const filePath = path.join(process.cwd(), 'supabase', 'migrations', '0007_email_attachments.sql');
  const sql = await fs.readFile(filePath, 'utf8');

  const { data, error } = await admin.rpc('exec_sql', { sql_text: sql });
  if (error) {
    return NextResponse.json({
      ok: false,
      fallback: 'paste_into_supabase_sql_editor',
      sqlToPaste: sql,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      rpc_error: error.message,
    }, { status: 200 });
  }

  return NextResponse.json({ ok: true, result: data });
}
