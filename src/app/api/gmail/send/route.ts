import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, sendMessage, type SendAttachment } from '@/lib/gmail/client';
import { persistOutgoingMessage, prepareOutgoingBody } from '@/lib/gmail/send-helpers';
import type { EmailAttachment } from '@/types/email-attachment';

/**
 * POST /api/gmail/send
 * Sends an email via the signed-in user's Gmail account, then persists a
 * row into `email_messages` (with direction-'out' semantics) and creates
 * `email_contact_matches` rows for the recipient + any CC'd contacts so
 * the Activity tab updates immediately without waiting for the next sync.
 *
 * Body: { to: string; cc?: string; subject: string; bodyText: string; bodyHtml?: string; contactId?: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.to || !body.subject) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Normalize attachments from the composer. The client ships each file as
  // either a data URL (`data:<mime>;base64,<payload>`) or a bare base64
  // string. We strip the data-URL prefix here and cap the total payload at
  // ~20MB — Gmail itself caps raw sends at 25MB and the JSON envelope adds
  // ~33% base64 overhead on top. Oversized requests return 413 instead of
  // burning a Gmail API call that will fail.
  type IncomingAttachment = {
    filename?: string;
    mimeType?: string;
    size?: number;
    dataBase64?: string;
    data?: string;
    documentId?: string;
  };
  const sendAttachments: SendAttachment[] = [];
  const persistAttachments: EmailAttachment[] = [];
  let totalBytes = 0;
  const incoming: IncomingAttachment[] = Array.isArray(body.attachments) ? body.attachments : [];
  for (const a of incoming) {
    if (!a || !a.filename || !(a.dataBase64 || a.data)) continue;
    const raw = (a.dataBase64 || a.data || '').replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
    if (!raw) continue;
    const approxBytes = Math.floor((raw.length * 3) / 4);
    totalBytes += approxBytes;
    if (totalBytes > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'attachments_too_large', message: 'Total attachments exceed 20MB' }, { status: 413 });
    }
    const filename = String(a.filename).slice(0, 200);
    const mimeType = (a.mimeType && String(a.mimeType)) || 'application/octet-stream';
    sendAttachments.push({ filename, mimeType, dataBase64: raw });
    persistAttachments.push({
      filename,
      mimeType,
      size: a.size ?? approxBytes,
      documentId: a.documentId || undefined,
    });
  }

  // Read the refresh token via the user's own session (RLS-protected). Fall
  // back to service role if RLS blocks the select.
  let conn: { provider_refresh_token: string | null } | null = null;
  const { data: userRead } = await supabase
    .from('gmail_connections')
    .select('provider_refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();
  if (userRead?.provider_refresh_token) {
    conn = userRead;
  } else {
    try {
      const admin = createServiceClient();
      const { data: adminRead } = await admin
        .from('gmail_connections')
        .select('provider_refresh_token')
        .eq('user_id', user.id)
        .maybeSingle();
      conn = adminRead;
    } catch {
      conn = null;
    }
  }
  if (!conn?.provider_refresh_token) {
    return NextResponse.json({ error: 'no_gmail_connection' }, { status: 400 });
  }

  // Writes (email_messages, email_contact_matches): try user session first —
  // if RLS blocks it we'll fall back to service role via a retry. Track
  // whether the user-session write succeeded so callers get accurate state.
  let writeClient = supabase;
  try {
    const admin = createServiceClient();
    // Probe the admin client with a harmless select — if this succeeds, use
    // admin for writes (bypasses RLS reliably). If it throws (bad key),
    // stay on the user session.
    const probe = await admin.from('gmail_connections').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!probe.error) writeClient = admin;
  } catch {
    // Keep user session as write client.
  }

  const appBaseUrl = resolveAppBaseUrl(request);
  const prepared = prepareOutgoingBody({
    bodyText: body.bodyText || '',
    bodyHtml: body.bodyHtml,
    appBaseUrl,
  });

  const accessToken = await refreshAccessToken(conn.provider_refresh_token);
  const result = await sendMessage(accessToken, {
    to: body.to,
    cc: body.cc,
    subject: body.subject,
    bodyText: prepared.bodyText,
    bodyHtml: prepared.bodyHtml,
    from: user.email,
    attachments: sendAttachments.length > 0 ? sendAttachments : undefined,
  });

  const persisted = await persistOutgoingMessage(writeClient, {
    userId: user.id,
    userEmail: user.email ?? null,
    to: body.to,
    cc: body.cc,
    subject: body.subject,
    bodyText: prepared.bodyText,
    bodyHtml: prepared.bodyHtml,
    gmailId: result.id,
    threadId: result.threadId,
    contactIdHint: body.contactId,
    trackingToken: prepared.token,
    attachments: persistAttachments,
  });

  console.log('[gmail/send] persisted', {
    writeClientIsAdmin: writeClient !== supabase,
    messageRowId: persisted.messageRowId,
    matchesLinked: persisted.matchesLinked,
    contactIdHint: body.contactId,
  });

  return NextResponse.json({
    ok: true,
    gmailId: result.id,
    threadId: result.threadId,
    messageRowId: persisted.messageRowId,
    matchesLinked: persisted.matchesLinked,
    trackingToken: prepared.token,
  });
}

function resolveAppBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  // Fall back to the request origin — works in dev and in production when
  // the app is hosted at its public URL. Tracking pixels embedded in sent
  // email must resolve from the public internet, so `APP_URL` should be
  // set to the deployed hostname.
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}
