import { ActivityLogEntry } from '@/types/activity-log';
import {
  BULK_ORGS,
  HM_SEEDS,
  CANDIDATE_SEEDS,
  type HMSeed,
  type CandidateSeed,
} from './seed-contacts-bulk';

// Helper to create timestamps relative to "now" for realistic ordering
const ago = (days: number, hours = 0, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours, d.getMinutes() - minutes);
  return d.getTime();
};

const fmt = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const CORE_ACTIVITY_LOG: ActivityLogEntry[] = [
  // Today
  {
    id: 'log-1', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Phone Number', action: 'updated',
    oldValue: '+1 (617) 000-5555', newValue: '+1 (617) 952-5555',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 1)), timestamp: ago(0, 1),
  },
  {
    id: 'log-2', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Email', action: 'added',
    newValue: 'info@meridiancapital.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 1, 15)), timestamp: ago(0, 1, 15),
  },
  {
    id: 'log-3', contactId: 'org-1', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'High Priority',
    author: 'Dexter Howell', authorInitials: 'DH', authorColor: '#3BAFC4',
    createdAt: fmt(ago(0, 3)), timestamp: ago(0, 3),
  },
  // Yesterday
  {
    id: 'log-4', contactId: 'org-1', eventType: 'title_change', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Senior Analyst', newValue: 'VP of Operations',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(1, 2)), timestamp: ago(1, 2),
  },
  {
    id: 'log-5', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Department', action: 'updated',
    oldValue: 'Research', newValue: 'Operations',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(1, 2)), timestamp: ago(1, 2),
  },
  {
    id: 'log-6', contactId: 'org-1', eventType: 'relationship_change', category: 'relationship',
    field: 'Organization', action: 'updated',
    oldValue: 'ESI East', newValue: 'Meridian Capital Group',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(1, 5)), timestamp: ago(1, 5),
  },
  {
    id: 'log-7', contactId: 'org-1', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Quarterly review completed — compliance check passed',
    author: 'Dexter Howell', authorInitials: 'DH', authorColor: '#3BAFC4',
    createdAt: fmt(ago(1, 8)), timestamp: ago(1, 8),
  },
  // 2 days ago
  {
    id: 'log-8', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Address', action: 'added',
    newValue: '100 Cummings Center, Ste-230-G, Portsmouth, NH 03811',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(2, 4)), timestamp: ago(2, 4),
  },
  {
    id: 'log-9', contactId: 'org-1', eventType: 'status_change', category: 'status',
    field: 'Status', action: 'updated',
    oldValue: 'Current', newValue: 'Stale',
    author: 'System', authorInitials: 'SY', authorColor: '#94A3B8',
    createdAt: fmt(ago(2, 6)), timestamp: ago(2, 6),
  },
  {
    id: 'log-10', contactId: 'org-1', eventType: 'industry_change', category: 'field',
    field: 'Industry', action: 'added',
    newValue: '52111 — Commercial Banking',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(2, 8)), timestamp: ago(2, 8),
  },
  // 5 days ago
  {
    id: 'log-11', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Phone Number', action: 'added',
    newValue: '+1 (617) 000-5555',
    author: 'Antonia Hopkins', authorInitials: 'AH', authorColor: '#D96FA8',
    createdAt: fmt(ago(5, 3)), timestamp: ago(5, 3),
  },
  {
    id: 'log-12', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Website', action: 'added',
    newValue: 'meridiancapital.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(5, 4)), timestamp: ago(5, 4),
  },
  {
    id: 'log-13', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Employees', action: 'updated',
    oldValue: '100-250', newValue: '250-500',
    author: 'Mercedes Paul', authorInitials: 'MP', authorColor: '#247A8A',
    createdAt: fmt(ago(5, 6)), timestamp: ago(5, 6),
  },
  // 10 days ago
  {
    id: 'log-14', contactId: 'org-1', eventType: 'entry_removed', category: 'entry',
    field: 'Email', action: 'removed',
    oldValue: 'old-info@meridian.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(10, 2)), timestamp: ago(10, 2),
  },
  {
    id: 'log-15', contactId: 'org-1', eventType: 'contact_created', category: 'status',
    field: 'Contact', action: 'created',
    newValue: 'Meridian Capital Group',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(10, 8)), timestamp: ago(10, 8),
  },
  // Person contact logs
  {
    id: 'log-16', contactId: 'per-1', eventType: 'field_update', category: 'field',
    field: 'Phone Number', action: 'updated',
    oldValue: '+1 (603) 555-0100', newValue: '+1 (603) 555-0199',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 4)), timestamp: ago(0, 4),
  },
  {
    id: 'log-17', contactId: 'per-1', eventType: 'title_change', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Analyst', newValue: 'VP of Operations',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(1, 3)), timestamp: ago(1, 3),
  },
  {
    id: 'log-18', contactId: 'per-1', eventType: 'relationship_change', category: 'relationship',
    field: 'Organization', action: 'added',
    newValue: 'Meridian Capital Group',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(3, 2)), timestamp: ago(3, 2),
  },

  // ─────────────────────────────────────────────────────────────────────
  // Year-long history across all core contacts. Each entry is a field
  // edit, note, tag change, status flip, identifier add, industry code,
  // relationship edit, or title change — enough variety that every icon
  // branch in ActivityLog.getEventIcon renders in the demo.
  //
  // Dates span ~14 months so the date-group bucketing shows Today →
  // Yesterday → This Week → Last Week → This Month → "Month Year" group
  // rows. This exercises the year-view story Paul asked for.
  // ─────────────────────────────────────────────────────────────────────

  // per-1 · Sarah Chen — long history, promoted 11mo ago, onboarded
  {
    id: 'log-sc-20', contactId: 'per-1', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Quarterly check-in — wants stretch scope next promo cycle',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(14, 3)), timestamp: ago(14, 3),
  },
  {
    id: 'log-sc-21', contactId: 'per-1', eventType: 'entry_added', category: 'entry',
    field: 'Address', action: 'added',
    newValue: '125 Beacon Street, Apt 4B, Boston, MA 02116',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(45, 10)), timestamp: ago(45, 10),
  },
  {
    id: 'log-sc-22', contactId: 'per-1', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'VIP',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(62, 5)), timestamp: ago(62, 5),
  },
  {
    id: 'log-sc-23', contactId: 'per-1', eventType: 'field_update', category: 'field',
    field: 'Department', action: 'updated',
    oldValue: 'Research', newValue: 'Operations',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(120, 9)), timestamp: ago(120, 9),
  },
  {
    id: 'log-sc-24', contactId: 'per-1', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: '90-day retrospective — team of 8, morale up, one flight risk (analyst)',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(85, 14)), timestamp: ago(85, 14),
  },
  {
    id: 'log-sc-25', contactId: 'per-1', eventType: 'relationship_change', category: 'relationship',
    field: 'Organization', action: 'added',
    newValue: 'Fidelity Investments',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(305, 16)), timestamp: ago(305, 16),
  },
  {
    id: 'log-sc-26', contactId: 'per-1', eventType: 'contact_created', category: 'status',
    field: 'Contact', action: 'created',
    newValue: 'Sarah Chen',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(330, 11)), timestamp: ago(330, 11),
  },

  // per-2 · Marcus Webb — active search, recent cadence
  {
    id: 'log-mw-1', contactId: 'per-2', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Active Search',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(1, 17)), timestamp: ago(1, 17),
  },
  {
    id: 'log-mw-2', contactId: 'per-2', eventType: 'status_change', category: 'status',
    field: 'Status', action: 'updated',
    oldValue: 'Passive', newValue: 'Active',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(22, 9, 30)), timestamp: ago(22, 9, 30),
  },
  {
    id: 'log-mw-3', contactId: 'per-2', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Called about Stripe Director role — strong interest, comp gap 15%',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(22, 10)), timestamp: ago(22, 10),
  },
  {
    id: 'log-mw-4', contactId: 'per-2', eventType: 'entry_added', category: 'entry',
    field: 'Phone Number', action: 'added',
    newValue: '+1 (415) 555-0391',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(68, 18)), timestamp: ago(68, 18),
  },
  {
    id: 'log-mw-5', contactId: 'per-2', eventType: 'title_change', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Senior Engineer', newValue: 'Engineering Manager, Payments Platform',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(210, 12)), timestamp: ago(210, 12),
  },
  {
    id: 'log-mw-6', contactId: 'per-2', eventType: 'contact_created', category: 'status',
    field: 'Contact', action: 'created',
    newValue: 'Marcus Webb',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(400, 14)), timestamp: ago(400, 14),
  },

  // per-3 · Diana Reyes — placed 6mo ago
  {
    id: 'log-dr-1', contactId: 'per-3', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Hit 6mo milestone — NPS +18, attrition down to 4%',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(3, 10)), timestamp: ago(3, 10),
  },
  {
    id: 'log-dr-2', contactId: 'per-3', eventType: 'field_update', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Sr Manager, CS', newValue: 'Director of Customer Success',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(178, 12)), timestamp: ago(178, 12),
  },
  {
    id: 'log-dr-3', contactId: 'per-3', eventType: 'relationship_change', category: 'relationship',
    field: 'Organization', action: 'updated',
    oldValue: 'Zendesk', newValue: 'HubSpot, Inc.',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(178, 12, 5)), timestamp: ago(178, 12, 5),
  },
  {
    id: 'log-dr-4', contactId: 'per-3', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Placed',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(178, 13)), timestamp: ago(178, 13),
  },

  // per-6 · James Harford — client, highest-value
  {
    id: 'log-jh-1', contactId: 'per-6', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Q2 kickoff — 4 new reqs, same structure as Q1',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 11, 30)), timestamp: ago(0, 11, 30),
  },
  {
    id: 'log-jh-2', contactId: 'per-6', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Client',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(110, 10)), timestamp: ago(110, 10),
  },
  {
    id: 'log-jh-3', contactId: 'per-6', eventType: 'entry_added', category: 'entry',
    field: 'Email', action: 'added',
    newValue: 'j.harford@dowjones.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(112, 17)), timestamp: ago(112, 17),
  },
  {
    id: 'log-jh-4', contactId: 'per-6', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'MSA signed — 12mo term, milestone-based, net 30',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(112, 16, 25)), timestamp: ago(112, 16, 25),
  },
  {
    id: 'log-jh-5', contactId: 'per-6', eventType: 'field_update', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Director of Talent', newValue: 'Head of Talent Acquisition',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(240, 11)), timestamp: ago(240, 11),
  },
  {
    id: 'log-jh-6', contactId: 'per-6', eventType: 'contact_created', category: 'status',
    field: 'Contact', action: 'created',
    newValue: 'James Harford',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(410, 9)), timestamp: ago(410, 9),
  },

  // per-7 · Alex Rivera — passive, slow cadence
  {
    id: 'log-ar-1', contactId: 'per-7', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Passive',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(1, 20, 15)), timestamp: ago(1, 20, 15),
  },
  {
    id: 'log-ar-2', contactId: 'per-7', eventType: 'status_change', category: 'status',
    field: 'Status', action: 'updated',
    oldValue: 'Current', newValue: 'Stale',
    author: 'System', authorInitials: 'SY', authorColor: '#94A3B8',
    createdAt: fmt(ago(92, 19)), timestamp: ago(92, 19),
  },
  {
    id: 'log-ar-3', contactId: 'per-7', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Heads-down on rewrite — not open till Q3',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(92, 19, 15)), timestamp: ago(92, 19, 15),
  },
  {
    id: 'log-ar-4', contactId: 'per-7', eventType: 'contact_created', category: 'status',
    field: 'Contact', action: 'created',
    newValue: 'Alex Rivera',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(280, 10)), timestamp: ago(280, 10),
  },

  // per-8 · Priya Shah — just got promoted
  {
    id: 'log-ps-1', contactId: 'per-8', eventType: 'title_change', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Senior Product Marketing Manager', newValue: 'Director, Product Marketing',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(2, 10)), timestamp: ago(2, 10),
  },
  {
    id: 'log-ps-2', contactId: 'per-8', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Coached through Director comp conversation — got 75th percentile',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(18, 15)), timestamp: ago(18, 15),
  },
  {
    id: 'log-ps-3', contactId: 'per-8', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Promoted',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(2, 10, 30)), timestamp: ago(2, 10, 30),
  },

  // per-4 · Tom Nakamura — Compliance Director
  {
    id: 'log-tn-1', contactId: 'per-4', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Annual compliance audit clean — document org paid off',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(6, 11)), timestamp: ago(6, 11),
  },
  {
    id: 'log-tn-2', contactId: 'per-4', eventType: 'entry_added', category: 'entry',
    field: 'Identifier', action: 'added',
    newValue: 'CRCP-2024-182',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(140, 10)), timestamp: ago(140, 10),
  },
  {
    id: 'log-tn-3', contactId: 'per-4', eventType: 'field_update', category: 'field',
    field: 'Department', action: 'updated',
    oldValue: 'Legal', newValue: 'Compliance',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(200, 11)), timestamp: ago(200, 11),
  },

  // per-5 · Lisa Park — just went active
  {
    id: 'log-lp-1', contactId: 'per-5', eventType: 'status_change', category: 'status',
    field: 'Status', action: 'updated',
    oldValue: 'Passive', newValue: 'Active',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(4, 17)), timestamp: ago(4, 17),
  },
  {
    id: 'log-lp-2', contactId: 'per-5', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Active Search',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(4, 17, 5)), timestamp: ago(4, 17, 5),
  },
  {
    id: 'log-lp-3', contactId: 'per-5', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Ready to move — 3 principal SA roles queued (Stripe/Plaid/Ramp)',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(4, 17, 10)), timestamp: ago(4, 17, 10),
  },

  // org-2 · Stripe — account entries across year
  {
    id: 'log-s-1', contactId: 'org-2', eventType: 'industry_change', category: 'field',
    field: 'Industry', action: 'added',
    newValue: '51321 — Software Publishers',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(40, 10)), timestamp: ago(40, 10),
  },
  {
    id: 'log-s-2', contactId: 'org-2', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'MSA renewal — same terms + new priority-tier SLA',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(58, 15)), timestamp: ago(58, 15),
  },
  {
    id: 'log-s-3', contactId: 'org-2', eventType: 'field_update', category: 'field',
    field: 'Employees', action: 'updated',
    oldValue: '2,500-5,000', newValue: '5,000-10,000',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(210, 11)), timestamp: ago(210, 11),
  },

  // org-3 · HubSpot — account moves
  {
    id: 'log-hs-1', contactId: 'org-3', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Referral bonus settled for Diana Reyes placement',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(170, 10)), timestamp: ago(170, 10),
  },
  {
    id: 'log-hs-2', contactId: 'org-3', eventType: 'entry_added', category: 'entry',
    field: 'Website', action: 'added',
    newValue: 'linkedin.com/company/hubspot',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(150, 14)), timestamp: ago(150, 14),
  },
  {
    id: 'log-hs-3', contactId: 'org-3', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'Active Client',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(178, 13, 5)), timestamp: ago(178, 13, 5),
  },

  // org-4 · Dow Jones — renewal + reqs
  {
    id: 'log-dj-1', contactId: 'org-4', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Renewal terms in — board decides Tuesday',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 7, 30)), timestamp: ago(0, 7, 30),
  },
  {
    id: 'log-dj-2', contactId: 'org-4', eventType: 'entry_added', category: 'entry',
    field: 'Identifier', action: 'added',
    newValue: 'DUNS 01-234-5678',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(180, 13)), timestamp: ago(180, 13),
  },
  {
    id: 'log-dj-3', contactId: 'org-4', eventType: 'industry_change', category: 'field',
    field: 'Industry', action: 'added',
    newValue: '51912 — Internet Publishing and Broadcasting',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(220, 11)), timestamp: ago(220, 11),
  },
  {
    id: 'log-dj-4', contactId: 'org-4', eventType: 'entry_removed', category: 'entry',
    field: 'Email', action: 'removed',
    oldValue: 'hr@dj-old-domain.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(300, 10)), timestamp: ago(300, 10),
  },

  // org-1 · Fidelity — additional deep history
  {
    id: 'log-fid-1', contactId: 'org-1', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Q1 QBR completed — 3 placements, cycle time down 18%',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(21, 11)), timestamp: ago(21, 11),
  },
  {
    id: 'log-fid-2', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Identifier', action: 'added',
    newValue: 'EIN 04-1590477',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(50, 13)), timestamp: ago(50, 13),
  },
  {
    id: 'log-fid-3', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Address', action: 'added',
    newValue: '900 Salem Street, Smithfield, RI 02917',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(180, 14)), timestamp: ago(180, 14),
  },
  {
    id: 'log-fid-4', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Employees', action: 'updated',
    oldValue: '5,000-10,000', newValue: '10,000+',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(250, 10)), timestamp: ago(250, 10),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// BULK ACTIVITY LOG (generator-based)
