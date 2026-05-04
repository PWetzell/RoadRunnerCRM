/**
 * Types for the customizable Dashboard.
 *
 * A dashboard view is an ordered list of widgets. Each widget has a type
 * (controls what it renders) and a size (grid col/row span). Users can add,
 * remove, resize, and reorder widgets. Configurations are saved as "views" —
 * named presets that can be switched between.
 */

export type WidgetType =
  // Status / KPI family
  | 'kpi-open-deals'
  | 'kpi-pipeline-value'
  | 'kpi-won-this-month'
  | 'kpi-stalled-deals'
  | 'kpi-active-contacts'
  | 'kpi-incomplete-contacts'
  // Reporting family
  | 'chart-pipeline-by-stage'
  | 'chart-deals-by-source'
  // List family
  | 'list-recent-deals'
  | 'list-recent-contacts'
  | 'list-stalled-deals'
  // To-do / work family
  | 'todo'
  | 'ai-suggestions'
  // Extended reporting (used by report type presets)
  | 'kpi-win-rate'
  | 'kpi-avg-deal-size'
  | 'kpi-avg-velocity'
  | 'kpi-lost-revenue'
  | 'kpi-total-revenue'
  | 'kpi-deals-count'
  // Custom reports — dispatches on config.reportId
  | 'custom-report'
  // Quality Score split into three independently-draggable cards:
  // - score-kpis: 3 KPI tiles (avg / top / critical)
  // - score-distribution: horizontal bar chart of the four bands
  // - scoring-rules: collapsible rules table + edit/add/reset
  | 'score-kpis'
  | 'score-distribution'
  | 'scoring-rules';

export type WidgetCategory = 'status' | 'reporting' | 'list' | 'work' | 'custom';

