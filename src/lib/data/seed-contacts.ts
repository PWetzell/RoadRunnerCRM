import { ContactWithEntries } from '@/types/contact';
import { BULK_CONTACTS } from './seed-contacts-bulk';

/**
 * Seed data uses real, publicly-known companies and their published HQ
 * addresses so the Overview map pins to a real location. People, phone
 * numbers, and identifiers are still fabricated (fake 555 numbers, no
 * real EINs), but employers, emails, and office locations reflect the
 * real businesses.
 *
 * This file defines the original 12 "core story" contacts — the ones
 * notes, documents, and deals deep-reference. Bulk 2026 recruiter book-
 * of-business (additional 20+ orgs, 25 hiring managers, 80 candidates)
 * lives in `seed-contacts-bulk.ts` and is merged at the bottom.
 */
const CORE_CONTACTS: ContactWithEntries[] = [
  {
    id: 'org-1', type: 'org', name: 'Fidelity Investments', avatarColor: '#1955A6', industry: 'Investment Management',
    employees: '10,000+', hq: 'Boston, MA', website: 'fidelity.com',
    description: 'Multinational financial services firm offering investment management, retirement planning, brokerage, and wealth management for individual and institutional clients.',
    structure: 'Private', category: 'National',
    revenueVolume: { annual: 28000000000 },
    lastUpdated: '2026-04-08', status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Contacts Tag', 'Sales Tag'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [
        { id: 'a1', type: 'Headquarters', value: '245 Summer Street', city: 'Boston', state: 'MA', zip: '02210', primary: true },
        { id: 'a2', type: 'Regional Office', value: '900 Salem Street', city: 'Smithfield', state: 'RI', zip: '02917', primary: false },
      ],
      emails: [
        { id: 'e1', type: 'Work', value: 'institutional@fidelity.com', primary: true },
        { id: 'e2', type: 'Support', value: 'service@fidelity.com', primary: false },
      ],
      phones: [
        { id: 'p1', type: 'Office', value: '+1 (617) 563-7000', primary: true },
        { id: 'p2', type: 'Toll-Free', value: '+1 (800) 343-3548', primary: false },
      ],
      websites: [
        { id: 'w1', type: 'Primary', value: 'fidelity.com', primary: true },
        { id: 'w2', type: 'LinkedIn', value: 'linkedin.com/company/fidelity-investments', primary: false },
      ],
      names: [
        { id: 'cn1', type: 'Primary · Legal', value: 'FMR LLC', primary: true },
        { id: 'cn2', type: 'Doing Business As', value: 'Fidelity Investments', primary: false },
      ],
      identifiers: [
        { id: 'id1', type: 'Federal Tax ID (EIN)', authority: 'Internal Revenue Service (IRS)', value: '', primary: false },
        { id: 'id2', type: 'Federal Vendor ID (DUNS)', authority: 'System for Award Management (SAM)', value: '', primary: false },
      ],
      industries: [
        { id: 'ind1', code: '52393', name: 'Investment Advice', primary: true },
        { id: 'ind2', code: '52312', name: 'Securities Brokerage', primary: false },
      ],
    },
  },
  {
    id: 'org-2', type: 'org', name: 'Stripe, Inc.', avatarColor: '#635BFF', industry: 'Payments / Software',
    employees: '5,000-10,000', hq: 'South San Francisco, CA', website: 'stripe.com',
    description: 'Financial infrastructure platform — payments, billing, identity verification, and embedded finance APIs used by millions of businesses worldwide.',
    structure: 'Private', category: 'Global',
    revenueVolume: { annual: 16200000000 },
    salesVolume: { annual: 14500000000 },
    products: [
      { id: 'prod-s1', type: 'Software (API)', description: 'Stripe Payments — online card processing' },
      { id: 'prod-s2', type: 'Software (API)', description: 'Stripe Connect — marketplace and platform payments' },
      { id: 'prod-s3', type: 'Software (SaaS)', description: 'Stripe Billing — subscription management' },
    ],
    lastUpdated: '2026-03-28', status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Sales Tag', 'VIP'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [
        { id: 'a1', type: 'Headquarters', value: '354 Oyster Point Boulevard', city: 'South San Francisco', state: 'CA', zip: '94080', primary: true },
      ],
      emails: [
        { id: 'e1', type: 'Work', value: 'sales@stripe.com', primary: true },
        { id: 'e2', type: 'Support', value: 'support@stripe.com', primary: false },
      ],
      phones: [
        { id: 'p1', type: 'Office', value: '+1 (888) 926-2289', primary: true },
      ],
      websites: [
        { id: 'w1', type: 'Primary', value: 'stripe.com', primary: true },
        { id: 'w2', type: 'LinkedIn', value: 'linkedin.com/company/stripe', primary: false },
      ],
      names: [
        { id: 'cn1', type: 'Primary · Legal', value: 'Stripe, Inc.', primary: true },
      ],
      identifiers: [
        { id: 'id1', type: 'Federal Tax ID (EIN)', authority: 'Internal Revenue Service (IRS)', value: '', primary: false },
      ],
      industries: [
        { id: 'ind1', code: '51321', name: 'Software Publishers', primary: true },
      ],
    },
  },
  {
    id: 'org-3', type: 'org', name: 'HubSpot, Inc.', avatarColor: '#FF7A59', industry: 'Marketing Software',
    employees: '5,000-10,000', hq: 'Cambridge, MA', website: 'hubspot.com',
    description: 'Customer platform with software, integrations, and resources for marketing, sales, customer service, CMS, and operations teams. Publicly traded on NYSE (HUBS).',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 2630000000, quarterly: 657500000 },
    lastUpdated: '2026-04-02', status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Sales Tag', 'Client'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [
        { id: 'a1', type: 'Headquarters', value: '2 Canal Park', city: 'Cambridge', state: 'MA', zip: '02141', primary: true },
      ],
      emails: [
        { id: 'e1', type: 'Work', value: 'sales@hubspot.com', primary: true },
      ],
      phones: [
        { id: 'p1', type: 'Office', value: '+1 (888) 482-7768', primary: true },
      ],
      websites: [
        { id: 'w1', type: 'Primary', value: 'hubspot.com', primary: true },
        { id: 'w2', type: 'LinkedIn', value: 'linkedin.com/company/hubspot', primary: false },
      ],
      names: [
        { id: 'cn1', type: 'Primary · Legal', value: 'HubSpot, Inc.', primary: true },
      ],
      identifiers: [
        { id: 'id1', type: 'Federal Tax ID (EIN)', authority: 'Internal Revenue Service (IRS)', value: '', primary: false },
      ],
      industries: [
        { id: 'ind1', code: '51321', name: 'Software Publishers', primary: true },
      ],
    },
  },
  {
    id: 'org-4', type: 'org', name: 'Dow Jones & Company', avatarColor: '#0B2F5C', industry: 'Business News & Information',
    employees: '5,000-10,000', hq: 'New York, NY', website: 'dowjones.com',
    description: 'Global provider of business and financial news and information — publisher of The Wall Street Journal, Barron\'s, MarketWatch, Dow Jones Newswires, and Factiva. Subsidiary of News Corp.',
    structure: 'Private', category: 'Global',
    revenueVolume: { annual: 2230000000 },
    lastUpdated: '2026-03-19', status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Contacts Tag', 'Vendor'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [
        { id: 'a1', type: 'Headquarters', value: '1211 Avenue of the Americas', city: 'New York', state: 'NY', zip: '10036', primary: true },
      ],
      emails: [
        { id: 'e1', type: 'Work', value: 'info@dowjones.com', primary: true },
      ],
      phones: [
        { id: 'p1', type: 'Office', value: '+1 (212) 416-2000', primary: true },
      ],
      websites: [
        { id: 'w1', type: 'Primary', value: 'dowjones.com', primary: true },
        { id: 'w2', type: 'LinkedIn', value: 'linkedin.com/company/dow-jones', primary: false },
      ],
      names: [
        { id: 'cn1', type: 'Primary · Legal', value: 'Dow Jones & Company, Inc.', primary: true },
      ],
      identifiers: [
        { id: 'id1', type: 'Federal Tax ID (EIN)', authority: 'Internal Revenue Service (IRS)', value: '', primary: false },
      ],
      industries: [
        { id: 'ind1', code: '51112', name: 'Periodical Publishers', primary: true },
      ],
    },
  },
  {
    id: 'per-1', type: 'person', name: 'Sarah Chen', avatarColor: '#047857', title: 'VP of Operations',
    orgId: 'org-1', orgName: 'Fidelity Investments', email: 's.chen@fidelity.com',
    phone: '+1 617 555 0142', department: 'Operations',
    lastUpdated: '2026-04-10', status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Contacts Tag'], assignedTo: 'Tom Coffee', isPrivate: true, visibleTo: ['Paul Wentzell', 'Janet Parker'], createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Home', value: '125 Beacon Street, Apt 4B', city: 'Boston', state: 'MA', zip: '02116', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 's.chen@fidelity.com', primary: true }, { id: 'e2', type: 'Personal', value: 'sarah.s.chen@gmail.com', primary: false }],
      phones: [{ id: 'p1', type: 'Mobile', value: '+1 617 555 0142', primary: true }, { id: 'p2', type: 'Office', value: '+1 (617) 563-7142', primary: false }],
      websites: [{ id: 'w1', type: 'LinkedIn', value: 'linkedin.com/in/sarah-chen-ops', primary: false }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Sarah Chen', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-2', type: 'person', name: 'Marcus Webb', avatarColor: '#C2410C', title: 'Engineering Manager, Payments Platform',
    orgId: 'org-2', orgName: 'Stripe, Inc.', email: 'm.webb@stripe.com',
    phone: '+1 415 555 0391', department: 'Engineering',
    lastUpdated: '2026-03-15', status: 'active', stale: false, aiStatus: 'verified',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Work', value: 'm.webb@stripe.com', primary: true }],
      phones: [{ id: 'p1', type: 'Mobile', value: '+1 415 555 0391', primary: true }],
      websites: [{ id: 'w1', type: 'LinkedIn', value: 'linkedin.com/in/marcus-webb-eng', primary: false }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Marcus Webb', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-3', type: 'person', name: 'Diana Reyes', avatarColor: '#6A0FB8', title: 'Director of Customer Success',
    orgId: 'org-3', orgName: 'HubSpot, Inc.', email: 'd.reyes@hubspot.com',
    phone: '+1 617 555 0278', department: 'Customer Success',
    lastUpdated: '2026-04-05', status: 'active', stale: false, aiStatus: 'verified',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Work', value: 'd.reyes@hubspot.com', primary: true }],
      phones: [{ id: 'p1', type: 'Mobile', value: '+1 617 555 0278', primary: true }],
      websites: [],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Diana Reyes', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-4', type: 'person', name: 'Tom Nakamura', avatarColor: '#0B2F5C', title: 'Director of Compliance',
    orgId: 'org-1', orgName: 'Fidelity Investments', email: 't.nakamura@fidelity.com',
    phone: '+1 617 555 0209', department: 'Compliance',
    lastUpdated: '2026-03-30', status: 'active', stale: false, aiStatus: 'verified',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Work', value: 't.nakamura@fidelity.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (617) 563-7209', primary: true }],
      websites: [],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Tom Nakamura', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-5', type: 'person', name: 'Lisa Park', avatarColor: '#9D174D', title: 'Senior Solutions Architect',
    orgId: 'org-2', orgName: 'Stripe, Inc.', email: 'l.park@stripe.com',
    phone: '+1 415 555 0157', department: 'Solutions Engineering',
    lastUpdated: '2026-03-22', status: 'active', stale: false, aiStatus: 'verified',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Work', value: 'l.park@stripe.com', primary: true }],
      phones: [{ id: 'p1', type: 'Mobile', value: '+1 415 555 0157', primary: true }],
      websites: [],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Lisa Park', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-6', type: 'person', name: 'James Harford', avatarColor: '#1D4ED8', title: 'Head of Talent Acquisition',
    orgId: 'org-4', orgName: 'Dow Jones & Company', email: 'j.harford@dowjones.com',
    phone: '+1 212 555 0183', department: 'Human Resources',
    lastUpdated: '2026-03-25', status: 'active', stale: false, aiStatus: 'verified',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Work', value: 'j.harford@dowjones.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (212) 416-2183', primary: true }],
      websites: [],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'James Harford', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-7', type: 'person', name: 'Alex Rivera', avatarColor: '#059669', title: 'Staff Data Engineer',
    email: 'alex.rivera@gmail.com',
    phone: '+1 415 555 0294', department: '',
    lastUpdated: '2026-04-12', status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Prospect'], assignedTo: 'Paul Wentzell',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Personal', value: 'alex.rivera@gmail.com', primary: true }],
      phones: [{ id: 'p1', type: 'Mobile', value: '+1 415 555 0294', primary: true }],
      websites: [{ id: 'w1', type: 'LinkedIn', value: 'linkedin.com/in/alexrivera', primary: false }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Alex Rivera', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
  {
    id: 'per-8', type: 'person', name: 'Priya Shah', avatarColor: '#D97706', title: 'Senior Product Marketing Manager',
    orgId: 'org-3', orgName: 'HubSpot, Inc.', email: 'p.shah@hubspot.com',
    phone: '+1 617 555 0344', department: 'Product Marketing',
    lastUpdated: '2026-04-07', status: 'active', stale: false, aiStatus: 'verified',
    entries: {
      addresses: [],
      emails: [{ id: 'e1', type: 'Work', value: 'p.shah@hubspot.com', primary: true }],
      phones: [{ id: 'p1', type: 'Mobile', value: '+1 617 555 0344', primary: true }],
      websites: [],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Priya Shah', primary: true }],
      identifiers: [],
      industries: [],
    },
  },
];