//
// Every bulk contact gets 2-3 activity entries derived from its seed
// metadata. This gives the Activity Log real density across the full
// rolodex — not just the 10 core story contacts — so year-view groupings
// and icon variety continue to look populated when Paul clicks into any
// of the 104 bulk contacts.
//
// The `CandidateSeed.stage` field drives a plausible status-change
// timeline (sourced → screened → submitted → interview → placed) with
// each transition getting its own log row. That mirrors how HubSpot's
// "lifecycle stage changed" events stack up in the activity timeline and
// gives the demo a rich candidate-journey view.
// ──────────────────────────────────────────────────────────────────────────

const PAUL = { author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6' } as const;
const SYSTEM = { author: 'System', authorInitials: 'SY', authorColor: '#94A3B8' } as const;

/** Stage → list of sequential status transitions with relative day offsets.
 * Offsets are measured BACKWARD from `daysSinceUpdate` — i.e. how far
 * before the contact's current lastUpdated stamp the transition happened.
 * A placed candidate, for example, has a longer journey than a sourced
 * one, so we walk further back to show the full path. */
const STAGE_PATH: Record<NonNullable<CandidateSeed['stage']>, Array<{ old: string; new: string; daysBefore: number }>> = {
  sourced: [
    { old: '', new: 'Prospect', daysBefore: 30 },
  ],
  screened: [
    { old: '', new: 'Prospect', daysBefore: 14 },
    { old: 'Prospect', new: 'Screened', daysBefore: 7 },
  ],
  submitted: [
    { old: '', new: 'Prospect', daysBefore: 21 },
    { old: 'Prospect', new: 'Screened', daysBefore: 14 },
    { old: 'Screened', new: 'Submitted', daysBefore: 3 },
  ],
  interview: [
    { old: '', new: 'Prospect', daysBefore: 28 },
    { old: 'Prospect', new: 'Screened', daysBefore: 18 },
    { old: 'Screened', new: 'Submitted', daysBefore: 9 },
    { old: 'Submitted', new: 'Interview', daysBefore: 2 },
  ],
  placed: [
    { old: '', new: 'Prospect', daysBefore: 60 },
    { old: 'Prospect', new: 'Screened', daysBefore: 45 },
    { old: 'Screened', new: 'Submitted', daysBefore: 30 },
    { old: 'Submitted', new: 'Interview', daysBefore: 18 },
    { old: 'Interview', new: 'Placed', daysBefore: 7 },
  ],
  'not-a-fit': [
    { old: '', new: 'Prospect', daysBefore: 10 },
    { old: 'Prospect', new: 'Not a fit', daysBefore: 2 },
  ],
};

const candidateActivity = (c: CandidateSeed): ActivityLogEntry[] => {
  const rows: ActivityLogEntry[] = [];
  const anchor = c.daysSinceUpdate;

  // contact_created — earliest event in the timeline for this contact
  const path = STAGE_PATH[c.stage ?? 'sourced'];
  const oldestOffset = path[0].daysBefore;
  rows.push({
    id: `log-bulk-${c.id}-created`,
    contactId: c.id,
    eventType: 'contact_created',
    category: 'field',
    field: 'Contact',
    action: 'created',
    newValue: c.name,
    ...PAUL,
    createdAt: fmt(ago(anchor + oldestOffset + 1, 9)),
    timestamp: ago(anchor + oldestOffset + 1, 9),
  });

  // Status transitions per stage
  path.forEach((step, i) => {
    rows.push({
      id: `log-bulk-${c.id}-stage-${i}`,
      contactId: c.id,
      eventType: 'status_change',
      category: 'status',
      field: 'Status',
      action: 'updated',
      oldValue: step.old || undefined,
      newValue: step.new,
      ...PAUL,
      createdAt: fmt(ago(anchor + step.daysBefore, 14)),
      timestamp: ago(anchor + step.daysBefore, 14),
    });
  });

  // Recent field update — mirrors a light edit just before lastUpdated
  // stamp so the top-of-timeline row matches what's on the contact card.
  rows.push({
    id: `log-bulk-${c.id}-recent`,
    contactId: c.id,
    eventType: 'field_update',
    category: 'field',
    field: anchor <= 3 ? 'Phone Number' : 'Title',
    action: 'updated',
    oldValue: anchor <= 3 ? `+1 ${c.phoneArea} 555 0000` : '',
    newValue: anchor <= 3 ? `+1 ${c.phoneArea} 555 0${(100 + anchor).toString().padStart(3, '0')}` : c.title,
    ...PAUL,
    createdAt: fmt(ago(anchor, 11)),
    timestamp: ago(anchor, 11),
  });

  return rows;
};

const hmActivity = (hm: HMSeed): ActivityLogEntry[] => {
  const rows: ActivityLogEntry[] = [];
  const anchor = hm.daysSinceUpdate;
  const isVIP = hm.tags?.includes('VIP');
  const isClient = hm.tags?.includes('Client') || isVIP;

  rows.push({
    id: `log-bulk-${hm.id}-created`,
    contactId: hm.id,
    eventType: 'contact_created',
    category: 'field',
    field: 'Contact',
    action: 'created',
    newValue: hm.name,
    ...PAUL,
    createdAt: fmt(ago(anchor + 45, 10)),
    timestamp: ago(anchor + 45, 10),
  });

  if (isClient) {
    rows.push({
      id: `log-bulk-${hm.id}-tag`,
      contactId: hm.id,
      eventType: 'tag_change',
      category: 'status',
      field: 'Tag',
      action: 'added',
      newValue: isVIP ? 'VIP' : 'Client',
      ...PAUL,
      createdAt: fmt(ago(anchor + 14, 13)),
      timestamp: ago(anchor + 14, 13),
    });
  }

  rows.push({
    id: `log-bulk-${hm.id}-org`,
    contactId: hm.id,
    eventType: 'relationship_change',
    category: 'relationship',
    field: 'Organization',
    action: 'updated',
    newValue: hm.orgName,
    ...PAUL,
    createdAt: fmt(ago(anchor + 7, 15)),
    timestamp: ago(anchor + 7, 15),
  });

  return rows;
};

const orgActivity = (orgId: string, orgName: string, industry: string, daysSince: number): ActivityLogEntry[] => {
  const rows: ActivityLogEntry[] = [];

  rows.push({
    id: `log-bulk-${orgId}-created`,
    contactId: orgId,
    eventType: 'contact_created',
    category: 'field',
    field: 'Contact',
    action: 'created',
    newValue: orgName,
    ...PAUL,
    createdAt: fmt(ago(daysSince + 90, 9)),
    timestamp: ago(daysSince + 90, 9),
  });

  rows.push({
    id: `log-bulk-${orgId}-industry`,
    contactId: orgId,
    eventType: 'industry_change',
    category: 'field',
    field: 'Industry',
    action: 'updated',
    newValue: industry,
    ...PAUL,
    createdAt: fmt(ago(daysSince + 60, 11)),
    timestamp: ago(daysSince + 60, 11),
  });

  rows.push({
    id: `log-bulk-${orgId}-stale`,
    contactId: orgId,
    eventType: 'status_change',
    category: 'status',
    field: 'Status',
    action: 'updated',
    oldValue: 'Active',
    newValue: daysSince > 30 ? 'Stale' : 'Active',
    ...(daysSince > 30 ? SYSTEM : PAUL),
    createdAt: fmt(ago(Math.max(daysSince - 2, 1), 16)),
    timestamp: ago(Math.max(daysSince - 2, 1), 16),
  });

  return rows;
};

const BULK_ACTIVITY_LOG: ActivityLogEntry[] = [
  ...CANDIDATE_SEEDS.flatMap(candidateActivity),
  ...HM_SEEDS.flatMap(hmActivity),
  ...BULK_ORGS.flatMap((o) => {
    const daysSince = Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(o.lastUpdated).getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    return orgActivity(
      o.id,
      o.name,
      ('industry' in o ? o.industry : undefined) ?? 'Business Services',
      daysSince,
    );
  }),
];

export const SEED_ACTIVITY_LOG: ActivityLogEntry[] = [
  ...CORE_ACTIVITY_LOG,
  ...BULK_ACTIVITY_LOG,
];
