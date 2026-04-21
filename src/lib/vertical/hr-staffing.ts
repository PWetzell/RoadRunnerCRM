/**
 * HR Staffing vertical — terminology + pipeline configuration.
 *
 * The Sales section keeps its generic "Sales / Deal" labels. This file
 * provides the HR-specific overlays: Candidate vs Client labels on deals,
 * recruiting-stage names, and candidate sources. Future verticals
 * (real estate, consulting, executive search) can swap this module.
 *
 * Internal type names (Deal, DealStage, etc.) intentionally stay as-is so
 * the data model and store code are vertical-neutral.
 */

/**
 * Label map for the HR Staffing vertical. Every key here replaces a
 * hard-coded string that used to live in a component.
 */
export const LABELS = {
  // Nav + page titles
  navSales: 'Sales',
  pageSalesTitle: 'Sales',
  pageSalesSubtitle: 'Track deals from first contact to close',

  // Record nouns (singular / plural)
  deal: 'deal',
  deals: 'deals',
  Deal: 'Deal',
  Deals: 'Deals',

  // Who the deal represents
  personLead: 'Candidate',       // when deal.type === 'person'
  companyLead: 'Client',         // when deal.type === 'company'
  lead: 'candidate',
  Lead: 'Candidate',
  leads: 'candidates',
  Leads: 'Candidates',

  // Actions
  newDeal: 'New Deal',
  addDeal: 'Add Deal',
  newLeadPerson: 'Add Candidate',
  newLeadCompany: 'Add Client',

  // Pipeline / stage
  pipeline: 'Sales Pipeline',
  stage: 'Stage',

  // Empty states
  noDeals: 'No deals yet',
  noDealsHint: 'Start by adding a candidate or client.',
} as const;

/**
 * Pipeline stage labels for recruiting. The underlying `DealStage` enum is
 * unchanged — we just render these labels instead of the raw IDs.
 *
 * Mapping rationale (keyed by the existing `DealStage`):
 *   lead        → Sourced       (first contact, resume received)
 *   qualified   → Screened      (passed initial screen)
 *   proposal    → Submitted     (resume sent to client)
 *   negotiation → Interview     (client-side evaluation)
 *   closed-won  → Placed        (offer accepted, candidate starting)
 *   closed-lost → Not a fit     (rejected by either side)
 */
export const STAGE_LABELS: Record<string, string> = {
  'lead': 'Sourced',
  'qualified': 'Screened',
  'discovery': 'Submitted',
  'proposal': 'Client review',
  'negotiation': 'Interview',
  'closed-won': 'Placed',
  'closed-lost': 'Not a fit',
};

/** Short (kanban-column-friendly) version of the stage labels. */
export const STAGE_LABELS_SHORT: Record<string, string> = {
  'lead': 'Sourced',
  'qualified': 'Screened',
  'discovery': 'Submitted',
  'proposal': 'Review',
  'negotiation': 'Interview',
  'closed-won': 'Placed',
  'closed-lost': 'Not a fit',
};

/**
 * Recruiting-specific sources for where a candidate came from.
 * Replaces the generic DEAL_SOURCES list in the new-lead wizard.
 */
export const CANDIDATE_SOURCES = [
  'LinkedIn',
  'Indeed',
  'Referral',
  'Cold outreach',
  'Company website',
  'Career fair',
  'Internal database',
  'Other',
] as const;

export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

/**
 * Helper to label a deal for the UI. Picks Candidate vs Client based on
 * whether the deal is person-first or company-first.
 */
export function dealTypeLabel(type: 'person' | 'company'): string {
  return type === 'person' ? LABELS.personLead : LABELS.companyLead;
}

/**
 * Helper to render a stage label.
 */
export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] || stage;
}
