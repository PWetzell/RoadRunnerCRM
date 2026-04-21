/**
 * Hand-crafted near-duplicate clusters seeded into the fake database.
 * These guarantee that any demo typing common names finds plausible matches
 * with varying confidence levels.
 */

import { ContactWithEntries } from '@/types/contact';

function dup(id: string, name: string, email: string, phone: string, title: string, company: string, color: string): ContactWithEntries {
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');
  return {
    id, type: 'person', name, title,
    department: 'Engineering', orgName: company, email, phone,
    status: 'active', lastUpdated: '2026-03-22',
    stale: false, aiStatus: 'verified', avatarColor: color, createdBy: 'System',
    entries: {
      addresses: [],
      emails: [{ id: `e-${id}`, type: 'Work', value: email, primary: true }],
      phones: [{ id: `p-${id}`, type: 'Mobile', value: phone, primary: true }],
      websites: [],
      names: [{ id: `n-${id}`, type: 'Primary · Legal', value: name, primary: true, firstName, lastName }],
      identifiers: [], industries: [],
    },
  } as ContactWithEntries;
}

export const INTENTIONAL_DUPLICATES: ContactWithEntries[] = [
  // Sarah Chen cluster (most likely to be tested in demo)
  dup('dup-sarah-1', 'Sarah J Chen', 's.chen@meridiantech.com', '+1 (555) 234-5678', 'VP of Engineering', 'Meridian Technologies', '#3BAFC4'),
  dup('dup-sarah-2', 'Sara Chen', 'sara.chen@meridiantech.com', '+1 (555) 234-5679', 'Senior Engineer', 'Meridian Technologies', '#3BAFC4'),
  dup('dup-sarah-3', 'Sarah Chenoweth', 'schenoweth@apexindustries.com', '+1 (415) 555-0182', 'Product Manager', 'Apex Industries', '#247A8A'),

  // John Smith cluster
  dup('dup-john-1', 'Jonathan R. Smith', 'jsmith@acmecorp.com', '+1 (617) 555-0142', 'Senior Product Manager', 'Acme Corporation', '#1955A6'),
  dup('dup-john-2', 'John Smith', 'john.smith@apexindustries.com', '+1 (212) 555-7700', 'Director of Sales', 'Apex Industries', '#5C7CFA'),
  dup('dup-john-3', 'Jon Smith', 'j.smith@stellarlogistics.com', '+1 (646) 555-3300', 'Marketing Manager', 'Stellar Logistics', '#5C7CFA'),

  // Lisa Park cluster
  dup('dup-lisa-1', 'Lisa Park', 'l.park@vertexanalytics.io', '+1 (212) 555-0157', 'Senior Analyst', 'Vertex Analytics', '#D96FA8'),
  dup('dup-lisa-2', 'Elisa Park', 'epark@beaconconsulting.com', '+1 (415) 555-9921', 'Consultant', 'Beacon Consulting', '#D96FA8'),

  // Michael Johnson cluster
  dup('dup-mike-1', 'Michael Johnson', 'mjohnson@harborlinefin.com', '+1 (617) 555-3344', 'Director of Finance', 'Harborline Financial', '#6A0FB8'),
  dup('dup-mike-2', 'Mike Johnson', 'mike.j@cobaltsystems.com', '+1 (303) 555-1100', 'Engineering Manager', 'Cobalt Systems', '#6A0FB8'),
  dup('dup-mike-3', 'M. Johnson', 'mjohnson@northbeamtech.com', '+1 (206) 555-7755', 'Software Engineer', 'Northbeam Tech', '#6A0FB8'),

  // Emily Davis cluster
  dup('dup-emily-1', 'Emily Davis', 'edavis@brightlinehealth.com', '+1 (206) 555-1124', 'VP of Operations', 'Brightline Health', '#10B981'),
  dup('dup-emily-2', 'Emilly Davis', 'emily.davis@cypresstrading.com', '+1 (212) 555-9988', 'Trader', 'Cypress Trading', '#10B981'),

  // David Lee cluster
  dup('dup-david-1', 'David Lee', 'dlee@quantumdevices.com', '+1 (650) 555-2200', 'CTO', 'Quantum Devices', '#F59E0B'),
  dup('dup-david-2', 'D. Lee', 'd.lee@phoenixaerospace.com', '+1 (310) 555-4400', 'Senior Engineer', 'Phoenix Aerospace', '#F59E0B'),
  dup('dup-david-3', 'Dave Lee', 'dave.lee@helixpharma.com', '+1 (617) 555-6600', 'Research Director', 'Helix Pharmaceuticals', '#F59E0B'),

  // Jennifer Martinez cluster
  dup('dup-jen-1', 'Jennifer Martinez', 'jmartinez@beaconconsulting.com', '+1 (713) 555-2200', 'Senior Consultant', 'Beacon Consulting', '#EC4899'),
  dup('dup-jen-2', 'Jen Martinez', 'jen.m@drift-marketing.com', '+1 (415) 555-8800', 'Marketing Director', 'Drift Marketing', '#EC4899'),

  // Robert Brown cluster
  dup('dup-rob-1', 'Robert Brown', 'rbrown@redwoodholdings.com', '+1 (213) 555-3300', 'CFO', 'Redwood Holdings', '#84CC16'),
  dup('dup-rob-2', 'Bob Brown', 'bob.brown@ironcladsec.com', '+1 (212) 555-9900', 'Security Director', 'Ironclad Security', '#84CC16'),
  dup('dup-rob-3', 'Bobby Brown', 'bbrown@granite-mfg.com', '+1 (313) 555-1100', 'Plant Manager', 'Granite Manufacturing', '#84CC16'),
];
