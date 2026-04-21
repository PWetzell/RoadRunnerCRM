/**
 * OpenCorporates — 200M+ companies across 140+ jurisdictions.
 *
 * Docs: https://api.opencorporates.com/
 * Cost: free developer token (500 req/mo). Set OPENCORPORATES_TOKEN in .env.local.
 * Gracefully returns [] when no token is configured.
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany } from './types';

interface OcCompany {
  company: {
    name: string;
    company_number: string;
    jurisdiction_code: string;
    incorporation_date?: string;
    company_type?: string;
    registered_address_in_full?: string;
    opencorporates_url: string;
    current_status?: string;
  };
}

interface OcResponse {
  results?: { companies?: OcCompany[] };
}

const cache = getCache<OcCompany[]>('opencorporates', 200, 60 * 60 * 1000);

export async function searchOpenCorporates(query: string): Promise<ExternalCompany[]> {
  if (!PROVIDER_CONFIG.opencorporates.token) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let rows = cache.get(key);
  if (!rows) {
    try {
      const url = `${PROVIDER_CONFIG.opencorporates.baseUrl}/companies/search?q=${encodeURIComponent(q)}&api_token=${encodeURIComponent(PROVIDER_CONFIG.opencorporates.token)}&per_page=5`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];
      const json = (await res.json()) as OcResponse;
      rows = json.results?.companies || [];
      cache.set(key, rows);
    } catch {
      return [];
    }
  }

  return rows.map((r, i): ExternalCompany => {
    const c = r.company;
    return {
      id: `opencorporates:${c.jurisdiction_code}/${c.company_number}`,
      source: 'opencorporates',
      sourceUrl: c.opencorporates_url,
      name: c.name,
      legalName: c.name,
      country: c.jurisdiction_code,
      hq: c.registered_address_in_full,
      founded: c.incorporation_date,
      identifiers: { opencorporates: `${c.jurisdiction_code}/${c.company_number}` },
      confidence: Math.max(50, 82 - i * 6),
      matchedFields: ['name'],
    };
  });
}
