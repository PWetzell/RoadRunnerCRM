-- ─────────────────────────────────────────────────────────────────
-- 0000_exec_sql_installer.sql
-- ONE-TIME paste for the Supabase SQL editor. Installs `public.exec_sql`,
-- a security-definer wrapper that lets the service-role key apply future
-- migrations via PostgREST (`admin.rpc('exec_sql', { sql_text: ... })`).
-- After running this once, POST /api/debug/run-migration-NNNN will apply
-- schema changes automatically — no more paste-into-SQL-editor round trip.
--
-- Security: revokes execute from every role except `service_role`, so only
-- our server-side admin client can invoke it.
-- ─────────────────────────────────────────────────────────────────

create or replace function public.exec_sql(sql_text text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql_text;
end;
$$;

revoke all on function public.exec_sql(text) from public;
revoke all on function public.exec_sql(text) from anon;
revoke all on function public.exec_sql(text) from authenticated;
grant execute on function public.exec_sql(text) to service_role;
