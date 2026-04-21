import { getFakeContacts } from '@/lib/data/fake-database/generator';
import { nameScore } from '@/lib/fuzzy-match';

export interface OrgDuplicateCandidate {
  id: string;
  name: string;
  industry: string;
  website: string;
  hq: string;
  employees: string;
  avatarColor: string;
  confidence: number;
  matchedFields: string[];
}

/**
 * Scans the simulated 2,847-contact database for organizations matching
 * the query name. Returns top candidates above threshold.
 */
export function detectOrgDuplicates({ companyName, website, hq }: {
  companyName: string; website?: string; hq?: string;
}): OrgDuplicateCandidate[] {
  if (!companyName || companyName.trim().length < 2) return [];

  const fakeContacts = getFakeContacts();
  const orgContacts = fakeContacts.filter((c) => c.type === 'org');

  const scored: OrgDuplicateCandidate[] = [];

  for (const c of orgContacts) {
    const ns = nameScore(companyName, c.name);
    if (ns < 30) continue;

    const matchedFields: string[] = [];
    if (ns >= 75) matchedFields.push('name');

    const orgWebsite = 'website' in c && c.website ? c.website : '';
    const orgHq = 'hq' in c && c.hq ? c.hq : '';

    // Boost confidence if website or HQ also match
    let confidence = ns;
    if (website && orgWebsite && website.toLowerCase().includes(orgWebsite.toLowerCase().replace('.com', ''))) {
      confidence = Math.min(100, confidence + 10);
      matchedFields.push('website');
    }
    if (hq && orgHq && hq.toLowerCase() === orgHq.toLowerCase()) {
      confidence = Math.min(100, confidence + 5);
      matchedFields.push('hq');
    }

    scored.push({
      id: c.id,
      name: c.name,
      industry: 'industry' in c && c.industry ? c.industry : '—',
      website: orgWebsite,
      hq: orgHq,
      employees: 'employees' in c && c.employees ? c.employees : '—',
      avatarColor: c.avatarColor || '#4A6741',
      confidence,
      matchedFields,
    });
  }

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, 5);
}
