'use client';

import type { ScoreBucket } from '@/types/scoring';

/**
 * Horizontal bar chart for the four score bands. CSS-only — no chart
 * library dependency (the project doesn't ship one; reporting/page.tsx
 * builds bars the same way).
 *
 * Bar fill colors mirror the four QualityScoreBadge bucket hexes
 * EXACTLY so the chart and the grid badge read as the same band at
 * a glance. After the WCAG sweep these hexes are AA-compliant against
 * white text in both themes — same ratios listed in QualityScoreBadge.
 */

interface BandRow {
  bucket: ScoreBucket;
  label: string;
  range: string;
  count: number;
  fill: string;
}

const BAND_FILL: Record<ScoreBucket, string> = {
  critical: '#DC2626', // red-600,    4.83:1 vs white
  low:      '#C2410C', // orange-700, 5.18:1
  mid:      '#2563EB', // blue-600,   5.17:1
  high:     '#047857', // emerald-700,5.48:1
};

const BAND_RANGE: Record<ScoreBucket, string> = {
  critical: '0–24',
  low:      '25–49',
  mid:      '50–74',
  high:     '75–100',
};

const BAND_LABEL: Record<ScoreBucket, string> = {
  critical: 'Critical',
  low:      'Building',
  mid:      'Strong',
  high:     'Top performers',
};

interface Props {
  /** Counts per bucket. Total of all four = number of scored persons. */
  counts: Record<ScoreBucket, number>;
}

export default function ScoreDistributionChart({ counts }: Props) {
  const total = counts.critical + counts.low + counts.mid + counts.high;
  // The bar width is calculated relative to the LARGEST band, not the
  // total. Using the total would shrink small bands to invisible
  // slivers when one band dominates (e.g. 80 mid + 5 elsewhere). The
  // largest-band scale gives every nonzero band a visible footprint.
  const max = Math.max(counts.critical, counts.low, counts.mid, counts.high, 1);

  const rows: BandRow[] = (['critical', 'low', 'mid', 'high'] as ScoreBucket[]).map((b) => ({
    bucket: b,
    label: BAND_LABEL[b],
    range: BAND_RANGE[b],
    count: counts[b],
    fill: BAND_FILL[b],
  }));

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">Score distribution</h2>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {total} {total === 1 ? 'person' : 'people'} scored
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const pct = total === 0 ? 0 : Math.round((r.count / total) * 100);
          const widthPct = (r.count / max) * 100;
          return (
            <div key={r.bucket} className="flex items-center gap-3">
              {/* Label column — fixed width so all four bars start at
                  the same x. */}
              <div className="w-[140px] flex-shrink-0">
                <div className="text-[12px] font-bold text-[var(--text-primary)] leading-tight">{r.label}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">Score {r.range}</div>
              </div>
              {/* Bar track — neutral surface that hosts the colored fill. */}
              <div className="flex-1 h-6 rounded-md bg-[var(--surface-raised)] overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-[width] duration-300 ease-out"
                  style={{ width: `${widthPct}%`, background: r.fill, minWidth: r.count > 0 ? 4 : 0 }}
                />
              </div>
              {/* Numeric column — count + percentage. tabular-nums so the
                  digits align across rows even when single-digit. */}
              <div className="w-[100px] flex-shrink-0 text-right tabular-nums">
                <span className="text-[13px] font-extrabold text-[var(--text-primary)]">{r.count}</span>
                <span className="text-[11px] text-[var(--text-tertiary)] ml-1.5">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
