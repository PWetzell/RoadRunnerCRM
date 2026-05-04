'use client';

import { CheckCircle, Tag, X as XIcon } from '@phosphor-icons/react';
import { Deal } from '@/types/deal';
import { ContactWithEntries } from '@/types/contact';
import { initials, getAvatarColor } from '@/lib/utils';

export default function ConvertToCustomerDialog({ deal, org, onCancel, onConfirm }: {
  deal: Deal;
  org: ContactWithEntries | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl w-[440px] max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold text-[var(--text-primary)]">Convert to Customer</h3>
          <button onClick={onCancel} aria-label="Close" className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">
            <XIcon size={14} />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-[var(--text-secondary)] mb-4">
            Mark <strong className="text-[var(--text-primary)]">{org?.name || 'this organization'}</strong> as a customer? This will:
          </p>
          <ul className="flex flex-col gap-2 mb-4">
            <li className="flex items-start gap-2 text-[12px] text-[var(--text-primary)]">
              <CheckCircle size={14} weight="fill" className="text-[var(--success)] mt-0.5 flex-shrink-0" />
              Close <strong>{deal.name}</strong> as Won
            </li>
            <li className="flex items-start gap-2 text-[12px] text-[var(--text-primary)]">
              <Tag size={14} weight="fill" className="text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
              Add the <strong>Customer</strong> tag to the organization
            </li>
          </ul>
          {org && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--surface-raised)] rounded-md">
              <div className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: getAvatarColor(org.id, org.avatarColor) }}>{initials(org.name)}</div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{org.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{'industry' in org ? org.industry : ''}</div>
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-bg)] flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)]">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-[12px] font-bold text-white bg-[var(--tag-success-bg)] border-none rounded-md cursor-pointer hover:opacity-90 inline-flex items-center gap-1.5">
            <CheckCircle size={14} weight="fill" /> Convert to Customer
          </button>
        </div>
      </div>
    </div>
  );
}
