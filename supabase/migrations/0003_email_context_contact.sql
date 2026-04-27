-- ─────────────────────────────────────────────────────────────────
-- Migration 0003 — email_messages.context_contact_id
-- ─────────────────────────────────────────────────────────────────
-- Why: the contact-association pattern used by HubSpot/Salesforce/Pipedrive
-- is "whichever record the composer was opened from owns this email",
-- not "whichever recipient address happens to match a contact row".
-- Our existing email_contact_matches table enforced that via a UUID
-- contact_id column, which blows up for demo/seed contacts whose IDs
-- live only client-side (e.g. 'per-90'). A plain TEXT column on the
-- message row gives us an origin tag that works for UUID and non-UUID
-- contact ids alike — the read path then treats it as a second
-- matching predicate alongside recipient-address matching.
-- ─────────────────────────────────────────────────────────────────

alter table public.email_messages
  add column if not exists context_contact_id text;

create index if not exists email_messages_user_context_contact_idx
  on public.email_messages (user_id, context_contact_id)
  where context_contact_id is not null;
