-- ─────────────────────────────────────────────────────────────────
-- 0008_contacts_source.sql
--
-- Adds a `source` column to `contacts` so we can tell apart contacts
-- the user typed by hand vs. ones the Gmail import wizard created from
-- their inbox. Without this, the "Disconnect & remove imported contacts"
-- action in Settings has no safe way to know which rows are which.
--
-- Industry parallel: HubSpot, Pipedrive, and Close all stamp every
-- contact with an origin ("Created by integration: Gmail" / "Source:
-- Email sync"). It's how those tools support "show me only contacts
-- from this integration" and "remove everything that came from this
-- integration" without users having to remember.
--
-- Values used today:
--   'manual'         — typed in the UI, imported via CSV, or seeded
--   'gmail_import'   — created by the onboarding import wizard
-- (Free-form text, not an enum, so future sources — LinkedIn, Outlook,
--  Calendly, etc. — don't require another migration.)
-- ─────────────────────────────────────────────────────────────────

alter table public.contacts
  add column if not exists source text not null default 'manual';

create index if not exists contacts_user_source_idx
  on public.contacts (user_id, source);

-- Best-effort backfill for contacts created BEFORE this migration.
-- Heuristic: a contact is "Gmail-imported-shaped" if
--   1) it has no phone / org_name / title (the wizard never sets these), AND
--   2) at least one synced email_message has from_email matching this contact's email
-- That's the exact fingerprint left by `insertContactBatch` in src/lib/contacts/batch.ts,
-- so it pinpoints the wizard rows without false-flagging hand-entered contacts who
-- happen to have emailed the user.
update public.contacts c
   set source = 'gmail_import'
 where c.source = 'manual'
   and (c.phone is null or c.phone = '')
   and (c.org_name is null or c.org_name = '')
   and (c.title is null or c.title = '')
   and exists (
     select 1
       from public.email_messages m
      where m.user_id = c.user_id
        and lower(m.from_email) = lower(c.email)
   );
