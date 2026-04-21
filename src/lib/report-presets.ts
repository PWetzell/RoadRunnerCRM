import { WidgetConfig, WidgetType } from '@/types/dashboard';

/**
 * Report type presets. Each report type defines a different widget layout
 * for the Reporting page. Switching report type swaps the entire widget
 * grid — same as switching dashboard views on the main Dashboard.
 *
 * Based on industry standards from Monday CRM, HubSpot, and Salesforce:
 * - Pipeline Health
 * - Sales Forecast
 * - Activity
 * - Win/Loss Analysis
 * - Revenue
 * - Contact Health
 * - Team Performance
 */

export interface ReportPreset {
  id: string;
  label: string;
  description: string;
  icon: string; // Phosphor icon name
  widgets: WidgetConfig[];
}

function w(id: string, type: WidgetType, cols: 1|2|3|4, rows: 1|2|3, title?: string): WidgetConfig {
  return { id, type, size: { cols, rows }, title };
}

export const REPORT_PRESETS: ReportPreset[] = [
  {
    id: 'pipeline-health',
    label: 'Pipeline Health',
    description: 'Deal distribution, stage velocity, bottlenecks',
    icon: 'Funnel',
    widgets: [
      w('ph-1', 'kpi-open-deals', 1, 1, 'Open Deals'),
      w('ph-2', 'kpi-pipeline-value', 1, 1, 'Pipeline Value'),
      w('ph-3', 'kpi-stalled-deals', 1, 1, 'Stalled Deals'),
      w('ph-4', 'kpi-deals-count', 1, 1, 'Total Deals'),
      w('ph-5', 'chart-pipeline-by-stage', 2, 2, 'Pipeline Funnel'),
      w('ph-6', 'list-stalled-deals', 2, 2, 'Needs Attention'),
      w('ph-7', 'list-recent-deals', 2, 2, 'Recent Activity'),
      w('ph-8', 'ai-suggestions', 2, 2, 'AI Recommendations'),
    ],
  },
  {
    id: 'sales-forecast',
    label: 'Sales Forecast',
    description: 'Weighted revenue projection, close probability',
    icon: 'TrendUp',
    widgets: [
      w('sf-1', 'kpi-pipeline-value', 1, 1, 'Weighted Forecast'),
      w('sf-2', 'kpi-open-deals', 1, 1, 'Open Pipeline'),
      w('sf-3', 'kpi-won-this-month', 1, 1, 'Won This Month'),
      w('sf-4', 'kpi-avg-deal-size', 1, 1, 'Avg Deal Size'),
      w('sf-5', 'chart-pipeline-by-stage', 2, 2, 'Forecast by Stage'),
      w('sf-6', 'chart-deals-by-source', 2, 2, 'Deals by Source'),
      w('sf-7', 'list-recent-deals', 4, 2, 'Deal Pipeline'),
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Team actions — calls, emails, meetings, notes',
    icon: 'Lightning',
    widgets: [
      w('ac-1', 'kpi-deals-count', 1, 1, 'Total Activities'),
      w('ac-2', 'kpi-open-deals', 1, 1, 'Active Deals'),
      w('ac-3', 'kpi-active-contacts', 1, 1, 'Active Contacts'),
      w('ac-4', 'kpi-stalled-deals', 1, 1, 'Idle 21+ Days'),
      w('ac-5', 'list-recent-deals', 2, 2, 'Recent Deal Activity'),
      w('ac-6', 'list-recent-contacts', 2, 2, 'Recent Contact Activity'),
      w('ac-7', 'todo', 2, 2, 'Action Items'),
      w('ac-8', 'ai-suggestions', 2, 2, 'Suggested Actions'),
    ],
  },
  {
    id: 'win-loss',
    label: 'Win/Loss Analysis',
    description: 'Won vs lost deals, reasons, patterns',
    icon: 'Trophy',
    widgets: [
      w('wl-1', 'kpi-won-this-month', 1, 1, 'Deals Won'),
      w('wl-2', 'kpi-win-rate', 1, 1, 'Win Rate'),
      w('wl-3', 'kpi-lost-revenue', 1, 1, 'Lost Revenue'),
      w('wl-4', 'kpi-avg-velocity', 1, 1, 'Avg Close Time'),
      w('wl-5', 'chart-deals-by-source', 2, 2, 'Wins by Source'),
      w('wl-6', 'chart-pipeline-by-stage', 2, 2, 'Stage Distribution'),
      w('wl-7', 'list-stalled-deals', 4, 2, 'At-Risk Deals'),
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    description: 'Closed revenue, by source, by rep, trends',
    icon: 'CurrencyDollar',
    widgets: [
      w('rv-1', 'kpi-total-revenue', 1, 1, 'Total Revenue'),
      w('rv-2', 'kpi-pipeline-value', 1, 1, 'Forecast'),
      w('rv-3', 'kpi-avg-deal-size', 1, 1, 'Avg Deal'),
      w('rv-4', 'kpi-won-this-month', 1, 1, 'Won This Month'),
      w('rv-5', 'chart-deals-by-source', 2, 2, 'Revenue by Source'),
      w('rv-6', 'chart-pipeline-by-stage', 2, 2, 'Revenue by Stage'),
      w('rv-7', 'list-recent-deals', 4, 2, 'Recent Closed Deals'),
    ],
  },
  {
    id: 'contact-health',
    label: 'Contact Health',
    description: 'CRM data quality, completeness, stale records',
    icon: 'Heart',
    widgets: [
      w('ch-1', 'kpi-active-contacts', 1, 1, 'Active Contacts'),
      w('ch-2', 'kpi-incomplete-contacts', 1, 1, 'Incomplete'),
      w('ch-3', 'kpi-open-deals', 1, 1, 'With Deals'),
      w('ch-4', 'kpi-deals-count', 1, 1, 'Total Records'),
      w('ch-5', 'list-recent-contacts', 2, 2, 'Recently Updated'),
      w('ch-6', 'list-stalled-deals', 2, 2, 'Stale Records'),
      w('ch-7', 'ai-suggestions', 4, 2, 'AI Data Quality Suggestions'),
    ],
  },
  {
    id: 'team-performance',
    label: 'Team Performance',
    description: 'Per-rep metrics, pipeline contribution, velocity',
    icon: 'UsersThree',
    widgets: [
      w('tp-1', 'kpi-deals-count', 1, 1, 'Total Deals'),
      w('tp-2', 'kpi-win-rate', 1, 1, 'Team Win Rate'),
      w('tp-3', 'kpi-avg-velocity', 1, 1, 'Avg Velocity'),
      w('tp-4', 'kpi-total-revenue', 1, 1, 'Team Revenue'),
      w('tp-5', 'chart-pipeline-by-stage', 2, 2, 'Team Pipeline'),
      w('tp-6', 'chart-deals-by-source', 2, 2, 'Source Mix'),
      w('tp-7', 'list-recent-deals', 2, 2, 'Recent Wins'),
      w('tp-8', 'todo', 2, 2, 'Team To-Dos'),
    ],
  },
];

export const REPORT_PRESET_MAP = Object.fromEntries(REPORT_PRESETS.map((p) => [p.id, p]));
