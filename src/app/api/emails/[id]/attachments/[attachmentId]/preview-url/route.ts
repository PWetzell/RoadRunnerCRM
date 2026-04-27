import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken } from '@/lib/gmail/client';

/**
 * GET /api/emails/:id/attachments/:attachmentId/preview-url
 *
 * Mints a short-lived signed URL that Microsoft's free Office Online embed
 * viewer (`view.officeapps.live.com/op/embed.aspx`) can fetch to render
 * a DOCX/XLSX/PPTX/RTF inline with **Word/Excel/PowerPoint's actual
 * rendering engine** — same approach Outlook web and Slack use for inline
 * Office previews, and the only browser-side path that gets pixel-perfect
 * fidelity (logos, embedded fonts, headers/footers, page layout).
 *
 * Why a signed token instead of session auth on the proxy:
 *   Microsoft's servers fetch the URL we hand them — they don't carry the
 *   user's Supabase session cookie. Token-based auth lets us prove "this
 *   URL was authorized for this attachment by this user, expiring in 10
 *   minutes" without exposing the underlying Gmail attachment endpoint
 *   to the public internet.
 *
 * Why the Gmail access token is embedded in the signed payload:
 *   The proxy route at `/api/preview/[token]/[filename]` runs unauthenticated
 *   (Microsoft's fetch has no cookies) and needs to call Gmail to stream
 *   the bytes. Three options to give the proxy what it needs:
 *
 *     (a) Service-role-look up the user's `gmail_connections` row by user_id
 *         decoded from the token, then refresh the access token there.
 *         Reliable in theory but fragile in this codebase — Paul's
 *         `SUPABASE_SERVICE_ROLE_KEY` is currently rejected as
 *         "Unregistered API key", so service-role queries silently return
 *         null and the proxy 4xx's with no obvious cause.
 *
 *     (b) Persist a token→refresh-token mapping in a DB table with TTL.
 *         Adds a new table, a sweep job, and a DB hit on every preview
 *         fetch. Overkill for a 10-min ephemeral view URL.
 *
 *     (c) Refresh the access token *now* (using the user's authenticated
 *         session, which works), embed it in the signed JWT-ish payload,
 *         and let the proxy hand it straight to Gmail's API. Single round
 *         trip, no DB at preview-fetch time, no service-role dependency.
 *
 *   We pick (c). The access token is short-lived (~1h from Google), our
 *   URL is shorter-lived (10m), and the HMAC signature prevents any
 *   tampering. The leak surface is Microsoft's request logs — for an
 *   internal CRM viewing the user's own Gmail attachments, the trade is
 *   acceptable. We can iterate to a server-stored mapping if/when this
 *   ships externally.
 *
 * Query params (echoed into the token so the proxy can serve the correct
 * Content-Type and filename for Office Online's extension-based dispatch):
 *   ?filename=<urlencoded>&mimeType=<urlencoded>
 *
 * Response:
 *   {
 *     proxyUrl: string,         // public URL the viewer fetches
 *     officeViewerUrl: string,  // wrap of proxyUrl in the embed viewer
 *     expiresAt: ISO string
 *   }
 */

const TOKEN_TTL_SECONDS = 600; // 10 minutes — long enough for Microsoft
                                // to fetch + render even on slow links;
                                // short enough that a leaked URL self-heals.

interface TokenPayload {
  uid: string;   // user_id (logging / audit)
  gmid: string;  // gmail_message_id
  aid: string;   // gmail attachmentId
  m: string;     // mime type
  f: string;     // filename
  at: string;    // freshly-refreshed Gmail access token
  exp: number;   // unix-seconds expiry
}

/**
 * Secret resolution order, picked to "just work" on Paul's deployment
 * without requiring a new env var, while still accepting a dedicated
 * one in production:
 *   1. PREVIEW_TOKEN_SECRET (if explicitly set — recommended for prod)
 *   2. NEXTAUTH_SECRET (already commonly present)
 *   3. SHA-256 of stable, secret-ish env vars unique to this deployment.
 *      Not crypto-bulletproof, but rotates with the Supabase project key.
 */
