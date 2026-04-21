/**
 * Hunter.io — domain → email patterns + named employees.
 *
 * Docs: https://hunter.io/api-documentation/v2
 * Cost: 25 searches/month free. Set HUNTER_TOKEN in .env.local.
 * Gracefully returns [] when no token is configured.
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalPerson } from './types';

interface HunterEmail {
  value: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  linkedin?: string;
  confidence?: number;
}

interface HunterDomainResponse {
  data?: { emails?: HunterEmail[]; organization?: string };
}

const cache = getCache<HunterEmail[]>('hunter-domain', 200, 60 * 60 * 1000);

export async function hunterDomainSearch(domain: string): Promise<ExternalPerson[]> {
  if (!PROVIDER_CONFIG.hunter.token) return [];

  const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (!d || !d.includes('.')) return [];

  let rows = cache.get(d);
  if (!rows) {
    try {
      const url = `${PROVIDER_CONFIG.hunter.baseUrl}/domain-search?domain=${encodeURIComponent(d)}&api_key=${encodeURIComponent(PROVIDER_CONFIG.hunter.token)}&limit=10`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];
      const json = (await res.json()) as HunterDomainResponse;
      rows = json.data?.emails || [];
      cache.set(d, rows);
    } catch {
      return [];
    }
  }

  return rows.map((e, i): ExternalPerson => {
    const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || e.value;
    return {
      id: `hunter:${e.value}`,
      source: 'hunter',
      name,
      firstName: e.first_name,
      lastName: e.last_name,
      email: e.value,
      title: e.position,
      confidence: e.confidence ?? Math.max(40, 70 - i * 4),
      matchedFields: ['domain'],
    };
  });
}
