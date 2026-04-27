import type { SupabaseClient } from '@supabase/supabase-js';
import { generateTrackingToken, instrumentHtml, wrapPlainTextAsTrackedHtml } from './tracking';
import type { EmailAttachment } from '@/types/email-attachment';

/**
 * After a successful Gmail send, persist the outgoing message into the
 * local `email_messages` table and link it to any matching CRM contacts via
 * `email_contact_matches`. Done eagerly so the Activity tab on the contact
 * card refreshes immediately — the nightly/manual Gmail sync will later
 * upsert the same row (idempotent on `user_id + gmail_message_id`).
 *
 * Matching rules:
 *   - Every recipient (To + Cc) is looked up in `contacts` for this user.
 *     When found, a match row is added with type 'to' or 'cc'.
 *   - If the caller passed `contactIdHint` (the contact the user clicked
 *     "Send email" from), we upsert a match for that id even if the address
 *     typed in "To" doesn't exactly equal contact.email — prevents the
 *     timeline from missing the email the user just composed.
 */
export interface PreparedOutgoing {
  token: string;
  bodyHtml: string;
  bodyText: string;
}

/**
 * Prepares the outgoing body for send: generates a tracking token, builds
 * an HTML body (either instrumenting any the caller supplied or wrapping
 * plain text into a minimal tracked HTML document), and returns the final
 * bytes that should go to `sendMessage` plus the token to persist.
 *
 * `appBaseUrl` is used to build absolute URLs for the pixel + click
 * endpoints — tracking links must resolve from the recipient's inbox, not
 * relative to our app.
 */
export function prepareOutgoingBody(input: {
  bodyText: string;
  bodyHtml?: string;
  appBaseUrl: string;
}): PreparedOutgoing {
  const token = generateTrackingToken();
  const html = input.bodyHtml && input.bodyHtml.trim().length > 0
    ? instrumentHtml(input.bodyHtml, { appBaseUrl: input.appBaseUrl, token })
    : wrapPlainTextAsTrackedHtml(input.bodyText, { appBaseUrl: input.appBaseUrl, token });
  return { token, bodyHtml: html, bodyText: input.bodyText };
}

export async function persistOutgoingMessage(
  admin: SupabaseClient,
  input: {
    userId: string;
    userEmail: string | null;
    to: string;
    cc?: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    gmailId: string;
    threadId: string;
    contactIdHint?: string;
    trackingToken?: string;
    /** Sent-attachment metadata sourced from Roadrunner Documents. The
     *  actual bytes live in the user's Gmail Sent message — we only store
     *  filename/mime/size/documentId here for display + provenance. */
    attachments?: EmailAttachment[];
  },
): Promise<{ messageRowId: string | null; matchesLinked: number }> {
  const toEmails = splitAddresses(input.to);
  const ccEmails = splitAddresses(input.cc);
  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    user_id: input.userId,
    gmail_message_id: input.gmailId,
    thread_id: input.threadId,
    from_email: (input.userEmail || '').toLowerCase() || null,
    from_name: null,
    to_emails: toEmails,
    cc_emails: ccEmails,
    subject: input.subject,
    body_text: input.bodyText,
    body_html: input.bodyHtml ?? null,
    snippet: (input.bodyText || '').slice(0, 200),
    label_ids: ['SENT'],
    received_at: now,
  };
  if (input.trackingToken) row.tracking_token = input.trackingToken;
  // Origin-tag: stores whichever contact id the composer was opened from,
  // UUID or demo/client-side ('per-90'). The read path uses this to keep
  // the email visible on the originating contact's card regardless of what
  // got typed in the To field. Industry-standard (HubSpot/Salesforce).
  if (input.contactIdHint) row.context_contact_id = input.contactIdHint;
  if (input.attachments && input.attachments.length > 0) row.attachments = input.attachments;

  // Degrade gracefully when optional columns (tracking_token,
  // context_contact_id, attachments) haven't been migrated yet — retry
  // with just the core columns so a missing DDL push doesn't block sends.
  async function attemptUpsert(): Promise<{ id: string } | null> {
    const attempt = await admin
      .from('email_messages')
      .upsert(row, { onConflict: 'user_id,gmail_message_id' })
      .select('id')
      .single();
    if (!attempt.error) return attempt.data;
    const msg = attempt.error.message || '';
    if (/\battachments\b/i.test(msg) && 'attachments' in row) {
      delete row.attachments;
      return attemptUpsert();
    }
    if (/context_contact_id/i.test(msg) && 'context_contact_id' in row) {
      delete row.context_contact_id;
      return attemptUpsert();
    }
    if (/tracking_token/i.test(msg) && 'tracking_token' in row) {
      delete row.tracking_token;
      return attemptUpsert();
    }
    console.error('[persistOutgoingMessage] upsert failed', msg);
    return null;
  }
  const inserted = await attemptUpsert();
  if (!inserted) return { messageRowId: null, matchesLinked: 0 };
  const messageRowId = inserted.id as string;

  const allAddresses = Array.from(new Set([...toEmails, ...ccEmails]));

  const contactIds = new Map<string, 'to' | 'cc'>();
  if (allAddresses.length > 0) {
    const { data: matchedContacts } = await admin
      .from('contacts')
      .select('id, email')
      .eq('user_id', input.userId)
      .in('email', allAddresses);
    for (const c of matchedContacts ?? []) {
      if (!c.email) continue;
      const e = c.email.toLowerCase();
      if (toEmails.includes(e)) contactIds.set(c.id, 'to');
      else if (ccEmails.includes(e)) contactIds.set(c.id, 'cc');
    }
  }
  if (input.contactIdHint && !contactIds.has(input.contactIdHint)) {
    contactIds.set(input.contactIdHint, 'to');
  }

  const matchRows = Array.from(contactIds.entries()).map(([contact_id, match_type]) => ({
    message_id: messageRowId,
    contact_id,
    match_type,
  }));

  if (matchRows.length > 0) {
    await admin
      .from('email_contact_matches')
      .upsert(matchRows, { onConflict: 'message_id,contact_id,match_type', ignoreDuplicates: true });
  }

  return { messageRowId, matchesLinked: matchRows.length };
}

function splitAddresses(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => {
      const match = s.match(/<([^>]+)>/);
      return (match ? match[1] : s).trim().toLowerCase();
    })
    .filter(Boolean);
}
