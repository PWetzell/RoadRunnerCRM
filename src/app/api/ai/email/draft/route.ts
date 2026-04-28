import Anthropic from '@anthropic-ai/sdk';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { buildDraftSystemPrompt, buildDraftUserMessage, DraftContext } from '@/lib/ai/email-prompts';

/**
 * POST /api/ai/email/draft
 * Body: { contactId: string; instruction: string }
 *
 * Streams the model's draft back as Server-Sent Events. The client reads the
 * stream, splits on the first blank line to separate subject from body, and
 * writes tokens into the composer as they arrive.
 *
 * Event format:
 *   data: {"type":"delta","text":"..."}\n\n
 *   data: {"type":"done"}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 */

const MODEL = 'claude-haiku-4-5-20251001';

// Per-user rate limit: max 20 drafts/minute. Capped in-memory — sufficient
// for single-instance dev; swap for a Redis/Upstash bucket when we scale.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = (rateBuckets.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (bucket.length >= RATE_MAX) {
    const oldest = bucket[0];
    return { ok: false, retryAfterSec: Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000) };
  }
  bucket.push(now);
  rateBuckets.set(userId, bucket);
  return { ok: true, retryAfterSec: 0 };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError('ai_not_configured', 'Set ANTHROPIC_API_KEY in .env.local to enable AI drafts.', 501);
  }

  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return jsonError('unauthorized', 'Sign in to use AI drafts.', 401);

  const rl = checkRateLimit(user.id);
  if (!rl.ok) {
    return jsonError('rate_limited', `Slow down — try again in ${rl.retryAfterSec}s.`, 429);
  }

  const body = await request.json().catch(() => ({}));
  const { contactId, instruction, recipientEmail, recipientName } = body as {
    contactId?: string;
    instruction?: string;
    recipientEmail?: string;
    recipientName?: string;
  };

  const admin = createServiceClient();

  // Try to enrich from DB. Missing row is NOT an error — seed/mock contacts and
  // brand-new composes both hit this path. We fall back to whatever the client
  // already knows (name + email from the composer).
  let dbContact: { id: string; full_name: string; email: string | null } | null = null;
  if (contactId) {
    const { data } = await admin
      .from('contacts')
      .select('id, full_name, email, user_id')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();
    dbContact = data;
  }

  const nameFromEmail = (e?: string | null) =>
    e ? e.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;

  const finalName =
    dbContact?.full_name ??
    (recipientName && recipientName.trim()) ??
    nameFromEmail(recipientEmail) ??
    'there';
  const finalEmail = dbContact?.email ?? recipientEmail ?? null;

  if (!finalName && !finalEmail) {
    return jsonError('missing_recipient', 'Add a recipient email or open from a contact.', 400);
  }

  let title: string | null = null;
  let orgName: string | null = null;
  let industry: string | null = null;
  let tags: string[] = [];
  let recent: DraftContext['recentEmails'] = [];

  if (dbContact) {
    const [titleRow, orgRow, tagRows, industryRow, recentEmails] = await Promise.all([
      admin.from('contact_title_entries').select('value').eq('contact_id', dbContact.id).eq('primary', true).limit(1).maybeSingle(),
      admin.from('contact_relationships').select('to_contact_id, kind').eq('from_contact_id', dbContact.id).eq('kind', 'employee-of').limit(1).maybeSingle(),
      admin.from('contact_tags').select('tag').eq('contact_id', dbContact.id),
      admin.from('contact_industry_entries').select('value').eq('contact_id', dbContact.id).eq('primary', true).limit(1).maybeSingle(),
      admin
        .from('email_contact_matches')
        .select('match_type, email_messages(subject, snippet, received_at)')
        .eq('contact_id', dbContact.id)
        .order('id', { ascending: false })
        .limit(5),
    ]);
    title = titleRow.data?.value ?? null;
    industry = industryRow.data?.value ?? null;
    tags = (tagRows.data ?? []).map((t: { tag: string }) => t.tag);
    if (orgRow.data?.to_contact_id) {
      const { data: org } = await admin.from('contacts').select('full_name').eq('id', orgRow.data.to_contact_id).maybeSingle();
      orgName = org?.full_name ?? null;
    }
    interface MatchRow {
      match_type: 'from' | 'to' | 'cc' | 'bcc';
      email_messages: { subject: string | null; snippet: string | null; received_at: string } | null;
    }
    // Explicit `unknown` annotation on `m` — Supabase's generic
    // `select()` return type doesn't narrow to a known shape here, so
    // strict TS (used by Vercel's production `next build`) flags it
    // as implicit `any`. Cast happens on the next line anyway.
    recent = (recentEmails.data ?? [])
      .map((m: unknown) => {
        const row = m as MatchRow;
        if (!row.email_messages) return null;
        return {
          direction: row.match_type === 'from' ? ('incoming' as const) : ('outgoing' as const),
          subject: row.email_messages.subject,
          snippet: row.email_messages.snippet,
          receivedAt: row.email_messages.received_at,
        };
      })
      .filter((e: { direction: 'incoming' | 'outgoing'; subject: string | null; snippet: string | null; receivedAt: string } | null): e is NonNullable<typeof e> => e !== null);
  }

  const ctx: DraftContext = {
    contact: {
      name: finalName,
      title,
      orgName,
      industry,
      tags,
      email: finalEmail,
    },
    sender: {
      name: user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
    },
    recentEmails: recent,
    userInstruction: instruction ?? '',
  };

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        const response = await client.messages.stream({
          model: MODEL,
          max_tokens: 800,
          system: buildDraftSystemPrompt(),
          messages: [{ role: 'user', content: buildDraftUserMessage(ctx) }],
        });
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ type: 'delta', text: event.delta.text });
          }
        }
        send({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown_error';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
    },
  });
}

function jsonError(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
