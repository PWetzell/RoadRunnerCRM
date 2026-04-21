/**
 * Custom Report types and field registry.
 *
 * A CustomReport is a reusable metric definition that users build in the
 * Report Builder. Each report has a source entity, aggregation method,
 * filter chain, and display format. Saved reports can be added as widgets
 * to any dashboard.
 */

import { DEAL_STAGES, DEAL_SOURCES, DealStage, DealSource } from './deal';
import type { ContentTextSize, ContentAlign } from './dashboard';

export type ReportSource = 'deals' | 'contacts' | 'documents' | 'cross-object';

export type ReportAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max';

export type ReportDisplay = 'number' | 'bar' | 'pie' | 'donut' | 'table';

export type FilterOp =
  | 'eq'            // equals
  | 'neq'           // not equals
  | 'gt'            // greater than
  | 'gte'           // greater than or equal
  | 'lt'            // less than
  | 'lte'           // less than or equal
  | 'contains'      // string contains
  | 'notContains'   // string does not contain
  | 'in'            // value is in list
  | 'notIn'         // value is not in list
  | 'empty'         // field is empty / null
  | 'notEmpty'      // field has a value
  | 'withinDays'    // within last N days
  | 'olderThanDays'; // older than N days

export interface FilterClause {
  id: string;
  field: string;
  op: FilterOp;
  value: string | number | string[];
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  source: ReportSource;
  aggregation: ReportAggregation;
  /** Required when aggregation is sum/avg/min/max (not for count). */
  field?: string;
  filters: FilterClause[];
  /** Field to group by. Used for bar/pie/donut/table. */
  groupBy?: string;
  display: ReportDisplay;
  /** Row limit for table display. */
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  /** If source is 'cross-object', references one of CROSS_OBJECT_PRESETS by id. */
  presetMetricId?: string;
  /**
   * Visual defaults applied when this report is rendered as a dashboard
   * widget. Individual widget instances can still override any field via
   * their own WidgetConfig.
   */
  style?: ReportStyle;
  createdAt: string;
  updatedAt: string;
}

/** Per-report visual defaults — mirrors the subset of WidgetConfig that
 *  controls appearance. All fields optional; omitted ones use brand defaults. */
