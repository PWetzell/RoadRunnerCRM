/**
 * Shape of a single email attachment persisted alongside an email_message row
 * (stored as JSONB in `email_messages.attachments`).
 *
 * Two provenance paths converge into this shape:
 *
 *  1. Outbound — attachment came from Roadrunner's Documents library when the
 *     user composed an email. `documentId` points back at the CrmDocument so
 *     the UI can link the attachment chip to the Documents tab and offers a
 *     "view in library" affordance. The actual bytes live in the Gmail
 *     message the user's Gmail account already stored — we don't re-store
 *     file data in Supabase (expensive, redundant, and the user authorized
 *     Gmail, not us, to be the archive).
 *
 *  2. Inbound — attachment arrived in a Gmail message pulled by /gmail/sync.
 *     `gmailAttachmentId` is Gmail's opaque id used with the
 *     users.messages.attachments.get endpoint; we defer fetching the bytes
 *     until the user asks for them ("Save to Documents" or "Download").
 *     Gmail billing-wise this is free; the alternative (preload every
 *     attachment on sync) would rack up egress for files users never look
 *     at. HubSpot / Pipedrive both lazy-load inbound attachments for the
 *     same reason.
 *
 * The two kinds are distinguished by which id is populated. `filename`,
 * `mimeType`, `size` are always available for display.
 */
export interface EmailAttachment {
  /** Display name ("Proposal-v3.pdf"). */
  filename: string;
  /** Gmail/Internet media type, e.g. 'application/pdf'. */
  mimeType: string;
  /** Bytes. 0 if unknown. */
  size: number;
  /** Outbound: CrmDocument.id the attachment was sourced from. */
  documentId?: string;
  /** Inbound: Gmail's attachment id, used to lazy-fetch the bytes. */
  gmailAttachmentId?: string;
  /** Gmail message id (id column on email_messages). Used for inbound
   *  download routing — we don't duplicate it on every row in queries but
   *  the client receives it on the emails DTO for convenience. */
  messageRowId?: string;
}

/** Outbound payload shape: the bytes we ship to /api/gmail/send. */
export interface OutgoingAttachmentPayload {
  filename: string;
  mimeType: string;
  /** Base64 (NOT base64url) — the Gmail multipart MIME encoder wraps at 76 cols. */
  dataBase64: string;
  /** Optional CrmDocument.id for provenance. */
  documentId?: string;
  size?: number;
}
