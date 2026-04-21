'use client';

import { ArrowLeft, Gear, CalendarCheck, Bell } from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';
import RuleTab from './tabs/RuleTab';
import ReminderTab from './tabs/ReminderTab';
import QuickAlertTab from './tabs/QuickAlertTab';

const TABS = [
  { id: 'rule' as const, label: 'Alert Rule', icon: Gear },
  { id: 'reminder' as const, label: 'Reminder', icon: CalendarCheck },
  { id: 'quick' as const, label: 'Quick Alert', icon: Bell },
];

/**
 * Tabbed dialog for creating alerts. Three modes:
 *   - Rule: Preset template picker with configurable threshold
 *   - Reminder: Date/time + recurrence + entity link
 *   - Quick: Simple title/message/severity (legacy behavior)
 */
export default function CreateAlertDialog() {
  const setCreateOpen = useAlertStore((s) => s.setCreateOpen);
  const createTab = useAlertStore((s) => s.createTab);
  const setCreateTab = useAlertStore((s) => s.setCreateTab);

  return (
    <div className="absolute right-0 top-full mt-2 w-[400px] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl z-[60] flex flex-col max-h-[600px] animate-[fadeUp_0.15s_ease-out]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <button
          onClick={() => setCreateOpen(false)}
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={14} weight="bold" />
        </button>
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1">Create Alert</span>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-0">
        <div className="flex gap-1 bg-[var(--surface-raised)] rounded-[var(--radius-sm)] p-0.5">
          {TABS.map((tab) => {
            const active = createTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCreateTab(tab.id)}
                className={`flex-1 h-[30px] text-[11px] font-bold rounded-[var(--radius-xs,4px)] border-none cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  active
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={12} weight={active ? 'fill' : 'regular'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {createTab === 'rule' && <RuleTab />}
      {createTab === 'reminder' && <ReminderTab />}
      {createTab === 'quick' && <QuickAlertTab />}
    </div>
  );
}
