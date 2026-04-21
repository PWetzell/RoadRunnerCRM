/**
 * Clearbit Autocomplete — company name → domain + logo suggestions.
 *
 * Docs: https://clearbit.com/docs#autocomplete-api
 * Cost: free, no auth, no sign-up required. Small daily rate limit.
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany } from './types';

interface ClearbitHit {
  name: string;
  domain: string;
  logo: string;
}

const cache = getCache<ClearbitHit[]>('clearbit', 200, 60 * 60 * 1000);

export async function searchClearbit(query: string): Promise<ExternalCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let hits = cache.get(key);
  if (!hits) {
    try {
      const url = `${PROVIDER_CONFIG.clearbit.baseUrl}?query=${encodeURIComponent(q)}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];
      hits = (await res.json()) as ClearbitHit[];
      cache.set(key, hits);
    } catch {
      return [];
    }
  }

  return hits.slice(0, 8).map((h, i): ExternalCompany => ({
    id: `clearbit:${h.domain}`,
    source: 'clearbit',
    sourceUrl: `https://${h.domain}`,
    name: h.name,
    domain: h.domain,
    // As of 2024+ the autocomplete endpoint returns logo:null for most
    // entries. The logo.clearbit.com image endpoint still serves logos
    // keyed by domain, and browsers can load it directly via <img>.
    logoUrl: h.logo || (h.domain ? `https://logo.clearbit.com/${h.domain}` : undefined),
    website: `https://${h.domain}`,
    // Clearbit ranks results by relevance — first hit is strongest.
    confidence: Math.max(55, 92 - i * 5),
    matchedFields: ['name'],
  }));
}
