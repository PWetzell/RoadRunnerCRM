import { getFakeContacts } from '@/lib/data/fake-database/generator';
import { compositeScore } from '@/lib/fuzzy-match';

export interface DuplicateCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  joined: string;
  tenure: string;
  avatarColor: string;
  confidence: number;
  matchedFields: string[];
}

/**
 * Scans the simulated 2,847-contact database for fuzzy matches against
 * the input. Returns top candidates above the confidence threshold.
 *
 * In Phase 4 this can be augmented with Claude reasoning for borderline cases.
 */
export function detectDuplicates({
  firstName, lastName, email, phone, company,
}: {
  firstName: string; lastName: string; email: string; phone?: string; company?: string;
}): DuplicateCandidate[] {
  const queryLen = (firstName.trim() + lastName.trim() + email.trim()).length;
  if (queryLen < 2) return [];

  const fakeContacts = getFakeContacts();
  const personContacts = fakeContacts.filter((c) => c.type === 'person');

  const scored: DuplicateCandidate[] = [];

  for (const c of personContacts) {
    const primaryEmail = c.entries?.emails?.find((e) => e.primary)?.value || ('email' in c ? c.email : '') || '';
    const primaryPhone = c.entries?.phones?.find((p) => p.primary)?.value || ('phone' in c ? c.phone : '') || '';
    const orgName = 'orgName' in c ? c.orgName || '' : '';

    const { confidence, matchedFields } = compositeScore(
      { firstName, lastName, email, phone, company },
      { name: c.name, email: primaryEmail, phone: primaryPhone, company: orgName },
    );

    // Lower threshold (30) so partial matches surface for browsing,
    // but UI shows confidence color (red/yellow/green) so user can judge.
    if (confidence >= 30) {
      scored.push({
        id: c.id,
        name: c.name,
        email: primaryEmail,
        phone: primaryPhone,
        title: 'title' in c && c.title ? c.title : '—',
        company: orgName,
        joined: c.lastUpdated || '—',
        tenure: '—',
        avatarColor: c.avatarColor || '#1955A6',
        confidence,
        matchedFields,
      });
    }
  }

  // Sort by confidence descending, return top 5
  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, 5);
}
