import { ContactWithEntries } from '@/types/contact';

/**
 * Bulk seed data modeled on a realistic 2026 boutique-agency recruiter book
 * of business — ~20 client companies across 6 staffing verticals (healthcare,
 * tech/AI, biotech, financial services, legal, skilled manufacturing) plus
 * ~25 client-side hiring managers/HR partners and ~80 candidates actively
 * sourced for current searches. Addresses are real HQs; people, phones, and
 * emails are fabricated (555 numbers, placeholder domains).
 *
 * IDs continue the numbering in seed-contacts.ts: org-5+, per-9+.
 */

const AVATARS = [
  '#1955A6', '#047857', '#C2410C', '#6A0FB8', '#0B2F5C', '#9D174D',
  '#1D4ED8', '#059669', '#D97706', '#BE185D', '#7C2D12', '#065F46',
  '#4338CA', '#B91C1C', '#0369A1', '#7C3AED', '#15803D', '#A16207',
];
const color = (i: number) => AVATARS[i % AVATARS.length];

/** Today minus N days, formatted YYYY-MM-DD. Seed "today" is 2026-04-22. */
const daysAgo = (n: number): string => {
  const d = new Date('2026-04-22T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────────────────────────────────
// ADDITIONAL CLIENT ORGANIZATIONS
// ─────────────────────────────────────────────────────────────────────────

export const BULK_ORGS: ContactWithEntries[] = [
  // ── Healthcare & Life Sciences ──
  {
    id: 'org-5', type: 'org', name: 'Mass General Brigham', avatarColor: '#0369A1', industry: 'Healthcare System',
    employees: '75,000+', hq: 'Somerville, MA', website: 'massgeneralbrigham.org',
    description: 'Integrated academic healthcare system — parent of Massachusetts General Hospital, Brigham and Women\'s Hospital, and 12 community hospitals. Largest private employer in Massachusetts.',
    structure: 'Nonprofit', category: 'Regional',
    revenueVolume: { annual: 21000000000 },
    lastUpdated: daysAgo(5), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'Recruiting'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '399 Revolution Drive', city: 'Somerville', state: 'MA', zip: '02145', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'talent@mgb.org', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (617) 724-8000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'massgeneralbrigham.org', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Mass General Brigham Incorporated', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '62211', name: 'General Medical & Surgical Hospitals', primary: true }],
    },
  },
  {
    id: 'org-6', type: 'org', name: 'Moderna, Inc.', avatarColor: '#B91C1C', industry: 'Biotechnology',
    employees: '5,000-10,000', hq: 'Cambridge, MA', website: 'modernatx.com',
    description: 'Clinical-stage biotech developing mRNA therapeutics and vaccines. NASDAQ: MRNA. Pipeline spans infectious disease, oncology, rare disease, and autoimmune.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 6800000000 },
    lastUpdated: daysAgo(9), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'Recruiting'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '325 Binney Street', city: 'Cambridge', state: 'MA', zip: '02142', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'talent@modernatx.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (617) 714-6500', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'modernatx.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Moderna, Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '54171', name: 'Research and Development in Biotechnology', primary: true }],
    },
  },
  {
    id: 'org-7', type: 'org', name: 'Pfizer Inc.', avatarColor: '#0369A1', industry: 'Pharmaceuticals',
    employees: '75,000+', hq: 'New York, NY', website: 'pfizer.com',
    description: 'Global biopharmaceutical company — vaccines, oncology, internal medicine, inflammation/immunology, and rare disease. NYSE: PFE.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 58500000000 },
    lastUpdated: daysAgo(14), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '66 Hudson Boulevard', city: 'New York', state: 'NY', zip: '10001', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'careers@pfizer.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (212) 733-2323', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'pfizer.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Pfizer Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '32541', name: 'Pharmaceutical Preparation Manufacturing', primary: true }],
    },
  },
  {
    id: 'org-8', type: 'org', name: 'Medtronic plc', avatarColor: '#0B2F5C', industry: 'Medical Devices',
    employees: '75,000+', hq: 'Galway, Ireland', website: 'medtronic.com',
    description: 'Global medical-device company — cardiovascular, neuroscience, medical-surgical, and diabetes portfolios. NYSE: MDT.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 32500000000 },
    lastUpdated: daysAgo(20), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'US Headquarters', value: '710 Medtronic Parkway', city: 'Minneapolis', state: 'MN', zip: '55432', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'talent@medtronic.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (763) 514-4000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'medtronic.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Medtronic plc', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '33911', name: 'Medical Equipment & Supplies Manufacturing', primary: true }],
    },
  },
  // ── Tech / AI ──
  {
    id: 'org-9', type: 'org', name: 'Anthropic, PBC', avatarColor: '#D97706', industry: 'Artificial Intelligence',
    employees: '1,000-5,000', hq: 'San Francisco, CA', website: 'anthropic.com',
    description: 'AI safety company — developer of the Claude family of large language models. Products span Claude.ai, API, and Claude Code developer tools.',
    structure: 'Private', category: 'Global',
    revenueVolume: { annual: 4200000000 },
    lastUpdated: daysAgo(3), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'VIP', 'Recruiting'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '548 Market Street', city: 'San Francisco', state: 'CA', zip: '94104', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@anthropic.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (415) 555-0100', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'anthropic.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Anthropic, PBC', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '54151', name: 'Computer Systems Design Services', primary: true }],
    },
  },
  {
    id: 'org-10', type: 'org', name: 'Snowflake Inc.', avatarColor: '#29B5E8', industry: 'Data Platform',
    employees: '5,000-10,000', hq: 'Bozeman, MT', website: 'snowflake.com',
    description: 'Cloud data platform — data warehouse, data lake, data engineering, data science, and AI workloads. NYSE: SNOW.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 3600000000 },
    lastUpdated: daysAgo(11), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'Recruiting'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '106 East Babcock Street', city: 'Bozeman', state: 'MT', zip: '59715', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'talent@snowflake.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (844) 766-9355', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'snowflake.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Snowflake Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '51821', name: 'Data Processing, Hosting, and Related Services', primary: true }],
    },
  },
  {
    id: 'org-11', type: 'org', name: 'Datadog, Inc.', avatarColor: '#632CA6', industry: 'Observability Software',
    employees: '5,000-10,000', hq: 'New York, NY', website: 'datadoghq.com',
    description: 'Monitoring and security platform for cloud applications — infrastructure, APM, logs, security, and AI observability. NASDAQ: DDOG.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 2700000000 },
    lastUpdated: daysAgo(7), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '620 8th Avenue, 45th Floor', city: 'New York', state: 'NY', zip: '10018', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@datadoghq.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (866) 329-4466', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'datadoghq.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Datadog, Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '51321', name: 'Software Publishers', primary: true }],
    },
  },
  {
    id: 'org-12', type: 'org', name: 'Figma, Inc.', avatarColor: '#F24E1E', industry: 'Design Software',
    employees: '1,000-5,000', hq: 'San Francisco, CA', website: 'figma.com',
    description: 'Collaborative design platform — UI design, whiteboarding (FigJam), developer handoff, and AI-assisted design generation. Acquired by Adobe 2024, now independent post-regulatory unwind.',
    structure: 'Private', category: 'Global',
    revenueVolume: { annual: 900000000 },
    lastUpdated: daysAgo(16), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '760 Market Street', city: 'San Francisco', state: 'CA', zip: '94102', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'careers@figma.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (415) 555-0180', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'figma.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Figma, Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '51321', name: 'Software Publishers', primary: true }],
    },
  },
  // ── Financial Services ──
  {
    id: 'org-13', type: 'org', name: 'The Goldman Sachs Group, Inc.', avatarColor: '#7F1D1D', industry: 'Investment Banking',
    employees: '45,000-50,000', hq: 'New York, NY', website: 'goldmansachs.com',
    description: 'Global investment banking, securities, and asset management firm. NYSE: GS.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 51000000000 },
    lastUpdated: daysAgo(22), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '200 West Street', city: 'New York', state: 'NY', zip: '10282', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@gs.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (212) 902-1000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'goldmansachs.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'The Goldman Sachs Group, Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '52311', name: 'Investment Banking and Securities Dealing', primary: true }],
    },
  },
  {
    id: 'org-14', type: 'org', name: 'BlackRock, Inc.', avatarColor: '#000000', industry: 'Asset Management',
    employees: '20,000-25,000', hq: 'New York, NY', website: 'blackrock.com',
    description: 'World\'s largest asset manager — $10.5T AUM. iShares ETFs, Aladdin risk platform, alternatives, and sustainable investing. NYSE: BLK.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 20000000000 },
    lastUpdated: daysAgo(18), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '50 Hudson Yards', city: 'New York', state: 'NY', zip: '10001', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@blackrock.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (212) 810-5300', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'blackrock.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'BlackRock, Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '52392', name: 'Portfolio Management', primary: true }],
    },
  },
  {
    id: 'org-15', type: 'org', name: 'The Charles Schwab Corporation', avatarColor: '#00A0DF', industry: 'Brokerage / Wealth Management',
    employees: '30,000-35,000', hq: 'Westlake, TX', website: 'schwab.com',
    description: 'Savings & investment firm — retail brokerage, banking, wealth management, and advisor services. NYSE: SCHW.',
    structure: 'Public', category: 'National',
    revenueVolume: { annual: 19600000000 },
    lastUpdated: daysAgo(25), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Prospect'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '3000 Schwab Way', city: 'Westlake', state: 'TX', zip: '76262', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'careers@schwab.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (817) 859-5000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'schwab.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'The Charles Schwab Corporation', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '52312', name: 'Securities Brokerage', primary: true }],
    },
  },
  // ── Legal ──
  {
    id: 'org-16', type: 'org', name: 'Sidley Austin LLP', avatarColor: '#8B1A1A', industry: 'Law Firm',
    employees: '2,500-5,000', hq: 'Chicago, IL', website: 'sidley.com',
    description: 'Global law firm — 21 offices, full-service practice across regulatory, M&A, litigation, and private equity. 2,000+ attorneys.',
    structure: 'Partnership', category: 'Global',
    revenueVolume: { annual: 2900000000 },
    lastUpdated: daysAgo(13), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'Recruiting'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: 'One South Dearborn', city: 'Chicago', state: 'IL', zip: '60603', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@sidley.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (312) 853-7000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'sidley.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Sidley Austin LLP', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '54111', name: 'Offices of Lawyers', primary: true }],
    },
  },
  {
    id: 'org-17', type: 'org', name: 'Kirkland & Ellis LLP', avatarColor: '#003366', industry: 'Law Firm',
    employees: '3,500-5,000', hq: 'Chicago, IL', website: 'kirkland.com',
    description: 'Largest US law firm by revenue — 3,500+ attorneys. Private equity, M&A, restructuring, and litigation practice leaders.',
    structure: 'Partnership', category: 'Global',
    revenueVolume: { annual: 7200000000 },
    lastUpdated: daysAgo(17), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '333 West Wolf Point Plaza', city: 'Chicago', state: 'IL', zip: '60654', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@kirkland.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (312) 862-2000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'kirkland.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Kirkland & Ellis LLP', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '54111', name: 'Offices of Lawyers', primary: true }],
    },
  },
  // ── Manufacturing & Industrial ──
  {
    id: 'org-18', type: 'org', name: 'Caterpillar Inc.', avatarColor: '#FFCD11', industry: 'Heavy Equipment Manufacturing',
    employees: '100,000+', hq: 'Irving, TX', website: 'caterpillar.com',
    description: 'World\'s largest manufacturer of construction and mining equipment, diesel and natural gas engines, and industrial gas turbines. NYSE: CAT.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 67100000000 },
    lastUpdated: daysAgo(28), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'Recruiting'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '5205 N. O\'Connor Boulevard', city: 'Irving', state: 'TX', zip: '75039', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'recruiting@cat.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (972) 891-7000', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'caterpillar.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Caterpillar Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '33312', name: 'Construction Machinery Manufacturing', primary: true }],
    },
  },
  {
    id: 'org-19', type: 'org', name: 'The Boeing Company', avatarColor: '#0033A0', industry: 'Aerospace & Defense',
    employees: '150,000+', hq: 'Arlington, VA', website: 'boeing.com',
    description: 'Commercial aircraft, defense systems, space systems, and global services. NYSE: BA.',
    structure: 'Public', category: 'Global',
    revenueVolume: { annual: 77800000000 },
    lastUpdated: daysAgo(30), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Prospect'], assignedTo: 'Tom Coffee', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '929 Long Bridge Drive', city: 'Arlington', state: 'VA', zip: '22202', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'careers@boeing.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (703) 465-3500', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'boeing.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'The Boeing Company', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '33641', name: 'Aerospace Product and Parts Manufacturing', primary: true }],
    },
  },
  // ── Former / Dormant Accounts (realistic rolodex depth) ──
  {
    id: 'org-20', type: 'org', name: 'Vertex Analytics Inc.', avatarColor: '#065F46', industry: 'Data & Analytics',
    employees: '500-1,000', hq: 'New York, NY', website: 'vertexanalytics.com',
    description: 'Enterprise analytics software — completed 5 placements 2024-2026, currently dormant between searches.',
    structure: 'Private', category: 'National',
    revenueVolume: { annual: 180000000 },
    lastUpdated: daysAgo(45), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Customer'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '500 Technology Way', city: 'New York', state: 'NY', zip: '10001', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'hr@vertexanalytics.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (212) 555-0400', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'vertexanalytics.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Vertex Analytics Inc.', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '51821', name: 'Data Processing, Hosting, and Related Services', primary: true }],
    },
  },
  {
    id: 'org-21', type: 'org', name: 'Meridian Capital Group', avatarColor: '#4338CA', industry: 'Private Equity',
    employees: '250-500', hq: 'Boston, MA', website: 'meridiancapital.com',
    description: 'Middle-market private equity firm. Active retained-search client across compliance, finance, and operations leadership.',
    structure: 'Private', category: 'Regional',
    revenueVolume: { annual: 85000000 },
    lastUpdated: daysAgo(4), status: 'active', stale: false, aiStatus: 'verified',
    tags: ['Client', 'VIP'], assignedTo: 'Paul Wentzell', createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Headquarters', value: '100 Federal Street', city: 'Boston', state: 'MA', zip: '02110', primary: true }],
      emails: [{ id: 'e1', type: 'Work', value: 'hr@meridiancapital.com', primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: '+1 (617) 555-0420', primary: true }],
      websites: [{ id: 'w1', type: 'Primary', value: 'meridiancapital.com', primary: true }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: 'Meridian Capital Group, LP', primary: true }],
      identifiers: [],
      industries: [{ id: 'ind1', code: '52392', name: 'Portfolio Management', primary: true }],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE HIRING MANAGERS / HR PARTNERS
