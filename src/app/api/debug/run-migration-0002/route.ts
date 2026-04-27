import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Dev-only: applies the 0002_email_tracking.sql migration via the service
 * role. The project doesn't yet have a supabase-cli-driven migration runner
 * in CI, so this endpoint lets us push schema changes the same way we ran
 * 0001_gmail_sync.sql — one POST from the preview sandbox.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const admin = createServiceClient();
  const filePath = path.join(process.cwd(), 'supabase', 'migrations', '0002_email_tracking.sql');
  const sql = await fs.readFile(filePath, 'utf8');

  // Supabase JS client can't run arbitrary DDL — use the PostgREST RPC
  // `exec_sql` if it exists; otherwise we return the SQL back so the user
  // can paste it into the Supabase SQL editor.
  const { data, error } = await admin.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // exec_sql isn't installed. Return a single SQL blob that installs the
    // helper + runs this migration — one paste in Supabase SQL editor and
    // future migrations can be applied through this endpoint automatically.
    const installerPlusMigration = buildInstallerPlus(sql);
    return NextResponse.json({
      ok: false,
      fallback: 'paste_combined_sql_into_supabase_sql_editor',
      sqlToPaste: installerPlusMigration,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      instructions:
        '1) Open Supabase → SQL Editor. 2) Paste the `sqlToPaste` value. 3) Run. After that, POSTing here (or any future migration endpoint) will apply schema changes automatically.',
      rpc_error: error.message,
    }, { status: 200 });
  }

  return NextResponse.json({ ok: true, result: data });
}

function buildInstallerPlus(migrationSql: string): string {
  return [
    '-- One-time installer: lets the service-role key run DDL through PostgREST.',
    '-- Safe to run repeatedly (CREATE OR REPLACE).',
    'create or replace function public.exec_sql(sql_text text)',
    'returns void',
    'language plpgsql',
    'security definer',
    'as $$',
    'begin',
    '  execute sql_text;',
    'end;',
    '$$;',
    '',
    '-- Restrict to service_role only (authenticated / anon have no execute).',
    'revoke all on function public.exec_sql(text) from public;',
    'revoke all on function public.exec_sql(text) from anon;',
    'revoke all on function public.exec_sql(text) from authenticated;',
    'grant execute on function public.exec_sql(text) to service_role;',
    '',
    '-- Migration 0002 — email open + click tracking.',
    migrationSql,
  ].join('\n');
}