function getSecret(): string {
  if (process.env.PREVIEW_TOKEN_SECRET) return process.env.PREVIEW_TOKEN_SECRET;
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  const seed = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}::${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}::roadrunner-preview-token-v1`;
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function signToken(payload: TokenPayload): string {
  const secret = getSecret();
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/**
 * Returns the public origin used to build the proxy URL. Reads the request
 * URL first (works for both deployed Vercel and local dev). For local dev,
 * Microsoft's Office viewer can't fetch localhost URLs — so we surface a
 * clear hint in the response so the client can fall back gracefully.
 */
function getOrigin(request: Request): { origin: string; isLocal: boolean } {
  const u = new URL(request.url);
  const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.local');
  return { origin: u.origin, isLocal };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await params;
  const url = new URL(request.url);
  const filename = url.searchParams.get('filename') || 'attachment';
  const mimeType = url.searchParams.get('mimeType') || 'application/octet-stream';

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // --- Verify ownership of the email row -----------------------------
  // Service-role probe first (cheaper when it works); fall back to the
  // user session (RLS-aware) when the probe errors. Same pattern the
  // bytes route uses — known to work on Paul's setup.
  let db = supabase;
  try {
    const admin = createServiceClient();
    const probe = await admin.from('email_messages').select('id').eq('user_id', user.id).limit(1);
    if (!probe.error) db = admin;
  } catch {
    /* stay on user session */
  }

  const { data: row, error: rowErr } = await db
    .from('email_messages')
    .select('id, gmail_message_id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({
      error: 'not_found',
      detail: rowErr?.message || 'email row missing for this id+user',
    }, { status: 404 });
  }
  if (!row.gmail_message_id) {
    return NextResponse.json({ error: 'no_gmail_message_id' }, { status: 400 });
  }

  // --- Resolve refresh token (user-session-first per known-good path) -
  let refreshToken: string | null = null;
  let connLookupErr: string | null = null;
  {
    const r = await supabase
      .from('gmail_connections')
      .select('provider_refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (r.data?.provider_refresh_token) {
      refreshToken = r.data.provider_refresh_token;
    } else if (r.error) {
      connLookupErr = r.error.message;
      try {
        const admin = createServiceClient();
        const r2 = await admin
          .from('gmail_connections')
          .select('provider_refresh_token')
          .eq('user_id', user.id)
          .maybeSingle();
        if (r2.data?.provider_refresh_token) refreshToken = r2.data.provider_refresh_token;
      } catch {
        /* admin unavailable — fall through */
      }
    }
  }
  if (!refreshToken) {
    return NextResponse.json({
      error: 'no_gmail_connection',
      detail: connLookupErr || 'no provider_refresh_token for this user',
    }, { status: 400 });
  }

  // --- Refresh the access token now (so the proxy doesn't have to) ---
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(refreshToken);
  } catch (e) {
    return NextResponse.json({
      error: 'refresh_failed',
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 502 });
  }

  // --- Sign the token + assemble the URLs ----------------------------
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = signToken({
    uid: user.id,
    gmid: row.gmail_message_id,
    aid: attachmentId,
    m: mimeType,
    f: filename,
    at: accessToken,
    exp,
  });

  const { origin, isLocal } = getOrigin(request);
  // Filename is part of the path so Microsoft's viewer can dispatch by
  // extension (.docx → Word renderer, .xlsx → Excel, etc.).
  const safeFilename = encodeURIComponent(filename);
  const proxyUrl = `${origin}/api/preview/${encodeURIComponent(token)}/${safeFilename}`;
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(proxyUrl)}`;

  return NextResponse.json({
    proxyUrl,
    officeViewerUrl,
    isLocal, // client uses this to fall back when Microsoft can't reach localhost
    expiresAt: new Date(exp * 1000).toISOString(),
  });
}
