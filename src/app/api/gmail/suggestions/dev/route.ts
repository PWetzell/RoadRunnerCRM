import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { buildSuggestions } from '@/lib/gmail/suggestions';

/**
 * Dev-only mirror of GET /api/gmail/suggestions. Resolves user by email via
 * the service role so the preview sandbox can verify the flow without a
 * real Supabase cookie session.
 *
 * Body: { email: string; limit?: number }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const { email, limit: requestedLimit }: { email?: string; limit?: number } =
    await request.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

  const admin = createServiceClient();
  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const user = users.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const limit = Math.min(200, Math.max(1, Number(requestedLimit) || 50));
  // buildSuggestions now returns `{ suggestions, stats }`; preserve the
  // dev-route's flat shape by destructuring and surfacing stats separately
  // so any harness scripts that read `count` keep working.
  const { suggestions, stats } = await buildSuggestions(admin, user.id, user.email ?? null, limit);
  return NextResponse.json({ user_id: user.id, count: suggestions.length, suggestions, stats });
}
