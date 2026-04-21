/**
 * Alert / Notification system types.
 *
 * Alerts surface across the CRM via the bell icon in the Topbar. They
 * cover system events, user actions, AI insights, and user-created custom
 * alerts. Each alert has a type, severity, and optional link to the
 * relevant record.
 *
 * Designed for template reuse — the type/severity taxonomy is generic
 * enough for any B2B CRM vertical (sales, recruiting, support, etc.).
 */

export type AlertSeverity = 'info' | 'success' | 'warning' | 'critical';

export const ALERT_SEVERITIES: { id: AlertSeverity; label: string; color: string; bg: string }[] = [
  { id: 'info',     label: 'Info',     color: 'var(--brand-primary)', bg: 'var(--brand-bg)' },
  { id: 'success',  label: 'Success',  color: 'var(--success)',       bg: 'var(--success-bg)' },
  { id: 'warning',  label: 'Warning',  color: 'var(--warning)',       bg: 'var(--warning-bg)' },
  { id: 'critical', label: 'Critical', color: 'var(--danger)',        bg: 'var(--danger-bg)' },
];

export type AlertType =
  // Deal / Sales
  | 'deal-stage-change'
  | 'deal-won'
  | 'deal-lost'
  | 'deal-stalled'
  | 'deal-overdue'
  // Contact
  | 'contact-incomplete'
  | 'contact-updated'
  | 'contact-assigned'
  // Document
  | 'document-uploaded'
  | 'document-expiring'
  // Recruiting
  | 'candidate-stage-change'
  | 'candidate-match'
  // AI
  | 'ai-suggestion'
  | 'ai-anomaly'
  // System
  | 'system-update'
  | 'system-maintenance'
  | 'system-error'
  // User-created
  | 'custom'
  // Reminders
  | 'reminder'
  | 'follow-up-due'
  // Task
  | 'task-assigned'
  | 'task-due';

export const ALERT_TYPE_META: Record<AlertType, { label: string; category: string; defaultSeverity: AlertSeverity; icon: string }> = {
  'deal-stage-change':      { label: 'Deal stage changed',        category: 'Sales',      defaultSeverity: 'info',     icon: 'ArrowsClockwise' },
  'deal-won':               { label: 'Deal won',                  category: 'Sales',      defaultSeverity: 'success',  icon: 'Trophy' },
  'deal-lost':              { label: 'Deal lost',                 category: 'Sales',      defaultSeverity: 'warning',  icon: 'XCircle' },
  'deal-stalled':           { label: 'Deal stalled',              category: 'Sales',      defaultSeverity: 'warning',  icon: 'Hourglass' },
  'deal-overdue':           { label: 'Deal overdue',              category: 'Sales',      defaultSeverity: 'critical', icon: 'Warning' },
  'contact-incomplete':     { label: 'Contact incomplete',        category: 'Contacts',   defaultSeverity: 'info',     icon: 'Warning' },
  'contact-updated':        { label: 'Contact updated',           category: 'Contacts',   defaultSeverity: 'info',     icon: 'User' },
  'contact-assigned':       { label: 'Contact assigned to you',   category: 'Contacts',   defaultSeverity: 'info',     icon: 'UserPlus' },
  'document-uploaded':      { label: 'Document uploaded',         category: 'Documents',  defaultSeverity: 'info',     icon: 'File' },
  'document-expiring':      { label: 'Document expiring soon',    category: 'Documents',  defaultSeverity: 'warning',  icon: 'Clock' },
  'candidate-stage-change': { label: 'Candidate stage changed',   category: 'Recruiting', defaultSeverity: 'info',     icon: 'UsersThree' },
  'candidate-match':        { label: 'AI found a match',          category: 'Recruiting', defaultSeverity: 'success',  icon: 'Sparkle' },
  'ai-suggestion':          { label: 'AI suggestion',             category: 'AI',         defaultSeverity: 'info',     icon: 'Sparkle' },
  'ai-anomaly':             { label: 'AI detected anomaly',       category: 'AI',         defaultSeverity: 'warning',  icon: 'Lightning' },
  'system-update':          { label: 'System update available',   category: 'System',     defaultSeverity: 'info',     icon: 'ArrowsClockwise' },
  'system-maintenance':     { label: 'Scheduled maintenance',     category: 'System',     defaultSeverity: 'warning',  icon: 'Wrench' },
  'system-error':           { label: 'System error',              category: 'System',     defaultSeverity: 'critical', icon: 'Warning' },
  'custom':                 { label: 'Custom alert',              category: 'Custom',     defaultSeverity: 'info',     icon: 'Bell' },
  'reminder':               { label: 'Reminder',                  category: 'Reminders',  defaultSeverity: 'info',     icon: 'Clock' },
  'follow-up-due':          { label: 'Follow-up due',             category: 'Reminders',  defaultSeverity: 'warning',  icon: 'CalendarCheck' },
  'task-assigned':          { label: 'Task assigned to you',      category: 'Tasks',      defaultSeverity: 'info',     icon: 'CheckSquare' },
  'task-due':               { label: 'Task due soon',             category: 'Tasks',      defaultSeverity: 'warning',  icon: 'Clock' },
};