// ─────────────────────────────────────────────────────────────────────────

export interface HMSeed {
  id: string;
  name: string;
  title: string;
  department: string;
  orgId: string;
  orgName: string;
  email: string;
  phoneArea: string;
  city: string;
  state: string;
  daysSinceUpdate: number;
  tags?: Array<'Client' | 'VIP' | 'Contacts Tag'>;
}

export const HM_SEEDS: HMSeed[] = [
  // Mass General Brigham
  { id: 'per-9', name: 'Karen O\'Brien', title: 'VP, Human Resources', department: 'Human Resources', orgId: 'org-5', orgName: 'Mass General Brigham', email: 'k.obrien@mgb.org', phoneArea: '617', city: 'Somerville', state: 'MA', daysSinceUpdate: 6, tags: ['Client', 'VIP'] },
  { id: 'per-10', name: 'Michael Chen, MD', title: 'Director of Nursing — MGH', department: 'Clinical Operations', orgId: 'org-5', orgName: 'Mass General Brigham', email: 'mchen@mgh.harvard.edu', phoneArea: '617', city: 'Boston', state: 'MA', daysSinceUpdate: 10, tags: ['Client'] },
  { id: 'per-11', name: 'Andrea Kowalski', title: 'Senior Talent Acquisition Partner — Allied Health', department: 'Talent Acquisition', orgId: 'org-5', orgName: 'Mass General Brigham', email: 'a.kowalski@mgb.org', phoneArea: '617', city: 'Somerville', state: 'MA', daysSinceUpdate: 3 },
  // Moderna
  { id: 'per-12', name: 'Dr. Rachel Finkelstein', title: 'Head of Clinical Talent', department: 'R&D Talent', orgId: 'org-6', orgName: 'Moderna, Inc.', email: 'rachel.finkelstein@modernatx.com', phoneArea: '617', city: 'Cambridge', state: 'MA', daysSinceUpdate: 8, tags: ['Client', 'VIP'] },
  { id: 'per-13', name: 'Christopher Ayala', title: 'Manager, Clinical Operations Hiring', department: 'Clinical Operations', orgId: 'org-6', orgName: 'Moderna, Inc.', email: 'c.ayala@modernatx.com', phoneArea: '617', city: 'Cambridge', state: 'MA', daysSinceUpdate: 14 },
  // Pfizer
  { id: 'per-14', name: 'Monica Delacroix', title: 'Director, Talent Acquisition — Commercial', department: 'Human Resources', orgId: 'org-7', orgName: 'Pfizer Inc.', email: 'monica.delacroix@pfizer.com', phoneArea: '212', city: 'New York', state: 'NY', daysSinceUpdate: 19 },
  // Medtronic
  { id: 'per-15', name: 'Jeffrey Lindqvist', title: 'Senior Director, Engineering Talent', department: 'Human Resources', orgId: 'org-8', orgName: 'Medtronic plc', email: 'j.lindqvist@medtronic.com', phoneArea: '763', city: 'Minneapolis', state: 'MN', daysSinceUpdate: 24 },
  // Anthropic
  { id: 'per-16', name: 'Taylor Ng', title: 'Head of Research Recruiting', department: 'Research Talent', orgId: 'org-9', orgName: 'Anthropic, PBC', email: 'taylor@anthropic.com', phoneArea: '415', city: 'San Francisco', state: 'CA', daysSinceUpdate: 2, tags: ['Client', 'VIP'] },
  { id: 'per-17', name: 'Priscilla Okafor', title: 'Sr. Recruiter, Applied AI', department: 'Product Talent', orgId: 'org-9', orgName: 'Anthropic, PBC', email: 'priscilla@anthropic.com', phoneArea: '415', city: 'San Francisco', state: 'CA', daysSinceUpdate: 4 },
  // Snowflake
  { id: 'per-18', name: 'Dmitri Volkov', title: 'Staff Technical Recruiter — Platform', department: 'Talent Acquisition', orgId: 'org-10', orgName: 'Snowflake Inc.', email: 'dmitri.volkov@snowflake.com', phoneArea: '650', city: 'San Mateo', state: 'CA', daysSinceUpdate: 9 },
  // Datadog
  { id: 'per-19', name: 'Hannah Bergstrom', title: 'Engineering Manager, Observability Pipelines', department: 'Engineering', orgId: 'org-11', orgName: 'Datadog, Inc.', email: 'hannah.bergstrom@datadoghq.com', phoneArea: '646', city: 'New York', state: 'NY', daysSinceUpdate: 5 },
  // Figma
  { id: 'per-20', name: 'Kelsey Broussard', title: 'Design Recruiting Lead', department: 'People', orgId: 'org-12', orgName: 'Figma, Inc.', email: 'kelsey@figma.com', phoneArea: '415', city: 'San Francisco', state: 'CA', daysSinceUpdate: 15 },
  // Goldman
  { id: 'per-21', name: 'Alistair Penrose', title: 'Managing Director — Technology Recruiting', department: 'Human Capital Management', orgId: 'org-13', orgName: 'The Goldman Sachs Group, Inc.', email: 'alistair.penrose@gs.com', phoneArea: '212', city: 'New York', state: 'NY', daysSinceUpdate: 21 },
  // BlackRock
  { id: 'per-22', name: 'Vanessa Shapiro', title: 'VP, Aladdin Engineering Talent', department: 'Aladdin', orgId: 'org-14', orgName: 'BlackRock, Inc.', email: 'vanessa.shapiro@blackrock.com', phoneArea: '212', city: 'New York', state: 'NY', daysSinceUpdate: 17 },
  // Schwab
  { id: 'per-23', name: 'Gregory Mwangi', title: 'Director of Talent, Advisor Services', department: 'Human Resources', orgId: 'org-15', orgName: 'The Charles Schwab Corporation', email: 'gregory.mwangi@schwab.com', phoneArea: '817', city: 'Westlake', state: 'TX', daysSinceUpdate: 26 },
  // Sidley Austin
  { id: 'per-24', name: 'Robert Goldstein', title: 'Director of Lateral Partner Recruiting', department: 'Attorney Recruiting', orgId: 'org-16', orgName: 'Sidley Austin LLP', email: 'rgoldstein@sidley.com', phoneArea: '312', city: 'Chicago', state: 'IL', daysSinceUpdate: 12, tags: ['Client'] },
  { id: 'per-25', name: 'Elena Vasquez', title: 'Associate Recruiting Manager — NYC', department: 'Attorney Recruiting', orgId: 'org-16', orgName: 'Sidley Austin LLP', email: 'evasquez@sidley.com', phoneArea: '212', city: 'New York', state: 'NY', daysSinceUpdate: 7 },
  // Kirkland & Ellis
  { id: 'per-26', name: 'Nathaniel Burke', title: 'Senior Director, Paralegal & Staff Recruiting', department: 'Talent', orgId: 'org-17', orgName: 'Kirkland & Ellis LLP', email: 'nathaniel.burke@kirkland.com', phoneArea: '312', city: 'Chicago', state: 'IL', daysSinceUpdate: 18 },
  // Caterpillar
  { id: 'per-27', name: 'Lindsey Carter', title: 'Plant HR Manager — Decatur Operations', department: 'Human Resources', orgId: 'org-18', orgName: 'Caterpillar Inc.', email: 'carter_lindsey@cat.com', phoneArea: '217', city: 'Decatur', state: 'IL', daysSinceUpdate: 11, tags: ['Client'] },
  { id: 'per-28', name: 'Manuel Ortega', title: 'Director of Skilled Trades Recruiting', department: 'Talent Acquisition', orgId: 'org-18', orgName: 'Caterpillar Inc.', email: 'ortega_manuel@cat.com', phoneArea: '972', city: 'Irving', state: 'TX', daysSinceUpdate: 29 },
  // Boeing
  { id: 'per-29', name: 'Dana Whitfield', title: 'Senior Manager, Cleared Talent Acquisition', department: 'Human Resources', orgId: 'org-19', orgName: 'The Boeing Company', email: 'dana.whitfield@boeing.com', phoneArea: '703', city: 'Arlington', state: 'VA', daysSinceUpdate: 31 },
  // Meridian Capital (existing dormant client re-activated)
  { id: 'per-30', name: 'Sloan Pemberton', title: 'COO', department: 'Executive', orgId: 'org-21', orgName: 'Meridian Capital Group', email: 'spemberton@meridiancapital.com', phoneArea: '617', city: 'Boston', state: 'MA', daysSinceUpdate: 6, tags: ['Client', 'VIP'] },
  { id: 'per-31', name: 'Angela Farhi', title: 'VP, People Operations', department: 'Human Resources', orgId: 'org-21', orgName: 'Meridian Capital Group', email: 'afarhi@meridiancapital.com', phoneArea: '617', city: 'Boston', state: 'MA', daysSinceUpdate: 2 },
  // Vertex (dormant but still in rolodex)
  { id: 'per-32', name: 'Devon Halstrom', title: 'VP of Engineering', department: 'Engineering', orgId: 'org-20', orgName: 'Vertex Analytics Inc.', email: 'devon.halstrom@vertexanalytics.com', phoneArea: '212', city: 'New York', state: 'NY', daysSinceUpdate: 46 },
];

