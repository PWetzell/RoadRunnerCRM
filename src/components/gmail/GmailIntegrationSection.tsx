'use client';

import { useEffect, useState } from 'react';
import { Envelope, GoogleLogo, Plug, ArrowsClockwise, CheckCircle, UserMinus, AddressBook, Sparkle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { useToastStore } from '@/stores/toast-store';
import { useGmailStatusStore, type GmailStatus } from '@/stores/gmail-status-store';
import { useUserStore } from '@/stores/user-store';
import { isDemoEmail } from '@/lib/auth/demo-accounts';
import GmailDisconnectDialog from './GmailDisconnectDialog';
import RemoveImportedContactsDialog from './RemoveImportedContactsDialog';

// Re-export under the local name used throughout this file. Same shape
// as the store's `GmailStatus` — kept as a type alias so the file's
// existing references don't churn.
type Status = GmailStatus;

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

/**
 * Settings → Integrations → Gmail card.
 *
 * The dashboard banner is the primary connect surface (it's the first thing
 * the user sees post-login). Settings is the secondary surface — it owns the
 * disconnect path and shows the "you're connected as X" detail that doesn't
 * need to live in the banner. Reconnect from Settings also works for users
 * who dismissed the banner with the "Ignore" button.
 *
 * Visually mirrors the existing Settings <Section> shell, so it slots in
 * without bespoke styling.
 */
export default function GmailIntegrationSection() {
  // Subscribe to the shared store so any disconnect/connect here is
  // immediately reflected in the dashboard banner (and vice versa). The
  // local `setStatus` references throughout this file now write into the
  // store's optimistic setter — same call shape, different backing store.
  const status = useGmailStatusStore((s) => s.status);
  const refreshStatus = useGmailStatusStore((s) => s.refresh);
  const setStatus = useGmailStatusStore((s) => s.setOptimistic);

  const [busy, setBusy] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showRemoveImported, setShowRemoveImported] = useState(false);
  // Demo users have no Supabase user record, so connect/disconnect/sync
  // would all error server-side. Render a passive "this is a demo" card
  // instead of the live integration UI — keeps Settings looking complete
  // (we don't want a mysteriously-missing Gmail section) while making it
  // obvious why the buttons aren't there. Doubles as a conversion CTA
  // for hiring managers evaluating the product.
  const userEmail = useUserStore((s) => s.user.email);
  const isDemo = isDemoEmail(userEmail);
  /** Count of contacts whose `source = 'gmail_import'` for the current user.
   *  Drives whether we render the "Remove imported contacts" row at all —
   *  zero is a no-op state we hide instead of showing a dead button. */
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const push = useToastStore((s) => s.push);

  async function refresh() {
    try {
      const [, importedRes] = await Promise.all([
        // Status now flows through the shared store so every consumer
        // (banner, settings, future surfaces) stays aligned.
        refreshStatus(),
        fetch('/api/contacts/by-source?source=gmail_import&previewLimit=0')
          .then(async (r) => (r.ok ? r.json() : { count: 0 }))
          .catch(() => ({ count: 0 })),
      ]);
      setImportedCount(typeof importedRes.count === 'number' ? importedRes.count : 0);
    } catch {
      setStatus({ connected: false, reason: 'error' });
      setImportedCount(0);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleRemoveImported() {
    // Same optimistic-close pattern as handleDisconnect: close the dialog
    // and zero the count immediately. The actual count gets reconciled from
    // the server after the DELETE; on error we restore + toast.
    const prevImported = importedCount;
    setShowRemoveImported(false);
    setImportedCount(0);

    push({
      severity: 'success',
      title: 'Removing imported contacts…',
      description: 'Deleting wizard-created contacts.',
      duration: 2500,
    });

    try {
      const r = await fetch('/api/contacts/by-source?source=gmail_import', { method: 'DELETE' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? `remove failed (${r.status})`);
      push({
        severity: 'success',
        title: 'Imported contacts removed',
        description: `Deleted ${body.removed ?? 0} contact${body.removed === 1 ? '' : 's'} created by the Gmail import wizard.`,
        duration: 3500,
      });
      await refresh();
    } catch (e) {
      push({
        severity: 'error',
        title: 'Could not remove imported contacts',
        description: e instanceof Error ? e.message : String(e),
        duration: 5000,
      });
      setImportedCount(prevImported);
      await refresh();
    }
  }

  async function handleConnect() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      // Same redirect as the banner — drop the user into the import wizard
      // post-OAuth so reconnect-from-Settings ends with a useful action,
      // not just a green checkmark.
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding/gmail-import')}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback,
          scopes: GMAIL_SCOPES,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        push({ severity: 'error', title: 'Could not start Google sign-in', description: error.message, duration: 3000 });
        setBusy(false);
      }
    } catch (e) {
      push({
        severity: 'error',
        title: 'Could not start Google sign-in',
        description: e instanceof Error ? e.message : String(e),
        duration: 3000,
      });
      setBusy(false);
    }
  }

  async function handleDisconnect(purge: boolean) {
    // OPTIMISTIC UI: close the dialog and flip Settings to "Not connected"
    // immediately. Don't make the user stare at a stuck modal while we wait
    // for Google's revoke endpoint + Supabase round-trip. If the API fails,
    // we re-fetch the real status so the UI snaps back to truth and surface
    // an error toast. HubSpot/Linear/Notion all use this pattern for
    // destructive confirms — visual confirmation is the close, not the
    // server's 200.
    const prevStatus = status;
    const prevImported = importedCount;
    setShowDisconnect(false);
    setStatus({ connected: false, reason: 'optimistic_disconnect' });
    if (purge) setImportedCount(prevImported); // contacts aren't purged here

    push({
      severity: 'success',
      title: 'Gmail disconnected',
      description: purge
        ? 'Removing your synced messages…'
        : 'Your synced messages were kept. Reconnect anytime to resume sync.',
      duration: 3500,
    });

    try {
      const r = await fetch('/api/gmail/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purge }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? `disconnect failed (${r.status})`);

      // For purge, replace the in-flight toast with the real count.
      if (purge) {
        push({
          severity: 'success',
          title: 'Email history forgotten',
          description: `Removed ${body.purgedMessages ?? 0} synced messages from your timeline.`,
          duration: 3500,
        });
      }
      // Reconcile with the server in case the count differs from optimistic.
      await refresh();
    } catch (e) {
      // Rollback: snap UI back to whatever the server actually says.
      push({
        severity: 'error',
        title: 'Disconnect failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 5000,
      });
      // Restore prior status immediately so the user isn't lied to, then
      // refresh against the server in case state diverged.
      if (prevStatus) setStatus(prevStatus);
      await refresh();
    }
  }

  // Demo-mode placeholder. See `isDemo` declaration above for rationale.
  // Renders as a quietly-disabled section with a "sign up to connect"
  // message — same shape as the live card so Settings layout doesn't
  // shift when a user later signs up for real.
  if (isDemo) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="text-[14px] font-extrabold text-[var(--text-primary)]">Gmail</div>
          <div className="text-[12px] text-[var(--text-tertiary)]">
            Connect a Google account to sync email activity into Roadrunner.
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-bg)] flex items-center justify-center flex-shrink-0">
            <Sparkle size={16} weight="fill" className="text-[var(--brand-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-[var(--text-primary)]">
              You&rsquo;re viewing the demo workspace
            </div>
            <div className="text-[12px] text-[var(--text-secondary)]">
              Gmail sync needs a real account. Sign up free to connect your inbox and start tracking email activity.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton — match the row heights of the connected/disconnected
  // states so the card doesn't jump on first paint.
  if (!status) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="text-[14px] font-extrabold text-[var(--text-primary)]">Gmail</div>
          <div className="text-[12px] text-[var(--text-tertiary)]">Connect a Google account to sync email activity into Roadrunner.</div>
        </div>
        <div className="px-5 py-4">
          <div className="h-[20px] w-[60%] rounded bg-[var(--surface-raised)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="text-[14px] font-extrabold text-[var(--text-primary)]">Gmail</div>
        <div className="text-[12px] text-[var(--text-tertiary)]">
          {status.connected
            ? 'Roadrunner is syncing email activity from this Google account.'
            : 'Connect a Google account to sync email activity into Roadrunner.'}
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-between gap-4">
        {status.connected ? (
          <>
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-bg)] flex items-center justify-center flex-shrink-0">
                <Envelope size={15} weight="fill" className="text-[var(--brand-primary)]" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  {status.email}
                  <CheckCircle size={12} weight="fill" className="text-[var(--brand-primary)]" />
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5 flex-wrap">
                  <span>{status.messageCount ?? 0} messages tracked</span>
                  <span aria-hidden>·</span>
                  <ArrowsClockwise size={10} weight="bold" />
                  <span>{formatLastSync(status.lastSyncAt)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDisconnect(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] font-bold rounded-md border border-[var(--danger,#dc2626)] text-[var(--danger,#dc2626)] bg-transparent hover:bg-[var(--danger-bg,#fef2f2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plug size={12} weight="bold" />
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
                <Envelope size={15} weight="duotone" className="text-[var(--text-tertiary)]" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--text-primary)]">Not connected</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  We&rsquo;ll request read, send, and modify scopes so you can compose email from inside Roadrunner.
                </div>
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] font-bold rounded-md bg-[var(--brand-primary)] text-white border-none hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            >
              <GoogleLogo size={13} weight="bold" />
              {busy ? 'Redirecting…' : 'Connect Gmail'}
            </button>
          </>
        )}
      </div>

      {/* "Imported contacts" row — surfaced whenever the user has at least
          one contact tagged source='gmail_import', whether they're still
          connected or not. Lets them clean up wizard-created contacts
          without needing to disconnect first. Hidden when count = 0 so the
          card stays uncluttered for users who never ran the import wizard. */}
      {!!importedCount && importedCount > 0 && (
        <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
              <AddressBook size={15} weight="duotone" className="text-[var(--text-secondary)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[var(--text-primary)]">
                {importedCount.toLocaleString()} contact{importedCount === 1 ? '' : 's'} imported from Gmail
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Created by the import wizard. Removing them deletes the contact records but keeps any synced emails in your timeline.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowRemoveImported(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] font-bold rounded-md border border-[var(--danger,#dc2626)] text-[var(--danger,#dc2626)] bg-transparent hover:bg-[var(--danger-bg,#fef2f2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <UserMinus size={12} weight="bold" />
            Remove imported
          </button>
        </div>
      )}

      <GmailDisconnectDialog
        open={showDisconnect}
        email={status.email}
        messageCount={status.messageCount}
        onClose={() => !busy && setShowDisconnect(false)}
        onConfirm={handleDisconnect}
      />

      <RemoveImportedContactsDialog
        open={showRemoveImported}
        onClose={() => !busy && setShowRemoveImported(false)}
        onConfirm={handleRemoveImported}
      />
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
