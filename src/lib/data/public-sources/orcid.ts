/**
 * ORCID — global researcher registry.
 *
 * Docs: https://pub.orcid.org/v3.0/
 * Cost: free, no auth.
 *
 * Only useful when the query looks like it could be an academic /
 * researcher — we still always call it because the aggregator
 * handles signal vs noise via confidence scoring.
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalPerson } from './types';

interface OrcidSearchResult {
  'result'?: { 'orcid-identifier': { path: string } }[];
}

interface OrcidPerson {
  name?: {
    'given-names'?: { value?: string };
    'family-name'?: { value?: string };
    'credit-name'?: { value?: string };
  };
  'other-names'?: { 'other-name'?: { content?: string }[] };
  biography?: { content?: string };
}

interface OrcidEmployment {
  'affiliation-group'?: {
    summaries?: { 'employment-summary'?: { organization?: { name?: string }; 'role-title'?: string } }[];
  }[];
}

const searchCache = getCache<string[]>('orcid-search', 200, 60 * 60 * 1000);
const detailCache = getCache<ExternalPerson | null>('orcid-detail', 500, 60 * 60 * 1000);

export async function searchOrcid(query: string): Promise<ExternalPerson[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const key = q.toLowerCase();
  let orcids = searchCache.get(key);
  if (!orcids) {
    try {
      const url = `${PROVIDER_CONFIG.orcid.baseUrl}/search?q=${encodeURIComponent(q)}&rows=5`;
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = (await res.json()) as OrcidSearchResult;
      orcids = (json.result || []).map((r) => r['orcid-identifier'].path).slice(0, 3);
      searchCache.set(key, orcids);
    } catch {
      return [];
    }
  }

  // Fetch person + employment in parallel for each ORCID
  const rows = await Promise.all(
    orcids.map(async (id): Promise<ExternalPerson | null> => {
      const cached = detailCache.get(id);
      if (cached !== undefined) return cached;
      try {
        const [pRes, eRes] = await Promise.all([
          fetchWithTimeout(`${PROVIDER_CONFIG.orcid.baseUrl}/${id}/person`, { headers: { Accept: 'application/json' } }),
          fetchWithTimeout(`${PROVIDER_CONFIG.orcid.baseUrl}/${id}/employments`, { headers: { Accept: 'application/json' } }),
        ]);
        if (!pRes.ok) { detailCache.set(id, null); return null; }
        const person = (await pRes.json()) as OrcidPerson;
        const emp = eRes.ok ? ((await eRes.json()) as OrcidEmployment) : null;
        const first = person.name?.['given-names']?.value;
        const last = person.name?.['family-name']?.value;
        const display = person.name?.['credit-name']?.value || [first, last].filter(Boolean).join(' ') || id;
        const currentEmp = emp?.['affiliation-group']?.[0]?.summaries?.[0]?.['employment-summary'];
        const result: ExternalPerson = {
          id: `orcid:${id}`,
          source: 'orcid',
          sourceUrl: `https://orcid.org/${id}`,
          name: display,
          firstName: first,
          lastName: last,
          bio: person.biography?.content,
          title: currentEmp?.['role-title'],
          company: currentEmp?.organization?.name,
          identifiers: { orcid: id },
          confidence: 65,
          matchedFields: ['name'],
        };
        detailCache.set(id, result);
        return result;
      } catch {
        detailCache.set(id, null);
        return null;
      }
    })
  );

  return rows.filter((r): r is ExternalPerson => r !== null);
}