/** All distinct categories for filtering in settings. */
export const ALERT_CATEGORIES = [...new Set(Object.values(ALERT_TYPE_META).map((m) => m.category))];

export interface CrmAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Link to the relevant record (e.g. /sales/deal-1, /contacts/per-3). */
  href?: string;
  /** ISO date string. */
  createdAt: string;
  /** Has the user seen / acknowledged this alert? */
  read: boolean;
  /** Has the user dismissed it from the panel? */
  dismissed: boolean;
}

/** User preferences for which alerts to show. */
export interface AlertSettings {
  /** Enabled alert types — if a type is false or missing, alerts of that type are hidden. */
  enabledTypes: Partial<Record<AlertType, boolean>>;
  /** Minimum severity to show. Alerts below this threshold are hidden. */
  minSeverity: AlertSeverity;
  /** Show desktop notifications (browser Notification API). */
  desktopNotifications: boolean;
  /** Play a sound for critical alerts. */
  soundOnCritical: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabledTypes: Object.fromEntries(
    Object.keys(ALERT_TYPE_META).map((t) => [t, true])
  ) as Record<AlertType, boolean>,
  minSeverity: 'info',
  desktopNotifications: false,
  soundOnCritical: false,
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { info: 0, success: 1, warning: 2, critical: 3 };

export function severityAtOrAbove(severity: AlertSeverity, min: AlertSeverity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[min];
}

/* ------------------------------------------------------------------ */
/*  Rule-based Alerts                                                  */
/* ------------------------------------------------------------------ */

export type AlertRuleTemplate =
  | 'deal-idle-days'
  | 'deal-amount-exceeds'
  | 'contact-missing-info'
  | 'document-expiring';

export interface AlertRuleTemplateMeta {
  id: AlertRuleTemplate;
  label: string;
  description: string;
  hasThreshold: boolean;
  thresholdLabel: string;
  thresholdDefault: number;
  thresholdPrefix: string;
  thresholdSuffix: string;
  alertType: AlertType;
  defaultSeverity: AlertSeverity;
}

export const ALERT_RULE_TEMPLATES: AlertRuleTemplateMeta[] = [
  {
    id: 'deal-idle-days', label: 'Deal idle for X days',
    description: 'Alert when an open deal has no activity for the specified number of days.',
    hasThreshold: true, thresholdLabel: 'Days idle', thresholdDefault: 14,
    thresholdPrefix: '', thresholdSuffix: 'days',
    alertType: 'deal-stalled', defaultSeverity: 'warning',
  },
  {
    id: 'deal-amount-exceeds', label: 'Deal amount exceeds threshold',
    description: 'Alert when an open deal\'s value exceeds the specified amount.',
    hasThreshold: true, thresholdLabel: 'Amount', thresholdDefault: 50000,
    thresholdPrefix: '$', thresholdSuffix: '',
    alertType: 'deal-overdue', defaultSeverity: 'info',
  },
  {
    id: 'contact-missing-info', label: 'Contact missing key info',
    description: 'Alert when contacts are flagged as having incomplete profiles.',
    hasThreshold: false, thresholdLabel: '', thresholdDefault: 0,
    thresholdPrefix: '', thresholdSuffix: '',
    alertType: 'contact-incomplete', defaultSeverity: 'info',
  },
  {
    id: 'document-expiring', label: 'Document expiring in X days',
    description: 'Alert when a contract or NDA is approaching its expiration date.',
    hasThreshold: true, thresholdLabel: 'Days before expiry', thresholdDefault: 30,
    thresholdPrefix: '', thresholdSuffix: 'days',
    alertType: 'document-expiring', defaultSeverity: 'warning',
  },
];

export interface AlertRule {
  id: string;
  name: string;
  template: AlertRuleTemplate;
  threshold: number | null;
  severity: AlertSeverity;
  enabled: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Reminder Alerts                                                    */
/* ------------------------------------------------------------------ */

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface EntityLink {
  entityType: 'contact' | 'deal' | 'document';
  entityId: string;
  entityName: string;
  href: string;
}

export interface AlertReminder {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  /** ISO date string — when this reminder should fire. */
  scheduledAt: string;
  recurrence: ReminderRecurrence;
  entityLink?: EntityLink;
  /** Has this reminder fired (for one-time reminders)? */
  fired: boolean;
  /** Last time this reminder created an alert. */
  lastFiredAt?: string;
  enabled: boolean;
  createdAt: string;
}