/** col × row span in a 4-column grid. */
export interface WidgetSize {
  cols: 1 | 2 | 3 | 4;
  /**
   * Was 1|2|3 (max card 480px). Extended to 1-6 (max 960px) for cards
   * whose content is naturally tall — specifically the Quality Score
   * rules editor, which can host 16+ rules across 3 categories.
   *
   * Cards never scroll internally; if content exceeds the card height
   * the page (browser) scrolls. So a card that hosts tall content
   * needs to size large enough to fit it. The 6-row ceiling is the
   * pragmatic upper bound — beyond that the card dominates the
   * viewport and dragging it becomes awkward anyway.
   */
  rows: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * How many list-style items a widget should show at its current size.
 * Picked so each tier comfortably fits without internal scrolling.
 *   1×1 (Compact, ~140px)  → 2 items
 *   2×2 (Medium,  ~300px)  → 5 items
 *   4×2 (Wide,   same h)   → 7 items (more horizontal room for context)
 *   anything bigger        → 10
 */
export function itemLimitForSize(size: WidgetSize): number {
  const area = size.cols * size.rows;
  if (area <= 1) return 2;
  if (area <= 4) return 5;
  if (area <= 8) return 7;
  return 10;
}

export type ContentAlign = 'left' | 'center' | 'right';
export type ContentTextSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** A widget instance on a dashboard view. */
export interface WidgetConfig {
  id: string;           // unique instance id (so you can have two of the same type)
  type: WidgetType;
  size: WidgetSize;
  /** Optional override title; falls back to the widget's default label. */
  title?: string;
  /** Accent color applied to the header (top stripe + tint). Hex only.
   *  If undefined, the default brand color is used. */
  headerColor?: string;
  /** Overridden icon (Phosphor component name). If undefined, the widget
   *  type's default icon is used. See '@/lib/phosphor-icons'. */
  iconName?: string;
  /** Icon color override. Hex. If undefined, falls back to headerColor or brand. */
  iconColor?: string;
  /** Content text alignment inside the body area. */
  contentAlign?: ContentAlign;
  /** Header title color override. Hex. */
  titleColor?: string;
  /** Header title size scale. */
  titleSize?: ContentTextSize;
  /** Primary "value" text size scale (KPI number, list item title, etc.). */
  contentTextSize?: ContentTextSize;
  /** Primary "value" text color override. Hex. */
  contentTextColor?: string;
  /** Secondary "subtitle" text color override (descriptions, captions). Hex. */
  subtitleColor?: string;
  /** Secondary "subtitle" text size scale. */
  subtitleSize?: ContentTextSize;
  /** Inner stat-tile background color — for cards that contain small
   *  per-metric tiles (e.g. AI Usage: Calls Today / This Month). Hex. */
  innerTileBg?: string;
  /** Text color for inline tags/chips (e.g. user role badges). */
  tagTextColor?: string;
  /** Background color for inline tags/chips. */
  tagBg?: string;
  /** Border color for inline tags/chips. */
  tagBorderColor?: string;
  /** Free-form config bag for widgets that need state (e.g., todo items). */
  config?: Record<string, unknown>;
}

/** Suggested icons per widget type — shown at the top of the icon picker for quick access. */
export const WIDGET_ICON_SUGGESTIONS: Partial<Record<WidgetType, string[]>> = {
  'kpi-open-deals':            ['Handbag', 'Briefcase', 'Folder', 'Target'],
  'kpi-pipeline-value':        ['TrendUp', 'ChartLineUp', 'CurrencyDollar', 'Wallet'],
  'kpi-won-this-month':        ['Trophy', 'Medal', 'Star', 'CheckCircle'],
  'kpi-stalled-deals':         ['Warning', 'Clock', 'Hourglass', 'Flag'],
  'kpi-active-contacts':       ['UsersThree', 'Users', 'AddressBook', 'User'],
  'kpi-incomplete-contacts':   ['Sparkle', 'Warning', 'WarningCircle', 'Info'],
  'chart-pipeline-by-stage':   ['ChartBar', 'ChartBarHorizontal', 'Kanban', 'Funnel'],
  'chart-deals-by-source':     ['ChartPieSlice', 'ChartDonut', 'ChartBar'],
  'list-recent-deals':         ['Handbag', 'ListBullets', 'Briefcase'],
  'list-recent-contacts':      ['UsersThree', 'AddressBook', 'Users'],
  'list-stalled-deals':        ['Warning', 'Clock', 'Fire'],
  'todo':                      ['CheckSquare', 'ListChecks', 'ClipboardText'],
  'ai-suggestions':            ['Sparkle', 'MagicWand', 'Brain', 'Robot'],
  'custom-report':             ['Funnel', 'ChartBar', 'ChartPieSlice', 'Table', 'TrendUp'],
  'score-kpis':                ['Gauge', 'Sparkle', 'ChartBar', 'TrendUp'],
  'score-distribution':        ['ChartBar', 'ChartBarHorizontal', 'ChartPieSlice'],
  'scoring-rules':             ['ShieldCheck', 'Sliders', 'Gear', 'Star'],
};

/** Where a new widget goes when you add it via the toolbar. */
export type InsertPosition = 'end' | 'start' | { afterId: string };

/** Saturated colors offered by the widget color pickers. Neutral B2B set
 *  with Ink (near-black) + Paper (white) as neutrals at the end of the row. */
export const WIDGET_HEADER_COLORS: { value: string; name: string }[] = [
  { value: '#1955A6', name: 'Brand' },
  { value: '#0E7490', name: 'Teal' },
  { value: '#059669', name: 'Green' },
  { value: '#D97706', name: 'Amber' },
  { value: '#DC2626', name: 'Red' },
  { value: '#7C3AED', name: 'Violet' },
  { value: '#BE185D', name: 'Pink' },
  { value: '#475569', name: 'Slate' },
  { value: '#0F172A', name: 'Ink' },           // near-black for text/heavy accents
  { value: '#FFFFFF', name: 'Paper' },         // pure white for backgrounds on dark themes
];

/** Matching tint for each saturated color above — same hue, medium-light.
 *  Calibrated to be clearly colored (not barely-there pastel) while still
 *  reading as a tint suitable for backgrounds + tag fills. Ordering matches
 *  WIDGET_HEADER_COLORS exactly so the picker can show both rows paired. */
export const WIDGET_HEADER_TINTS: { value: string; name: string }[] = [
  { value: '#BFDBFE', name: 'Brand tint' },    // blue-200
  { value: '#99F6E4', name: 'Teal tint' },     // teal-200
  { value: '#BBF7D0', name: 'Green tint' },    // green-200
  { value: '#FDE68A', name: 'Amber tint' },    // amber-200
  { value: '#FECACA', name: 'Red tint' },      // red-200
  { value: '#DDD6FE', name: 'Violet tint' },   // violet-200
  { value: '#FBCFE8', name: 'Pink tint' },     // pink-200
  { value: '#E2E8F0', name: 'Slate tint' },    // slate-200
  { value: '#94A3B8', name: 'Gray' },          // slate-400 — the "Ink tint"
  { value: '#E8EEF5', name: 'Off-white' },     // between slate-100 and slate-200 — distinctly off-white, not a whisper
];

/** A saved dashboard layout. */
export interface DashboardView {
  id: string;
  name: string;
  /** Suggested role this view is tailored for — used to pick a default when
   *  the user's role matches. */
  role?: 'sales' | 'recruiter' | 'manager' | 'admin' | 'any';
  /** Built-in presets cannot be deleted; users can save edits as new views. */
  preset?: boolean;
  widgets: WidgetConfig[];
}

/** Metadata for the "Add widget" menu. */
export interface WidgetTypeMeta {
  type: WidgetType;
  category: WidgetCategory;
  label: string;
  description: string;
  defaultSize: WidgetSize;
}

export const WIDGET_META: WidgetTypeMeta[] = [
  { type: 'kpi-open-deals',         category: 'status',    label: 'Open deals',          description: 'Count of deals not yet closed.',           defaultSize: { cols: 1, rows: 1 } },
  { type: 'kpi-pipeline-value',     category: 'status',    label: 'Pipeline value',      description: 'Weighted forecast of open deals.',         defaultSize: { cols: 1, rows: 1 } },
  { type: 'kpi-won-this-month',     category: 'status',    label: 'Won this month',      description: 'Count of deals closed-won this month.',    defaultSize: { cols: 1, rows: 1 } },
  { type: 'kpi-stalled-deals',      category: 'status',    label: 'Stalled deals',       description: 'Open deals idle for 21+ days.',            defaultSize: { cols: 1, rows: 1 } },
  { type: 'kpi-active-contacts',    category: 'status',    label: 'Active contacts',     description: 'Total active contacts in the CRM.',        defaultSize: { cols: 1, rows: 1 } },
  { type: 'kpi-incomplete-contacts',category: 'status',    label: 'Incomplete contacts', description: 'Contacts flagged as incomplete.',          defaultSize: { cols: 1, rows: 1 } },
  { type: 'chart-pipeline-by-stage',category: 'reporting', label: 'Pipeline by stage',   description: 'Stacked bar chart of deals by stage.',     defaultSize: { cols: 2, rows: 2 } },
  { type: 'chart-deals-by-source',  category: 'reporting', label: 'Deals by source',     description: 'How leads are entering the funnel.',       defaultSize: { cols: 2, rows: 2 } },
  { type: 'list-recent-deals',      category: 'list',      label: 'Recent deals',        description: 'Most recently updated deals.',             defaultSize: { cols: 2, rows: 2 } },
  { type: 'list-recent-contacts',   category: 'list',      label: 'Recent contacts',     description: 'Most recently added/updated contacts.',    defaultSize: { cols: 2, rows: 2 } },
  { type: 'list-stalled-deals',     category: 'list',      label: 'Needs attention',     description: 'Deals that have stalled or look at risk.', defaultSize: { cols: 2, rows: 2 } },
  { type: 'todo',                   category: 'work',      label: 'To-do list',          description: 'Personal task list with checkboxes.',      defaultSize: { cols: 2, rows: 2 } },
  { type: 'ai-suggestions',         category: 'work',      label: 'AI suggestions',      description: 'Smart next-best actions.',                 defaultSize: { cols: 2, rows: 2 } },
  { type: 'custom-report',          category: 'custom',    label: 'Custom report',       description: 'User-defined metric built in the Report Builder.', defaultSize: { cols: 2, rows: 2 } },
  // Quality Score split into three independently-draggable cards so
  // each piece can be hidden, repositioned, or resized on its own.
  // Defaults sized to fit content without internal scrolling — the
  // browser handles overflow at the page level.
  { type: 'score-kpis',             category: 'status',    label: 'Score KPIs',          description: 'Average score, top performers, and need-attention counts.',         defaultSize: { cols: 4, rows: 1 } },
  { type: 'score-distribution',     category: 'reporting', label: 'Score distribution',  description: 'Counts per band — Critical, Building, Strong, Top performers.',     defaultSize: { cols: 4, rows: 2 } },
  { type: 'scoring-rules',          category: 'work',      label: 'Scoring rules',       description: 'Tune the rules that compute every contact’s 0–100 quality score.',  defaultSize: { cols: 4, rows: 6 } },
];

export const WIDGET_META_MAP: Record<WidgetType, WidgetTypeMeta> = WIDGET_META.reduce(
  (acc, m) => { acc[m.type] = m; return acc; },
  {} as Record<WidgetType, WidgetTypeMeta>,
);
