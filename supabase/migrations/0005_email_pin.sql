-- Pin flag for email_messages.
-- Pinned emails bubble to the top of the per-contact Emails tab regardless
-- of received_at, so users can keep "the contract", "the intro thread", or
-- "the latest ask" always in view. Pattern matches HubSpot's pin-to-timeline
-- and Folk's pinned messages. Gmail uses stars for the same job-to-be-done.
--
-- pinned_at doubles as sort key: most recently pinned first inside the
-- pinned section, falling back to received_at for the rest.

alter table public.email_messages
  add column if not exists pinned_at timestamptz;

create index if not exists email_messages_user_pinned_idx
  on public.email_messages (user_id, pinned_at desc)
  where pinned_at is not null;
