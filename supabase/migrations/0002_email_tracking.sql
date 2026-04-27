-- ─────────────────────────────────────────────────────────────────
-- 0002_email_tracking.sql
-- Open + click tracking for outbound Gmail sends (Step 5 of the
-- hybrid-CRM rollout). Adds columns to email_messages so we can
-- count pixel loads and click-through redirects, plus a tracking_token
-- that's embedded in the outgoing HTML so the tracking endpoints can
-- resolve back to a specific message without exposing the DB id.
--
-- Pattern mirrors HubSpot Sales / Close / Salesforce:
--   • Outgoing message gets a unique token at send-time.
--   • `<img src="/api/track/pixel/{token}">` embedded at the end of
--     the HTML body records opens (idempotent-ish counter).
--   • Any <a href> links get rewritten to `/api/track/click/{token}?
--     url=...` which 302-redirects after recording the click.
-- ─────────────────────────────────────────────────────────────────

alter table public.email_messages
  add column if not exists tracking_token      text,
  add column if not exists open_count          integer not null default 0,
  add column if not exists first_opened_at     timestamptz,
  add column if not exists last_opened_at      timestamptz,
  add column if not exists click_count         integer not null default 0,
  add column if not exists first_clicked_at    timestamptz,
  add column if not exists last_clicked_at     timestamptz;

create unique index if not exists email_messages_tracking_token_idx
  on public.email_messages (tracking_token)
  where tracking_token is not null;
