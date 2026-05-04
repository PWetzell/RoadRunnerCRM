'use client';

import { useMemo } from 'react';
import { Sparkle, Warning, CheckCircle } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import StagePill from '@/components/sales/StagePill';

export default function AIDealDuplicateDetection({ dealName, personContactId, orgContactId }: { dealName: string; personContactId: string; orgContactId: string }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);

  const candidates = useMemo(() => {
    if (!personContactId && !orgContactId && dealName.trim().length < 3) return [];
    return deals
      .filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost')
      .map((d) => {
        let score = 0;
        const reasons: string[] = [];
        if (orgContactId && d.orgContactId === orgContactId) { score += 60; reasons.push('Same org'); }
        if (personContactId && d.personContactId === personContactId) { score += 30; reasons.push('Same contact'); }
        if (dealName.trim().length >= 3) {
          const a = dealName.toLowerCase();
          const b = d.name.toLowerCase();
          if (a === b) { score += 50; reasons.push('Identical name'); }
          else {
            const tokens = a.split(/\s+/).filter((t) => t.length > 2);
            const matches = tokens.filter((t) => b.includes(t)).length;
            if (matches > 0) { score += matches * 10; reasons.push(`${matches} keyword${matches > 1 ? 's' : ''} match`); }
          }
        }
        return { deal: d, score, reasons };
      })
      .filter((c) => c.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [deals, dealName, personContactId, orgContactId]);

  const showEmpty = !personContactId && !orgContactId && dealName.trim().length < 3;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[var(--tag-info-bg)] flex items-center justify-center"><Sparkle size={12} weight="duotone" className="text-white" /></div>
        <div className="text-[13px] font-extrabold text-[var(--text-primary)]">AI Duplicate Detection</div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {showEmpty && (
          <div className="text-[11px] text-[var(--text-tertiary)]">
            Enter a deal name or pick contacts — AI will scan {deals.length} existing deals for matches.
          </div>
        )}
        {!showEmpty && candidates.length === 0 && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--success)]">
            <CheckCircle size={12} weight="fill" /> No open duplicates found
          </div>
        )}
        {candidates.map(({ deal, score, reasons }) => {
          const person = contacts.find((c) => c.id === deal.personContactId);
          const org = contacts.find((c) => c.id === deal.orgContactId);
          return (
            <div key={deal.id} className="border border-[var(--warning)] bg-[var(--warning-bg)] rounded-md px-3 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{deal.name}</div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--tag-warning-bg)] text-white">
                  <Warning size={10} weight="fill" /> {Math.min(score, 99)}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                <StagePill stage={deal.stage} />
                <span>·</span>
                <span className="truncate">{org?.name || '—'} · {person?.name || '—'}</span>
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)]">{reasons.join(' · ')}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
