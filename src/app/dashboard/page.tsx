'use client';

import { useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import ReportBuilderModal from '@/components/reporting/builder/ReportBuilderModal';
import CustomReportPrintView from '@/components/reporting/CustomReportPrintView';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { useUserStore } from '@/stores/user-store';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Sparkle, Envelope, X as XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

/**
 * Dashboard home. Lays out:
 *   Topbar → toolbar → widget grid.
 * On first load for a given user we pick a default preset matching their
 * role (e.g. recruiter → "Recruiter" preset). After that we respect whatever
 * view was last active (persisted via the dashboard-store).
 */
export default function DashboardPage() {
  const user = useUserStore((s) => s.user);
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const views = useDashboardStore((s) => s.views);
  const activeViewId = useDashboardStore((s) => s.activeViewId);
  const setActiveViewId = useDashboardStore((s) => s.setActiveViewId);
  const openImport = useOnboardingStore((s) => s.openImport);

  // Manual hydration — avoids SSR/client race with Zustand v5 persist.
  useEffect(() => {
    useDashboardStore.persist.rehydrate();
    useCustomReportStore.persist.rehydrate();
  }, []);

  // Auto-open curated import wizard on first Gmail sign-in if the user has
  // unmatched senders to pull in. Gated on a localStorage flag so we don't
  // re-prompt after the user has skipped or completed it.
  useEffect(() => {
    const doneAt = localStorage.getItem('roadrunner-onboarding-v1-done');
    if (doneAt) return;
    let cancelled = false;
    fetch('/api/gmail/suggestions?limit=5')
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body.reason === 'unauthenticated') return;
        if (Array.isArray(body.suggestions) && body.suggestions.length > 0) {
          openImport();
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [openImport]);

  // One-time: if the user's role matches a preset and the current active view
  // is still the default, swap to the role-appropriate preset.
  useEffect(() => {
    if (!user) return;
    const role = (user.role || '').toLowerCase();
    let wanted: string | null = null;
    if (role.includes('recruit')) wanted = 'preset-recruiter';
    else if (role.includes('manager') || role.includes('director') || role.includes('lead')) wanted = 'preset-manager';
    else if (role.includes('sales') || role.includes('ae') || role.includes('bdr')) wanted = 'preset-sales';

    if (wanted && activeViewId === 'preset-sales' && wanted !== 'preset-sales') {
      const exists = views.find((v) => v.id === wanted);
      if (exists) setActiveViewId(wanted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-3 pb-1 flex flex-col gap-1.5 items-start">
          {/* Weekly email summary banner — gated by Settings → Notifications → Email updates */}
          <WeeklyEmailBanner />
          {/* AI Insights bar — consistent with all other pages */}
          {aiEnabled && insightsBars?.dashboard && <DashboardInsightsBar />}
          <DashboardToolbar />
        </div>
        <div className="px-5 pb-6">
          <DashboardGrid />
        </div>
      </div>

      {/* Report Builder — mounted so "New report…" in Add Widget opens it */}
      <ReportBuilderModal />

      {/* Custom-report print view — renders off-screen, revealed only in print */}
      <div className="custom-report-print-host">
        <CustomReportPrintView />
      </div>
    </>
  );
}

/**
 * Shown at the top of the dashboard when the user has email updates enabled.
 * Lets the user see — and dismiss for the session — the signal that weekly
 * digests are active. Gated by Settings → Notifications → Email updates.
 */
function WeeklyEmailBanner() {
  const emailUpdates = useUserStore((s) => s.notifications.emailUpdates);
  const userEmail = useUserStore((s) => s.user.email);
  const [dismissed, setDismissed] = useState(false);
  if (!emailUpdates || dismissed) return null;
  return (
    <div className="w-full bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-lg px-2.5 py-1.5 flex items-center gap-2 h-[32px]">
      <div className="w-[18px] h-[18px] rounded-[var(--radius-sm)] bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
        <Envelope size={11} weight="fill" className="text-white" />
      </div>
      <div className="text-[11px] text-[var(--text-secondary)] flex-1">
        Weekly summary is on — next digest will be sent to <strong className="font-bold text-[var(--text-primary)]">{userEmail}</strong> on Monday morning.
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="w-5 h-5 inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer rounded"
      >
        <XIcon size={11} weight="bold" />
      </button>
    </div>
  );
}

function DashboardInsightsBar() {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const staleAlertsOn = useUserStore((s) => s.aiEnabled && s.notifications.staleAlerts);
  const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
  const staleCount = contacts.filter((c) => c.stale).length;

  return (
    <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-2.5 py-1.5 flex items-center gap-2 rounded-lg w-full h-[32px] overflow-hidden">
      <div className="w-[18px] h-[18px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={11} weight="duotone" className="text-white" />
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">Dashboard</strong>
        <span> · {open.length} open deals · {contacts.length} contacts</span>
      </div>
      {staleAlertsOn && staleCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
          {staleCount} incomplete
        </span>
      )}
    </div>
  );
}