export interface ReportStyle {
  headerColor?: string;
  iconName?: string;
  iconColor?: string;
  titleColor?: string;
  titleSize?: ContentTextSize;
  contentTextColor?: string;
  contentTextSize?: ContentTextSize;
  subtitleColor?: string;
  contentAlign?: ContentAlign;
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'array';
  /** For enum fields, the allowed values. */
  options?: readonly string[];
  /** Can this field be summed/averaged/etc? (true for numeric fields) */
  aggregable?: boolean;
  /** Can this field be used as a groupBy? (true for enums + low-cardinality strings) */
  groupable?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Field registries — what users can filter/aggregate/group by       */
/* ------------------------------------------------------------------ */

const DEAL_STAGE_VALUES = DEAL_STAGES.map((s) => s.id) as DealStage[];
const DEAL_SOURCE_VALUES = DEAL_SOURCES as readonly DealSource[];

export const DEAL_FIELDS: FieldDef[] = [
  { key: 'name',              label: 'Name',              type: 'string' },
  { key: 'stage',             label: 'Stage',             type: 'enum', options: DEAL_STAGE_VALUES, groupable: true },
  { key: 'type',              label: 'Type',              type: 'enum', options: ['person', 'company'] as const, groupable: true },
  { key: 'amount',            label: 'Amount',            type: 'number', aggregable: true },
  { key: 'probability',       label: 'Probability',       type: 'number', aggregable: true },
  { key: 'source',            label: 'Source',            type: 'enum', options: DEAL_SOURCE_VALUES, groupable: true },
  { key: 'priority',          label: 'Priority',          type: 'enum', options: ['high', 'medium', 'low'] as const, groupable: true },
  { key: 'owner',             label: 'Owner',             type: 'string', groupable: true },
  { key: 'createdAt',         label: 'Created',           type: 'date' },
  { key: 'lastUpdated',       label: 'Last Updated',      type: 'date' },
  { key: 'closedAt',          label: 'Closed',            type: 'date' },
  { key: 'expectedCloseDate', label: 'Expected Close',    type: 'date' },
];

export const CONTACT_FIELDS: FieldDef[] = [
  { key: 'name',        label: 'Name',         type: 'string' },
  { key: 'type',        label: 'Type',         type: 'enum', options: ['org', 'person'] as const, groupable: true },
  { key: 'status',      label: 'Status',       type: 'enum', options: ['active', 'inactive'] as const, groupable: true },
  { key: 'stale',       label: 'Incomplete',   type: 'boolean', groupable: true },
  { key: 'industry',    label: 'Industry',     type: 'string', groupable: true },
  { key: 'assignedTo',  label: 'Assigned To',  type: 'string', groupable: true },
  { key: 'tags',        label: 'Tags',         type: 'array' },
  { key: 'lastUpdated', label: 'Last Updated', type: 'date' },
];

export const DOCUMENT_FIELDS: FieldDef[] = [
  { key: 'name',        label: 'Name',        type: 'string' },
  { key: 'category',    label: 'Category',    type: 'enum',
    options: ['resume', 'contract', 'proposal', 'invoice', 'report', 'presentation', 'spreadsheet', 'image', 'correspondence', 'legal', 'other'] as const,
    groupable: true },
  { key: 'fileFamily',  label: 'File Type',   type: 'enum',
    options: ['image', 'pdf', 'office', 'text', 'archive', 'video', 'audio', 'other'] as const,
    groupable: true },
  { key: 'size',        label: 'Size (bytes)', type: 'number', aggregable: true },
  { key: 'uploadedBy',  label: 'Uploaded By', type: 'string', groupable: true },
  { key: 'uploadedAt',  label: 'Uploaded',    type: 'date' },
  { key: 'updatedAt',   label: 'Updated',     type: 'date' },
  { key: 'expiresAt',   label: 'Expires',     type: 'date' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getFields(source: ReportSource): FieldDef[] {
  switch (source) {
    case 'deals':    return DEAL_FIELDS;
    case 'contacts': return CONTACT_FIELDS;
    case 'documents': return DOCUMENT_FIELDS;
    case 'cross-object': return [];
  }
}

export function getField(source: ReportSource, key: string): FieldDef | undefined {
  return getFields(source).find((f) => f.key === key);
}

/** Return the valid filter operators for a given field type. */
export function getValidOps(type: FieldDef['type']): FilterOp[] {
  switch (type) {
    case 'number':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];
    case 'date':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'withinDays', 'olderThanDays'];
    case 'enum':
      return ['eq', 'neq', 'in', 'notIn'];
    case 'boolean':
      return ['eq', 'neq'];
    case 'array':
      return ['contains', 'notContains', 'empty', 'notEmpty'];
    case 'string':
    default:
      return ['eq', 'neq', 'contains', 'notContains', 'empty', 'notEmpty'];
  }
}

/** Display labels for filter operators. */
export const FILTER_OP_LABELS: Record<FilterOp, string> = {
  eq:            'equals',
  neq:           'not equals',
  gt:            'greater than',
  gte:           'greater than or equal',
  lt:            'less than',
  lte:           'less than or equal',
  contains:      'contains',
  notContains:   'does not contain',
  in:            'is one of',
  notIn:         'is not one of',
  empty:         'is empty',
  notEmpty:      'is not empty',
  withinDays:    'within last (days)',
  olderThanDays: 'older than (days)',
};

/** Display labels for aggregations. */
export const AGGREGATION_LABELS: Record<ReportAggregation, string> = {
  count: 'Count',
  sum:   'Sum',
  avg:   'Average',
  min:   'Minimum',
  max:   'Maximum',
};

/** Display labels for sources. */
export const SOURCE_LABELS: Record<ReportSource, string> = {
  deals:          'Deals',
  contacts:       'Contacts',
  documents:      'Documents',
  'cross-object': 'Cross-object',
};

/** Display labels for display types. */
export const DISPLAY_LABELS: Record<ReportDisplay, string> = {
  number: 'Number',
  bar:    'Bar chart',
  pie:    'Pie chart',
  donut:  'Donut chart',
  table:  'Table',
};
