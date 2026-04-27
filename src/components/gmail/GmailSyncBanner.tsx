'use client';

import { useEffect, useState } from 'react';
import { ArrowsClockwise, Envelope, UserPlus, GoogleLogo, Warning, X as XIcon, Sparkle } from '@phosphor-icons/react';
import { useToastStore } from '@/stores/toast-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import { useUserStore } from '@/stores/user-store';
import { createClient } from '@/lib/supabase/client';
import { isDemoEmail } from '@/lib/auth/demo-accounts';

const DISMISS_KEY = 'roadrunner.gmailBanner.dismissed';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

/**
 * Dashboard banner showing Gmail connection status + a manual Sync Now button.
 * Hidden when the user has no Supabase session (demo/local mode).
 *
 * Subscribes to the shared `useGmailStatusStore` so when Settings
 * disconnects/reconnects Gmail, this banner flips immediately too — no
 * page reload required. Previously each component held its own cached
 * `useState` copy of /api/gmail/status, which is why the two surfaces
 * could disagree.
 */
export default function GmailSyncBanner() {
  const status = useGmailStatusStore((s) => s.status);
  const refreshStatus = useGmailStatusStore((s) => s.refresh);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Suggestions count: number of unmatched Gmail senders the user could
  // promote to contacts. Folded into the "Import contacts" CTA so the
  // banner has a single, action-oriented signal instead of stacking a
  // second "you have N senders" callout below it (Folk/Attio pattern).
  // null while loading; 0 means no suggestions available.
  const [suggestionCount, setSuggestionCount] = useState<number | null>(null);
  const push = useToastStore((s) => s.push);
  const openImport = useOnboardingStore((s) => s.openImport);
  // Demo users have no Supabase user record, so OAuth would have nothing
  // to attach Gmail tokens to. Hide the connect/sync UI entirely rather
  // than offering an action that's guaranteed to fail. The dashboard
  // already has the rest of the demo (170 contacts + AI suggestions);
  // the absence of this banner makes the demo look polished, not broken.
  const userEmail = useUserStore((s) => s.user.email);
  const isDemo = isDemoEmail(userEmail);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
    }
    // Hydrate the shared store on mount. The store deduplicates concurrent
    // calls, so it's safe if Settings already triggered a refresh.
    refreshStatus();
  }, [refreshStatus]);

  // Pull suggestion count whenever the connection becomes (or stays) active.
  // When disconnected we skip the fetch entirely — there'd be nothing to
  // suggest. Re-runs after Sync now (status.lastSyncAt changes) so the
  // count stays fresh without a page reload.
  useEffect(() => {
    if (!status?.connected) {
      setSuggestionCount(null);
      return;
    }
    let cancelled = false;
    fetch('/api/gmail/suggestions?limit=200')
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body.reason === 'unauthenticated') {
          setSuggestionCount(0);
          return;
        }
        setSuggestionCount((body.suggestions || []).length);
      })
      .catch(() => !cancelled && setSuggestionCount(0));
    return () => { cancelled = true; };
  }, [status?.connected, status?.lastSyncAt]);

  function handleDismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 100 }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? 'sync failed');
      push({
        severity: 'success',
        title: 'Gmail synced',
        description: `${body.synced} messages tracked · ${body.matched} contact matches`,
        duration: 3000,
      });
      // Refresh the shared store — this updates the banner AND the
      // Settings card together.
      await refreshStatus();
    } catch (e) {
      push({
        severity: 'error',
        title: 'Gmail sync failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 3000,
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnectGmail() {
    if (connecting) return;
    setConnecting(true);
    try {
      const supabase = createClient();
      // After the OAuth round-trip, send the user to the import wizard
      // (top-sender review) instead of dropping them back on the dashboard
      // staring at the same banner. `next` is honored by /auth/callback.
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding/gmail-import')}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback,
          scopes: GMAIL_SCOPES,
          // access_type=offline + prompt=consent are required here (and ONLY
          // here) so Google issues a refresh token we can use for background
          // sync. After the token lands in `gmail_connections`, no further
          // OAuth round-trip is needed for normal CRM usage.
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        push({
          severity: 'error',
          title: 'Could not start Google sign-in',
          description: error.message,
          duration: 3000,
        });
        setConnecting(false);
      }
    } catch (e) {
      push({
        severity: 'error',
        title: 'Could not start Google sign-in',
        description: e instanceof Error ? e.message : String(e),
        duration: 3000,
      });
      setConnecting(false);
    }
  }

  // Demo mode: never render. See `isDemo` declaration above for rationale.
  if (isDemo) return null;
  if (!status) return null;
  if (dismissed && !status.connected) return null;

  if (!status.connected) {
    return (
      <div
        data-tour="gmail-banner"
        className="w-full bg-[var(--warning-bg,#fff7ed)] border border-[var(--warning,#d97706)] rounded-lg px-3.5 py-2.5 flex items-center gap-2.5"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--warning,#d97706)] flex items-center justify-center flex-shrink-0">
          <Warning size={15} weight="fill" className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-bold text-[var(--text-primary)]">
            Connect Gmail to start tracking email activity
          </div>
          <div className="text-[11.5px] text-[var(--text-secondary)]">
            Sync your inbox to match messages to contacts and enable AI drafting.
          </div>
        </div>
        <button
          data-tour="gmail-connect-btn"
          onClick={handleConnectGmail}
          disabled={connecting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md bg-[var(--brand-primary)] text-white border-none hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
        >
          <GoogleLogo size={13} weight="bold" />
          {connecting ? 'Redirecting…' : 'Connect Gmail'}
        </button>
        <button
          onClick={handleDismiss}
          title="Hide this banner. You can reconnect anytime from Settings."
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md bg-white text-[var(--text-primary)] hover:bg-[var(--surface-2)] border border-[var(--text-primary)] cursor-pointer flex-shrink-0"
        >
          <XIcon size={12} weight="bold" />
          Ignore
        </button>
      </div>
    );
  }

  return (
    <div
      data-tour="gmail-banner"
      className="w-full bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-lg px-3.5 py-2 flex items-center gap-2.5"
    >
      <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
        <Envelope size={14} weight="fill" className="text-white" />
      </div>
      {/* Left status: just connection identity + message count. The
          last-sync timestamp moved out of this string and into the
          right-side action cluster so it sits next to the Sync button —
          per Paul's UX call (2026-04-27): action and the data it
          operates on belong together. */}
      <div className="text-[12px] text-[var(--text-secondary)] flex-1 min-w-0 truncate">
        Gmail connected as <strong className="font-bold text-[var(--text-primary)]">{status.email}</strong>
        {' · '}
        {status.messageCount ?? 0} messages tracked
      </div>
      {/* Import-contacts CTA. When unmatched senders exist, the button
          shows the count framed in the user's mental model — "contacts,"
          not "senders." Users on /contacts think in contacts; calling
          the source "Gmail senders" leaks an implementation detail.
          The tooltip still says they came from Gmail for those who want
          to know. When count is 0 / loading, the neutral "Import
          contacts" label keeps the banner from reading "Add 0
          contacts." */}
      <button
        data-tour="gmail-import"
        onClick={openImport}
        title={suggestionCount && suggestionCount > 0
          ? `${suggestionCount} contact${suggestionCount === 1 ? '' : 's'} from Gmail ready to add`
          : 'Add contacts from Gmail'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer flex-shrink-0 ${
          suggestionCount && suggestionCount > 0
            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white hover:opacity-90'
            : 'border-[var(--brand-primary)] bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-bg)]'
        }`}
      >
        {suggestionCount && suggestionCount > 0 ? (
          <>
            <Sparkle size={12} weight="fill" />
            Add {suggestionCount} contact{suggestionCount === 1 ? '' : 's'}
          </>
        ) : (
          <>
            <UserPlus size={12} weight="bold" />
            Import contacts
          </>
        )}
      </button>
      {/* Sync status + action grouped on the right. The "synced X ago"
          text sits flush against the Sync button so the user reads it
          as a unit — what state is the sync in, and the one-click
          refresh that controls it. Industry pattern: HubSpot, Folk,
          Attio all pair the freshness indicator with its refresh
          action this way. */}
      <span className="text-[11.5px] text-[var(--text-secondary)] flex-shrink-0">
        {formatLastSync(status.lastSyncAt)}
      </span>
      <button
        data-tour="gmail-sync-now"
        onClick={handleSync}
        disabled={syncing}
        title={syncing ? 'Syncing now…' : 'Pull latest Gmail messages and re-match contacts'}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded border border-[var(--brand-primary)] bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
      >
        <ArrowsClockwise
          size={12}
          weight="bold"
          className={syncing ? 'animate-spin' : ''}
        />
        {syncing ? 'Syncing…' : 'Sync'}
      </button>
    </div>
  );
}

function formatLastSync(iso?: string | null): string {
  if (!iso) return 'never synced';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'synced just now';
  if (mins < 60) return `synced ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `synced ${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `synced ${days}d ago`;
}
