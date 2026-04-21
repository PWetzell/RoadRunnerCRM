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
import { Sparkle, House, Envelope, X as XIcon } from '@phosphor-icons/react';
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

  // Manual hydration — avoids SSR/client race with Zustand v5 persist.
  useEffect(() => {
    useDashboardStore.persist.rehydrate();
    useCustomReportStore.persist.rehydrate();
  }, []);

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
        <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
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
    <div className="w-full bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-lg px-3.5 py-2 flex items-center gap-2.5">
      <Envelope size={14} weight="duotone" className="text-[var(--brand-primary)] flex-shrink-0" />
      <div className="text-[12px] text-[var(--text-secondary)] flex-1">
        Weekly summary is on — next digest will be sent to <strong className="font-bold text-[var(--text-primary)]">{userEmail}</strong> on Monday morning.
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="w-6 h-6 inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer rounded"
      >
        <XIcon size={12} weight="bold" />
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
    <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
      <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <House size={13} weight="duotone" className="text-white" />
      </div>
      <div className="text-[13px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">Dashboard</strong>
        <span> · {open.length} open deals · {contacts.length} contacts</span>
      </div>
      {staleAlertsOn && staleCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
          {staleCount} incomplete
        </span>
      )}
    </div>
  );
}
