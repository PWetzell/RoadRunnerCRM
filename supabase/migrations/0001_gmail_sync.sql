-- ─────────────────────────────────────────────────────────────────
-- Gmail sync schema + RLS
--
-- Tables:
--   gmail_connections       → stores the Gmail OAuth refresh token
--                             so we can pull mail without the user online
--   email_messages          → every synced Gmail message, per user
--   email_contact_matches   → which CRM contacts appear in each message
--   contacts                → minimal table so Gmail sync can join on email;
--                             extend freely to mirror the Zustand store shape
--
-- Every table is scoped by user_id with RLS so one customer can't see
-- another's mail. The service-role key (server-side only) bypasses RLS
-- for the sync + send routes.
-- ─────────────────────────────────────────────────────────────────

-- ─── CONTACTS (extend as you migrate the Zustand store to DB) ───
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  email         text,
  org_name      text,
  title         text,
  phone         text,
  type          text check (type in ('person', 'org')) default 'person',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists contacts_user_email_idx on public.contacts (user_id, lower(email));

-- ─── GMAIL CONNECTIONS ───
create table if not exists public.gmail_connections (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  email                   text,
  provider_refresh_token  text not null,
  provider_access_token   text,
  connected_at            timestamptz not null default now(),
  last_sync_at            timestamptz,
  sync_enabled            boolean not null default true
);

-- ─── EMAIL MESSAGES ───
create table if not exists public.email_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  gmail_message_id  text not null,
  thread_id         text not null,
  from_email        text,
  from_name         text,
  to_emails         text[] not null default '{}',
  cc_emails         text[] not null default '{}',
  subject           text,
  body_text         text,
  body_html         text,
  snippet           text,
  label_ids         text[] not null default '{}',
  received_at       timestamptz not null,
  created_at        timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);
create index if not exists email_messages_user_received_idx
  on public.email_messages (user_id, received_at desc);
create index if not exists email_messages_thread_idx
  on public.email_messages (user_id, thread_id);

-- ─── EMAIL ↔ CONTACT MATCHES ───
create table if not exists public.email_contact_matches (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.email_messages(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  match_type  text not null check (match_type in ('from', 'to', 'cc', 'bcc')),
  created_at  timestamptz not null default now(),
  unique (message_id, contact_id, match_type)
);
create index if not exists email_contact_matches_contact_idx
  on public.email_contact_matches (contact_id);

-- ─── ROW-LEVEL SECURITY ───
alter table public.contacts                enable row level security;
alter table public.gmail_connections       enable row level security;
alter table public.email_messages          enable row level security;
alter table public.email_contact_matches   enable row level security;

-- Each user can only see their own rows.
create policy "contacts_owner" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gmail_connections_owner" on public.gmail_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "email_messages_owner" on public.email_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Matches inherit visibility from the parent message (same user_id).
create policy "email_contact_matches_owner" on public.email_contact_matches
  for all using (
    exists (
      select 1 from public.email_messages m
      where m.id = email_contact_matches.message_id and m.user_id = auth.uid()
    )
  );

-- updated_at trigger for contacts
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
