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
export const SEED_CONTACTS: ContactWithEntries[] = [...CORE_CONTACTS, ...BULK_CONTACTS];
