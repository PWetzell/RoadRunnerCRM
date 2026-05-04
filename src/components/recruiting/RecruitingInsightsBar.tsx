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
    <div data-tour="recruiting-insights" className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-2.5 py-1.5 flex items-center gap-2 rounded-lg w-full h-[32px] overflow-hidden">
      <div className="w-[18px] h-[18px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={11} weight="duotone" className="text-white" />
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">Recruiting Pipeline</strong>
        <span> · {stats.active} active candidates</span>
      </div>
      <div className="flex gap-1 flex-wrap ml-1">
        <Pill icon={<UsersThree size={10} />} bg="var(--brand-bg)" color="var(--brand-primary)">
          {stats.active} in pipeline
        </Pill>
        {/* Interviewing — lavender (violet) so it matches the Interview
            stage pill in the grid below. Was --success green, which
            disagreed with the grid's per-stage color (lavender). */}
        <Pill icon={<TrendUp size={10} />} bg="var(--lavender-bg)" color="var(--lavender-fg)" border="var(--lavender)">
          {stats.interviewing} interviewing
        </Pill>
        <Pill icon={<Trophy size={10} />} bg="var(--success-bg)" color="var(--success)">
          {stats.placed} placed
        </Pill>
        <Pill
          icon={<Warning size={10} />}
          bg={stats.needsAction > 0 ? 'var(--warning-bg)' : 'var(--success-bg)'}
          color={stats.needsAction > 0 ? 'var(--warning)' : 'var(--success)'}
        >
          {stats.needsAction > 0 ? `${stats.needsAction} need action` : 'All on track'}
        </Pill>
        {stats.stalled > 0 && (
          /* Stalled — warning orange (was danger red, violating the
             "no red for tags" rule). Matches the grid's Stalled status
             pill which already uses --warning. */
          <Pill icon={<Warning size={10} />} bg="var(--warning-bg)" color="var(--warning)">
            {stats.stalled} stalled (14+ days)
          </Pill>
        )}
      </div>
    </div>
  );
}

/**
 * Canonical insights-bar pill — same class string as the grid pills
 * (`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]
 * font-bold border`) so size, font, and shape align across the bar
 * and the grid below it. Border color defaults to the foreground
 * color for triplets where the same hex is correct for both; pass an
 * explicit `border` prop for triplets that use a separate border token.
 */
function Pill({ icon, bg, color, border, children }: { icon: React.ReactNode; bg: string; color: string; border?: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border"
      style={{ background: bg, color, borderColor: border ?? color }}
    >
      {icon} {children}
    </span>
  );
}
