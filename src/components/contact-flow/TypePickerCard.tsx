'use client';

import { Sparkle, User, Buildings } from '@phosphor-icons/react';

export function TypePickerCard({ type, onClick }: {
  type: 'person' | 'company';
  onClick: () => void;
}) {
  const isPerson = type === 'person';
  const color = isPerson ? 'var(--brand-primary)' : 'var(--success)';
  const bg = isPerson ? 'var(--brand-bg)' : 'var(--success-bg)';

  return (
    <button
      onClick={onClick}
      data-tour={isPerson ? 'contact-type-person' : 'contact-type-company'}
      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 bg-[var(--surface-card)] cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 text-center min-h-[200px]"
      style={{ borderColor: color, boxShadow: `0 0 0 4px ${bg}` }}
    >
      {/* Icon circle */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ border: `2px solid ${color}`, background: bg }}
      >
        {isPerson ? (
          <User size={28} weight="bold" style={{ color }} />
        ) : (
          <Buildings size={28} weight="bold" style={{ color }} />
        )}
      </div>

      <div>
        <h3 className="text-[16px] font-extrabold text-[var(--text-primary)] mb-1">
          {isPerson ? 'Person' : 'Company'}
        </h3>
        <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed max-w-[180px]">
          {isPerson
            ? 'Add an individual contact with personal details, role, and relationships.'
            : 'Add a company or organization with business details.'}
        </p>
      </div>

      {/* AI Badge */}
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
        <Sparkle size={10} weight="duotone" />
        {isPerson ? 'AI Dedup' : 'AI Enrich'}
      </span>
    </button>
  );
}
