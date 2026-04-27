/**
 * Prompt builders for AI email features. Keep these deterministic — the route
 * handlers just substitute context and forward to Anthropic.
 */

export interface DraftContext {
  contact: {
    name: string;
    title?: string | null;
    orgName?: string | null;
    industry?: string | null;
    tags?: string[];
    email?: string | null;
  };
  sender: {
    name?: string | null;
    email?: string | null;
  };
  recentEmails?: Array<{
    direction: 'incoming' | 'outgoing';
    subject: string | null;
    snippet: string | null;
    receivedAt: string;
  }>;
  userInstruction: string;
}

export function buildDraftSystemPrompt(): string {
  return [
    'You are an assistant that drafts short, professional business emails.',
    'Output rules:',
    '1. Respond with ONLY the email — no preamble, no explanation, no markdown fences.',
    '2. First line MUST be exactly: Subject: <subject line>',
    '3. One blank line, then the body.',
    '4. Body opens with a one-line greeting ("Hi <first name>,"), then 1-3 short paragraphs, then a sign-off ("Best,\\n<Sender first name>" when known, otherwise just "Best,").',
    '5. Warm and professional tone — no hype, no exclamation marks, no emojis.',
    '6. Keep the whole email under 120 words unless the user explicitly asks for more.',
    '7. Use only facts present in the provided context. Never invent meetings, quotes, numbers, or prior conversations.',
  ].join('\n');
}

export function buildDraftUserMessage(ctx: DraftContext): string {
  const lines: string[] = [];
  lines.push('# Recipient');
  lines.push(`Name: ${ctx.contact.name}`);
  if (ctx.contact.title) lines.push(`Title: ${ctx.contact.title}`);
  if (ctx.contact.orgName) lines.push(`Organization: ${ctx.contact.orgName}`);
  if (ctx.contact.industry) lines.push(`Industry: ${ctx.contact.industry}`);
  if (ctx.contact.tags && ctx.contact.tags.length) lines.push(`Tags: ${ctx.contact.tags.join(', ')}`);
  if (ctx.contact.email) lines.push(`Email: ${ctx.contact.email}`);

  if (ctx.sender.name || ctx.sender.email) {
    lines.push('');
    lines.push('# Sender (you)');
    if (ctx.sender.name) lines.push(`Name: ${ctx.sender.name}`);
    if (ctx.sender.email) lines.push(`Email: ${ctx.sender.email}`);
  }

  if (ctx.recentEmails && ctx.recentEmails.length) {
    lines.push('');
    lines.push('# Recent email history (most recent first)');
    for (const e of ctx.recentEmails.slice(0, 5)) {
      const arrow = e.direction === 'incoming' ? '←' : '→';
      lines.push(`- ${arrow} ${e.receivedAt} "${e.subject ?? '(no subject)'}" — ${e.snippet ?? ''}`.trim());
    }
  }

  lines.push('');
  lines.push('# User instruction');
  lines.push(ctx.userInstruction.trim() || '(no instruction — write a polite check-in)');

  lines.push('');
  lines.push('Write the email now.');

  return lines.join('\n');
}

/**
 * Parses the model's streamed output into { subject, body }. The system prompt
 * forces "Subject: ..." on the first line followed by a blank line; if the
 * model drifts we fall back to using the whole text as body.
 */
export function splitDraft(raw: string): { subject: string; body: string } {
  const trimmed = raw.replace(/^\s+/, '');
  const match = trimmed.match(/^Subject:\s*(.+?)\r?\n\r?\n([\s\S]*)$/);
  if (match) {
    return { subject: match[1].trim(), body: match[2].trim() };
  }
  const firstLine = trimmed.match(/^Subject:\s*(.+?)\r?\n([\s\S]*)$/);
  if (firstLine) {
    return { subject: firstLine[1].trim(), body: firstLine[2].trim() };
  }
  return { subject: '', body: trimmed.trim() };
}
