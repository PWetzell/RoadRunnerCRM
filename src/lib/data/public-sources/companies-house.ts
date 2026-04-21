/**
 * UK Companies House — the canonical UK corporate registry.
 *
 * Docs: https://developer-specs.company-information.service.gov.uk/
 * Cost: free with API key (no paid tier). Set COMPANIES_HOUSE_TOKEN in .env.local.
 * Gracefully returns [] when no token is configured.
 *
 * Auth: HTTP Basic, username = api key, password = ''
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany } from './types';

interface ChCompany {
  company_number: string;
  title: string;
  company_status?: string;
  date_of_creation?: string;
  address_snippet?: string;
  links?: { self?: string };
}

interface ChResponse {
  items?: ChCompany[];
}

const cache = getCache<ChCompany[]>('companies-house', 200, 60 * 60 * 1000);

export async function searchCompaniesHouse(query: string): Promise<ExternalCompany[]> {
  if (!PROVIDER_CONFIG.companiesHouse.token) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let rows = cache.get(key);
  if (!rows) {
    try {
      const authB64 = Buffer.from(`${PROVIDER_CONFIG.companiesHouse.token}:`).toString('base64');
      const url = `${PROVIDER_CONFIG.companiesHouse.baseUrl}/search/companies?q=${encodeURIComponent(q)}&items_per_page=5`;
      const res = await fetchWithTimeout(url, { headers: { Authorization: `Basic ${authB64}` } });
      if (!res.ok) return [];
      const json = (await res.json()) as ChResponse;
      rows = json.items || [];
      cache.set(key, rows);
    } catch {
      return [];
    }
  }

  return rows.map((c, i): ExternalCompany => ({
    id: `companies-house:${c.company_number}`,
    source: 'companies-house',
    sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${c.company_number}`,
    name: c.title,
    legalName: c.title,
    country: 'GB',
    hq: c.address_snippet,
    founded: c.date_of_creation,
    identifiers: { 'companies-house': c.company_number },
    confidence: Math.max(55, 85 - i * 6),
    matchedFields: ['name'],
  }));
}