function makeHM(hm: HMSeed, i: number): ContactWithEntries {
  const phone = `+1 ${hm.phoneArea} 555 0${(200 + i * 3).toString().padStart(3, '0')}`;
  // Synthesize an address from the city/state already on the HMSeed.
  // Was previously `addresses: []` which made the Quality Score
  // engine's "Has address" rule never fire for any bulk hiring
  // manager — capped them at 70 instead of 75. The city/state pair
  // is enough for the score check; building number is decorative.
  const address = {
    id: 'a1',
    type: 'Office' as const,
    value: `${hm.city} office`,
    city: hm.city,
    state: hm.state,
    zip: '',
    primary: true,
  };
  return {
    id: hm.id,
    type: 'person',
    name: hm.name,
    avatarColor: color(i + 4),
    title: hm.title,
    department: hm.department,
    orgId: hm.orgId,
    orgName: hm.orgName,
    email: hm.email,
    phone,
    lastUpdated: daysAgo(hm.daysSinceUpdate),
    status: 'active',
    stale: false,
    aiStatus: 'verified',
    tags: hm.tags ?? ['Contacts Tag'],
    assignedTo: 'Paul Wentzell',
    entries: {
      addresses: [address],
      emails: [{ id: 'e1', type: 'Work', value: hm.email, primary: true }],
      phones: [{ id: 'p1', type: 'Office', value: phone, primary: true }],
      websites: [{ id: 'w1', type: 'LinkedIn', value: `linkedin.com/in/${hm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, primary: false }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: hm.name.replace(/,\s*(MD|PhD|JD|PMP|CPA|CFA|RN|NP)$/, ''), primary: true }],
      identifiers: [],
      industries: [],
    },
  };
}

const HIRING_MANAGERS: ContactWithEntries[] = HM_SEEDS.map(makeHM);

// ─────────────────────────────────────────────────────────────────────────
// CANDIDATES (active book — sourced via LinkedIn / referrals / inbound)
// Short tuple → full ContactWithEntries record via makeCandidate()
// ─────────────────────────────────────────────────────────────────────────

export interface CandidateSeed {
  id: string;
  name: string;
  title: string;
  city: string;
  state: string;
  phoneArea: string;
  skills: string[];
  compBase: number;   // annual base in $ (2026 dollars)
  vertical: 'healthcare' | 'tech' | 'biotech' | 'finance' | 'legal' | 'manufacturing' | 'hr-admin' | 'exec';
  availability: 'immediate' | '2-weeks' | '30-days' | '60-days' | 'passive';
  stage?: 'sourced' | 'screened' | 'submitted' | 'interview' | 'placed' | 'not-a-fit';
  daysSinceUpdate: number;
  currentEmployer?: string;
  credentials?: string; // e.g. "RN, BSN", "CPA", "JD", "PMP"
  remote?: boolean;
}

/** Candidate roster — 2026 market, compensation figures reflect post-2024 inflation. */
export const CANDIDATE_SEEDS: CandidateSeed[] = [
  // ── Tech / AI Engineering ──
  { id: 'per-33', name: 'Ethan Park', title: 'Staff Machine Learning Engineer', city: 'Palo Alto', state: 'CA', phoneArea: '650', skills: ['PyTorch', 'Transformers', 'CUDA', 'Distributed Training', 'Python', 'RLHF'], compBase: 385000, vertical: 'tech', availability: '30-days', stage: 'submitted', daysSinceUpdate: 2, currentEmployer: 'Meta AI', remote: true },
  { id: 'per-34', name: 'Ravi Narayan', title: 'Senior Research Scientist — NLP', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['NLP', 'LLMs', 'JAX', 'PyTorch', 'Published ACL/NeurIPS'], compBase: 420000, vertical: 'tech', availability: 'passive', stage: 'sourced', daysSinceUpdate: 8, currentEmployer: 'Google DeepMind', credentials: 'PhD' },
  { id: 'per-35', name: 'Sofia Restrepo', title: 'Principal Platform Engineer', city: 'Seattle', state: 'WA', phoneArea: '206', skills: ['Kubernetes', 'Rust', 'Go', 'eBPF', 'Service Mesh', 'AWS'], compBase: 340000, vertical: 'tech', availability: '60-days', stage: 'interview', daysSinceUpdate: 1, currentEmployer: 'Amazon Web Services' },
  { id: 'per-36', name: 'Nikolai Petrov', title: 'Senior SRE — Payments Infrastructure', city: 'Austin', state: 'TX', phoneArea: '512', skills: ['Kubernetes', 'Terraform', 'Go', 'Observability', 'Incident Response'], compBase: 245000, vertical: 'tech', availability: '2-weeks', stage: 'submitted', daysSinceUpdate: 4, currentEmployer: 'PayPal', remote: true },
  { id: 'per-37', name: 'Olivia Chen', title: 'Senior Full-Stack Engineer', city: 'Brooklyn', state: 'NY', phoneArea: '718', skills: ['TypeScript', 'React', 'Next.js', 'PostgreSQL', 'GraphQL', 'AWS'], compBase: 215000, vertical: 'tech', availability: 'immediate', stage: 'screened', daysSinceUpdate: 3, currentEmployer: '(Contract ending Apr 30)', remote: true },
  { id: 'per-38', name: 'Marcus Abernathy', title: 'Engineering Manager, Data Platform', city: 'Chicago', state: 'IL', phoneArea: '773', skills: ['Leadership', 'Hiring', 'dbt', 'Airflow', 'Snowflake', 'Org Design'], compBase: 310000, vertical: 'tech', availability: '30-days', stage: 'interview', daysSinceUpdate: 5, currentEmployer: 'Groupon' },
  { id: 'per-39', name: 'Yuki Tanaka', title: 'Staff iOS Engineer', city: 'San Francisco', state: 'CA', phoneArea: '415', skills: ['Swift', 'SwiftUI', 'Combine', 'Core Data', 'App Performance'], compBase: 325000, vertical: 'tech', availability: 'passive', stage: 'sourced', daysSinceUpdate: 12, currentEmployer: 'Apple' },
  { id: 'per-40', name: 'Danielle Okonkwo', title: 'Senior Product Manager — AI Products', city: 'San Francisco', state: 'CA', phoneArea: '415', skills: ['Product Strategy', 'AI/ML Product', 'B2B SaaS', 'Roadmapping', 'PRDs'], compBase: 295000, vertical: 'tech', availability: '30-days', stage: 'submitted', daysSinceUpdate: 2, currentEmployer: 'Notion' },
  { id: 'per-41', name: 'Tyler Kwiatkowski', title: 'Security Engineer — AppSec', city: 'Denver', state: 'CO', phoneArea: '303', skills: ['AppSec', 'Pen Testing', 'OWASP', 'Burp Suite', 'Python', 'Cloud Security'], compBase: 225000, vertical: 'tech', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 6, currentEmployer: 'Cloudflare', remote: true },
  { id: 'per-42', name: 'Mei-Lin Huang', title: 'Senior Data Scientist', city: 'Mountain View', state: 'CA', phoneArea: '650', skills: ['Python', 'SQL', 'Experimentation', 'Causal Inference', 'Bayesian Methods'], compBase: 260000, vertical: 'tech', availability: 'passive', stage: 'sourced', daysSinceUpdate: 20, currentEmployer: 'Google' },
  { id: 'per-43', name: 'Kwame Adebayo', title: 'Head of Design', city: 'New York', state: 'NY', phoneArea: '212', skills: ['Design Leadership', 'Design Systems', 'Hiring', 'Product Design', 'Figma'], compBase: 355000, vertical: 'tech', availability: '60-days', stage: 'interview', daysSinceUpdate: 4, currentEmployer: 'Stripe' },
  { id: 'per-44', name: 'Blake Ferrer', title: 'Senior Software Engineer — Backend', city: 'Remote', state: 'TX', phoneArea: '737', skills: ['Go', 'Postgres', 'Redis', 'gRPC', 'Microservices'], compBase: 205000, vertical: 'tech', availability: 'immediate', stage: 'submitted', daysSinceUpdate: 1, currentEmployer: '(Laid off Mar 2026)', remote: true },
  { id: 'per-45', name: 'Heather Nolan', title: 'Engineering Director — Observability', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Engineering Leadership', 'Distributed Systems', 'OpenTelemetry', 'Metrics/Logs/Traces'], compBase: 380000, vertical: 'tech', availability: '30-days', stage: 'interview', daysSinceUpdate: 3, currentEmployer: 'Honeycomb' },

  // ── Healthcare (nursing, allied, clinical) ──
  { id: 'per-46', name: 'Jasmine Carter', title: 'ICU Registered Nurse', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Critical Care', 'ACLS', 'BLS', 'CCRN', 'Vasoactive Drips'], compBase: 112000, vertical: 'healthcare', availability: '2-weeks', stage: 'submitted', daysSinceUpdate: 3, currentEmployer: 'Tufts Medical Center', credentials: 'RN, BSN, CCRN' },
  { id: 'per-47', name: 'Dmitri Sokolov', title: 'Emergency Department RN', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['Trauma', 'TNCC', 'Triage', 'Pediatric Emergencies'], compBase: 108000, vertical: 'healthcare', availability: 'immediate', stage: 'screened', daysSinceUpdate: 5, currentEmployer: '(Travel contract ended)', credentials: 'RN, BSN, CEN' },
  { id: 'per-48', name: 'Priya Venkatesh', title: 'Nurse Practitioner — Family Medicine', city: 'Newton', state: 'MA', phoneArea: '617', skills: ['Primary Care', 'Chronic Disease', 'EMR (Epic)', 'Patient Education'], compBase: 138000, vertical: 'healthcare', availability: '30-days', stage: 'submitted', daysSinceUpdate: 2, currentEmployer: 'Atrius Health', credentials: 'MSN, FNP-BC' },
  { id: 'per-49', name: 'Brandon Tillman', title: 'Operating Room RN', city: 'Providence', state: 'RI', phoneArea: '401', skills: ['Surgical Nursing', 'Scrub/Circulate', 'Orthopedic Surgery', 'CNOR'], compBase: 124000, vertical: 'healthcare', availability: '2-weeks', stage: 'interview', daysSinceUpdate: 1, currentEmployer: 'Rhode Island Hospital', credentials: 'RN, CNOR' },
  { id: 'per-50', name: 'Amara Johnson', title: 'Clinical Nurse Specialist — Oncology', city: 'Brookline', state: 'MA', phoneArea: '617', skills: ['Chemotherapy', 'OCN', 'Clinical Trials', 'Protocol Development'], compBase: 142000, vertical: 'healthcare', availability: 'passive', stage: 'sourced', daysSinceUpdate: 18, currentEmployer: 'Dana-Farber', credentials: 'MSN, CNS, OCN' },
  { id: 'per-51', name: 'Liam O\'Sullivan, MD', title: 'Hospitalist Physician', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Internal Medicine', 'EHR (Epic)', 'Teaching', 'Quality Improvement'], compBase: 295000, vertical: 'healthcare', availability: '60-days', stage: 'submitted', daysSinceUpdate: 7, currentEmployer: 'Beth Israel Deaconess', credentials: 'MD, Board Certified IM' },
  { id: 'per-52', name: 'Isabella Ricci', title: 'Physical Therapist — Outpatient Ortho', city: 'Worcester', state: 'MA', phoneArea: '508', skills: ['Manual Therapy', 'Post-Surgical Rehab', 'McKenzie Method'], compBase: 92000, vertical: 'healthcare', availability: 'immediate', stage: 'screened', daysSinceUpdate: 4, currentEmployer: '(Relocation)', credentials: 'DPT, OCS' },
  { id: 'per-53', name: 'Reginald Whitaker', title: 'Healthcare Administrator — Nursing Operations', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Operations Leadership', 'Staffing Analytics', 'Labor Budget', 'Magnet Certification'], compBase: 185000, vertical: 'healthcare', availability: '30-days', stage: 'interview', daysSinceUpdate: 2, currentEmployer: 'Boston Medical Center', credentials: 'MBA, MSN' },

  // ── Biotech / Clinical Research ──
  { id: 'per-54', name: 'Sophia Nguyen, PhD', title: 'Senior Clinical Research Associate', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['ICH-GCP', 'Site Monitoring', 'Veeva CTMS', 'Oncology Trials', 'Phase 2/3'], compBase: 145000, vertical: 'biotech', availability: '2-weeks', stage: 'submitted', daysSinceUpdate: 3, currentEmployer: 'IQVIA', credentials: 'PhD, CCRA' },
  { id: 'per-55', name: 'Joaquín Herrera', title: 'Clinical Research Coordinator', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Patient Recruitment', 'Protocol Adherence', 'IRB Submissions', 'EDC (Medidata)'], compBase: 82000, vertical: 'biotech', availability: 'immediate', stage: 'screened', daysSinceUpdate: 5, currentEmployer: 'Brigham & Women\'s Hospital', credentials: 'CCRC' },
  { id: 'per-56', name: 'Anastasia Kuznetsova', title: 'Principal Scientist — mRNA Formulation', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['mRNA', 'Lipid Nanoparticles', 'Formulation', 'Protein Chemistry'], compBase: 235000, vertical: 'biotech', availability: '60-days', stage: 'interview', daysSinceUpdate: 4, currentEmployer: 'Alnylam', credentials: 'PhD' },
  { id: 'per-57', name: 'Benjamin Oyelaran', title: 'QA Specialist — GMP Manufacturing', city: 'Norwood', state: 'MA', phoneArea: '781', skills: ['cGMP', 'FDA Audits', 'Deviation Management', 'CAPA', '21 CFR Part 11'], compBase: 118000, vertical: 'biotech', availability: '30-days', stage: 'submitted', daysSinceUpdate: 6, currentEmployer: 'Moderna (contract)' },
  { id: 'per-58', name: 'Harper Sinclair', title: 'Regulatory Affairs Manager', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['IND Submissions', 'FDA', 'EMA', 'Regulatory Strategy', 'Oncology'], compBase: 175000, vertical: 'biotech', availability: 'passive', stage: 'sourced', daysSinceUpdate: 22, currentEmployer: 'Bristol Myers Squibb' },
  { id: 'per-59', name: 'Gabriela Santos-Mendes', title: 'Biostatistician II', city: 'Waltham', state: 'MA', phoneArea: '781', skills: ['R', 'SAS', 'Survival Analysis', 'Bayesian Methods', 'CDISC'], compBase: 165000, vertical: 'biotech', availability: '30-days', stage: 'screened', daysSinceUpdate: 9, currentEmployer: 'Sanofi', credentials: 'MS Biostatistics' },

  // ── Financial Services / Accounting / Finance ──
  { id: 'per-60', name: 'David Hernandez', title: 'Senior CPA — Audit Manager', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Public Accounting', 'GAAP', 'SOX', 'Financial Reporting', 'Team Leadership'], compBase: 168000, vertical: 'finance', availability: '30-days', stage: 'submitted', daysSinceUpdate: 2, currentEmployer: 'Deloitte', credentials: 'CPA' },
  { id: 'per-61', name: 'Brian Sullivan', title: 'Assistant Controller', city: 'Portsmouth', state: 'NH', phoneArea: '603', skills: ['Month-End Close', 'NetSuite', 'Financial Consolidation', 'Team Management'], compBase: 142000, vertical: 'finance', availability: 'immediate', stage: 'interview', daysSinceUpdate: 1, currentEmployer: '(Previous role ended Mar)', credentials: 'CPA' },
  { id: 'per-62', name: 'Chandra Reddy', title: 'Senior Compliance Officer — BSA/AML', city: 'New York', state: 'NY', phoneArea: '212', skills: ['BSA/AML', 'OFAC', 'KYC', 'Transaction Monitoring', 'FINRA'], compBase: 195000, vertical: 'finance', availability: '2-weeks', stage: 'submitted', daysSinceUpdate: 4, currentEmployer: 'JPMorgan Chase', credentials: 'CAMS' },
  { id: 'per-63', name: 'Alexander Rothstein', title: 'VP, Fixed Income Trading', city: 'New York', state: 'NY', phoneArea: '212', skills: ['Treasury Trading', 'Rates', 'Risk Management', 'Bloomberg', 'Series 7/63'], compBase: 385000, vertical: 'finance', availability: 'passive', stage: 'sourced', daysSinceUpdate: 25, currentEmployer: 'Morgan Stanley' },
  { id: 'per-64', name: 'Fernanda Montoya', title: 'Financial Analyst II — FP&A', city: 'Stamford', state: 'CT', phoneArea: '203', skills: ['Excel', 'Power BI', 'Hyperion', 'Forecasting', 'Business Partnering'], compBase: 98000, vertical: 'finance', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 7, currentEmployer: 'Aetna', credentials: 'MBA' },
  { id: 'per-65', name: 'Gregory Fitzpatrick', title: 'Director of Internal Audit', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['SOX', 'Risk Assessment', 'IT Audit', 'Team Leadership'], compBase: 215000, vertical: 'finance', availability: '30-days', stage: 'interview', daysSinceUpdate: 3, currentEmployer: 'State Street', credentials: 'CPA, CIA' },
  { id: 'per-66', name: 'Kenji Yamamoto', title: 'Quantitative Researcher', city: 'Greenwich', state: 'CT', phoneArea: '203', skills: ['Python', 'C++', 'Statistical Arbitrage', 'Time Series', 'PhD Math'], compBase: 475000, vertical: 'finance', availability: 'passive', stage: 'sourced', daysSinceUpdate: 35, currentEmployer: 'Citadel Securities', credentials: 'PhD Mathematics' },
  { id: 'per-67', name: 'Madison Kellerman', title: 'Senior Risk Analyst — Credit', city: 'Charlotte', state: 'NC', phoneArea: '704', skills: ['Credit Risk', 'Basel III', 'Stress Testing', 'SAS', 'Python'], compBase: 138000, vertical: 'finance', availability: '60-days', stage: 'screened', daysSinceUpdate: 11, currentEmployer: 'Bank of America' },

  // ── Legal ──
  { id: 'per-68', name: 'Rebecca Feinstein', title: 'Senior Associate — M&A', city: 'New York', state: 'NY', phoneArea: '212', skills: ['M&A', 'Private Equity', 'Contract Drafting', 'Due Diligence'], compBase: 425000, vertical: 'legal', availability: '60-days', stage: 'submitted', daysSinceUpdate: 4, currentEmployer: 'Wachtell Lipton', credentials: 'JD, NY Bar' },
  { id: 'per-69', name: 'Marcus Oyelowo', title: 'Litigation Associate — Commercial', city: 'Chicago', state: 'IL', phoneArea: '312', skills: ['Commercial Litigation', 'E-Discovery', 'Depositions', 'Trial Prep'], compBase: 365000, vertical: 'legal', availability: 'passive', stage: 'sourced', daysSinceUpdate: 15, currentEmployer: 'Latham & Watkins', credentials: 'JD, IL Bar' },
  { id: 'per-70', name: 'Eleanor Whitmore', title: 'Senior Paralegal — Corporate', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Corporate Governance', 'SEC Filings', 'Closing Management', 'Cap Tables'], compBase: 115000, vertical: 'legal', availability: '2-weeks', stage: 'interview', daysSinceUpdate: 2, currentEmployer: 'Ropes & Gray', credentials: 'Paralegal Certificate' },
  { id: 'per-71', name: 'Thomas Blackburn', title: 'In-House Counsel — Commercial Contracts', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['SaaS Contracts', 'Data Privacy (GDPR/CCPA)', 'Procurement', 'IP Licensing'], compBase: 245000, vertical: 'legal', availability: '30-days', stage: 'submitted', daysSinceUpdate: 5, currentEmployer: 'HubSpot', credentials: 'JD, MA Bar' },
  { id: 'per-72', name: 'Priscilla Durand', title: 'Immigration Attorney', city: 'Washington', state: 'DC', phoneArea: '202', skills: ['H-1B', 'L-1', 'Green Cards', 'PERM', 'I-9 Compliance'], compBase: 185000, vertical: 'legal', availability: 'immediate', stage: 'screened', daysSinceUpdate: 6, currentEmployer: 'Fragomen', credentials: 'JD' },
  { id: 'per-73', name: 'Jamal Whitfield', title: 'Compliance Counsel — Financial Services', city: 'New York', state: 'NY', phoneArea: '212', skills: ['SEC', 'FINRA', 'Investment Adviser Act', 'Regulatory Exams'], compBase: 295000, vertical: 'legal', availability: '60-days', stage: 'submitted', daysSinceUpdate: 8, currentEmployer: 'Fidelity Investments', credentials: 'JD, CFA' },

  // ── Skilled Manufacturing / Trades ──
  { id: 'per-74', name: 'Roland Kosinski', title: 'Plant Manager — Heavy Equipment', city: 'Peoria', state: 'IL', phoneArea: '309', skills: ['Lean Manufacturing', 'Six Sigma Black Belt', 'Team of 400+', 'Union Environment'], compBase: 195000, vertical: 'manufacturing', availability: '30-days', stage: 'interview', daysSinceUpdate: 3, currentEmployer: 'John Deere', credentials: 'MBA, SSBB' },
  { id: 'per-75', name: 'Derek Holcomb', title: 'Senior Manufacturing Engineer', city: 'Decatur', state: 'IL', phoneArea: '217', skills: ['CAD (SolidWorks)', 'Process Design', 'Robotics', 'PLCs', 'Automation'], compBase: 128000, vertical: 'manufacturing', availability: 'immediate', stage: 'submitted', daysSinceUpdate: 4, currentEmployer: '(Plant closure)', credentials: 'BSME, PE' },
  { id: 'per-76', name: 'Miguel Acosta', title: 'CNC Machinist — Journey Level', city: 'Wichita', state: 'KS', phoneArea: '316', skills: ['5-Axis CNC', 'Mastercam', 'Aerospace Tolerances', 'Inspection'], compBase: 78000, vertical: 'manufacturing', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 6, currentEmployer: 'Textron Aviation' },
  { id: 'per-77', name: 'Jessica Laferriere', title: 'Quality Engineer — AS9100', city: 'Everett', state: 'WA', phoneArea: '425', skills: ['AS9100', 'Root Cause Analysis', 'Minitab', 'FAI', 'Aerospace'], compBase: 115000, vertical: 'manufacturing', availability: '30-days', stage: 'submitted', daysSinceUpdate: 9, currentEmployer: 'Boeing', credentials: 'CQE' },
  { id: 'per-78', name: 'Tyrone Beasley', title: 'Senior Welder — Pressure Vessel', city: 'Houston', state: 'TX', phoneArea: '713', skills: ['ASME Code', 'TIG/MIG', 'Stainless / Carbon', 'Pipe Welding 6G'], compBase: 92000, vertical: 'manufacturing', availability: 'immediate', stage: 'screened', daysSinceUpdate: 2, currentEmployer: '(Contract ending)', credentials: 'AWS Certified Welder' },
  { id: 'per-79', name: 'Stacy Rinehart', title: 'Supply Chain Manager', city: 'Greenville', state: 'SC', phoneArea: '864', skills: ['S&OP', 'SAP', 'Supplier Development', 'Cost Reduction'], compBase: 135000, vertical: 'manufacturing', availability: 'passive', stage: 'sourced', daysSinceUpdate: 19, currentEmployer: 'BMW Manufacturing', credentials: 'APICS CSCP' },

  // ── HR / Admin / People Ops ──
  { id: 'per-80', name: 'Maya Patel', title: 'Senior HR Business Partner', city: 'San Francisco', state: 'CA', phoneArea: '415', skills: ['Employee Relations', 'Org Design', 'Compensation', 'Tech HRBP'], compBase: 175000, vertical: 'hr-admin', availability: '30-days', stage: 'submitted', daysSinceUpdate: 2, currentEmployer: 'Airbnb', credentials: 'SPHR' },
  { id: 'per-81', name: 'Tomás Ríos', title: 'Technical Recruiter', city: 'Austin', state: 'TX', phoneArea: '512', skills: ['Full-Cycle Recruiting', 'Sourcing', 'Greenhouse', 'LinkedIn Recruiter'], compBase: 118000, vertical: 'hr-admin', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 5, currentEmployer: 'Indeed', remote: true },
  { id: 'per-82', name: 'Nadia Whitfield-Ajani', title: 'Director of Total Rewards', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Compensation Design', 'Equity Plans', 'Benefits', 'Radford Surveys'], compBase: 245000, vertical: 'hr-admin', availability: 'passive', stage: 'sourced', daysSinceUpdate: 16, currentEmployer: 'Wayfair', credentials: 'CCP' },
  { id: 'per-83', name: 'Lorraine McCutcheon', title: 'Executive Assistant to CEO', city: 'New York', state: 'NY', phoneArea: '212', skills: ['C-Suite Support', 'Calendar Management', 'Board Coordination', 'Travel'], compBase: 115000, vertical: 'hr-admin', availability: '30-days', stage: 'interview', daysSinceUpdate: 1, currentEmployer: 'McKinsey' },
  { id: 'per-84', name: 'Cameron Whitlock', title: 'People Operations Manager', city: 'Remote', state: 'OR', phoneArea: '503', skills: ['HRIS (Workday)', 'Onboarding', 'HR Analytics', 'Process Design'], compBase: 128000, vertical: 'hr-admin', availability: 'immediate', stage: 'screened', daysSinceUpdate: 4, currentEmployer: '(Laid off Apr 2026)', remote: true },

  // ── Executive / Placed (closed deals, still in rolodex) ──
  { id: 'per-85', name: 'Jennifer Morrison', title: 'VP of Compliance', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['SEC/FINRA', 'Compliance Program Build-Out', 'Team Leadership'], compBase: 285000, vertical: 'exec', availability: 'passive', stage: 'placed', daysSinceUpdate: 38, currentEmployer: 'Meridian Capital Group (placed Jan 2026)', credentials: 'JD' },
  { id: 'per-86', name: 'Robert Kim', title: 'Former VP Regulatory Affairs', city: 'San Francisco', state: 'CA', phoneArea: '415', skills: ['Government Relations', 'SEC Former Regulator', 'Policy'], compBase: 340000, vertical: 'exec', availability: 'passive', stage: 'not-a-fit', daysSinceUpdate: 52, currentEmployer: 'Pacific Trust', credentials: 'JD' },
  { id: 'per-87', name: 'Maria Santos', title: 'Chief Compliance Officer', city: 'Stamford', state: 'CT', phoneArea: '203', skills: ['M&A Compliance', 'Chief Compliance Officer', 'Legal + Regulatory'], compBase: 395000, vertical: 'exec', availability: '60-days', stage: 'interview', daysSinceUpdate: 6, currentEmployer: 'Greenfield Capital', credentials: 'JD, CFA' },
  { id: 'per-88', name: 'Jonathan Whitfield', title: 'Chief Financial Officer', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['IPO Readiness', 'Series D+ Capital Raises', 'SaaS Finance', 'Team of 45'], compBase: 485000, vertical: 'exec', availability: 'passive', stage: 'sourced', daysSinceUpdate: 28, currentEmployer: 'Toast, Inc.', credentials: 'CPA, MBA' },
  { id: 'per-89', name: 'Valentina Rossi', title: 'Chief Marketing Officer', city: 'New York', state: 'NY', phoneArea: '212', skills: ['B2B Marketing', 'Demand Gen', 'Brand', 'Team Leadership', 'PLG'], compBase: 425000, vertical: 'exec', availability: '60-days', stage: 'submitted', daysSinceUpdate: 10, currentEmployer: 'Asana', credentials: 'MBA Kellogg' },

  // ── Additional Diverse Candidates ──
  { id: 'per-90', name: 'Aisha Rahman', title: 'Data Engineer — Analytics Platform', city: 'San Jose', state: 'CA', phoneArea: '408', skills: ['dbt', 'Snowflake', 'Airflow', 'Python', 'SQL'], compBase: 195000, vertical: 'tech', availability: '30-days', stage: 'submitted', daysSinceUpdate: 3, currentEmployer: 'Okta' },
  { id: 'per-91', name: 'Hector Valenzuela', title: 'DevOps Engineer', city: 'Phoenix', state: 'AZ', phoneArea: '602', skills: ['GitLab CI', 'Terraform', 'Ansible', 'AWS', 'Python'], compBase: 168000, vertical: 'tech', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 7, currentEmployer: 'GoDaddy', remote: true },
  { id: 'per-92', name: 'Felicity Abara', title: 'UX Researcher', city: 'Seattle', state: 'WA', phoneArea: '206', skills: ['Qualitative Research', 'Usability Testing', 'Synthesis', 'Service Design'], compBase: 178000, vertical: 'tech', availability: 'passive', stage: 'sourced', daysSinceUpdate: 14, currentEmployer: 'Microsoft' },
  { id: 'per-93', name: 'Omar Khouri', title: 'Neonatal ICU Registered Nurse', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['NICU', 'Neonatal Resuscitation', 'High-Risk Infant Care'], compBase: 118000, vertical: 'healthcare', availability: '30-days', stage: 'screened', daysSinceUpdate: 9, currentEmployer: 'Boston Children\'s Hospital', credentials: 'RN, BSN, RNC-NIC' },
  { id: 'per-94', name: 'Yolanda Pritchard', title: 'Clinical Research Associate II', city: 'Research Triangle', state: 'NC', phoneArea: '919', skills: ['Oncology', 'Phase 3', 'ICH-GCP', 'Site Management'], compBase: 128000, vertical: 'biotech', availability: '60-days', stage: 'sourced', daysSinceUpdate: 20, currentEmployer: 'PPD (Thermo Fisher)' },
  { id: 'per-95', name: 'Ian Sokolowski', title: 'Corporate Paralegal — Capital Markets', city: 'New York', state: 'NY', phoneArea: '212', skills: ['IPO Prep', 'SEC Filings', 'S-1 / 10-K', 'EDGAR'], compBase: 138000, vertical: 'legal', availability: 'immediate', stage: 'submitted', daysSinceUpdate: 2, currentEmployer: '(Relocating)', credentials: 'ABA-Approved Paralegal Certificate' },
  { id: 'per-96', name: 'Beatrice Mukamuri', title: 'FP&A Senior Analyst', city: 'Boston', state: 'MA', phoneArea: '617', skills: ['Anaplan', 'SaaS Metrics', 'Board Reporting', 'Scenario Modeling'], compBase: 132000, vertical: 'finance', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 5, currentEmployer: 'Klaviyo' },
  { id: 'per-97', name: 'Giancarlo Marconi', title: 'Industrial Maintenance Technician', city: 'Louisville', state: 'KY', phoneArea: '502', skills: ['PLC Troubleshooting (Allen-Bradley)', 'Hydraulics', 'Pneumatics', 'Electrical'], compBase: 82000, vertical: 'manufacturing', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 11, currentEmployer: 'GE Appliances' },
  { id: 'per-98', name: 'Rebecca Stonebridge', title: 'Learning & Development Manager', city: 'Denver', state: 'CO', phoneArea: '303', skills: ['Instructional Design', 'Leadership Development', 'LMS Administration'], compBase: 135000, vertical: 'hr-admin', availability: '30-days', stage: 'sourced', daysSinceUpdate: 17, currentEmployer: 'Arrow Electronics' },
  { id: 'per-99', name: 'Dr. Constance Okwuosa', title: 'Senior Scientific Director — Oncology Research', city: 'Cambridge', state: 'MA', phoneArea: '617', skills: ['Translational Research', 'Drug Discovery', 'Leadership', 'Cell Therapy'], compBase: 385000, vertical: 'biotech', availability: '60-days', stage: 'interview', daysSinceUpdate: 4, currentEmployer: 'Novartis', credentials: 'PhD, MD' },
  { id: 'per-100', name: 'Wesley Ainsworth', title: 'Technical Sales Engineer — Industrial', city: 'Milwaukee', state: 'WI', phoneArea: '414', skills: ['Solution Selling', 'CAD Literacy', 'Territory Management', 'OEM Relationships'], compBase: 142000, vertical: 'manufacturing', availability: 'passive', stage: 'sourced', daysSinceUpdate: 24, currentEmployer: 'Rockwell Automation' },
  { id: 'per-101', name: 'Natalie Grzegorczyk', title: 'Associate — Private Equity', city: 'New York', state: 'NY', phoneArea: '212', skills: ['LBO Modeling', 'Due Diligence', 'Deal Execution', 'Post-Close Value Creation'], compBase: 385000, vertical: 'finance', availability: 'passive', stage: 'sourced', daysSinceUpdate: 32, currentEmployer: 'KKR', credentials: 'MBA Wharton' },
  { id: 'per-102', name: 'Corey Wahlstrom', title: 'Staff Security Engineer — Cloud', city: 'Chicago', state: 'IL', phoneArea: '312', skills: ['AWS Security', 'GCP Security', 'Kubernetes Security', 'Zero Trust', 'SIEM'], compBase: 275000, vertical: 'tech', availability: '30-days', stage: 'submitted', daysSinceUpdate: 3, currentEmployer: 'Salesforce', remote: true, credentials: 'CISSP' },
  { id: 'per-103', name: 'Lucia Vargas', title: 'Senior Perioperative Nurse Educator', city: 'Cleveland', state: 'OH', phoneArea: '216', skills: ['OR Education', 'Simulation-Based Training', 'CNOR Prep', 'Staff Development'], compBase: 128000, vertical: 'healthcare', availability: '60-days', stage: 'sourced', daysSinceUpdate: 21, currentEmployer: 'Cleveland Clinic', credentials: 'MSN, CNOR, CNE' },
  { id: 'per-104', name: 'Marguerite Taliaferro', title: 'Environmental Health & Safety Manager', city: 'Knoxville', state: 'TN', phoneArea: '865', skills: ['OSHA', 'ISO 45001', 'Incident Investigation', 'Regulatory Compliance'], compBase: 125000, vertical: 'manufacturing', availability: '2-weeks', stage: 'screened', daysSinceUpdate: 6, currentEmployer: 'Eastman Chemical', credentials: 'CSP' },
  { id: 'per-105', name: 'Sebastian Lindgren', title: 'Head of Data Science', city: 'New York', state: 'NY', phoneArea: '212', skills: ['Leadership', 'Causal Inference', 'A/B Testing at Scale', 'Team Building'], compBase: 425000, vertical: 'tech', availability: '60-days', stage: 'interview', daysSinceUpdate: 5, currentEmployer: 'Warby Parker', credentials: 'PhD Statistics' },
  { id: 'per-106', name: 'Cheng-Hui Lo', title: 'Senior Accountant — Revenue Recognition', city: 'San Francisco', state: 'CA', phoneArea: '415', skills: ['ASC 606', 'SaaS Revenue', 'NetSuite', 'Month-End Close'], compBase: 128000, vertical: 'finance', availability: '30-days', stage: 'submitted', daysSinceUpdate: 4, currentEmployer: 'Zendesk', credentials: 'CPA' },
  { id: 'per-107', name: 'Amani Solorio', title: 'Labor & Employment Attorney', city: 'Los Angeles', state: 'CA', phoneArea: '310', skills: ['Wage & Hour', 'California Employment Law', 'Single-Plaintiff Litigation', 'Policy Drafting'], compBase: 285000, vertical: 'legal', availability: '30-days', stage: 'submitted', daysSinceUpdate: 7, currentEmployer: 'Littler Mendelson', credentials: 'JD, CA Bar' },
  { id: 'per-108', name: 'Nora Whitby-Chen', title: 'Regulatory Affairs Specialist — Medical Devices', city: 'Minneapolis', state: 'MN', phoneArea: '612', skills: ['FDA 510(k)', 'CE Mark', 'MDR', 'Class II/III Devices'], compBase: 128000, vertical: 'biotech', availability: 'passive', stage: 'sourced', daysSinceUpdate: 26, currentEmployer: 'Boston Scientific', credentials: 'RAC' },
  { id: 'per-109', name: 'Reyansh Gupta', title: 'Staff Infrastructure Engineer', city: 'Seattle', state: 'WA', phoneArea: '206', skills: ['Kubernetes', 'Istio', 'Go', 'Multi-Region', 'Cost Optimization'], compBase: 340000, vertical: 'tech', availability: '60-days', stage: 'sourced', daysSinceUpdate: 18, currentEmployer: 'Airbnb' },
  { id: 'per-110', name: 'Tara Bolduc', title: 'Nurse Manager — Medical-Surgical', city: 'Manchester', state: 'NH', phoneArea: '603', skills: ['Staffing Management', 'Quality Metrics', 'Joint Commission', 'Staff Coaching'], compBase: 148000, vertical: 'healthcare', availability: '30-days', stage: 'interview', daysSinceUpdate: 2, currentEmployer: 'Elliot Health System', credentials: 'MSN, RN, NE-BC' },
  { id: 'per-111', name: 'Demetrius Okafor-Hale', title: 'Tax Senior Manager — M&A', city: 'Atlanta', state: 'GA', phoneArea: '404', skills: ['M&A Tax', 'Transaction Structuring', 'ASC 740', 'International Tax'], compBase: 225000, vertical: 'finance', availability: '30-days', stage: 'screened', daysSinceUpdate: 8, currentEmployer: 'EY', credentials: 'CPA, JD' },
  { id: 'per-112', name: 'Heloise Chevalier', title: 'Senior Paralegal — Immigration', city: 'Washington', state: 'DC', phoneArea: '202', skills: ['H-1B Petitions', 'I-140', 'PERM Labor Certifications', 'Case Management'], compBase: 92000, vertical: 'legal', availability: 'immediate', stage: 'screened', daysSinceUpdate: 1, currentEmployer: '(Firm dissolution)', credentials: 'Paralegal Certificate' },
];

function makeCandidate(c: CandidateSeed, i: number): ContactWithEntries {
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const phone = `+1 ${c.phoneArea} 555 ${(100 + i * 7 % 900).toString().padStart(4, '0')}`;
  const personalEmail = `${slug.replace(/-/g, '.')}@gmail.com`;

  const stageTag = c.stage === 'placed' ? 'Customer' : c.stage === 'submitted' || c.stage === 'interview' ? 'Recruiting' : 'Prospect';

  return {
    id: c.id,
    type: 'person',
    name: c.name,
    avatarColor: color(i),
    title: c.title,
    department: '',
    email: personalEmail,
    phone,
    skills: c.skills,
    linkedinUrl: `linkedin.com/in/${slug}`,
    lastUpdated: daysAgo(c.daysSinceUpdate),
    status: 'active',
    stale: c.daysSinceUpdate > 30,
    staleReason: c.daysSinceUpdate > 30 ? 'No contact in 30+ days' : undefined,
    aiStatus: 'verified',
    tags: [stageTag],
    assignedTo: 'Paul Wentzell',
    createdBy: 'Paul Wentzell',
    entries: {
      addresses: [{ id: 'a1', type: 'Home', value: '', city: c.city, state: c.state, zip: '', primary: true }],
      emails: [{ id: 'e1', type: 'Personal', value: personalEmail, primary: true }],
      phones: [{ id: 'p1', type: 'Mobile', value: phone, primary: true }],
      websites: [{ id: 'w1', type: 'LinkedIn', value: `linkedin.com/in/${slug}`, primary: false }],
      names: [{ id: 'cn1', type: 'Primary · Legal', value: c.name.replace(/,\s*(MD|PhD|JD|PMP|CPA|CFA|RN|NP)$/, ''), primary: true }],
      identifiers: c.credentials ? [{ id: 'id1', type: 'Professional Credential', authority: 'Various', value: c.credentials, primary: true }] : [],
      industries: [],
    },
  };
}

const CANDIDATES: ContactWithEntries[] = CANDIDATE_SEEDS.map(makeCandidate);

// ─────────────────────────────────────────────────────────────────────────
// Merged export
// ─────────────────────────────────────────────────────────────────────────

export const BULK_CONTACTS: ContactWithEntries[] = [
  ...BULK_ORGS,
  ...HIRING_MANAGERS,
  ...CANDIDATES,
];
