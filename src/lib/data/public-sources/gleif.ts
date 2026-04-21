/**
 * GLEIF — Global Legal Entity Identifier Foundation.
 *
 * Docs: https://api.gleif.org/
 * Cost: free, no auth.
 *
 * Every LEI is a verified, regulator-backed identifier for a legal entity.
 * Great for confirming "this company is a real legal entity" and for
 * looking up corporate hierarchies (parent/child relationships).
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany } from './types';

interface GleifRecord {
  id: string;
  attributes: {
    lei: string;
    entity: {
      legalName: { name: string };
      otherNames?: { name: string }[];
      legalAddress?: { country?: string; city?: string; region?: string; addressLines?: string[] };
      headquartersAddress?: { country?: string; city?: string; region?: string; addressLines?: string[] };
      jurisdiction?: string;
      legalForm?: { id?: string };
      status?: string;
    };
  };
}

interface GleifResponse {
  data?: GleifRecord[];
}

const cache = getCache<GleifRecord[]>('gleif', 200, 60 * 60 * 1000);

export async function searchGleif(query: string): Promise<ExternalCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let rows = cache.get(key);
  if (!rows) {
    try {
      const url = `${PROVIDER_CONFIG.gleif.baseUrl}/lei-records?filter[entity.legalName]=${encodeURIComponent(q)}&page[size]=5`;
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/vnd.api+json' } });
      if (!res.ok) return [];
      const json = (await res.json()) as GleifResponse;
      rows = json.data || [];
      cache.set(key, rows);
    } catch {
      return [];
    }
  }

  return rows.map((r, i): ExternalCompany => {
    const a = r.attributes.entity;
    const addr = a.headquartersAddress || a.legalAddress;
    const hq = addr ? [addr.city, addr.region, addr.country].filter(Boolean).join(', ') : undefined;
    return {
      id: `gleif:${r.attributes.lei}`,
      source: 'gleif',
      sourceUrl: `https://search.gleif.org/#/record/${r.attributes.lei}`,
      name: a.legalName.name,
      legalName: a.legalName.name,
      country: addr?.country,
      region: addr?.region,
      city: addr?.city,
      hq,
      identifiers: { gleif: r.attributes.lei },
      confidence: Math.max(55, 85 - i * 6),
      matchedFields: ['name'],
    };
  });
}
