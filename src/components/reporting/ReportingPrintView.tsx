'use client';

import { useMemo } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { Deal, DEAL_STAGES, STAGE_META } from '@/types/deal';
import { ContactWithEntries } from '@/types/contact';
import { WidgetConfig, ContentTextSize } from '@/types/dashboard';
import { fmtDate } from '@/lib/utils';

interface Props {
  viewName: string;
  widgets: WidgetConfig[];
  deals: Deal[];
  contacts: ContactWithEntries[];
}

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
};

const fmtMoneyFull = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Map ContentTextSize tokens to scale multipliers (matches the dashboard CSS vars). */
const SIZE_SCALE: Record<ContentTextSize, number> = {
  sm: 0.85, md: 1, lg: 1.15, xl: 1.3, xxl: 1.5,
};

function scale(size: ContentTextSize | undefined): number {
  return SIZE_SCALE[size ?? 'md'];
}

/** KPI labels & icons by type — mirrors KPIWidget's KPI_META. */
const KPI_META: Record<string, string> = {
  'kpi-open-deals': 'Open deals',
  'kpi-pipeline-value': 'Pipeline (weighted)',
  'kpi-won-this-month': 'Won this month',
  'kpi-stalled-deals': 'Stalled 21+ days',
  'kpi-active-contacts': 'Active contacts',
  'kpi-incomplete-contacts': 'Incomplete',
  'kpi-win-rate': 'Win rate',
  'kpi-avg-deal-size': 'Avg deal size',
  'kpi-avg-velocity': 'Avg velocity',
  'kpi-lost-revenue': 'Lost revenue',
  'kpi-total-revenue': 'Total revenue',
  'kpi-deals-count': 'Total deals',
};

/** Computes KPI value + subtitle for a given widget type. Mirrors KPIWidget logic. */
function computeKpi(type: string, deals: Deal[], contacts: ContactWithEntries[]): { value: string; subtitle: string } {
  switch (type) {
    case 'kpi-open-deals': {
      const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
      return { value: String(open.length), subtitle: `${deals.length} total` };
    }
    case 'kpi-pipeline-value': {
      const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
      const weighted = open.reduce((s, d) => s + (d.amount * d.probability) / 100, 0);
      const total = open.reduce((s, d) => s + d.amount, 0);
      return { value: fmtMoney(weighted), subtitle: `${fmtMoney(total)} unweighted` };
    }
    case 'kpi-won-this-month': {
      const now = new Date();
      const m = now.getMonth(), y = now.getFullYear();
      const won = deals.filter((d) => d.stage === 'closed-won' && d.closedAt && new Date(d.closedAt).getMonth() === m && new Date(d.closedAt).getFullYear() === y);
      return { value: String(won.length), subtitle: fmtMoney(won.reduce((s, d) => s + d.amount, 0)) };
    }
    case 'kpi-stalled-deals': {
      const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
      const stalled = open.filter((d) => (Date.now() - new Date(d.lastUpdated).getTime()) / 86400000 > 21);
      return { value: String(stalled.length), subtitle: stalled.length === 0 ? 'All moving' : 'needs attention' };
    }
    case 'kpi-active-contacts': {
      const active = contacts.filter((c) => c.status === 'active');
      return { value: String(active.length), subtitle: `${contacts.length} total` };
    }
    case 'kpi-incomplete-contacts': {
      const stale = contacts.filter((c) => c.stale);
      return { value: String(stale.length), subtitle: stale.length === 0 ? 'All complete' : 'needs review' };
    }
    case 'kpi-win-rate': {
      const won = deals.filter((d) => d.stage === 'closed-won');
      const lost = deals.filter((d) => d.stage === 'closed-lost');
      const rate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
      return { value: `${rate}%`, subtitle: `${won.length} won · ${lost.length} lost` };
    }
    case 'kpi-avg-deal-size': {
      const won = deals.filter((d) => d.stage === 'closed-won');
      const avg = won.length > 0 ? won.reduce((s, d) => s + d.amount, 0) / won.length : 0;
      return { value: fmtMoney(avg), subtitle: `from ${won.length} closed deals` };
    }
    case 'kpi-avg-velocity': {
      const won = deals.filter((d) => d.stage === 'closed-won');
      const vs = won.map((d) => Math.max(1, Math.round((new Date(d.closedAt || d.lastUpdated).getTime() - new Date(d.createdAt).getTime()) / 86400000)));
      const avg = vs.length > 0 ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : 0;
      return { value: `${avg}d`, subtitle: 'avg days to close' };
    }
    case 'kpi-lost-revenue': {
      const lost = deals.filter((d) => d.stage === 'closed-lost');
      return { value: fmtMoney(lost.reduce((s, d) => s + d.amount, 0)), subtitle: `${lost.length} deals lost` };
    }
    case 'kpi-total-revenue': {
      const won = deals.filter((d) => d.stage === 'closed-won');
      return { value: fmtMoney(won.reduce((s, d) => s + d.amount, 0)), subtitle: `${won.length} placements` };
    }
    case 'kpi-deals-count':
      return { value: String(deals.length), subtitle: `${contacts.length} contacts` };
    default:
      return { value: '—', subtitle: '' };
  }
}