/** Full seed — original 12 story contacts merged with the 2026 bulk book. */
const RAW_SEED_CONTACTS: ContactWithEntries[] = [...CORE_CONTACTS, ...BULK_CONTACTS];

/**
 * Post-processor — applies an engagement-and-recency profile to person
 * contacts so the Quality Score engine (rule-eng-contacted /
 * rule-eng-stale / rule-eng-cold) fires on a credible spread.
 *
 * Without this, every seed contact has a recent `lastUpdated` and zero
 * `recentEmail.lastEmailAt`, which collapses the distribution into
 * a flat 25-35 cluster (no engagement signals can fire). Per Paul's
 * 2026-04-30 spec, the demo needs visible 0-24 / 25-49 / 50-74 / 75-100
 * spread so the score story reads.
 *
 * Profile assignment is deterministic per-index so reloads produce
 * the same distribution.
 *
 * Buckets, by index in the persons-only array:
 *   • 0-39   → Hot (recentEmail within 2-7 days)
 *   • 40-81  → As-is (default lastUpdated, no recent email)
 *   • 82-96  → Stale (lastUpdated 65-85 days ago, no recent email)
 *   • 97-111 → Cold (lastUpdated 95-125 days ago, plus stripped tags
 *              so completeness drops them into the 0-24 band)
 *
 * Stale bucket trimmed from 25 → 15 on 2026-04-30 to lift the
 * mid-band count above the 25% tolerance floor.
 *
 * Org-link augmentation (added 2026-04-30 evening):
 * Bulk candidates (per-33 onwards) are mostly orgId-less in the seed,
 * so all firmographic rules miss on them — they cluster around the
 * completeness floor of 25-35. Default `lastUpdated desc` sort puts
 * recent candidates at the TOP of the grid, which made the visible
 * grid look monotone (every visible row 25 or 35) even though the
 * 75-100 band had 13 contacts. Solution: link every other candidate
 * (skipping cold bucket) to one of the seed orgs via a deterministic
 * rotation. Each linked candidate inherits firmographic boost and
 * lands somewhere in 50-75 — spreads variety across the grid's
 * default sort order.
 */
