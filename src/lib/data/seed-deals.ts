import { Deal } from '@/types/deal';

/**
 * Demo seed data. Each deal is a sales opportunity in the Roadrunner CRM
 * pipeline. Deals are typed:
 *   - `company`  — a prospective client org with a (usually named) project
 *                  or initiative driving the opportunity
 *   - `person`   — an individual contact. May or may not have a current
 *                  employer attached.
 * Stages are the standard B2B progression:
 *   Lead → Qualified → Discovery → Proposal → Negotiation → Closed Won / Lost
 */

export const SEED_DEALS: Deal[] = [
  {
    id: 'deal-1', name: 'Vertex — Sr. Data Scientist (retained)',
    type: 'company',
    personContactId: 'per-2', orgContactId: 'org-2',
    stage: 'negotiation', amount: 65000, probability: 75,
    expectedCloseDate: '2026-05-30', source: 'Inbound', priority: 'high',
    lastCommunication: { type: 'Phone Call', date: '2026-04-08' },
    owner: 'Paul Wentzell',
    initiative: 'Q2 Data Science hire — Sr. IC role to replace departing lead',
    targetStartDate: '2026-06-01',
    notes: 'Final candidate accepted verbal. Marcus negotiating start date and sign-on bonus.',
    createdAt: '2026-01-12', lastUpdated: '2026-04-08',
  },
  {
    id: 'deal-2', name: 'Meridian — VP Compliance search',
    type: 'company',
    personContactId: 'per-4', orgContactId: 'org-1',
    stage: 'proposal', amount: 92000, probability: 55,
    expectedCloseDate: '2026-06-15', source: 'Referral', priority: 'high',
    lastCommunication: { type: 'Slate Sent', date: '2026-04-02' },
    owner: 'Paul Wentzell',
    initiative: 'VP Compliance — net-new leadership role for new regulatory program',
    targetStartDate: '2026-07-01',
    notes: 'Slate of 4 candidates sent to Tom 04/02. Two interviews scheduled.',
    createdAt: '2026-02-04', lastUpdated: '2026-04-02',
  },
  {
    id: 'deal-3', name: 'Clearpath — 3 Investment Analysts (contingent)',
    type: 'company',
    personContactId: 'per-3', orgContactId: 'org-3',
    stage: 'discovery', amount: 78000, probability: 35,
    expectedCloseDate: '2026-07-20', source: 'Outbound', priority: 'medium',
    lastCommunication: { type: 'Intake', date: '2026-04-09' },
    owner: 'Paul Wentzell',
    // initiative intentionally missing — demo incomplete state (~91%)
    notes: 'Diana confirmed reqs. Sourcing kicked off — first slate due in 2 weeks.',
    createdAt: '2026-03-10', lastUpdated: '2026-04-09',
  },
  {
    id: 'deal-4', name: 'Harborline — Director of Risk',
    type: 'company',
    personContactId: 'per-6', orgContactId: 'org-4',
    stage: 'qualified', amount: 55000, probability: 30,
    expectedCloseDate: '2026-08-01', source: 'Event', priority: 'medium',
    lastCommunication: { type: 'Email', date: '2026-04-05' },
    owner: 'Paul Wentzell',
    initiative: 'Director of Risk — first senior risk hire post-Series C',
    notes: 'Met at Fintech Summit. Search agreement signed last week.',
    createdAt: '2026-03-22', lastUpdated: '2026-04-05',
  },
  {
    id: 'deal-5', name: 'Vertex — Junior Analyst (contingent)',
    type: 'company',
    personContactId: 'per-5', orgContactId: 'org-2',
    stage: 'qualified', amount: 22000, probability: 40,
    // expectedCloseDate + source intentionally missing — demo ~82% state
    expectedCloseDate: '', source: '' as unknown as Deal['source'], priority: 'low',
    lastCommunication: { type: 'Email', date: '2026-04-10' },
    owner: 'Paul Wentzell',
    initiative: 'Jr. Analyst backfill',
    notes: 'Lisa needs 1 hire by end of Q2. Backfill for departing analyst.',
    createdAt: '2026-03-28', lastUpdated: '2026-04-10',
  },
  {
    id: 'deal-6', name: 'Meridian — RPO advisor program (12 hires)',
    type: 'company',
    personContactId: 'per-1', orgContactId: 'org-1',
    // Sarah Chen is the client contact at Meridian for this engagement
    stage: 'proposal', amount: 145000, probability: 60,
    expectedCloseDate: '2026-05-22', source: 'Inbound', priority: 'high',
    lastCommunication: { type: 'Meeting', date: '2026-04-11' },
    owner: 'Paul Wentzell',
    initiative: '12-seat advisor rollout — 6-month RPO engagement',
    targetStartDate: '2026-05-15',
    notes: 'Sarah pushing for May rollout. 12 advisor seats — 6-month RPO engagement.',
    createdAt: '2026-02-19', lastUpdated: '2026-04-11',
  },
  {
    id: 'deal-7', name: 'Clearpath — onboarding cohort pilot',
    type: 'company',
    personContactId: 'per-3', orgContactId: 'org-3',
    stage: 'lead', amount: 18000, probability: 15,
    expectedCloseDate: '2026-09-15', source: 'Marketing', priority: 'low',
    lastCommunication: { type: 'Email', date: '2026-04-01' },
    owner: 'Paul Wentzell',
    notes: 'Webinar signup. Early stage — qualification call needed to confirm req count.',
    createdAt: '2026-04-01', lastUpdated: '2026-04-01',
  },
  {
    id: 'deal-8', name: 'Harborline — exploratory advisor search',
    type: 'company',
    personContactId: 'per-6', orgContactId: 'org-4',
    stage: 'lead', amount: 28000, probability: 10,
    expectedCloseDate: '2026-08-30', source: 'Outbound', priority: 'low',
    lastCommunication: { type: 'Left Message', date: '2026-04-05' },
    owner: 'Paul Wentzell',
    notes: 'Cold outreach reply — interest in an advisory role. No req yet.',
    createdAt: '2026-04-05', lastUpdated: '2026-04-05',
  },
  {
    id: 'deal-9', name: 'Vertex — Head of Engineering (placed)',
    type: 'company',
    personContactId: 'per-2', orgContactId: 'org-2',
    stage: 'closed-won', amount: 88000, probability: 100,
    expectedCloseDate: '2026-01-31', source: 'Inbound', priority: 'medium',
    lastCommunication: { type: 'Phone Call', date: '2026-01-31' },
    owner: 'Paul Wentzell',
    initiative: 'Head of Engineering — first exec hire',
    notes: 'First deal that opened the Vertex relationship. Candidate started 02/03.',
    createdAt: '2025-11-08', lastUpdated: '2026-01-31',
    closedAt: '2026-01-31',
  },
  {
    id: 'deal-10', name: 'Meridian — Chief of Staff search',
    type: 'company',
    personContactId: 'per-4', orgContactId: 'org-1',
    stage: 'closed-lost', amount: 75000, probability: 0,
    expectedCloseDate: '2026-03-15', source: 'Partner', priority: 'medium',
    lastCommunication: { type: 'Email', date: '2026-03-18' },
    owner: 'Paul Wentzell',
    notes: 'Lost to incumbent agency on fee structure.',
    createdAt: '2025-12-01', lastUpdated: '2026-03-18',
    closedAt: '2026-03-18',
    lostReason: 'Fee — competitor offered 20% lower contingency rate.',
  },

  // --- Person-first leads ---
  {
    id: 'deal-11', name: 'Alex Rivera — open to new role',
    type: 'person',
    personContactId: 'per-7',
    // No orgContactId — candidate is currently between roles
    stage: 'qualified', amount: 35000, probability: 45,
    expectedCloseDate: '2026-07-01', source: 'Referral', priority: 'medium',
    lastCommunication: { type: 'Meeting', date: '2026-04-12' },
    owner: 'Paul Wentzell',
    notes: 'Strong candidate between roles. Targeting staff-level IC opportunities.',
    createdAt: '2026-04-02', lastUpdated: '2026-04-12',
  },
  {
    id: 'deal-12', name: 'Priya Shah — passive candidate',
    type: 'person',
    personContactId: 'per-8', orgContactId: 'org-3',
    stage: 'lead', amount: 42000, probability: 20,
    // source + owner intentionally missing — demo ~80% state for a person lead
    expectedCloseDate: '2026-09-01', source: '' as unknown as Deal['source'], priority: 'low',
    lastCommunication: { type: 'Email', date: '2026-04-07' },
    owner: '',
    notes: 'Senior analyst at Clearpath. Exploring — no active search.',
    createdAt: '2026-04-07', lastUpdated: '2026-04-07',
  },

  // --- Freshly-created leads with minimal info (expected to show low completeness) ---
  {
    id: 'deal-13', name: 'Inbound inquiry — widget integration',
    type: 'company',
    // No org linked yet, no contact, no initiative — brand new inquiry
    stage: 'lead', amount: 0, probability: 5,
    expectedCloseDate: '', source: 'Inbound', priority: 'low',
    owner: 'Paul Wentzell',
    notes: 'Contact form submission — waiting on discovery call.',
    createdAt: '2026-04-14', lastUpdated: '2026-04-14',
  },
  {
    id: 'deal-14', name: 'Cold outbound candidate',
    type: 'person',
    // No person linked yet — just a name on a list
    stage: 'lead', amount: 0, probability: 5,
    expectedCloseDate: '', source: 'Outbound', priority: 'low',
    owner: 'Paul Wentzell',
    notes: 'From sourcing list. Not yet contacted.',
    createdAt: '2026-04-14', lastUpdated: '2026-04-14',
  },
  // ── Engagement-distribution deals (added 2026-04-30) ─────────────
  // Spreads `hasActiveDeal` across more person contacts so the Quality
  // Score engine's +10 active-deal rule fires on a credible portion of
  // the contact base — pushes top-of-distribution senior+large-company
  // contacts from 60-65 into the 75-100 high band. Stages chosen from
  // the active set (lead/qualified/discovery/proposal/negotiation) so
  // they all count as "active" in the engine's check.
  ...([
    ['deal-30', 'per-9',  'org-5',  'lead',        45000, 'Mass General Brigham — Director of Nursing search'],
    ['deal-31', 'per-10', 'org-5',  'qualified',   58000, 'MGH — Clinical Research Director'],
    ['deal-32', 'per-13', 'org-7',  'discovery',   72000, 'Pfizer — Senior Director, Regulatory Affairs'],
    ['deal-33', 'per-14', 'org-7',  'proposal',    65000, 'Pfizer — VP Clinical Operations'],
    ['deal-34', 'per-17', 'org-9',  'lead',        88000, 'Anthropic — Engineering Director (Safety)'],
    ['deal-35', 'per-18', 'org-9',  'qualified',   95000, 'Anthropic — Director of Product, API'],
    ['deal-36', 'per-19', 'org-10', 'negotiation', 70000, 'Snowflake — Senior Engineering Manager'],
    ['deal-37', 'per-21', 'org-11', 'discovery',   62000, 'Datadog — Director of Observability Eng'],
    ['deal-38', 'per-23', 'org-12', 'proposal',    75000, 'Figma — Senior Product Designer Lead'],
    ['deal-39', 'per-25', 'org-13', 'lead',       105000, 'Goldman Sachs — VP, Equity Capital Markets'],
    ['deal-40', 'per-26', 'org-13', 'qualified',   98000, 'Goldman Sachs — Director, FICC Sales'],
    ['deal-41', 'per-27', 'org-14', 'discovery',   85000, 'BlackRock — Senior PM, Aladdin Engineering'],
    ['deal-42', 'per-28', 'org-14', 'proposal',    78000, 'BlackRock — Director of Risk Analytics'],
    ['deal-43', 'per-29', 'org-19', 'lead',        82000, 'Boeing — Senior Manager, Cleared Talent'],
    ['deal-44', 'per-31', 'org-21', 'qualified',   55000, 'Meridian Capital — VP People Operations'],
    ['deal-45', 'per-32', 'org-15', 'discovery',   68000, 'Schwab — Director, Wealth Advisor Tech'],
    ['deal-46', 'per-33', 'org-16', 'lead',        90000, 'Sidley Austin — Lateral Partner search'],
    ['deal-47', 'per-34', 'org-17', 'qualified',   88000, 'Kirkland & Ellis — Paralegal Manager'],
    ['deal-48', 'per-35', 'org-18', 'discovery',   60000, 'Caterpillar — Director, Skilled Trades Recruiting'],
    ['deal-49', 'per-36', 'org-6',  'proposal',    72000, 'Moderna — Senior Director, Clinical Eng'],
    ['deal-50', 'per-37', 'org-8',  'lead',        58000, 'Medtronic — Director, Devices Manufacturing'],
    ['deal-51', 'per-38', 'org-20', 'qualified',   45000, 'Vertex Analytics — Director of Engineering'],
    ['deal-52', 'per-39', 'org-2',  'discovery',   65000, 'Stripe — Senior Engineering Manager, Payouts'],
    ['deal-53', 'per-40', 'org-4',  'proposal',    52000, 'Dow Jones — Director of Editorial Tech'],
    ['deal-54', 'per-41', 'org-3',  'lead',        48000, 'HubSpot — Sr. Product Marketing Manager'],
  ] as const).map(([id, personId, orgId, stage, amount, name]): Deal => ({
    id,
    name,
    type: 'company',
    personContactId: personId,
    orgContactId: orgId,
    stage: stage as Deal['stage'],
    amount,
    probability: 50,
    expectedCloseDate: '2026-06-30',
    source: 'Outbound' as Deal['source'],
    priority: 'medium' as Deal['priority'],
    owner: 'Paul Wentzell',
    createdAt: '2026-04-15',
    lastUpdated: '2026-04-25',
  })),
];
