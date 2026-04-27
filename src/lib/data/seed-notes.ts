import { Note } from '@/types/note';
import { BULK_NOTES } from './seed-notes-bulk';

/**
 * Realistic, business-type-appropriate notes for the seed contacts.
 * Dates sit in the weeks leading up to "today" (2026-04-22) so the
 * Activity feed looks like an in-progress account, not archived.
 */
const CORE_NOTES: Note[] = [
  // Fidelity Investments (org-1) — Investment Management
  {
    id: 'n1', contactId: 'org-1', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: true,
    body: 'Q2 retirement-plan consolidation kickoff locked in for May 5. Procurement signed off on SOC 2 Type II attestation; legal review cleared the MSA redlines. Waiting on their implementation team to name a PM before we publish the project charter.',
    tags: ['Meeting', 'High Priority'], noteType: 'Sales', createdAt: 'Apr 18, 2026 9:15 AM',
  },
  {
    id: 'n2', contactId: 'org-1', author: 'Dexter Howell', authorInitials: 'DH',
    authorColor: '#3BAFC4', location: 'Portsmouth Branch', pinned: false,
    body: 'Spoke with Sarah Chen re: their 401(k) record-keeper transition. They\'re consolidating three legacy vendors onto one platform by end of year. Implementation services team has capacity in the June-July window if we move now.',
    tags: ['Phone Call'], noteType: 'Sales', createdAt: 'Apr 15, 2026 2:40 PM',
  },
  {
    id: 'n3', contactId: 'org-1', author: 'Janet Parker', authorInitials: 'JP',
    authorColor: '#6A0FB8', location: 'ESI Boston', pinned: false,
    body: 'Tom Nakamura (Compliance) flagged that our DEI reporting export needs to pull from their Workday instance, not the CSV drop they offered originally. His team committed to standing up a Workday integration endpoint — ETA 2 weeks.',
    tags: ['Email'], noteType: 'Support', createdAt: 'Apr 10, 2026 11:00 AM',
  },

  // Stripe (org-2) — Payments / Software
  {
    id: 'n4', contactId: 'org-2', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: true,
    body: 'Demo\'d webhook replay + idempotency-key tooling to Marcus Webb\'s platform engineering team. They\'re evaluating buy vs. build. Decision expected end of April. Lisa is pulling current API volume — last quote was ~2.1B requests/month.',
    tags: ['Meeting', 'High Priority'], noteType: 'Sales', createdAt: 'Apr 17, 2026 3:20 PM',
  },
  {
    id: 'n5', contactId: 'org-2', author: 'Antonia Hopkins', authorInitials: 'AH',
    authorColor: '#D96FA8', location: 'ESI East', pinned: false,
    body: 'Lisa Park sent over current payment-search workload numbers. They\'re exploring a move off Elasticsearch due to licensing + cluster overhead. Our OpenSearch integration roadmap aligns — flagged for next product sync.',
    tags: ['Email'], noteType: 'Follow-up', createdAt: 'Apr 11, 2026 10:05 AM',
  },
  {
    id: 'n6', contactId: 'org-2', author: 'Janet Parker', authorInitials: 'JP',
    authorColor: '#6A0FB8', location: 'ESI Boston', pinned: false,
    body: 'Security review kickoff with their InfoSec lead. They require annual SOC 2 re-attestation plus a signed DPA before any production traffic can hit our endpoints. Current report is from Q1 2025 — need the refreshed one.',
    tags: ['Meeting'], noteType: 'Support', createdAt: 'Apr 3, 2026 1:30 PM',
  },

  // HubSpot (org-3) — Marketing Software
  {
    id: 'n7', contactId: 'org-3', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: true,
    body: 'Renewal conversation scheduled for June 15. Current ARR is $240K. Diana wants to pilot 25 additional seats in their Customer Success org — expansion path looks clean if we can show Q1 adoption metrics from her team\'s existing seats.',
    tags: ['High Priority'], noteType: 'Sales', createdAt: 'Apr 16, 2026 4:00 PM',
  },
  {
    id: 'n8', contactId: 'org-3', author: 'Dexter Howell', authorInitials: 'DH',
    authorColor: '#3BAFC4', location: 'Portsmouth Branch', pinned: false,
    body: 'Priya Shah\'s team published a case study on their migration off Marketo. She\'s open to being a reference customer for similar opportunities. Coordinate with marketing by May 1 — they want dual approval before the quote goes live.',
    tags: ['Email'], noteType: 'General', createdAt: 'Apr 9, 2026 9:45 AM',
  },
  {
    id: 'n9', contactId: 'org-3', author: 'Mercedes Paul', authorInitials: 'MP',
    authorColor: '#247A8A', location: 'ESI Boston', pinned: false,
    body: 'Their procurement team flagged that our latest SOC 2 Type II needs to be resigned before the June renewal paperwork moves. Forwarded to legal — they\'ll return the refreshed attestation letter this week.',
    tags: ['Investigate'], noteType: 'Support', createdAt: 'Apr 6, 2026 2:15 PM',
  },

  // Dow Jones (org-4) — Business News & Information
  {
    id: 'n10', contactId: 'org-4', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: true,
    body: 'Vendor onboarding packet (W-9, COI, SOC 2) due back to their AP team by April 30 — otherwise Q2 spend doesn\'t clear. James Harford flagged that the onboarding portal is down this week, emailed docs directly to his coordinator as a workaround.',
    tags: ['High Priority'], noteType: 'Follow-up', createdAt: 'Apr 19, 2026 10:30 AM',
  },
  {
    id: 'n11', contactId: 'org-4', author: 'Dexter Howell', authorInitials: 'DH',
    authorColor: '#3BAFC4', location: 'Portsmouth Branch', pinned: false,
    body: 'James Harford confirmed they\'re hiring 40 editorial data analysts across Q2-Q3. Our staffing desk has first look on 12 roles based in NYC and Princeton — need JD alignment by end of month so we can source in parallel with their internal pipeline.',
    tags: ['Phone Call'], noteType: 'Sales', createdAt: 'Apr 14, 2026 11:20 AM',
  },
  {
    id: 'n12', contactId: 'org-4', author: 'Janet Parker', authorInitials: 'JP',
    authorColor: '#6A0FB8', location: 'ESI Boston', pinned: false,
    body: 'Licensing inquiry from their WSJ Pro team — they\'re sunsetting an older content feed and consolidating vendors. Our news API rate tiers are being evaluated alongside two others. Tech eval expected to run 4-6 weeks.',
    tags: ['Email'], noteType: 'General', createdAt: 'Apr 2, 2026 3:45 PM',
  },

  // Sarah Chen (per-1) — VP Ops @ Fidelity
  {
    id: 'n13', contactId: 'per-1', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: false,
    body: 'Sarah circled back on the rebalancing demo — positive reception. Wants pricing for a 50-seat rollout in Ops by end of week. Asked us to include the compliance audit log feature in the quote, not the standalone add-on.',
    tags: ['Email'], noteType: 'Sales', createdAt: 'Apr 18, 2026 5:10 PM',
  },
  {
    id: 'n14', contactId: 'per-1', author: 'Antonia Hopkins', authorInitials: 'AH',
    authorColor: '#D96FA8', location: 'ESI East', pinned: false,
    body: 'Sarah mentioned their internal dashboard tool is being deprecated mid-year — opens a door for the reporting module if we can hit the June timeline. She offered to intro us to her counterpart in Wealth Management.',
    tags: ['Phone Call'], noteType: 'Follow-up', createdAt: 'Apr 11, 2026 9:00 AM',
  },

  // Marcus Webb (per-2) — Eng Manager @ Stripe
  {
    id: 'n15', contactId: 'per-2', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: false,
    body: 'Marcus is back from paternity leave. Picking up the Kafka migration conversation where we left off in February — he wants an updated RFP response now that their team size has doubled.',
    tags: ['Phone Call'], noteType: 'General', createdAt: 'Apr 8, 2026 1:15 PM',
  },

  // Diana Reyes (per-3) — Dir CS @ HubSpot
  {
    id: 'n16', contactId: 'per-3', author: 'Mercedes Paul', authorInitials: 'MP',
    authorColor: '#247A8A', location: 'ESI Boston', pinned: false,
    body: 'Diana pitched using us as a back-office replacement for their Zendesk workflow. Won\'t move on it until the Q3 planning cycle, but flagged to watch — she controls the vendor budget for Customer Success tooling.',
    tags: ['Meeting'], noteType: 'Sales', createdAt: 'Apr 5, 2026 10:45 AM',
  },

  // Tom Nakamura (per-4) — Compliance @ Fidelity
  {
    id: 'n17', contactId: 'per-4', author: 'Janet Parker', authorInitials: 'JP',
    authorColor: '#6A0FB8', location: 'ESI Boston', pinned: false,
    body: 'Tom approved the updated data-processing addendum. His team will need a 2-week window to wire the Workday integration before we can cut over from CSV drops. Target cutover: early May.',
    tags: ['Email'], noteType: 'Support', createdAt: 'Apr 12, 2026 2:00 PM',
  },

  // Lisa Park (per-5) — Solutions Architect @ Stripe
  {
    id: 'n18', contactId: 'per-5', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: false,
    body: 'Lisa shared a sample architecture diagram for their payments-search migration. Uses OpenSearch + vector embeddings for fuzzy merchant matching. Asking if we can support 99.99% availability on the query layer — checking with infra.',
    tags: ['Instant Messaged'], noteType: 'General', createdAt: 'Apr 9, 2026 4:30 PM',
  },

  // James Harford (per-6) — Talent @ Dow Jones
  {
    id: 'n19', contactId: 'per-6', author: 'Dexter Howell', authorInitials: 'DH',
    authorColor: '#3BAFC4', location: 'Portsmouth Branch', pinned: false,
    body: 'James wants to batch the first 12 data-analyst JDs into a single sourcing package so his team only reviews one slate. Said he\'ll forward the standard Dow Jones editorial job template by end of week.',
    tags: ['Phone Call'], noteType: 'Sales', createdAt: 'Apr 15, 2026 11:50 AM',
  },

  // Alex Rivera (per-7) — Prospect, Staff Data Engineer
  {
    id: 'n20', contactId: 'per-7', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'Portsmouth Branch', pinned: false,
    body: 'Alex reached out via LinkedIn — open to a conversation about the Staff Data Engineer opening at Stripe. Current role is remote, flexible on comp. Scheduling an intro for next week.',
    tags: ['Cold Call'], noteType: 'Sales', createdAt: 'Apr 17, 2026 6:15 PM',
  },

  // Priya Shah (per-8) — Product Marketing @ HubSpot
  {
    id: 'n21', contactId: 'per-8', author: 'Mercedes Paul', authorInitials: 'MP',
    authorColor: '#247A8A', location: 'ESI Boston', pinned: false,
    body: 'Priya signed off on the reference-customer case study. Draft is with her legal team for a final scrub. She wants the published asset to go live the same week as their Q2 investor day — flagging May 8 as the earliest safe publish date.',
    tags: ['Email'], noteType: 'Follow-up', createdAt: 'Apr 13, 2026 3:00 PM',
  },
];

export const SEED_NOTES: Note[] = [...CORE_NOTES, ...BULK_NOTES];