/**
 * Print-optimized layout for the Reporting page. Renders each widget in the
 * active view using its customized styling (header color, title, font sizes).
 *
 * Designed for 8.5" x 11" portrait paper with 0.5" margins.
 */
export default function ReportingPrintView({ viewName, widgets, deals, contacts }: Props) {
  // Split widgets by category for a logical print order
  const kpiWidgets = widgets.filter((w) => w.type.startsWith('kpi-'));
  const chartWidgets = widgets.filter((w) => w.type.startsWith('chart-'));
  const listWidgets = widgets.filter((w) => w.type.startsWith('list-'));
  const otherWidgets = widgets.filter(
    (w) => !w.type.startsWith('kpi-') && !w.type.startsWith('chart-') && !w.type.startsWith('list-'),
  );

  const summaryStats = useMemo(() => {
    const won = deals.filter((d) => d.stage === 'closed-won');
    const lost = deals.filter((d) => d.stage === 'closed-lost');
    const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
    const weighted = open.reduce((s, d) => s + (d.amount * d.probability) / 100, 0);
    const rate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    return { rate, weighted, openCount: open.length, totalContacts: contacts.length };
  }, [deals, contacts]);

  const printDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="reporting-print-view">
      {/* Page header */}
      <header className="print-header">
        <div className="print-header-left">
          <div className="print-header-logo">
            <img src="/roadrunner-logo-black.svg" alt="Roadrunner CRM" width={40} height={40} />
          </div>
          <div>
            <h1 className="print-header-title">{viewName}</h1>
            <div className="print-header-meta">
              Roadrunner CRM · Sales Report · {printDate}
            </div>
          </div>
        </div>
      </header>

      {/* Summary strip */}
      <div className="print-summary">
        <div className="print-summary-icon">
          <Sparkle size={12} weight="fill" />
        </div>
        <div>
          <strong>Summary</strong> · {summaryStats.rate}% win rate · {fmtMoney(summaryStats.weighted)} weighted forecast · {summaryStats.openCount} open deals · {summaryStats.totalContacts} contacts
        </div>
      </div>

      {/* KPI grid — one tile per KPI widget, using that widget's customizations */}
      {kpiWidgets.length > 0 && (
        <section className="print-section">
          <h2 className="print-section-title">Key Metrics</h2>
          <div className="print-kpi-grid">
            {kpiWidgets.map((w) => (
              <PrintKpiTile key={w.id} widget={w} deals={deals} contacts={contacts} />
            ))}
          </div>
        </section>
      )}

      {/* Charts — one section per chart widget */}
      {chartWidgets.map((w) => (
        <section key={w.id} className="print-section">
          <h2 className="print-section-title" style={w.titleColor ? { color: w.titleColor } : undefined}>
            {w.title || (w.type === 'chart-pipeline-by-stage' ? 'Pipeline by Stage' : 'Deals by Source')}
          </h2>
          {w.type === 'chart-pipeline-by-stage' && <PrintPipelineChart widget={w} deals={deals} />}
          {w.type === 'chart-deals-by-source' && <PrintDealsBySource widget={w} deals={deals} />}
        </section>
      ))}

      {/* Lists — recent deals / contacts / stalled */}
      {listWidgets.map((w) => (
        <section key={w.id} className="print-section">
          <h2 className="print-section-title" style={w.titleColor ? { color: w.titleColor } : undefined}>
            {w.title || (w.type === 'list-recent-deals' ? 'Recent Deal Activity' : w.type === 'list-recent-contacts' ? 'Recent Contacts' : 'Stalled Deals')}
          </h2>
          <PrintListWidget widget={w} deals={deals} contacts={contacts} />
        </section>
      ))}

      {/* Other widgets (todo / ai suggestions) */}
      {otherWidgets.map((w) => (
        <section key={w.id} className="print-section">
          <h2 className="print-section-title" style={w.titleColor ? { color: w.titleColor } : undefined}>
            {w.title || (w.type === 'todo' ? 'To-do List' : 'AI Suggestions')}
          </h2>
          {w.type === 'todo' && <PrintTodoList widget={w} />}
          {w.type === 'ai-suggestions' && <PrintAISuggestions widget={w} />}
        </section>
      ))}

      {/* Footer */}
      <footer className="print-footer">
        <span>Generated by Roadrunner CRM · {new Date().toLocaleString()}</span>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------- */
/*  Print sub-components                                          */
/* -------------------------------------------------------------- */

function PrintKpiTile({ widget, deals, contacts }: { widget: WidgetConfig; deals: Deal[]; contacts: ContactWithEntries[] }) {
  const { value, subtitle } = computeKpi(widget.type, deals, contacts);
  const accent = widget.headerColor || widget.iconColor || '#1955A6';
  const valueColor = widget.contentTextColor || accent;
  const titleColor = widget.titleColor || '#64748B';
  const label = widget.title || KPI_META[widget.type] || 'KPI';
  const titleScale = scale(widget.titleSize);
  const valueScale = scale(widget.contentTextSize);
  const subScale = scale(widget.subtitleSize);

  return (
    <div className="print-kpi-tile" style={{ borderTopColor: accent }}>
      <div
        className="print-kpi-label"
        style={{ color: titleColor, fontSize: `${8 * titleScale}pt` }}
      >
        {label}
      </div>
      <div
        className="print-kpi-value"
        style={{ color: valueColor, fontSize: `${20 * valueScale}pt` }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          className="print-kpi-sub"
          style={{ color: widget.subtitleColor || '#64748B', fontSize: `${8 * subScale}pt` }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function PrintPipelineChart({ widget, deals }: { widget: WidgetConfig; deals: Deal[] }) {
  const chartType = (widget.config?.chartType as string) || 'bar';
  const rows = useMemo(() => {
    return DEAL_STAGES.filter((s) => s.isOpen || s.id === 'closed-won').map((s) => {
      const stageDeals = deals.filter((d) => d.stage === s.id);
      return { stage: s, count: stageDeals.length, total: stageDeals.reduce((sum, d) => sum + d.amount, 0) };
    });
  }, [deals]);
  const maxAmount = Math.max(1, ...rows.map((r) => r.total));
  const totalCount = rows.reduce((s, r) => s + r.count, 0);

  // Bar chart (default)
  if (chartType === 'bar') {
    return (
      <div className="print-stage-table">
        {rows.map((r) => {
          const pct = (r.total / maxAmount) * 100;
          return (
            <div key={r.stage.id} className="print-stage-row">
              <div className="print-stage-label">
                <span className="print-stage-dot" style={{ background: r.stage.color }} />
                <span className="print-stage-name">{r.stage.label}</span>
              </div>
              <div className="print-stage-bar-wrap">
                <div className="print-stage-bar" style={{ width: `${Math.max(pct, r.total > 0 ? 3 : 0)}%`, background: r.stage.color }} />
              </div>
              <div className="print-stage-value">
                <span className="print-stage-count">{r.count}</span>
                <span className="print-stage-amount">{fmtMoneyFull(r.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Pie / donut — static SVG for print
  const size = 180;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const innerR = chartType === 'donut' ? r * 0.55 : 0;
  let start = -Math.PI / 2;
  const active = rows.filter((row) => row.count > 0);
  const slices = active.map((row) => {
    const frac = row.count / (totalCount || 1);
    const end = start + frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    let d: string;
    if (active.length === 1) {
      d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    } else if (innerR > 0) {
      const ix1 = cx + innerR * Math.cos(end), iy1 = cy + innerR * Math.sin(end);
      const ix2 = cx + innerR * Math.cos(start), iy2 = cy + innerR * Math.sin(start);
      d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
    } else {
      d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }
    const slice = { d, color: row.stage.color, label: row.stage.label, id: row.stage.id, count: row.count };
    start = end;
    return slice;
  });

  return (
    <div className="print-pie-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => (
          <path key={s.id} d={s.d} fill={s.color} stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="print-pie-legend">
        {rows.map((r) => {
          const pct = totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0;
          return (
            <div key={r.stage.id} className="print-pie-legend-row">
              <span className="print-stage-dot" style={{ background: r.stage.color }} />
              <span className="print-stage-name">{r.stage.label}</span>
              <span className="print-stage-count">{r.count}</span>
              <span className="print-stage-amount">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrintDealsBySource({ deals }: { widget: WidgetConfig; deals: Deal[] }) {
  const sources = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    deals.forEach((d) => {
      const cur = map.get(d.source) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += d.amount;
      map.set(d.source, cur);
    });
    return Array.from(map.entries()).map(([source, v]) => ({ source, ...v })).sort((a, b) => b.total - a.total);
  }, [deals]);
  const maxTotal = Math.max(1, ...sources.map((s) => s.total));
  const palette = ['#1955A6', '#0E7490', '#059669', '#D97706', '#A255FF', '#DC2626'];

  return (
    <div className="print-stage-table">
      {sources.map((s, i) => {
        const pct = (s.total / maxTotal) * 100;
        const color = palette[i % palette.length];
        return (
          <div key={s.source} className="print-stage-row">
            <div className="print-stage-label">
              <span className="print-stage-dot" style={{ background: color }} />
              <span className="print-stage-name">{s.source}</span>
            </div>
            <div className="print-stage-bar-wrap">
              <div className="print-stage-bar" style={{ width: `${Math.max(pct, 3)}%`, background: color }} />
            </div>
            <div className="print-stage-value">
              <span className="print-stage-count">{s.count}</span>
              <span className="print-stage-amount">{fmtMoneyFull(s.total)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrintListWidget({ widget, deals }: { widget: WidgetConfig; deals: Deal[]; contacts: ContactWithEntries[] }) {
  const rows = useMemo(() => {
    if (widget.type === 'list-recent-deals') {
      return [...deals]
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        .slice(0, 10);
    }
    if (widget.type === 'list-stalled-deals') {
      return deals.filter((d) => {
        if (d.stage === 'closed-won' || d.stage === 'closed-lost') return false;
        return (Date.now() - new Date(d.lastUpdated).getTime()) / 86400000 > 21;
      }).slice(0, 10);
    }
    return [];
  }, [widget.type, deals]);

  if (rows.length === 0) {
    return <div className="print-empty">No entries.</div>;
  }

  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Deal</th>
          <th>Stage</th>
          <th>Amount</th>
          <th>Prob.</th>
          <th>Owner</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => {
          const stage = STAGE_META[d.stage];
          return (
            <tr key={d.id}>
              <td className="print-deal-name">{d.name}</td>
              <td>
                <span className="print-stage-pill" style={{ background: stage?.bg, color: stage?.color, borderColor: stage?.color }}>
                  {stage?.label || d.stage}
                </span>
              </td>
              <td className="print-amount">{fmtMoneyFull(d.amount)}</td>
              <td className="print-prob">{d.probability}%</td>
              <td>{d.owner}</td>
              <td>{fmtDate(d.lastUpdated)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PrintTodoList({ widget }: { widget: WidgetConfig }) {
  const items = Array.isArray(widget.config?.items) ? (widget.config!.items as { id: string; text: string; done: boolean }[]) : [];
  if (items.length === 0) return <div className="print-empty">No tasks.</div>;
  return (
    <ul className="print-todo-list">
      {items.map((i) => (
        <li key={i.id} className={i.done ? 'done' : ''}>
          <span className="print-todo-box">{i.done ? '☑' : '☐'}</span>
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}

function PrintAISuggestions({ widget }: { widget: WidgetConfig }) {
  // AI suggestions are deterministic — use a placeholder count here; the print
  // view notes that these are insights driven by pipeline state.
  const bg = (widget.config?.suggestionBg as string | undefined) || '#E0F5F8';
  const border = (widget.config?.suggestionBorder as string | undefined) || '#7DD4DF';
  const accent = (widget.config?.suggestionAccent as string | undefined) || '#1FA4B6';
  return (
    <div className="print-ai-box" style={{ background: bg, borderColor: border }}>
      <div className="print-ai-title" style={{ color: accent }}>
        ✦ AI-driven next actions
      </div>
      <div className="print-ai-body">
        Review the full Reporting dashboard in the app for live suggestions. This report snapshot includes the KPIs, charts, and data tables above.
      </div>
    </div>
  );
}
