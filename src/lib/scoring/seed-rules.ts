import type { ScoringRule } from '@/types/scoring';

/**
 * Default rule set — fifteen rules across three categories. Rule weights
 * tuned to give a credible spread on the seeded staffing dataset:
 *
 *   • Profile Completeness — six rules at +5 each (max 30)
 *   • Firmographics — four rules totaling 30 max
 *   • Engagement — five rules including two negatives (range -25 to +35)
 *
 * `openedWithinDays` rule omitted: the deployed demo has no email-open
 * event source. The replied/contacted rules use sequence-store reply
 * status and contact.recentEmail.lastEmailAt respectively.
 *
 * Distribution target on the seed data: roughly credible spread across
 * 0-24 / 25-49 / 50-74 / 75-100 bands, ±10pp per band. Tuning happens
 * after the first dev-server preview, not in this constant.
 */
export const DEFAULT_RULES: ScoringRule[] = [
  // ── Profile Completeness — +30 max ──────────────────────────────────
  {
    id: 'rule-completeness-email',
    name: 'Has email',
    category: 'completeness',
    points: 5,
    active: true,
    condition: { kind: 'fieldPresent', field: 'email' },
  },
  {
    id: 'rule-completeness-phone',
    name: 'Has phone',
    category: 'completeness',
    points: 5,
    active: true,
    condition: { kind: 'fieldPresent', field: 'phone' },
  },
  {
    id: 'rule-completeness-title',
    name: 'Has job title',
    category: 'completeness',
    points: 5,
    active: true,
    condition: { kind: 'fieldPresent', field: 'title' },
  },
  {
    id: 'rule-completeness-company',
    name: 'Has company',
    category: 'completeness',
    points: 5,
    active: true,
    condition: { kind: 'fieldPresent', field: 'company' },
  },
  {
    id: 'rule-completeness-address',
    name: 'Has address',
    category: 'completeness',
    points: 5,
    active: true,
    condition: { kind: 'fieldPresent', field: 'address' },
  },
  {
    id: 'rule-completeness-tags',
    name: 'Has at least one tag',
    category: 'completeness',
    points: 5,
    active: true,
    condition: { kind: 'fieldPresent', field: 'tags' },
  },

  // ── Firmographics — +30 max ────────────────────────────────────────
  {
    id: 'rule-firm-senior-title',
    name: 'Senior title',
    category: 'firmographics',
    points: 10,
    active: true,
    condition: {
      kind: 'fieldContains',
      field: 'title',
      anyOf: ['VP', 'Vice President', 'Chief', 'Director', 'Head of', 'Senior'],
    },
  },
  {
    id: 'rule-firm-large-company',
    name: 'Large company',
    category: 'firmographics',
    points: 10,
    active: true,
    condition: { kind: 'companySizeGt', value: 100 },
  },
  {
    id: 'rule-firm-enterprise',
    name: 'Enterprise company',
    category: 'firmographics',
    points: 5,
    active: true,
    condition: { kind: 'companySizeGt', value: 1000 },
  },
  {
    id: 'rule-firm-target-industry',
    name: 'Target industry',
    category: 'firmographics',
    points: 5,
    active: true,
    condition: {
      // Engine does substring match (case-insensitive), so "Software"
      // matches "Marketing Software" / "Payments / Software";
      // "Investment" matches "Investment Management"; etc. Tokens
      // chosen to cover the seed orgs' actual industry strings while
      // staying conceptually meaningful (every entry below is a real
      // industry category, not just a string-match hack).
      kind: 'industryIn',
      values: [
        // Tech / SaaS
        'Software', 'SaaS', 'Technology', 'Artificial Intelligence', 'AI',
        'Data Platform', 'Data', 'Observability', 'Design',
        // Healthcare / Life Sciences
        'Healthcare', 'Biotech', 'Biotechnology', 'Pharma', 'Pharmaceutical',
        'Medical', 'Clinical',
        // Financial Services
        'Financial Services', 'Investment', 'Banking', 'Insurance', 'Payments',
        'Asset Management', 'Wealth', 'Brokerage', 'Equity',
        // Industrial high-margin verticals (Boeing, Caterpillar)
        'Aerospace', 'Manufacturing',
      ],
    },
  },

  // ── Engagement — −25 to +35 ────────────────────────────────────────
  {
    id: 'rule-eng-replied',
    name: 'Replied recently',
    category: 'engagement',
    points: 20,
    active: true,
    condition: { kind: 'repliedWithinDays', days: 30 },
  },
  {
    id: 'rule-eng-active-deal',
    name: 'Has active deal',
    category: 'engagement',
    points: 10,
    active: true,
    condition: { kind: 'hasActiveDeal' },
  },
  {
    id: 'rule-eng-contacted',
    name: 'Contacted recently',
    category: 'engagement',
    points: 5,
    active: true,
    condition: { kind: 'contactedWithinDays', days: 7 },
  },
  {
    id: 'rule-eng-stale',
    name: 'Stale',
    category: 'engagement',
    points: -10,
    active: true,
    condition: { kind: 'noActivityForDays', days: 60 },
  },
  {
    id: 'rule-eng-cold',
    name: 'Cold',
    category: 'engagement',
    points: -15,
    active: true,
    condition: { kind: 'noActivityForDays', days: 90 },
  },
];
