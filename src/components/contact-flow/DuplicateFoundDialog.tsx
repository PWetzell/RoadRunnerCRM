'use client';

import { Warning, X, Sparkle, CheckCircle } from '@phosphor-icons/react';
import { DuplicateCandidate } from '@/lib/data/mock-ai/duplicate-contacts';
import { initials } from '@/lib/utils';

interface NewContactData {
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
}

interface Props {
  open: boolean;
  candidate: DuplicateCandidate | null;
  newContact: NewContactData;
  onKeepExisting: () => void;
  onSmartMerge: () => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const FIELDS: { key: keyof NewContactData | keyof DuplicateCandidate; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'title', label: 'Job Title' },
  { key: 'company', label: 'Company' },
];

export function DuplicateFoundDialog({ open, candidate, newContact, onKeepExisting, onSmartMerge, onCreateNew, onClose }: Props) {
  if (!open || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-lg w-full max-w-[900px] max-h-[90vh] overflow-y-auto animate-[fadeUp_0.2s_ease-out]">
        {/* Header banner */}
        <div className="flex items-center justify-between px-5 py-3 bg-[var(--warning-bg)] border-b border-[var(--warning)] rounded-t-xl">
          <div className="flex items-center gap-2">
            <Warning size={18} className="text-[var(--warning)]" weight="fill" />
            <span className="text-[14px] font-extrabold text-[var(--warning)]">
              Potential Duplicate Detected — {candidate.confidence}% Match Confidence
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--warning)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-0 p-5">
          {/* Existing contact */}
          <div className="border-r border-[var(--border-subtle)] pr-5">
            <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
              Existing Contact
            </div>
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white"
                style={{ background: candidate.avatarColor }}
              >
                {initials(candidate.name)}
              </div>
              <div>
                <div className="text-[14px] font-bold text-[var(--text-primary)]">{candidate.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{candidate.company}</div>
              </div>
            </div>

            {FIELDS.map((f) => {
              const val = (candidate as any)[f.key] as string;
              const newVal = (newContact as any)[f.key] as string;
              const matches = val && newVal && val.toLowerCase() === newVal.toLowerCase();
              return (
                <div key={f.key} className="py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                  <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-0.5">{f.label}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                    <span className="truncate">{val || '—'}</span>
                    {matches && <CheckCircle size={12} weight="fill" className="text-[var(--success)] flex-shrink-0" />}
                  </div>
                </div>
              );
            })}

            <div className="py-2">
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-0.5">Joined</div>
              <div className="text-[13px] text-[var(--text-primary)]">{candidate.joined}</div>
            </div>
            <div className="py-2">
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-0.5">Tenure</div>
              <div className="text-[13px] text-[var(--text-primary)]">{candidate.tenure} days</div>
            </div>
          </div>

          {/* New contact */}
          <div className="pl-5">
            <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
              New Contact (Yours)
            </div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white bg-[var(--brand-primary)]">
                {initials(newContact.name || '?')}
              </div>
              <div>
                <div className="text-[14px] font-bold text-[var(--text-primary)]">{newContact.name || 'New Contact'}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{newContact.company || '—'}</div>
              </div>
            </div>

            {FIELDS.map((f) => {
              const val = (newContact as any)[f.key] as string;
              const existingVal = (candidate as any)[f.key] as string;
              const matches = val && existingVal && val.toLowerCase() === existingVal.toLowerCase();
              return (
                <div key={f.key} className="py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                  <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-0.5">{f.label}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                    <span className="truncate">{val || '—'}</span>
                    {matches && <CheckCircle size={12} weight="fill" className="text-[var(--success)] flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)]">
          <button
            onClick={onKeepExisting}
            className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
          >
            Keep Existing
          </button>

          <div className="flex gap-2">
            <button
              onClick={onSmartMerge}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-extrabold text-white rounded-[var(--radius-md)] cursor-pointer border-none"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}
            >
              <Sparkle size={14} weight="duotone" />
              Smart Merge
            </button>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-md)] cursor-pointer border-none"
            >
              Create as New
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