function applyDistributionProfile(contacts: ContactWithEntries[]): ContactWithEntries[] {
  const NOW_MS = Date.now();
  const DAY_MS = 86_400_000;
  const daysAgoIso = (d: number) => new Date(NOW_MS - d * DAY_MS).toISOString();
  const setRecentEmail = (c: ContactWithEntries, daysAgo: number, attachmentCount = 0) => {
    // Match bulk-candidate convention: when a contact has attachments,
    // they're UNREAD. The grid's attachments-desc sort key is
    // `unreadAttached * 100000 + totalAttached`, so contacts whose
    // attachments are merely "read" rank far below contacts with
    // unread attachments. To put high scorers in the visible top tier,
    // their attachments must register as unread (green badge), not
    // read (gray badge).
    const unread = attachmentCount;
    c.recentEmail = {
      hasNew: unread > 0,
      hasAttachment: attachmentCount > 0,
      attachmentCount,
      newAttachmentCount: unread,
      unreadCount: unread,
      unreadAttachmentCount: unread,
      lastEmailAt: daysAgoIso(daysAgo),
    };
  };

  const persons = contacts.filter((c) => c.type === 'person');
  const total = persons.length;

  // Orgs we'll rotate through when linking candidates. Picked from the
  // mid-and-large-firm pool so linked candidates inherit a credible
  // firmographic boost (large company + enterprise + target industry).
  const orgs = contacts.filter((c) => c.type === 'org');
  const linkPool = orgs.filter((o) =>
    ['org-5', 'org-6', 'org-7', 'org-8', 'org-9', 'org-10', 'org-11', 'org-12',
     'org-13', 'org-14', 'org-15', 'org-18', 'org-19'].includes(o.id),
  );

  // Top-of-grid pinning. Contacts grid sorts by lastUpdated desc by
  // default; without intervention the bulk persons (per-43+) sort first
  // because their seed lastUpdated values are recent. We want the
  // 75-scoring contacts to be the first thing the user sees so the
  // score column shows GREEN at the top, not BLUE/ORANGE.
  //
  // The 14 IDs below are exactly the contacts that scored 75 in the
  // /api/debug/score-distribution snapshot after the org-link
  // augmentation landed: completeness +30, senior title +10, large
  // company +10, enterprise +5, target industry +5, contacted recently
  // +5 ⇒ (yes 75 is correct, the rule weights total 65 firmographic +
  // engagement floor; the +10 active-deal pushes the sub-floor up).
  const HIGH_SCORER_IDS = new Set([
    'per-1', 'per-9', 'per-10', 'per-11', 'per-12', 'per-14', 'per-15',
    'per-16', 'per-21', 'per-22', 'per-23', 'per-28', 'per-29', 'per-37',
  ]);

  // Only a STRATEGIC SUBSET of the 14 high scorers gets pinned
  // attachments — the rest stay attachment-less so they don't all
  // cluster at the top of the @2-unread tier under the default
  // attachments-desc sort. The 4 IDs below sit at persons-array
  // indices 0, 10, 21, and 36 — spread across the array so they
  // interleave with bulk candidates (idx 32+) instead of dominating
  // the first 14 rows.
  //
  // Visible top tier becomes:
  //   row 1:  per-1 (Sarah Chen, GREEN)         ← idx 0
  //   row 2:  per-11 (Andrea Kowalski, GREEN)   ← idx 10
  //   row 3:  per-22 (Vanessa Shapiro, GREEN)   ← idx 21
  //   rows 4-7: bulk candidates per-33..per-36  ← idx 32-35 (mixed)
  //   row 8:  per-37 (Olivia Chen, GREEN)       ← idx 36
  //   rows 9+: bulk candidates per-38+ (mixed)  ← idx 37+
  // → 4 greens woven through orange/blue bulk; reds (cold contacts
  //   with seed-email attachments) appear lower in the tier.
  const ATTACHMENT_GREENS = new Set(['per-1', 'per-11', 'per-22', 'per-37']);

  persons.forEach((p, i) => {
    if (i < 40) {
      // Hot — recent email triggers contactedWithinDays:7 (+5) and
      // resets the activity clock so Stale/Cold can't fire.
      const attachments = ATTACHMENT_GREENS.has(p.id) ? 2 : 0;
      setRecentEmail(p, 2 + (i % 5), attachments);
    } else if (i >= total - 15) {
      // Cold — old lastUpdated triggers Stale (-10) AND Cold (-15) =
      // -25. Strip tags so completeness drops, yielding 0-24 floor.
      p.lastUpdated = daysAgoIso(95 + (i % 30));
      p.tags = [];
    } else if (i >= total - 30) {
      // Stale — older lastUpdated triggers Stale (-10) only. Keeps
      // these in the 25-49 band rather than the 0-24 floor.
      p.lastUpdated = daysAgoIso(65 + (i % 20));
    }
    // 40 ≤ i < total-30 → as-is (default mid-band score)

    // Org-link augmentation. Skip cold contacts (we want them low),
    // skip persons that already have an orgId (HMs from per-9..per-32
    // are already linked). Link every other remaining candidate to an
    // org from the rotation pool — spreads the firmographic boost so
    // mid-band and high-band scorers appear throughout the grid, not
    // just in the index 0-32 slice.
    const isCold = i >= total - 15;
    if (!isCold && !(p as { orgId?: string }).orgId && i % 2 === 0) {
      const linkedOrg = linkPool[Math.floor(i / 2) % linkPool.length];
      if (linkedOrg) {
        (p as { orgId?: string }).orgId = linkedOrg.id;
        (p as { orgName?: string }).orgName = linkedOrg.name;
      }
    }

    // Pin high scorers to today's date so they sort first under the
    // default lastUpdated-desc grid sort. Without this, the bulk
    // candidates (with their freshly-stamped post-processor dates) win
    // the top slots and the user sees a wall of blue/orange instead of
    // green-led variety.
    if (HIGH_SCORER_IDS.has(p.id)) {
      // Stagger over the last 14 days so the 14 high scorers occupy a
      // continuous block at the top without ties: per-1 newest, per-37
      // oldest within the high-scorer range.
      const order = [
        'per-1', 'per-9', 'per-10', 'per-11', 'per-12', 'per-14', 'per-15',
        'per-16', 'per-21', 'per-22', 'per-23', 'per-28', 'per-29', 'per-37',
      ];
      const rank = order.indexOf(p.id);
      p.lastUpdated = daysAgoIso(rank >= 0 ? rank : 0);
    }
  });

  return contacts;
}

export const SEED_CONTACTS: ContactWithEntries[] = applyDistributionProfile(RAW_SEED_CONTACTS);
