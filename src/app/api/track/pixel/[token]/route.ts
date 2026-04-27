import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/track/pixel/[token]
 *
 * The 1×1 transparent pixel we embed in every outgoing HTML body. When
 * the recipient's mail client fetches it, we bump the open counters on
 * the matching `email_messages` row. We always return the pixel bytes
 * regardless of DB success so we never break rendering in the client.
 *
 * No auth — this is called by arbitrary mail clients. The token is the
 * only capability, so we treat it like a bearer secret (random 24ch).
 */
export const dynamic = 'force-dynamic';

const GIF_1X1 = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
  'base64',
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (token) {
    // Fire-and-forget DB update. Don't await beyond a quick try so the
    // pixel response isn't delayed by tracking write latency.
    void recordOpen(token);
  }

  return new NextResponse(new Uint8Array(GIF_1X1), {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(GIF_1X1.length),
      // Cache-busting headers — every open should hit us.
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

async function recordOpen(token: string): Promise<void> {
  try {
    const admin = createServiceClient();
    const now = new Date().toISOString();

    const { data: row } = await admin
      .from('email_messages')
      .select('id, open_count, first_opened_at')
      .eq('tracking_token', token)
      .single();
    if (!row) return;

    await admin
      .from('email_messages')
      .update({
        open_count: (row.open_count ?? 0) + 1,
        first_opened_at: row.first_opened_at ?? now,
        last_opened_at: now,
      })
      .eq('id', row.id);
  } catch {
    // Swallow — pixel loads must always succeed from the recipient's side,
    // and missing columns (pre-migration) shouldn't throw.
  }
}
