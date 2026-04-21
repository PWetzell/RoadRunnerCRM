import { CrmAlert, AlertRule, AlertReminder } from '@/types/alert';

export const SEED_ALERTS: CrmAlert[] = [
  {
    id: 'alert-1', type: 'deal-won', severity: 'success',
    title: 'Deal closed — Vertex Head of Engineering',
    message: 'Deal closed. $88K fee invoiced.',
    href: '/sales/deal-9', createdAt: '2026-04-15T09:00:00Z', read: false, dismissed: false,
  },
  {
    id: 'alert-2', type: 'deal-stalled', severity: 'warning',
    title: 'Harborline — exploratory advisor search stalled',
    message: 'No activity for 10 days. Consider a follow-up.',
    href: '/sales/deal-8', createdAt: '2026-04-15T08:30:00Z', read: false, dismissed: false,
  },
  {
    id: 'alert-3', type: 'ai-suggestion', severity: 'info',
    title: 'AI: Reach out on Vertex negotiation',
    message: 'Deal is in negotiation — one more touch could close it.',
    href: '/sales/deal-1', createdAt: '2026-04-15T08:00:00Z', read: false, dismissed: false,
  },
  {
    id: 'alert-4', type: 'contact-incomplete', severity: 'info',
    title: '4 contacts have incomplete profiles',
    message: 'Marcus Webb, Lisa Park, and 2 others are missing data.',
    href: '/contacts', createdAt: '2026-04-15T07:00:00Z', read: true, dismissed: false,
  },
  {
    id: 'alert-5', type: 'document-expiring', severity: 'warning',
    title: 'NDA with Meridian expires in 30 days',
    message: 'The mutual NDA signed Nov 2025 is approaching renewal.',
    href: '/documents', createdAt: '2026-04-14T16:00:00Z', read: false, dismissed: false,
  },
  {
    id: 'alert-6', type: 'candidate-match', severity: 'success',
    title: 'AI: Alex Rivera matches Vertex Jr Analyst role',
    message: '78% match score — consider presenting.',
    href: '/sales/deal-5', createdAt: '2026-04-14T14:00:00Z', read: false, dismissed: false,
  },
  {
    id: 'alert-7', type: 'deal-overdue', severity: 'critical',
    title: 'Meridian Chief of Staff — expected close passed',
    message: 'Expected close was March 15. Deal is now closed-lost.',
    href: '/sales/deal-10', createdAt: '2026-04-14T10:00:00Z', read: true, dismissed: false,
  },
  {
    id: 'alert-8', type: 'follow-up-due', severity: 'warning',
    title: 'Follow-up due: Clearpath — 3 Investment Analysts',
    message: 'First slate was promised in 2 weeks. Due date approaching.',
    href: '/sales/deal-3', createdAt: '2026-04-14T09:00:00Z', read: false, dismissed: false,
  },
  {
    id: 'alert-9', type: 'system-update', severity: 'info',
    title: 'Roadrunner CRM v2.1 available',
    message: 'New features: Documents module, Recruiting pipeline, Reporting dashboard.',
    createdAt: '2026-04-13T12:00:00Z', read: true, dismissed: false,
  },
  {
    id: 'alert-10', type: 'task-assigned', severity: 'info',
    title: 'Task assigned: Review RPO proposal',
    message: 'Sarah Chen assigned you a task on the Meridian RPO deal.',
    href: '/sales/deal-6', createdAt: '2026-04-13T10:00:00Z', read: true, dismissed: false,
  },
  {
    id: 'alert-11', type: 'ai-anomaly', severity: 'warning',
    title: 'AI: Unusual activity pattern on Clearpath account',
    message: 'Multiple deals created in short succession — verify intent.',
    href: '/contacts/org-3', createdAt: '2026-04-12T15:00:00Z', read: true, dismissed: false,
  },
  {
    id: 'alert-12', type: 'reminder', severity: 'info',
    title: 'Reminder: Quarterly pipeline review',
    message: 'Scheduled for Friday at 2:00 PM.',
    createdAt: '2026-04-12T08:00:00Z', read: true, dismissed: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Seed Rules                                                         */
/* ------------------------------------------------------------------ */

export const SEED_RULES: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'Deal idle 14 days',
    template: 'deal-idle-days',
    threshold: 14,
    severity: 'warning',
    enabled: false,
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'rule-2',
    name: 'High-value deal alert',
    template: 'deal-amount-exceeds',
    threshold: 75000,
    severity: 'info',
    enabled: false,
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'rule-3',
    name: 'Incomplete contact profiles',
    template: 'contact-missing-info',
    threshold: null,
    severity: 'info',
    enabled: false,
    createdAt: '2026-03-15T09:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/*  Seed Reminders                                                     */
/* ------------------------------------------------------------------ */

function futureDate(daysFromNow: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function nextMonday9am(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMon = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export const SEED_REMINDERS: AlertReminder[] = [
  {
    id: 'rem-1',
    title: 'Quarterly pipeline review',
    message: 'Prepare updated forecast deck and review stalled deals before the Friday meeting.',
    severity: 'info',
    scheduledAt: futureDate(3, 14),
    recurrence: 'none',
    fired: false,
    enabled: true,
    createdAt: '2026-04-12T08:00:00Z',
  },
  {
    id: 'rem-2',
    title: 'Weekly Meridian check-in',
    message: 'Touch base with Sarah Chen on RPO advisor program. Review deal pipeline.',
    severity: 'warning',
    scheduledAt: nextMonday9am(),
    recurrence: 'weekly',
    entityLink: {
      entityType: 'deal',
      entityId: 'deal-6',
      entityName: 'Meridian — RPO Advisor Program',
      href: '/sales/deal-6',
    },
    fired: false,
    enabled: true,
    createdAt: '2026-04-01T09:00:00Z',
  },
];
