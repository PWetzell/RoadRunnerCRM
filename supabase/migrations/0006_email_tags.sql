-- Free-form tags on email_messages.
-- User-defined labels like "Contract", "Intro", "Objection" — applied inline,
-- no separate taxonomy table. Matches Gmail's label model and Folk's inline
-- tags. Stored as lowercase text[] so membership queries are O(log n) via GIN.
--
-- If this grows past ~50 tags or needs color/description metadata, promote to
-- a proper `email_labels` table + `email_message_labels` join. Not worth the
-- complexity while the library stays small.

alter table public.email_messages
  add column if not exists tags text[] not null default '{}';

create index if not exists email_messages_tags_gin_idx
  on public.email_messages using gin (tags);
