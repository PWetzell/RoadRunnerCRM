/**
 * SEC EDGAR — every US public company by name + CIK + ticker.
 *
 * Rather than hit the flaky full-text search endpoint (which returns 403
 * for non-compliant User-Agents and sometimes serves HTML), we use the
 * canonical static file:
 *   https://www.sec.gov/files/company_tickers.json
 * which lists every US public issuer with name, ticker, and CIK. We cache
 * it for 24 hours and run local fuzzy matching against the query.
 *
 * Docs: https://www.sec.gov/os/accessing-edgar-data
 * Auth: none, but SEC requires a User-Agent in "Name email@domain" format —
 *       set SEC_CONTACT_UA in .env.local to override the default.
 * Cost: free, no quota.
 */

import { getCache } from './cache';
import { fetchWithTimeout, SEC_UA } from './config';
import type { ExternalCompany } from './types';

interface Ticker {
  cik_str: number;
  ticker: string;
  title: string;   // Company name (usually in ALL CAPS)
}

const cache = getCache<Ticker[]>('sec-edgar-tickers', 10, 24 * 60 * 60 * 1000);

async function loadTickers(): Promise<Ticker[]> {
  let list = cache.get('all');
  if (list) return list;
  try {
    const res = await fetchWithTimeout('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': SEC_UA, Accept: 'application/json' },
    }, 10_000);
    if (!res.ok) return [];
    // SEC returns an object keyed by integer index: { "0": { cik_str, ticker, title }, ... }
    const json = (await res.json()) as Record<string, Ticker>;
    list = Object.values(json);
    cache.set('all', list);
    return list;
  } catch {
    return [];
  }
}

function cleanName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function searchSecEdgar(query: string): Promise<ExternalCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const needle = cleanName(q);
  if (!needle) return [];

  const tickers = await loadTickers();
  if (tickers.length === 0) return [];

  // Score each entry: exact name match > starts-with > contains
  const scored: { t: Ticker; score: number }[] = [];
  for (const t of tickers) {
    const n = cleanName(t.title);
    let score = 0;
    if (n === needle) score = 100;
    else if (n.startsWith(needle)) score = 85;
    else if (needle.length >= 3 && n.includes(needle)) score = 70;
    else if (cleanName(t.ticker) === needle) score = 95;
    else if (needle.length >= 2 && cleanName(t.ticker).startsWith(needle)) score = 60;
    if (score > 0) scored.push({ t, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map(({ t, score }): ExternalCompany => {
    const cik = String(t.cik_str).padStart(10, '0');
    // Titlecase the name (SEC stores ALL CAPS, which looks ugly in UI)
    const name = t.title.toLowerCase().replace(/(^|\s|\/|-)(\w)/g, (_, p, c) => p + c.toUpperCase());
    return {
      id: `sec:${cik}`,
      source: 'sec-edgar',
      sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`,
      name,
      legalName: t.title,
      identifiers: { 'sec-edgar': cik },
      country: 'US',
      confidence: score,
      matchedFields: ['name'],
    };
  });
}
