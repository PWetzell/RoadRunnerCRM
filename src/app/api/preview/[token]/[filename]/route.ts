import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAttachment, base64UrlToBase64 } from '@/lib/gmail/client';

/**
 * GET /api/preview/:token/:filename
 *
 * Public (un-authenticated) byte stream for an inbound Gmail attachment,
 * gated by a short-lived HMAC-signed token. **The token IS the auth.**
 * Anyone with a valid, unexpired token can fetch the bytes — this is by
 * design so that Microsoft's Office Online embed viewer
 * (`view.officeapps.live.com/op/embed.aspx?src=…`) can pull the file
 * down and render it with Word/Excel/PowerPoint's actual engine.
 *
 * Why we're OK with public-token access:
 *   1. Tokens expire in 10 minutes (see preview-url route).
 *   2. HMAC signature with a server-side secret prevents forgery.
 *   3. No way to enumerate other users' attachments — the token binds
 *      to a specific gmail_message_id + attachment_id.
 *   4. The leak surface is essentially Microsoft's request log, which
 *      is acceptable for an internal CRM viewing the user's own mail.
 *
 * Why the filename is in the path (vs. a query string):
 *   Office Online's viewer dispatches based on the URL's file extension.
 *   `…/api/preview/abc123/Resume.docx` routes to Word; `Sheet.xlsx`
 *   routes to Excel. A query string with `?filename=…` doesn't trigger
 *   the right dispatch.
 *
 * Streaming response:
 *   - Content-Type: from the token payload (the original Gmail mime)
 *   - Content-Disposition: inline (so iframe-embed actually displays)
 *   - Cache-Control: private, short — Microsoft caches its own renders;
 *     no need to encourage long-lived caching of the underlying bytes.
 */

interface TokenPayload {
  uid: string;
  gmid: string;
  aid: string;
  m: string;
  f: string;
  at: string;
  exp: number;
}

function getSecret(): string {
  if (process.env.PREVIEW_TOKEN_SECRET) return process.env.PREVIEW_TOKEN_SECRET;
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  const seed = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}::${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}::roadrunner-preview-token-v1`;
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function verifyToken(rawToken: string): { ok: true; payload: TokenPayload } | { ok: false; error: string } {
  try {
    const decoded = decodeURIComponent(rawToken);
    const parts = decoded.split('.');
    if (parts.length !== 2) return { ok: false, error: 'malformed_token' };
    const [b64, sig] = parts;
    const secret = getSecret();
    const expected = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
    // Constant-time compare to avoid timing oracles. Buffers must be
    // equal length, so we wrap in a length-equality guard first.
    const sigBuf = Buffer.from(sig, 'utf-8');
    const expectedBuf = Buffer.from(expected, 'utf-8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { ok: false, error: 'bad_signature' };
    }
    const json = Buffer.from(b64, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as TokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      return { ok: false, error: 'expired' };
    }
    if (!payload.gmid || !payload.aid || !payload.at) {
      return { ok: false, error: 'incomplete_payload' };
    }
    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'parse_error' };
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; filename: string }> },
) {
  const { token } = await params;
  const v = verifyToken(token);
  if (!v.ok) {
    // Surface a structured error for diagnostics, but don't reveal
    // anything that helps an attacker forge a token.
    return NextResponse.json({ error: 'invalid_token', detail: v.error }, { status: 401 });
  }
  const { gmid, aid, m, f, at } = v.payload;

  try {
    const raw = await getAttachment(at, gmid, aid);
    const standardB64 = base64UrlToBase64(raw.dataBase64Url);
    const buf = Buffer.from(standardB64, 'base64');

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': m || 'application/octet-stream',
        'Content-Length': String(buf.length),
        // `inline` is critical — `attachment` would force a download in
        // the iframe context and Office Online wouldn't render.
        'Content-Disposition': `inline; filename="${f.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=600',
        // Allow Microsoft's iframed viewer to pull bytes cross-origin.
        // The token already provides auth; CORS just lets the fetch land.
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return NextResponse.json({
      error: 'gmail_fetch_failed',
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 502 });
  }
}
