import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * OAuth callback — Supabase redirects here after Google sign-in.
 *
 * Two callers land here:
 *   1. AuthGate "Continue with Google" — minimal scopes (openid/email/profile),
 *      no refresh token. Just exchange the code and route to `next` (default `/`).
 *   2. GmailSyncBanner "Connect Gmail" — Gmail scopes + access_type=offline +
 *      prompt=consent. Refresh token is captured and saved to
 *      `gmail_connections`, then we route to `/onboarding/gmail-import`
 *      (passed as `next`) so the user reviews their top senders.
 *
 * We don't try to detect intent from the request — we just save the refresh
 * token if one came back, and honor whatever `next` the caller passed.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`);
  }

  // Persist the Gmail refresh token so we can sync without the user being online.
  // `provider_refresh_token` comes back only on the FIRST consent — that's why
  // we need access_type=offline + prompt=consent on sign-in.
  const session = data.session;
  const user = data.user;

  console.log('[auth/callback] exchange ok', {
    user_id: user?.id,
    email: user?.email,
    has_access_token: !!session?.provider_token,
    has_refresh_token: !!session?.provider_refresh_token,
  });

  // Try user-session write first (doesn't require service role key — uses RLS).
  // Fall back to service role if the user-session write fails (e.g., RLS blocks it).
  if (user && (session?.provider_refresh_token || session?.provider_token)) {
    const row = {
      user_id: user.id,
      provider_refresh_token: session.provider_refresh_token ?? null,
      provider_access_token: session.provider_token ?? null,
      email: user.email,
      connected_at: new Date().toISOString(),
    };

    const { error: userWriteErr } = await supabase
      .from('gmail_connections')
      .upsert(row, { onConflict: 'user_id' });

    if (userWriteErr) {
      console.warn('[auth/callback] user-session upsert failed, trying service role:', userWriteErr.message);
      try {
        const admin = createServiceClient();
        const { error: adminErr } = await admin
          .from('gmail_connections')
          .upsert(row, { onConflict: 'user_id' });
        if (adminErr) {
          console.error('[auth/callback] gmail_connections upsert failed (both paths):', adminErr);
          return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent('gmail_connection_save_failed: ' + adminErr.message)}`);
        }
        console.log('[auth/callback] gmail_connections upserted via service role for', user.id);
      } catch (e) {
        console.error('[auth/callback] unexpected error saving gmail_connections:', e);
        return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent('gmail_connection_exception')}`);
      }
    } else {
      console.log('[auth/callback] gmail_connections upserted via user session for', user.id);
    }
  } else {
    // No provider tokens means this was a lightweight CRM login (no Gmail
    // scopes requested). That's expected — don't warn. Gmail connection state
    // is unaffected; if the user previously connected, their refresh token
    // is still in `gmail_connections` and background sync keeps working.
  }

  return NextResponse.redirect(`${origin}${next}`);
}
