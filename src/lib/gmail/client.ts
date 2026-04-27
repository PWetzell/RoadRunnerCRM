/**
 * Minimal Gmail API client. Uses the OAuth access token Supabase stored
 * for the signed-in user — no extra SDK needed. Refresh happens via
 * Google's token endpoint when the access token expires.
 */

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface GmailMessage {
  id: string;
  threadId: string;
  historyId?: string;
  internalDate?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: GmailPayload;
}

interface GmailPayload {
  headers?: { name: string; value: string }[];
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPayload[];
}

/** Metadata for a single inbound attachment discovered while walking the
 *  Gmail message tree. We never fetch the bytes here — `attachmentId` is used
 *  later by users.messages.attachments.get when the user actually asks to
 *  download or save the file. */
export interface ParsedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  gmailAttachmentId: string;
}

export interface ParsedEmail {
  gmailId: string;
  threadId: string;
  from: string;
  fromName?: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  labelIds: string[];
  snippet: string;
  attachments: ParsedAttachment[];
}

/** Exchange refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET must be set for Gmail sync.');
  }
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

/** List message IDs, paginated. `q` uses Gmail search syntax. */
export async function listMessageIds(
  accessToken: string,
  opts: { q?: string; pageToken?: string; maxResults?: number } = {},
): Promise<{ ids: string[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.pageToken) params.set('pageToken', opts.pageToken);
  params.set('maxResults', String(opts.maxResults ?? 50));

  const res = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail list failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return {
    ids: (json.messages || []).map((m: { id: string }) => m.id),
    nextPageToken: json.nextPageToken,
  };
}

/** Fetch a single message with full payload. */
export async function getMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const res = await fetch(`${GMAIL_API}/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail get failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/').padEnd(data.length + ((4 - (data.length % 4)) % 4), '=');
  if (typeof Buffer !== 'undefined') return Buffer.from(padded, 'base64').toString('utf-8');
  return atob(padded);
}

function extractBody(payload: GmailPayload | undefined): { text: string; html: string } {
  if (!payload) return { text: '', html: '' };
  let text = '';
  let html = '';
  const walk = (p: GmailPayload) => {
    const data = p.body?.data;
    if (data) {
      // A MIME part is an attachment (not a body) when it has a filename OR
      // its body references an attachmentId. Skip those when pulling text.
      const isAttachment = !!p.filename || !!p.body?.attachmentId;
      if (!isAttachment) {
        if (p.mimeType === 'text/plain' && !text) text = decodeBase64Url(data);
        else if (p.mimeType === 'text/html' && !html) html = decodeBase64Url(data);
      }
    }
    if (p.parts) p.parts.forEach(walk);
  };
  walk(payload);
  return { text, html };
}

/** Walk the MIME tree collecting every part that looks like a real
 *  attachment — filename present and Gmail gave us an attachmentId. Inline
 *  images referenced via cid: usually also come with attachmentId; we
 *  include them so users can still save them to Documents if they want. */
function extractAttachments(payload: GmailPayload | undefined): ParsedAttachment[] {
  if (!payload) return [];
  const out: ParsedAttachment[] = [];
  const walk = (p: GmailPayload) => {
    const attId = p.body?.attachmentId;
    const fname = (p.filename || '').trim();
    if (attId && fname) {
      out.push({
        filename: fname,
        mimeType: p.mimeType || 'application/octet-stream',
        size: p.body?.size ?? 0,
        gmailAttachmentId: attId,
      });
    }
    if (p.parts) p.parts.forEach(walk);
  };
  walk(payload);
  return out;
}

/** Fetch the raw bytes of a single attachment (base64url-encoded per Gmail).
 *  Intentionally isolated: callers decide when to spend the bandwidth
 *  (usually "Save to Documents" or an explicit download click). */
export async function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string,
): Promise<{ dataBase64Url: string; size: number }> {
  const res = await fetch(
    `${GMAIL_API}/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Gmail attachment fetch failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { dataBase64Url: json.data as string, size: Number(json.size ?? 0) };
}

/** Convert Gmail's base64url (no padding, -_ alphabet) into standard
 *  base64 (+/ alphabet, padded to multiple of 4) — what a data URL and most
 *  decoders expect. */
export function base64UrlToBase64(b64url: string): string {
  const b = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b.length % 4)) % 4;
  return b + '='.repeat(pad);
}

function parseAddressList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => {
    const match = s.match(/<([^>]+)>/);
    return (match ? match[1] : s).trim().toLowerCase();
  }).filter(Boolean);
}

function parseFromHeader(raw: string | undefined): { email: string; name?: string } {
  if (!raw) return { email: '' };
  const match = raw.match(/^(.*?)<([^>]+)>$/);
  if (match) return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim().toLowerCase() };
  return { email: raw.trim().toLowerCase() };
}

