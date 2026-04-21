'use client';

import { useMemo } from 'react';
import { WidgetConfig } from '@/types/dashboard';
import { useSalesStore } from '@/stores/sales-store';
import { DEAL_STAGES } from '@/types/deal';
import Widget from '../Widget';
import { useIsDark } from '@/hooks/useIsDark';
import { dc } from '@/lib/pill-colors';

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

type ChartType = 'bar' | 'pie' | 'donut';

export default function PipelineChartWidget({ widget }: { widget: WidgetConfig }) {
  const deals = useSalesStore((s) => s.deals);
  const isDark = useIsDark();
  const chartType = (widget.config?.chartType as ChartType) || 'bar';

  const rows = useMemo(() => {
    return DEAL_STAGES.map((s) => {
      const stageDeals = deals.filter((d) => d.stage === s.id);
      const total = stageDeals.reduce((sum, d) => sum + d.amount, 0);
      const color = dc(s, isDark).color;
      return { stage: s, count: stageDeals.length, total, color };
    });
  }, [deals, isDark]);

  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const maxAmount = Math.max(1, ...rows.map((r) => r.total));
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Widget
      widget={widget}
      title={widget.title || 'Pipeline by stage'}
      defaultIconName="ChartBar"
    >
      {chartType === 'bar' && (
        <div className="flex flex-col gap-1.5 @md:gap-2 @xl:gap-3">
          {rows.map((r) => {
            const pct = (r.count / maxCount) * 100;
            const amountPct = (r.total / maxAmount) * 100;
            return (
              <div key={r.stage.id}>
                <div className="flex items-center justify-between text-[calc(10px*var(--content-scale,1))] @md:text-[calc(11px*var(--content-scale,1))] @xl:text-[calc(13px*var(--content-scale,1))] mb-0.5 @md:mb-1 @xl:mb-1.5">
                  <span className="inline-flex items-center gap-1 @md:gap-1.5 @xl:gap-2">
                    <span className="w-2 h-2 @md:w-2.5 @md:h-2.5 @xl:w-3 @xl:h-3 rounded-full" style={{ background: r.color }} />
                    <span className="font-bold text-[var(--widget-primary-text)]">{r.stage.label}</span>
                  </span>
                  <span className="text-[var(--widget-tertiary-text)] font-semibold">
                    {r.count} · {fmtMoney(r.total)}
                  </span>
                </div>
                <div className="h-1.5 @md:h-2 @xl:h-3 bg-[var(--surface-raised)] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, r.count > 0 ? 3 : 0)}%`, background: r.color }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 h-full rounded-full opacity-20"
                    style={{ width: `${amountPct}%`, background: r.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(chartType === 'pie' || chartType === 'donut') && (
        <PieOrDonutChart rows={rows} totalCount={totalCount} donut={chartType === 'donut'} />
      )}
    </Widget>
  );
}

/** Pie / donut chart built with SVG — no external charting library. */
function PieOrDonutChart({ rows, totalCount, donut }: { rows: { stage: { id: string; label: string }; count: number; total: number; color: string }[]; totalCount: number; donut: boolean }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const innerR = donut ? r * 0.55 : 0;

  // Build slice paths
  const slices = useMemo(() => {
    const items = rows.filter((row) => row.count > 0);
    if (items.length === 0) return [];
    let startAngle = -Math.PI / 2; // start at top
    return items.map((row) => {
      const fraction = row.count / totalCount;
      const endAngle = startAngle + fraction * 2 * Math.PI;
      // Edge case: full circle (one slice has all)
      const isFullCircle = items.length === 1;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = fraction > 0.5 ? 1 : 0;

      let d: string;
      if (isFullCircle) {
        // Full circle as two arcs
        d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
        if (donut) {
          d += ` M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} Z`;
        }
      } else if (donut) {
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
      } else {
        d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }

      const slice = { d, color: row.color, label: row.stage.label, count: row.count, id: row.stage.id };
      startAngle = endAngle;
      return slice;
    });
  }, [rows, totalCount, cx, cy, r, innerR, donut]);

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[calc(11px*var(--content-scale,1))] text-[var(--widget-tertiary-text)]">
        No deals in pipeline
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 @md:gap-5 justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {slices.map((s) => (
          <path key={s.id} d={s.d} fill={s.color} stroke="var(--surface-card)" strokeWidth={1.5} />
        ))}
        {donut && (
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-[var(--widget-primary-text)] text-[14px] font-extrabold" style={{ fontSize: 14 }}>
            {totalCount}
          </text>
        )}
        {donut && (
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-[var(--widget-tertiary-text)] text-[8px] font-bold" style={{ fontSize: 8 }}>
            DEALS
          </text>
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-1 min-w-0">
        {rows.map((row) => {
          const pct = totalCount > 0 ? Math.round((row.count / totalCount) * 100) : 0;
          return (
            <div key={row.stage.id} className="flex items-center gap-1.5 text-[calc(10px*var(--content-scale,1))] @md:text-[calc(11px*var(--content-scale,1))]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
              <span className="font-bold text-[var(--widget-primary-text)] truncate">{row.stage.label}</span>
              <span className="text-[var(--widget-tertiary-text)] font-semibold ml-auto flex-shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
