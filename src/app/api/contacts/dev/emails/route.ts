import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Dev-only mirror of GET /api/contacts/[id]/emails. Accepts
 * { email, contactId } so the preview sandbox can verify the email-timeline
 * join without a live Supabase cookie session.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const { email, contactId }: { email?: string; contactId?: string } =
    await request.json().catch(() => ({}));
  if (!email || !contactId) {
    return NextResponse.json({ error: 'email_and_contactId_required' }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const { data: contact } = await admin
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('user_id', user.id)
    .single();
  if (!contact) return NextResponse.json({ emails: [] });

  const { data: matches } = await admin
    .from('email_contact_matches')
    .select('match_type, email_messages(id, gmail_message_id, thread_id, from_email, from_name, to_emails, subject, snippet, body_text, received_at, open_count, last_opened_at, click_count, last_clicked_at)')
    .eq('contact_id', contactId);

  interface MatchRow {
    match_type: 'from' | 'to' | 'cc' | 'bcc';
    email_messages:
      | {
          id: string;
          gmail_message_id: string;
          thread_id: string;
          from_email: string | null;
          from_name: string | null;
          to_emails: string[] | null;
          subject: string | null;
          snippet: string | null;
          body_text: string | null;
          received_at: string;
          open_count?: number | null;
          last_opened_at?: string | null;
          click_count?: number | null;
          last_clicked_at?: string | null;
        }
      | null;
  }

  const emails = (matches ?? [])
    .map((m) => {
      const row = m as unknown as MatchRow;
      const msg = row.email_messages;
      if (!msg) return null;
      return {
        id: msg.id,
        gmailMessageId: msg.gmail_message_id,
        threadId: msg.thread_id,
        fromEmail: msg.from_email,
        fromName: msg.from_name,
        toEmails: msg.to_emails || [],
        subject: msg.subject,
        snippet: msg.snippet,
        bodyText: msg.body_text,
        receivedAt: msg.received_at,
        direction: row.match_type,
        openCount: msg.open_count ?? 0,
        lastOpenedAt: msg.last_opened_at ?? null,
        clickCount: msg.click_count ?? 0,
        lastClickedAt: msg.last_clicked_at ?? null,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

  return NextResponse.json({ count: emails.length, emails });
}
