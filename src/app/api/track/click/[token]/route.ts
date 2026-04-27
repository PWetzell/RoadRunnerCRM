import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/track/click/[token]?url=<encoded>
 *
 * Click-through redirect for tracked email links. Records the click on
 * the `email_messages` row matching the token, then 302-redirects to the
 * decoded target URL. The target must be fully qualified (http/https).
 *
 * We perform a minimal allow-list check on the protocol to avoid being
 * abused as an open redirect: only http(s) URLs are followed.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = new URL(request.url);
  const target = url.searchParams.get('url') || '';

  let safe: URL | null = null;
  try {
    const parsed = new URL(target);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') safe = parsed;
  } catch { /* invalid — fall through to 400 */ }

  if (!safe) {
    return new NextResponse('invalid target', { status: 400 });
  }

  if (token) void recordClick(token);

  return NextResponse.redirect(safe.toString(), { status: 302 });
}

async function recordClick(token: string): Promise<void> {
  try {
    const admin = createServiceClient();
    const now = new Date().toISOString();

    const { data: row } = await admin
      .from('email_messages')
      .select('id, click_count, first_clicked_at')
      .eq('tracking_token', token)
      .single();
    if (!row) return;

    await admin
      .from('email_messages')
      .update({
        click_count: (row.click_count ?? 0) + 1,
        first_clicked_at: row.first_clicked_at ?? now,
        last_clicked_at: now,
      })
      .eq('id', row.id);
  } catch {
    // Same as pixel: we never want this to throw — the user's click must
    // always reach the target, even if tracking is disabled.
  }
}
