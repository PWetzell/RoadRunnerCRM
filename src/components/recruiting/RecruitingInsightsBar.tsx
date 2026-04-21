'use client';

import { useMemo } from 'react';
import { Sparkle, UsersThree, TrendUp, Warning, Trophy } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { dealStageToRecruitingStage } from '@/types/recruiting';

/**
 * AI insights bar for the Recruiting dashboard — mirrors the pattern
 * from Contacts and Sales pages. Shows recruiting-specific KPIs.
 */
export default function RecruitingInsightsBar() {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);

  const stats = useMemo(() => {
    const personDeals = deals.filter((d) => d.type === 'person' || d.personContactId);
    const active = personDeals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
    const placed = personDeals.filter((d) => d.stage === 'closed-won');
    const interviewing = personDeals.filter((d) => {
      const rs = dealStageToRecruitingStage(d.stage);
      return rs === 'interview' || rs === 'offer';
    });
    const stalled = active.filter((d) => {
      const days = (Date.now() - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      return days > 14;
    });
    const needsAction = active.filter((d) => {
      if (d.stage !== 'lead' && d.stage !== 'qualified') return false;
      const days = (Date.now() - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      return days > 7;
    });
    return { active: active.length, placed: placed.length, interviewing: interviewing.length, stalled: stalled.length, needsAction: needsAction.length };
  }, [deals]);

  return (
    <div data-tour="recruiting-insights" className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
      <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={13} weight="duotone" className="text-white" />
      </div>
      <div className="text-[13px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">Recruiting Pipeline</strong>
        <span> · {stats.active} active candidates</span>
      </div>
      <div className="flex gap-1.5 flex-wrap ml-1">
        <Pill icon={<UsersThree size={12} />} bg="var(--brand-bg)" color="var(--brand-primary)">
          {stats.active} in pipeline
        </Pill>
        <Pill icon={<TrendUp size={12} />} bg="var(--success-bg)" color="var(--success)">
          {stats.interviewing} interviewing
        </Pill>
        <Pill icon={<Trophy size={12} weight="fill" />} bg="var(--success-bg)" color="var(--success)">
          {stats.placed} placed
        </Pill>
        <Pill
          icon={<Warning size={12} />}
          bg={stats.needsAction > 0 ? 'var(--warning-bg)' : 'var(--success-bg)'}
          color={stats.needsAction > 0 ? 'var(--warning)' : 'var(--success)'}
        >
          {stats.needsAction > 0 ? `${stats.needsAction} need action` : 'All on track'}
        </Pill>
        {stats.stalled > 0 && (
          <Pill icon={<Warning size={12} />} bg="var(--danger-bg)" color="var(--danger)">
            {stats.stalled} stalled (14+ days)
          </Pill>
        )}
      </div>
    </div>
  );
}

function Pill({ icon, bg, color, children }: { icon: React.ReactNode; bg: string; color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: bg, color, border: `1px solid ${color}` }}
    >
      {icon} {children}
    </span>
  );
}
