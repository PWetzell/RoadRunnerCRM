'use client';

import { useMemo } from 'react';
import { Sparkle, TrendUp } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { DealSource } from '@/types/deal';

interface Props {
  source: DealSource;
  amount: number;
  personContactId?: string;
  orgContactId?: string;
  onApplyProbability?: (n: number) => void;
}

const SOURCE_BASE: Record<DealSource, number> = {
  Inbound: 38,
  Referral: 45,
  Outbound: 18,
  Event: 28,
  Partner: 35,
  Marketing: 22,
};

export default function AIDealScoring({ source, amount, personContactId, orgContactId, onApplyProbability }: Props) {
  const contacts = useContactStore((s) => s.contacts);
  const notes = useContactStore((s) => s.notes);

  const score = useMemo(() => {
    let s = SOURCE_BASE[source] || 25;
    const factors: { label: string; delta: number }[] = [
      { label: `${source} baseline`, delta: SOURCE_BASE[source] || 25 },
    ];

    // Bigger deals are harder to close
    if (amount > 250000) { s -= 8; factors.push({ label: 'Large deal size', delta: -8 }); }
    else if (amount > 100000) { s -= 4; factors.push({ label: 'Medium deal size', delta: -4 }); }
    else if (amount > 0 && amount < 50000) { s += 5; factors.push({ label: 'SMB deal size', delta: +5 }); }

    // Existing relationship
    const hasPerson = !!contacts.find((c) => c.id === personContactId);
    const hasOrg = !!contacts.find((c) => c.id === orgContactId);
    if (hasPerson && hasOrg) { s += 10; factors.push({ label: 'Both contacts on file', delta: +10 }); }

    // Engagement: notes mentioning these contacts
    const engagement = notes.filter((n) => n.contactId === personContactId || n.contactId === orgContactId).length;
    if (engagement >= 3) { s += 12; factors.push({ label: `${engagement} prior interactions`, delta: +12 }); }
    else if (engagement >= 1) { s += 5; factors.push({ label: `${engagement} prior interaction${engagement > 1 ? 's' : ''}`, delta: +5 }); }

    return { value: Math.max(5, Math.min(95, Math.round(s))), factors };
  }, [source, amount, personContactId, orgContactId, contacts, notes]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[var(--ai)] flex items-center justify-center"><Sparkle size={12} weight="duotone" className="text-white" /></div>
        <div className="text-[13px] font-extrabold text-[var(--text-primary)]">AI Deal Scoring</div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[28px] font-extrabold text-[var(--ai-dark)]">{score.value}%</span>
          <span className="text-[11px] text-[var(--text-tertiary)] font-semibold">predicted close</span>
        </div>
        <div className="w-full h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[var(--ai)]" style={{ width: `${score.value}%` }} />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Factors</div>
        <div className="flex flex-col gap-1 mb-3">
          {score.factors.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-secondary)]">{f.label}</span>
              <span className={`font-bold ${f.delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {f.delta >= 0 ? '+' : ''}{f.delta}
              </span>
            </div>
          ))}
        </div>
        {onApplyProbability && (
          <button
            onClick={() => onApplyProbability(score.value)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-[var(--ai)] border-none rounded-md cursor-pointer hover:opacity-90"
          >
            <TrendUp size={12} weight="bold" /> Apply {score.value}% probability
          </button>
        )}
      </div>
    </div>
  );
}
