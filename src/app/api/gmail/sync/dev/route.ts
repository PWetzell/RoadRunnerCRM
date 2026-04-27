import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, listMessageIds, getMessage, parseMessage } from '@/lib/gmail/client';

/**
 * Dev-only sync trigger. Skips cookie auth and uses the service role to
 * look up a user by email. Gated on NODE_ENV !== 'production'.
 *
 * Body: { email: string; pageSize?: number; since?: string; q?: string }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const { email, pageSize, since, q }: { email: string; pageSize?: number; since?: string; q?: string } =
    await request.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

  const admin = createServiceClient();

  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const { data: conn, error: connErr } = await admin
    .from('gmail_connections')
    .select('provider_refresh_token, last_sync_at')
    .eq('user_id', user.id)
    .single();
  if (connErr || !conn?.provider_refresh_token) {
    return NextResponse.json({ error: 'no_gmail_connection', detail: connErr?.message }, { status: 400 });
  }

  const accessToken = await refreshAccessToken(conn.provider_refresh_token);

  const parts: string[] = [];
  if (q) parts.push(q);
  else {
    const afterDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    parts.push(`after:${afterDate.replace(/-/g, '/')}`);
    parts.push('(in:inbox OR in:sent)');
  }
  const query = parts.join(' ');

  const { ids } = await listMessageIds(accessToken, { q: query, maxResults: pageSize ?? 25 });

  const parsed = await Promise.all(ids.map(async (id) => {
    try { return parseMessage(await getMessage(accessToken, id)); } catch { return null; }
  }));
  const messages = parsed.filter((m): m is NonNullable<typeof m> => m !== null);

  if (messages.length === 0) {
    await admin.from('gmail_connections').update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id);
    return NextResponse.json({ user_id: user.id, synced: 0, matched: 0, query });
  }

  const rows = messages.map((m) => ({
    user_id: user.id,
    gmail_message_id: m.gmailId,
    thread_id: m.threadId,
    from_email: m.from,
    from_name: m.fromName ?? null,
    to_emails: m.to,
    cc_emails: m.cc,
    subject: m.subject,
    body_text: m.bodyText,
    body_html: m.bodyHtml,
    snippet: m.snippet,
    label_ids: m.labelIds,
    received_at: m.receivedAt,
  }));
  const { data: inserted, error: insertErr } = await admin
    .from('email_messages')
    .upsert(rows, { onConflict: 'user_id,gmail_message_id' })
    .select('id, from_email, to_emails, cc_emails, subject, received_at');
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const allEmails = new Set<string>();
  inserted?.forEach((m) => {
    if (m.from_email) allEmails.add(m.from_email.toLowerCase());
    (m.to_emails || []).forEach((e: string) => allEmails.add(e.toLowerCase()));
    (m.cc_emails || []).forEach((e: string) => allEmails.add(e.toLowerCase()));
  });

  let matchedCount = 0;
  if (allEmails.size > 0) {
    const { data: contacts } = await admin
      .from('contacts')
      .select('id, email')
      .eq('user_id', user.id)
      .in('email', Array.from(allEmails));

    if (contacts && contacts.length > 0) {
      const contactByEmail = new Map(contacts.map((c) => [c.email.toLowerCase(), c.id]));
      const matches: Array<{ message_id: string; contact_id: string; match_type: string }> = [];
      inserted?.forEach((m) => {
        const checkAndAdd = (e: string, type: string) => {
          const cid = contactByEmail.get(e.toLowerCase());
          if (cid) matches.push({ message_id: m.id, contact_id: cid, match_type: type });
        };
        if (m.from_email) checkAndAdd(m.from_email, 'from');
        (m.to_emails || []).forEach((e: string) => checkAndAdd(e, 'to'));
        (m.cc_emails || []).forEach((e: string) => checkAndAdd(e, 'cc'));
      });
      if (matches.length > 0) {
        await admin.from('email_contact_matches').upsert(matches, { onConflict: 'message_id,contact_id,match_type' });
        matchedCount = matches.length;
      }
    }
  }

  await admin.from('gmail_connections').update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id);

  const preview = (inserted ?? []).slice(0, 5).map((m) => ({
    from: m.from_email,
    subject: m.subject,
    at: m.received_at,
  }));

  return NextResponse.json({
    user_id: user.id,
    query,
    synced: inserted?.length ?? 0,
    matched: matchedCount,
    preview,
  });
}
