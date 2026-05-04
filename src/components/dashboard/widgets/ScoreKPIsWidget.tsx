'use client';

import { useEffect, useMemo } from 'react';
import { ChartBar, Sparkle, Warning } from '@phosphor-icons/react';
import Widget from '../Widget';
import { useScoringStore } from '@/stores/scoring-store';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useSequenceStore } from '@/stores/sequence-store';
import { computeScore } from '@/lib/scoring/computeScore';
import type { WidgetConfig } from '@/types/dashboard';

/**
 * Three Quality Score KPI tiles in one card. Was bundled in the
 * combined "Quality Score rules" widget; split out so it can be
 * hidden/dragged independently. Default size 4×1 = 160px tall, just
 * enough for the three tiles to render at a comfortable scale
 * side-by-side.
 *
 * Live reactivity: subscribes to the same scoring/contact/deals/
 * enrollment stores as the badge and the rules editor — rule edits
 * propagate here in the same render.
 */
export default function ScoreKPIsWidget({ widget }: { widget: WidgetConfig }) {
  const rules = useScoringStore((s) => s.rules);

  useEffect(() => {
    useScoringStore.persist.rehydrate();
  }, []);

  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const enrollments = useSequenceStore((s) => s.enrollments);

  const kpi = useMemo(() => {
    const ctx = {
      contacts,
      deals,
      enrollments: enrollments.map((e) => ({
        contactId: e.contactId,
        status: e.status,
        enrolledAt: e.enrolledAt,
        sendLog: e.sendLog,
      })),
      now: Date.now(),
    };
    const persons = contacts.filter((c) => c.type === 'person');
    const scored = persons.map((p) => computeScore(p, rules, ctx).total);
    const total = scored.length;
    const sum = scored.reduce((a, b) => a + b, 0);
    const mean = total === 0 ? 0 : sum / total;
    const top = scored.filter((s) => s >= 75).length;
    const critical = scored.filter((s) => s < 25).length;
    return {
      mean,
      top,
      topPct: total === 0 ? 0 : Math.round((top / total) * 100),
      critical,
      criticalPct: total === 0 ? 0 : Math.round((critical / total) * 100),
      total,
    };
  }, [contacts, deals, enrollments, rules]);

  return (
    <Widget widget={widget} title={widget.title || 'Score KPIs'} defaultIconName="Gauge">
      <div className="grid grid-cols-3 gap-3 h-full">
        <Tile
          icon={<ChartBar size={14} weight="bold" />}
          label="Average"
          value={kpi.mean.toFixed(1)}
          hint={`${kpi.total} ${kpi.total === 1 ? 'person' : 'people'} scored`}
        />
        <Tile
          icon={<Sparkle size={14} weight="duotone" />}
          label="Top performers"
          value={`${kpi.top}`}
          hint={`${kpi.topPct}% scoring 75+`}
          accent="success"
        />
        <Tile
          icon={<Warning size={14} weight="bold" />}
          label="Need attention"
          value={`${kpi.critical}`}
          hint={`${kpi.criticalPct}% under 25`}
          accent="danger"
        />
      </div>
    </Widget>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: 'success' | 'danger';
}) {
  // Accent strip on the left edge — same pattern as the standalone
  // KPI tiles I had before, kept consistent for visual continuity.
  const accentColor =
    accent === 'success' ? 'var(--tag-success-bg)' :
    accent === 'danger'  ? 'var(--tag-danger-bg)'  :
    'var(--tag-brand-bg)';
  return (
    <div
      className="rounded-md p-3 relative overflow-hidden flex flex-col justify-center"
      style={{ background: 'var(--card-inner-tile-bg, var(--surface-raised))' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accentColor }} />
      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] mb-1 ml-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="text-[24px] @md:text-[28px] font-extrabold text-[var(--text-primary)] leading-none ml-1.5 tabular-nums">{value}</div>
      <div className="text-[11px] text-[var(--text-tertiary)] mt-1 ml-1.5 truncate">{hint}</div>
    </div>
  );
}
