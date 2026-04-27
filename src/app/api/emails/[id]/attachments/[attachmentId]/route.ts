import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { refreshAccessToken, getAttachment, base64UrlToBase64 } from '@/lib/gmail/client';

/**
 * GET /api/emails/:id/attachments/:attachmentId
 *
 * Lazy-fetches the raw bytes of an inbound Gmail attachment. `:id` is the
 * Supabase `email_messages.id`; `:attachmentId` is the opaque Gmail
 * attachment id from the message payload.
 *
 * Why no metadata lookup anymore:
 *   The previous version tried to look up filename/mimeType from
 *   `email_messages.attachments` (DB column) with a live `getMessage`
 *   fallback. That added two extra failure modes (DB column missing,
 *   message fetch racing with rate limits) and ~600ms latency per click.
 *   The chip in the UI already knows the filename + mimeType, so we let
 *   the client send them as query params. Round-trip becomes a single
 *   Gmail bytes call — the only call that actually has to hit Google.
 *
 * Query params (optional but used for response shape):
 *   ?filename=<urlencoded>&mimeType=<urlencoded>
 *
 * Returns `{ ok, filename, mimeType, size, dataBase64 }` where `dataBase64`
 * is standard base64 (not URL-safe).
 *
 * Why a token-refresh retry on 401:
 *   Refresh tokens are stable but access tokens are short-lived (~1h).
 *   If a user keeps a tab open past expiry, the first byte fetch can 401
 *   even with a freshly-refreshed token (race between cache and Gmail's
 *   account state). One retry with a brand-new refresh resolves it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await params;
  const url = new URL(request.url);
  const qFilename = url.searchParams.get('filename') || undefined;
  const qMimeType = url.searchParams.get('mimeType') || undefined;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Service-role read where possible — the email row is user-scoped via
  // the user_id filter so RLS-aware fallback is also safe.
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
    console.error('[emails/attachments] row lookup failed', { id, rowErr });
    return NextResponse.json({
      error: 'not_found',
      detail: rowErr?.message || 'email_messages row missing for this id+user',
    }, { status: 404 });
  }
  if (!row.gmail_message_id) {
    return NextResponse.json({
      error: 'no_gmail_message_id',
      detail: 'email row has no gmail_message_id (likely a non-synced row)',
    }, { status: 400 });
  }

  // Resolve refresh token. User session FIRST (RLS-aware) — this is what
  // /api/gmail/sync uses and it's the path that's known-good for Paul's
  // setup. Service role only as fallback because the SUPABASE_SERVICE_ROLE_KEY
  // in his env is currently rejected as "Unregistered API key", which would
  // cause admin queries to silently return null and trigger a spurious
  // "no_gmail_connection" even though the row exists.
  let conn: { provider_refresh_token: string | null } | null = null;
  let connLookupErr: string | null = null;
  {
    const r = await supabase
      .from('gmail_connections')
      .select('provider_refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (r.data) {
      conn = r.data as { provider_refresh_token: string | null };
    } else if (r.error) {
      connLookupErr = r.error.message;
      // User-session lookup errored — try service role as a backup.
      try {
        const admin = createServiceClient();
        const r2 = await admin
          .from('gmail_connections')
          .select('provider_refresh_token')
          .eq('user_id', user.id)
          .maybeSingle();
        if (r2.data) conn = r2.data as { provider_refresh_token: string | null };
      } catch (e) {
        console.warn('[emails/attachments] admin fallback unavailable', e);
      }
    }
  }
  if (!conn?.provider_refresh_token) {
    console.error('[emails/attachments] no refresh token for user', user.id, 'lookup err:', connLookupErr);
    return NextResponse.json({
      error: 'no_gmail_connection',
      detail: connLookupErr || `no row in gmail_connections for user_id=${user.id.slice(0, 8)}…`,
    }, { status: 400 });
  }

  // Single retry on Gmail failure — refresh token stays the same, but we
  // get a brand-new access token in case the first one was stale.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const accessToken = await refreshAccessToken(conn.provider_refresh_token);
      const raw = await getAttachment(accessToken, row.gmail_message_id, attachmentId);
      const dataBase64 = base64UrlToBase64(raw.dataBase64Url);
      return NextResponse.json({
        ok: true,
        filename: qFilename || 'attachment',
        mimeType: qMimeType || 'application/octet-stream',
        size: raw.size || 0,
        dataBase64,
      });
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[emails/attachments] attempt ${attempt + 1} failed: ${msg}`);
      // Only retry on 401 / token-ish errors; don't retry on 404 (bad id).
      const isAuthish = /401|invalid_grant|unauthorized|expired/i.test(msg);
      if (!isAuthish) break;
    }
  }

  return NextResponse.json({
    error: 'gmail_fetch_failed',
    detail: lastErr instanceof Error ? lastErr.message : String(lastErr),
  }, { status: 502 });
}
