-- Attachment metadata on email_messages.
--
-- Stored inline as JSONB rather than in a separate table because:
--   * Attachments are always read alongside their email row (never standalone),
--     so a join would be pure overhead.
--   * We don't store file bytes here — outbound attachments live in the user's
--     Gmail Sent message; inbound attachments are fetched on demand via
--     users.messages.attachments.get using the gmailAttachmentId stashed in
--     the JSON. Supabase egress / storage cost stays flat at email volume.
--   * Gmail itself models attachments as part-of-message metadata, not a
--     first-class entity. HubSpot's email activity timeline uses the same
--     inline-JSON shape for the same reason.
--
-- Shape: [{ filename, mimeType, size, documentId?, gmailAttachmentId? }]
--   documentId       — outbound: CrmDocument id this was attached from
--   gmailAttachmentId — inbound: Gmail's opaque id for lazy-fetch
--
-- If we later need cross-contact attachment search ("find every email that
-- attached the 2026-Q3 proposal"), promote to a proper table with a foreign
-- key back to email_messages. At current volume a GIN index on the JSON
-- suffices.

alter table public.email_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- GIN index supports "emails mentioning this documentId / filename" lookups
-- via @> containment. Cheap on volume we expect.
create index if not exists email_messages_attachments_gin_idx
  on public.email_messages using gin (attachments jsonb_path_ops);
