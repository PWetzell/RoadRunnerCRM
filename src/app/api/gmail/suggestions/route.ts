import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { buildSuggestions } from '@/lib/gmail/suggestions';

/**
 * GET /api/gmail/suggestions
 *
 * Returns top email senders from the signed-in user's synced Gmail that
 * are NOT already contacts. Used by the onboarding import wizard and the
 * persistent Suggestions panel.
 *
 *   ?limit=50               (1..200, default 50)
 *   ?includeNoise=true      (default false) — skip the noise filter so
 *                           newsletters / no-reply / marketing senders
 *                           also appear. Powers the modal's "Show
 *                           automated senders" toggle.
 *
 *   Response shape:
 *     {
 *       suggestions: SenderSuggestion[],
 *       diagnostics: {
 *         totalMessages,    // # of email_messages rows for the user
 *         totalContacts,    // # of contacts rows for the user
 *         hasConnection,    // gmail_connections row present
 *         lastSyncAt,       // ISO or null — when sync last ran
 *         uniqueSenders,    // # of distinct from_email in scanned window
 *         filteredAsExisting, // # of senders dropped because already contact
 *         filteredAsNoise,  // # dropped by noise heuristic (only when includeNoise=false)
 *         reason,           // 'ok' | 'no_connection' | 'no_messages'
 *                           //  | 'all_imported' | 'all_filtered'
 *                           //    where all_filtered = senders exist but
 *                           //    were ALL noise — the user needs the
 *                           //    "Show automated senders" toggle.
 *       }
 *     }
 *
 * The diagnostics block lets the wizard render a useful empty state ("you
 * haven't synced yet" vs "everyone is already a contact" vs "we filtered
 * everything as automated — show them anyway?") instead of a vague "no
 * senders to suggest" prompt that left the user staring at zero.
 *
 * Auth pattern: tries the **user-session client first** (RLS allows the
 * owner to read their own rows) and only falls back to service-role if
 * that errors. Same defense as /api/gmail/disconnect — keeps the route
 * working when SUPABASE_SERVICE_ROLE_KEY is missing or rejected by the
 * Supabase project.
 */

function trySvc(): SupabaseClient | null {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch (e) {
    console.warn('[gmail/suggestions] service client unavailable:', e);
    return null;
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      suggestions: [],
      diagnostics: { totalMessages: 0, totalContacts: 0, hasConnection: false, lastSyncAt: null, reason: 'unauthenticated' },
    });
  }

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const includeNoise = url.searchParams.get('includeNoise') === 'true';

  // ─── Diagnostics: counts + connection presence. ───
  // Tried user-session first; if the count comes back null with an error
  // (RLS edge case), fall through to service-role.
  async function safeCount(table: string): Promise<number> {
    const r = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', user!.id);
    if (typeof r.count === 'number' && !r.error) return r.count;
    const admin = trySvc();
    if (!admin) return 0;
    const r2 = await admin.from(table).select('*', { count: 'exact', head: true }).eq('user_id', user!.id);
    return r2.count ?? 0;
  }

  type ConnRow = { user_id: string; last_sync_at: string | null };
  async function readConnection(): Promise<ConnRow | null> {
    const r = await supabase
      .from('gmail_connections')
      .select('user_id, last_sync_at')
      .eq('user_id', user!.id)
      .maybeSingle();
    if (r.data) return r.data as unknown as ConnRow;
    if (!r.error) return null;
    const admin = trySvc();
    if (!admin) return null;
    const r2 = await admin
      .from('gmail_connections')
      .select('user_id, last_sync_at')
      .eq('user_id', user!.id)
      .maybeSingle();
    return (r2.data as unknown as ConnRow) ?? null;
  }

  const [totalMessages, totalContacts, conn] = await Promise.all([
    safeCount('email_messages'),
    safeCount('contacts'),
    readConnection(),
  ]);

  // ─── Build suggestions: user-session first, service-role fallback. ───
  const empty = { suggestions: [], stats: { uniqueSenders: 0, filteredAsExisting: 0, filteredAsNoise: 0 } };
  let result = await buildSuggestions(supabase, user.id, user.email ?? null, limit, { includeNoise }).catch(
    (e) => {
      console.warn('[gmail/suggestions] user-session build failed:', e);
      return empty;
    },
  );

  if (result.suggestions.length === 0 && totalMessages > 0) {
    // We have messages but the user-session query returned nothing — could
    // be RLS edge case (e.g. service-role-inserted rows with mismatched
    // owner). Try the admin path.
    const admin = trySvc();
    if (admin) {
      try {
        result = await buildSuggestions(admin, user.id, user.email ?? null, limit, { includeNoise });
      } catch (e) {
        console.warn('[gmail/suggestions] service-role build failed:', e);
      }
    }
  }

  // ─── Reason classification for the dialog's empty state. ───
  // The crucial new branch is `all_filtered`: we have unique senders
  // but every single one was hidden by the noise heuristic. Showing
  // "all imported" in that case (as the previous version did) is a
  // straight lie when the user only has 1 contact and 152 messages —
  // exactly the bug Paul caught on 2026-04-27.
  let reason: 'ok' | 'no_connection' | 'no_messages' | 'all_imported' | 'all_filtered' = 'ok';
  if (!conn) reason = 'no_connection';
  else if (totalMessages === 0) reason = 'no_messages';
  else if (result.suggestions.length === 0) {
    if (!includeNoise && result.stats.filteredAsNoise > 0) reason = 'all_filtered';
    else reason = 'all_imported';
  }

  return NextResponse.json({
    suggestions: result.suggestions,
    diagnostics: {
      totalMessages,
      totalContacts,
      hasConnection: !!conn,
      lastSyncAt: conn?.last_sync_at ?? null,
      uniqueSenders: result.stats.uniqueSenders,
      filteredAsExisting: result.stats.filteredAsExisting,
      filteredAsNoise: result.stats.filteredAsNoise,
      reason,
    },
  });
}
