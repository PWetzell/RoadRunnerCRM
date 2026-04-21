'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  X, Check, CheckCircle, Warning, WarningCircle, Info, Bell, BellRinging,
  Sparkle, Trash, Gear, Eye, Clock, Trophy, XCircle, Hourglass, ArrowsClockwise,
  User, UsersThree, File, Lightning, Wrench, CalendarCheck, CheckSquare,
} from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';
import { useTourStore } from '@/stores/tour-store';
import { CrmAlert, AlertSeverity, ALERT_TYPE_META, ALERT_SEVERITIES } from '@/types/alert';
import AlertSettingsPanel from './AlertSettingsPanel';
import CreateAlertDialog from './CreateAlertDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const ICON_MAP: Record<string, typeof Bell> = {
  ArrowsClockwise, Trophy, XCircle, Hourglass, Warning, User, UsersThree,
  File, Clock, Sparkle, Lightning, Wrench, Bell, CalendarCheck, CheckSquare,
};

const SEVERITY_ICON: Record<AlertSeverity, React.ReactNode> = {
  info:     <Info size={14} weight="fill" className="text-[var(--brand-primary)]" />,
  success:  <CheckCircle size={14} weight="fill" className="text-[var(--success)]" />,
  warning:  <Warning size={14} weight="fill" className="text-[var(--warning)]" />,
  critical: <WarningCircle size={14} weight="fill" className="text-[var(--danger)]" />,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * The notification panel that opens from the bell icon. Shows:
 * - Header with title, mark-all-read, settings gear, close
 * - Filtered list of alerts (respects user settings)
 * - Each alert: severity icon, title, message, time, dismiss/mark-read
 * - Empty state when all caught up
 * - Footer with "Create custom alert" button
 */
export default function AlertPanel() {
  const panelOpen = useAlertStore((s) => s.panelOpen);
  const setPanelOpen = useAlertStore((s) => s.setPanelOpen);
  const settingsOpen = useAlertStore((s) => s.settingsOpen);
  const setSettingsOpen = useAlertStore((s) => s.setSettingsOpen);
  const createOpen = useAlertStore((s) => s.createOpen);
  const setCreateOpen = useAlertStore((s) => s.setCreateOpen);
  // Select raw state and derive in useMemo — calling the store method directly
  // returns a new array every render and causes an infinite update loop.
  const alerts = useAlertStore((s) => s.alerts);
  const settings = useAlertStore((s) => s.settings);
  const visibleAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (a.dismissed) return false;
      if (settings.enabledTypes[a.type] === false) return false;
      const order = { info: 0, success: 1, warning: 2, critical: 3 };
      if (order[a.severity] < order[settings.minSeverity]) return false;
      return true;
    });
  }, [alerts, settings]);
  const markRead = useAlertStore((s) => s.markRead);
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const dismiss = useAlertStore((s) => s.dismiss);
  const dismissAll = useAlertStore((s) => s.dismissAll);

  const ref = useRef<HTMLDivElement>(null);
  const [confirmDismissAll, setConfirmDismissAll] = useState(false);
  const activeTour = useTourStore((s) => s.activeWalkthrough);
  const isNotificationsTour = activeTour === '/notifications';

  // Auto-open the panel when the notifications tour starts (so steps 2-5 have a target)
  useEffect(() => {
    if (isNotificationsTour && !panelOpen) {
      setPanelOpen(true);
    }
  }, [isNotificationsTour, panelOpen, setPanelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    // Don't close when an overlay tour is active — its spotlight would trigger
    // the outside-click and kill the target the tour is pointing at.
    if (activeTour) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [panelOpen, setPanelOpen, activeTour]);

  if (!panelOpen) return null;

  // If settings sub-panel is open, show that instead
  if (settingsOpen) return <AlertSettingsPanel />;
  if (createOpen) return <CreateAlertDialog />;

  const unread = visibleAlerts.filter((a) => !a.read);
  const read = visibleAlerts.filter((a) => a.read);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[400px] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl z-[60] flex flex-col max-h-[560px] animate-[fadeUp_0.15s_ease-out]"
    >
      {/* Header */}
      <div data-tour="alert-header" className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <BellRinging size={16} weight="duotone" className="text-[var(--brand-primary)]" />
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1">
          Notifications
          {unread.length > 0 && (
            <span className="ml-1.5 text-[11px] font-bold text-[var(--brand-primary)]">
              ({unread.length} new)
            </span>
          )}
        </span>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            title="Mark all as read"
            className="text-[10px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"
          >
            Mark all read
          </button>
        )}
        <button
          data-tour="alert-settings-btn"
          onClick={() => setSettingsOpen(true)}
          title="Alert settings"
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
        >
          <Gear size={14} />
        </button>
        <button
          onClick={() => setPanelOpen(false)}
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Alert list */}
      <div data-tour="alert-list" className="flex-1 overflow-y-auto">
        {visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle size={32} weight="duotone" className="text-[var(--success)]" />
            <div className="text-[13px] font-bold text-[var(--text-secondary)]">All caught up!</div>
            <div className="text-[11px] text-[var(--text-secondary)]">No new notifications.</div>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">New</span>
              </div>
            )}
            {unread.map((a) => <AlertRow key={a.id} alert={a} onRead={markRead} onDismiss={dismiss} />)}
            {read.length > 0 && (
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Earlier</span>
                {read.length > 3 && (
                  <button
                    onClick={() => setConfirmDismissAll(true)}
                    className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
                  >
                    Dismiss all
                  </button>
                )}
              </div>
            )}
            {read.map((a) => <AlertRow key={a.id} alert={a} onRead={markRead} onDismiss={dismiss} />)}
          </>
        )}
      </div>

      {/* Footer */}
      <div data-tour="alert-footer" className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
        <button
          data-tour="alert-create-btn"
          onClick={() => setCreateOpen(true)}
          className="text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1"
        >
          <Bell size={12} weight="bold" /> Create custom alert
        </button>
        <span className="text-[10px] text-[var(--text-secondary)]">
          {visibleAlerts.length} of {alerts.filter((a) => !a.dismissed).length} shown
        </span>
      </div>

      <ConfirmDialog
        open={confirmDismissAll}
        title="Dismiss all earlier alerts?"
        message={`This will clear ${read.length} notification${read.length === 1 ? '' : 's'} from your alert panel. Unread alerts will not be affected.`}
        confirmLabel="Dismiss all"
        confirmVariant="danger"
        onConfirm={() => { dismissAll(); setConfirmDismissAll(false); }}
        onCancel={() => setConfirmDismissAll(false)}
      />
    </div>
  );
}

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  info:     'var(--brand-primary)',
  success:  'var(--success)',
  warning:  'var(--warning)',
  critical: 'var(--danger)',
};

