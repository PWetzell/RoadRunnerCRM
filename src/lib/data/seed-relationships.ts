import { Relationship } from '@/types/relationship';

/**
 * Hand-crafted relationship edges between SEED_CONTACTS.
 * Provides initial connectedness so the Overview Relationships card
 * shows real data on first load.
 */
export const SEED_RELATIONSHIPS: Relationship[] = [
  // Sarah Chen (per-1) is an employee of Meridian Capital Group (org-1)
  {
    id: 'rel-1',
    fromContactId: 'per-1',
    toContactId: 'org-1',
    kind: 'employee-of',
    createdAt: '2026-01-10',
    createdBy: 'Paul Wentzell',
  },
  // Tom Nakamura (per-2) is also an employee of Meridian
  {
    id: 'rel-2',
    fromContactId: 'per-2',
    toContactId: 'org-1',
    kind: 'employee-of',
    createdAt: '2026-01-12',
    createdBy: 'Paul Wentzell',
  },
  // Tom Nakamura reports to Sarah Chen
  {
    id: 'rel-3',
    fromContactId: 'per-2',
    toContactId: 'per-1',
    kind: 'reports-to',
    notes: 'Compliance team reports up through VP of Operations',
    createdAt: '2026-01-12',
    createdBy: 'Paul Wentzell',
  },
  // Lisa Park (per-3) is an employee of Vertex Analytics (org-2)
  {
    id: 'rel-4',
    fromContactId: 'per-3',
    toContactId: 'org-2',
    kind: 'employee-of',
    createdAt: '2026-02-01',
    createdBy: 'Paul Wentzell',
  },
  // Marcus Webb (per-4) is also at Vertex Analytics
  {
    id: 'rel-5',
    fromContactId: 'per-4',
    toContactId: 'org-2',
    kind: 'employee-of',
    createdAt: '2026-02-03',
    createdBy: 'Paul Wentzell',
  },
  // Lisa Park and Marcus Webb are peers
  {
    id: 'rel-6',
    fromContactId: 'per-3',
    toContactId: 'per-4',
    kind: 'peer',
    createdAt: '2026-02-03',
    createdBy: 'Paul Wentzell',
  },
  // Vertex Analytics is a vendor of Meridian Capital Group
  {
    id: 'rel-7',
    fromContactId: 'org-2',
    toContactId: 'org-1',
    kind: 'vendor-of',
    notes: 'Provides data analytics platform under multi-year SaaS contract',
    createdAt: '2025-09-15',
    createdBy: 'Paul Wentzell',
  },
  // Diana Reyes (per-5) is an employee of Clearpath Advisors (org-3)
  {
    id: 'rel-8',
    fromContactId: 'per-5',
    toContactId: 'org-3',
    kind: 'employee-of',
    createdAt: '2025-09-13',
    createdBy: 'Paul Wentzell',
  },
];
