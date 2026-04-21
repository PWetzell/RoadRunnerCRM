'use client';

import { Sparkle, ArrowRight } from '@phosphor-icons/react';
import { Deal } from '@/types/deal';

const SUGGESTIONS: Record<string, { action: string; rationale: string }> = {
  lead: { action: 'Schedule a qualification call', rationale: 'New inquiry — confirm role(s), headcount, timeline, and budget before committing sourcing time.' },
  qualified: { action: 'Run an intake session', rationale: 'Search agreement signed — capture role spec, must-haves, and ideal candidate profile.' },
  discovery: { action: 'Send first candidate slate', rationale: 'Sourcing in progress — clients expect a slate within 14 days of intake or momentum stalls.' },
  proposal: { action: 'Push for interviews on shortlist', rationale: 'Slate sent — first interviews scheduled within 7 days move 2x more candidates to offer.' },
  negotiation: { action: 'Mediate offer details', rationale: 'Offer extended — track candidate response, fee terms, and start date to close the deal.' },
  'closed-won': { action: 'Confirm start date and bill', rationale: 'Deal closed — confirm candidate start, send invoice, and begin guarantee period tracking.' },
  'closed-lost': { action: 'Capture the loss reason', rationale: 'Note why the search ended (budget, candidate dropout, lost to competitor) for forecasting.' },
};

export default function AINextStepSuggestion({ deal }: { deal: Deal }) {
  const s = SUGGESTIONS[deal.stage] || SUGGESTIONS.lead;
  const daysSinceUpdate = Math.floor((Date.now() - new Date(deal.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[var(--ai)] flex items-center justify-center"><Sparkle size={12} weight="duotone" className="text-white" /></div>
        <div className="text-[13px] font-extrabold text-[var(--text-primary)]">AI Next Step</div>
      </div>
      <div className="px-4 py-3">
        <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{s.action}</div>
        <div className="text-[11px] text-[var(--text-secondary)] mb-3">{s.rationale}</div>
        {daysSinceUpdate > 14 && (
          <div className="text-[11px] font-semibold text-[var(--warning)] mb-3 inline-flex items-center gap-1">
            <ArrowRight size={12} weight="bold" /> Last activity {daysSinceUpdate} days ago — momentum is stalling.
          </div>
        )}
        <button className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-[var(--ai)] border-none rounded-md cursor-pointer hover:opacity-90">
          <Sparkle size={12} weight="duotone" /> Draft email with AI
        </button>
      </div>
    </div>
  );
}
