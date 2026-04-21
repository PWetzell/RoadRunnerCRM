'use client';

import { useState } from 'react';
import { Gear, Check, Hourglass, CurrencyDollar, User, File } from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';
import { AlertSeverity, ALERT_SEVERITIES, ALERT_RULE_TEMPLATES, AlertRuleTemplate, AlertRuleTemplateMeta } from '@/types/alert';

const TEMPLATE_ICONS: Record<AlertRuleTemplate, typeof Gear> = {
  'deal-idle-days': Hourglass,
  'deal-amount-exceeds': CurrencyDollar,
  'contact-missing-info': User,
  'document-expiring': File,
};

export default function RuleTab() {
  const setCreateOpen = useAlertStore((s) => s.setCreateOpen);
  const addRule = useAlertStore((s) => s.addRule);

  const [selected, setSelected] = useState<AlertRuleTemplateMeta | null>(null);
  const [threshold, setThreshold] = useState<number>(0);
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSelectTemplate = (t: AlertRuleTemplateMeta) => {
    setSelected(t);
    setThreshold(t.thresholdDefault);
    setSeverity(t.defaultSeverity);
    setName(t.label);
    setErrors({});
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!selected) errs.template = 'Select a rule template';
    if (!name.trim() || name.trim().length < 3) errs.name = 'Name must be at least 3 characters';
    else if (name.length > 80) errs.name = 'Name must be at most 80 characters';
    if (selected?.hasThreshold) {
      if (!threshold || threshold <= 0) errs.threshold = 'Threshold must be greater than 0';
      else if (!Number.isInteger(threshold)) errs.threshold = 'Threshold must be a whole number';
      else if (threshold > 1_000_000_000) errs.threshold = 'Threshold is too large';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    addRule({
      name: name.trim(),
      template: selected!.id,
      threshold: selected!.hasThreshold ? threshold : null,
      severity,
      enabled: true,
    });
    setCreateOpen(false);
  };

  return (
    <>
      <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Template picker */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
            Rule Template <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex flex-col gap-1.5">
            {ALERT_RULE_TEMPLATES.map((t) => {
              const active = selected?.id === t.id;
              const Icon = TEMPLATE_ICONS[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left px-3 py-2 rounded-[var(--radius-sm)] border cursor-pointer transition-all flex items-start gap-2.5 ${
                    active
                      ? 'bg-[var(--brand-bg)] border-[var(--brand-primary)]'
                      : 'bg-[var(--surface-card)] border-[var(--border)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    active ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)]'
                  }`}>
                    {active ? <Check size={12} weight="bold" /> : <Icon size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-bold ${active ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {t.label}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.template && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{errors.template}</div>}
        </div>

        {/* Threshold (conditional) */}
        {selected?.hasThreshold && (
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
              {selected.thresholdLabel} <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {selected.thresholdPrefix && (
                <span className="text-[13px] font-bold text-[var(--text-secondary)]">{selected.thresholdPrefix}</span>
              )}
              <input
                type="number"
                value={threshold}
                onChange={(e) => { setThreshold(Number(e.target.value)); if (errors.threshold) setErrors((p) => ({ ...p, threshold: '' })); }}
                min={1}
                className={`w-[100px] h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${
                  errors.threshold ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
                }`}
              />
              {selected.thresholdSuffix && (
                <span className="text-[12px] text-[var(--text-tertiary)]">{selected.thresholdSuffix}</span>
              )}
            </div>
            {errors.threshold && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{errors.threshold}</div>}
          </div>
        )}

        {/* Rule name */}
        {selected && (
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Rule Name</label>
            <input
              value={name}
              maxLength={80}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
              className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${
                errors.name ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
              }`}
            />
            {errors.name && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{errors.name}</div>}
          </div>
        )}

        {/* Severity */}
        {selected && (
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Severity</label>
            <div className="flex gap-1">
              {ALERT_SEVERITIES.map((s) => {
                const active = severity === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSeverity(s.id)}
                    className={`flex-1 h-[28px] text-[11px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
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
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-end gap-2">
        <button
          onClick={() => setCreateOpen(false)}
          className="h-[32px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!selected}
          className={`h-[32px] px-5 text-[12px] font-bold text-white rounded-[var(--radius-sm)] border-none cursor-pointer ${
            selected ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Gear size={13} weight="bold" /> Save Rule
          </span>
        </button>
      </div>
    </>
  );
}
