-- Archive flag for email_messages.
-- Archiving hides the email from the per-contact Emails tab but keeps it
-- in the Activity Log, so users can "clean up" noisy threads without losing
-- the record of having sent/received them. Pattern matches Gmail archive
-- and HubSpot's "Move to Archived" on timeline items.

alter table public.email_messages
  add column if not exists archived_at timestamptz;

create index if not exists email_messages_user_archived_idx
  on public.email_messages (user_id, archived_at)
  where archived_at is null;