const SEVERITY_BG: Record<AlertSeverity, string> = {
  info:     'var(--brand-bg)',
  success:  'var(--success-bg)',
  warning:  'var(--warning-bg)',
  critical: 'var(--danger-bg)',
};

function AlertRow({ alert, onRead, onDismiss }: { alert: CrmAlert; onRead: (id: string) => void; onDismiss: (id: string) => void }) {
  const meta = ALERT_TYPE_META[alert.type];
  const IconComp = ICON_MAP[meta.icon] || Bell;

  const content = (
    <div
      className={`group pl-3 pr-4 py-2.5 flex items-start gap-3 border-b border-[var(--border-subtle)] last:border-0 cursor-pointer transition-colors ${
        alert.read ? 'hover:bg-[var(--surface-raised)]' : 'hover:brightness-[0.97]'
      }`}
      style={{
        borderLeft: `3px solid ${SEVERITY_BORDER[alert.severity]}`,
        ...(alert.read ? {} : { backgroundColor: SEVERITY_BG[alert.severity] }),
      }}
      onClick={() => !alert.read && onRead(alert.id)}
    >
      {/* Severity dot */}
      <div className="pt-0.5 flex-shrink-0">
        {SEVERITY_ICON[alert.severity]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-[12px] leading-tight ${alert.read ? 'text-[var(--text-secondary)]' : 'font-bold text-[var(--text-primary)]'}`}>
          {alert.title}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{alert.message}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{meta.category}</span>
          <span className="text-[10px] text-[var(--text-secondary)]">{timeAgo(alert.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!alert.read && (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRead(alert.id); }}
            title="Mark as read"
            className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border-none cursor-pointer"
          >
            <Eye size={10} weight="bold" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDismiss(alert.id); }}
          title="Dismiss"
          className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer"
        >
          <X size={10} weight="bold" />
        </button>
      </div>
    </div>
  );

  if (alert.href) {
    return <Link href={alert.href} className="no-underline block">{content}</Link>;
  }
  return content;
}
