/**
 * Demo custom reports seeded into the library on first load.
 *
 * These showcase the four display types and three entity sources, plus one
 * cross-object preset — so users immediately see what the Report Builder can
 * produce without having to build their own first.
 */

import { CustomReport } from '@/types/custom-report';

const NOW = '2026-04-01T12:00:00.000Z';

export const SEED_CUSTOM_REPORTS: CustomReport[] = [
  {
    id: 'rpt-negotiation-value',
    name: 'Negotiation Value',
    description: 'Total amount of all deals currently in the Negotiation stage.',
    source: 'deals',
    aggregation: 'sum',
    field: 'amount',
    filters: [
      { id: 'f-stage', field: 'stage', op: 'eq', value: 'negotiation' },
    ],
    display: 'number',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'rpt-deals-by-priority',
    name: 'Deals by Priority',
    description: 'Count of open deals grouped by priority level.',
    source: 'deals',
    aggregation: 'count',
    filters: [
      { id: 'f-open', field: 'stage', op: 'notIn', value: ['closed-won', 'closed-lost'] },
    ],
    groupBy: 'priority',
    display: 'bar',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'rpt-contacts-by-type',
    name: 'Contacts by Type',
    description: 'Distribution of active contacts between organizations and people.',
    source: 'contacts',
    aggregation: 'count',
    filters: [
      { id: 'f-active', field: 'status', op: 'eq', value: 'active' },
    ],
    groupBy: 'type',
    display: 'pie',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'rpt-top-deals',
    name: 'Top 10 Open Deals',
    description: 'Largest open deals by amount.',
    source: 'deals',
    aggregation: 'count',
    filters: [
      { id: 'f-open', field: 'stage', op: 'notIn', value: ['closed-won', 'closed-lost'] },
    ],
    display: 'table',
    sortBy: 'amount',
    sortDir: 'desc',
    limit: 10,
    createdAt: NOW,
    updatedAt: NOW,
  },
];
