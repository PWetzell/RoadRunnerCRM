'use client';

import { useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';
import { AlertSeverity, ALERT_SEVERITIES } from '@/types/alert';

export default function QuickAlertTab() {
  const setCreateOpen = useAlertStore((s) => s.setCreateOpen);
  const addAlert = useAlertStore((s) => s.addAlert);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity>('info');
  const [href, setHref] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateAll() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    else if (title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (href.trim() && !href.trim().startsWith('/')) errs.href = 'Link must start with / (e.g. /sales/deal-1)';
    return errs;
  }

  const handleSave = () => {
    const errs = validateAll();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    addAlert({
      type: 'custom',
      severity,
      title: title.trim(),
      message: message.trim(),
      href: href.trim() || undefined,
    });
    setCreateOpen(false);
  };

  return (
    <>
      <div className="p-4 flex flex-col gap-3">
        {/* Title */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Title <span className="text-[var(--danger)]">*</span></label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: '' })); }}
            placeholder="e.g., Follow up with Meridian by Friday"
            className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${errors.title ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
          />
          {errors.title && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{errors.title}</div>}
        </div>

        {/* Message */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional details..."
            rows={2}
            className="w-full px-2.5 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none resize-y focus:border-[var(--brand-primary)]"
          />
        </div>

        {/* Severity */}
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

        {/* Link */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Link (optional)</label>
          <input
            value={href}
            onChange={(e) => { setHref(e.target.value); if (errors.href) setErrors((p) => ({ ...p, href: '' })); }}
            placeholder="/sales/deal-1 or /contacts/per-3"
            className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${errors.href ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
          />
          {errors.href && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{errors.href}</div>}
        </div>
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
          disabled={!title.trim()}
          className={`h-[32px] px-5 text-[12px] font-bold text-white rounded-[var(--radius-sm)] border-none cursor-pointer ${
            title.trim() ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <FloppyDisk size={13} weight="bold" /> Create Alert
          </span>
        </button>
      </div>
    </>
  );
}
