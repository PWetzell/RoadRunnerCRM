'use client';

import { ArrowLeft, Bell, BellSlash } from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';
import { ALERT_CATEGORIES, ALERT_TYPE_META, AlertType, ALERT_SEVERITIES, AlertSeverity } from '@/types/alert';

/**
 * Alert settings sub-panel inside the notification dropdown.
 * Lets users control:
 *   - Which alert types are enabled (grouped by category)
 *   - Minimum severity threshold
 *   - Desktop notifications toggle
 *   - Sound on critical toggle
 */
export default function AlertSettingsPanel() {
  const settings = useAlertStore((s) => s.settings);
  const setSettingsOpen = useAlertStore((s) => s.setSettingsOpen);
  const toggleType = useAlertStore((s) => s.toggleType);
  const setMinSeverity = useAlertStore((s) => s.setMinSeverity);
  const updateSettings = useAlertStore((s) => s.updateSettings);

  return (
    <div className="absolute right-0 top-full mt-2 w-[400px] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl z-[60] flex flex-col max-h-[560px] animate-[fadeUp_0.15s_ease-out]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <button
          onClick={() => setSettingsOpen(false)}
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={14} weight="bold" />
        </button>
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1">Alert Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Min severity */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Minimum severity</div>
          <div className="flex gap-1">
            {ALERT_SEVERITIES.map((s) => {
              const active = settings.minSeverity === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setMinSeverity(s.id)}
                  className={`flex-1 h-[30px] text-[11px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                    active
                      ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
            Only alerts at or above this severity will appear.
          </div>
        </div>

        {/* Toggles */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex flex-col gap-2">
          <ToggleRow
            label="Desktop notifications"
            description="Show browser notifications for new alerts."
            checked={settings.desktopNotifications}
            onChange={(v) => updateSettings({ desktopNotifications: v })}
          />
          <ToggleRow
            label="Sound on critical"
            description="Play a sound when a critical alert arrives."
            checked={settings.soundOnCritical}
            onChange={(v) => updateSettings({ soundOnCritical: v })}
          />
        </div>

        {/* Alert types by category */}
        {ALERT_CATEGORIES.map((cat) => {
          const types = Object.entries(ALERT_TYPE_META)
            .filter(([, m]) => m.category === cat) as [AlertType, typeof ALERT_TYPE_META[AlertType]][];
          return (
            <div key={cat} className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{cat}</div>
              <div className="flex flex-col gap-1">
                {types.map(([type, meta]) => {
                  const enabled = settings.enabledTypes[type] !== false;
                  return (
                    <label key={type} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleType(type)}
                        className="w-3.5 h-3.5 rounded accent-[var(--brand-primary)]"
                      />
                      <span className="flex items-center gap-1.5 flex-1">
                        {enabled ? <Bell size={11} className="text-[var(--text-secondary)]" /> : <BellSlash size={11} className="text-[var(--text-tertiary)]" />}
                        <span className={`text-[11px] ${enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          {meta.label}
                        </span>
                      </span>
                      <span className="text-[9px] font-bold uppercase text-[var(--text-tertiary)]">{meta.defaultSeverity}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-[var(--brand-primary)] mt-0.5"
      />
      <div>
        <div className="text-[12px] font-bold text-[var(--text-primary)]">{label}</div>
        <div className="text-[10px] text-[var(--text-tertiary)]">{description}</div>
      </div>
    </label>
  );
}
