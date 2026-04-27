import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, sendMessage } from '@/lib/gmail/client';
import { persistOutgoingMessage, prepareOutgoingBody } from '@/lib/gmail/send-helpers';

/**
 * Dev-only mirror of POST /api/gmail/send. Resolves the user by email via
 * service role (no cookie session) so the preview sandbox can exercise the
 * full send + persist pipeline end-to-end.
 *
 * Body: { email, to, cc?, subject, bodyText, bodyHtml?, contactId? }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { email, to, cc, subject, bodyText, bodyHtml, contactId } = body as {
    email?: string;
    to?: string;
    cc?: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    contactId?: string;
  };
  if (!email || !to || !subject) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const { data: conn } = await admin
    .from('gmail_connections')
    .select('provider_refresh_token')
    .eq('user_id', user.id)
    .single();
  if (!conn?.provider_refresh_token) {
    return NextResponse.json({ error: 'no_gmail_connection' }, { status: 400 });
  }

  const u = new URL(request.url);
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || `${u.protocol}//${u.host}`).replace(/\/$/, '');
  const prepared = prepareOutgoingBody({
    bodyText: bodyText || '',
    bodyHtml,
    appBaseUrl,
  });

  const accessToken = await refreshAccessToken(conn.provider_refresh_token);
  const result = await sendMessage(accessToken, {
    to,
    cc,
    subject,
    bodyText: prepared.bodyText,
    bodyHtml: prepared.bodyHtml,
    from: user.email,
  });

  const persisted = await persistOutgoingMessage(admin, {
    userId: user.id,
    userEmail: user.email ?? null,
    to,
    cc,
    subject,
    bodyText: prepared.bodyText,
    bodyHtml: prepared.bodyHtml,
    gmailId: result.id,
    threadId: result.threadId,
    contactIdHint: contactId,
    trackingToken: prepared.token,
  });

  return NextResponse.json({
    ok: true,
    gmailId: result.id,
    threadId: result.threadId,
    messageRowId: persisted.messageRowId,
    matchesLinked: persisted.matchesLinked,
    trackingToken: prepared.token,
    appBaseUrl,
  });
}