/** Normalize a Gmail message into a flat row we can persist. */
export function parseMessage(msg: GmailMessage): ParsedEmail {
  const headers = msg.payload?.headers || [];
  const h = (name: string) => headers.find((x) => x.name.toLowerCase() === name.toLowerCase())?.value;
  const { text, html } = extractBody(msg.payload);
  const from = parseFromHeader(h('from'));
  return {
    gmailId: msg.id,
    threadId: msg.threadId,
    from: from.email,
    fromName: from.name,
    to: parseAddressList(h('to')),
    cc: parseAddressList(h('cc')),
    subject: h('subject') || '(no subject)',
    bodyText: text,
    bodyHtml: html,
    receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : new Date().toISOString(),
    labelIds: msg.labelIds || [],
    snippet: msg.snippet || '',
    attachments: extractAttachments(msg.payload),
  };
}

/** Outgoing attachment: standard base64 (NOT base64url). MIME wants 76-col
 *  wrapped base64 bytes, which we wrap here before splicing into the raw
 *  message. */
export interface SendAttachment {
  filename: string;
  mimeType: string;
  dataBase64: string;
}

/**
 * Send a message via Gmail API.
 *
 * MIME structure:
 *   - no attachments, plain only → single text/plain
 *   - no attachments, +html      → multipart/alternative (text + html)
 *   - attachments, plain only    → multipart/mixed (text + N attachments)
 *   - attachments, +html         → multipart/mixed [ multipart/alternative, N attachments ]
 *
 * RFC 2046 requires unique boundaries for nested multiparts, so the mixed
 * and alternative wrappers get independently-generated boundaries.
 */
export async function sendMessage(accessToken: string, raw: {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  from?: string;
  attachments?: SendAttachment[];
}): Promise<{ id: string; threadId: string }> {
  const attachments = raw.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const mixedBoundary = `nv_mx_${Date.now().toString(36)}`;
  const altBoundary = `nv_alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const lines: string[] = [];
  lines.push(`To: ${raw.to}`);
  if (raw.cc) lines.push(`Cc: ${raw.cc}`);
  if (raw.from) lines.push(`From: ${raw.from}`);
  lines.push(`Subject: ${encodeSubject(raw.subject)}`);
  lines.push('MIME-Version: 1.0');

  const emitBody = (isRoot: boolean) => {
    // Returns the body block either at the top level (isRoot=true) or nested
    // inside a multipart/mixed wrapper (isRoot=false).
    if (raw.bodyHtml) {
      const prefix = isRoot ? lines : [];
      prefix.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      prefix.push('');
      prefix.push(`--${altBoundary}`);
      prefix.push('Content-Type: text/plain; charset=UTF-8');
      prefix.push('Content-Transfer-Encoding: 7bit');
      prefix.push('');
      prefix.push(raw.bodyText || '');
      prefix.push(`--${altBoundary}`);
      prefix.push('Content-Type: text/html; charset=UTF-8');
      prefix.push('Content-Transfer-Encoding: 7bit');
      prefix.push('');
      prefix.push(raw.bodyHtml);
      prefix.push(`--${altBoundary}--`);
      return prefix;
    }
    const prefix = isRoot ? lines : [];
    prefix.push('Content-Type: text/plain; charset=UTF-8');
    prefix.push('Content-Transfer-Encoding: 7bit');
    prefix.push('');
    prefix.push(raw.bodyText || '');
    return prefix;
  };

  if (!hasAttachments) {
    emitBody(true);
  } else {
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    lines.push('');
    // Body part (possibly nested multipart/alternative)
    lines.push(`--${mixedBoundary}`);
    const bodyBlock = emitBody(false);
    lines.push(...bodyBlock);
    // Attachment parts
    for (const att of attachments) {
      lines.push(`--${mixedBoundary}`);
      lines.push(`Content-Type: ${att.mimeType}; name="${escapeQuoted(att.filename)}"`);
      lines.push(`Content-Disposition: attachment; filename="${escapeQuoted(att.filename)}"`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push('');
      lines.push(wrapBase64(att.dataBase64));
    }
    lines.push(`--${mixedBoundary}--`);
  }

  const message = lines.join('\r\n');
  const encoded = (typeof Buffer !== 'undefined' ? Buffer.from(message).toString('base64') : btoa(message))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Wrap base64 payload to 76 columns per RFC 2045. */
function wrapBase64(b64: string): string {
  // Normalize: in case caller accidentally passed a data URL or whitespace.
  const clean = b64.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 76) chunks.push(clean.slice(i, i + 76));
  return chunks.join('\r\n');
}

function escapeQuoted(s: string): string {
  // Filename parameter is inside double quotes; escape embedded quotes and
  // backslashes so MIME parsers don't choke on them.
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** RFC 2047 encoded-word for subjects containing non-ASCII. ASCII stays
 *  as-is so Gmail threading / replies aren't surprised. */
function encodeSubject(s: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(s, 'utf-8').toString('base64')
    : btoa(unescape(encodeURIComponent(s)));
  return `=?UTF-8?B?${b64}?=`;
}
