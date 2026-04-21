'use client';

import { useState } from 'react';
import { CalendarCheck } from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';
import { AlertSeverity, ALERT_SEVERITIES, ReminderRecurrence, EntityLink } from '@/types/alert';
import EntityPicker from '../EntityPicker';

const RECURRENCE_OPTIONS: { id: ReminderRecurrence; label: string }[] = [
  { id: 'none', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

/** Returns the local datetime string for <input type="datetime-local"> min attribute */
function localMinDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ReminderTab() {
  const setCreateOpen = useAlertStore((s) => s.setCreateOpen);
  const addReminder = useAlertStore((s) => s.addReminder);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none');
  const [severity, setSeverity] = useState<AlertSeverity>('info');
  const [entityLink, setEntityLink] = useState<EntityLink | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (!scheduledAt) errs.scheduledAt = 'Date & time is required';
    else if (new Date(scheduledAt).getTime() <= Date.now()) errs.scheduledAt = 'Must be in the future';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    addReminder({
      title: title.trim(),
      message: message.trim(),
      severity,
      scheduledAt: new Date(scheduledAt).toISOString(),
      recurrence,
      entityLink,
    });
    setCreateOpen(false);
  };

  return (
    <>
      <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Title */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Title <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: '' })); }}
            placeholder="e.g., Follow up with Meridian"
            className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${
              errors.title ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
            }`}
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

        {/* Date & Time */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Date & Time <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => { setScheduledAt(e.target.value); if (errors.scheduledAt) setErrors((p) => ({ ...p, scheduledAt: '' })); }}
            min={localMinDatetime()}
            className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${
              errors.scheduledAt ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
            }`}
          />
          {errors.scheduledAt && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{errors.scheduledAt}</div>}
        </div>

        {/* Recurrence */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Recurrence</label>
          <div className="flex gap-1">
            {RECURRENCE_OPTIONS.map((r) => {
              const active = recurrence === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRecurrence(r.id)}
                  className={`flex-1 h-[28px] text-[11px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                    active
                      ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entity link */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Link to Record (optional)</label>
          <EntityPicker value={entityLink} onChange={setEntityLink} />
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
          disabled={!title.trim() || !scheduledAt}
          className={`h-[32px] px-5 text-[12px] font-bold text-white rounded-[var(--radius-sm)] border-none cursor-pointer ${
            title.trim() && scheduledAt ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarCheck size={13} weight="bold" /> Set Reminder
          </span>
        </button>
      </div>
    </>
  );
}
