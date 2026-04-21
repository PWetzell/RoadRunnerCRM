/**
 * Unified public-data API.
 *
 * Every consumer calls `searchCompanies(q)`, `searchPeople(q)`,
 * `enrichCompany(domain)`, or `enrichPerson(email)` — the aggregator
 * fans out to every provider in parallel, merges the results, dedupes
 * where possible, and sorts by confidence.
 *
 * All calls are issued server-side (from the Next.js API route
 * handler) so keys never leak to the browser.
 */

import { searchClearbit } from './clearbit';
import { lookupGravatar } from './gravatar';
import { searchGithubPeople, searchGithubOrgs } from './github';
import { searchSecEdgar } from './sec-edgar';
import { searchWikidataCompanies, searchWikidataPeople } from './wikidata';
import { searchGleif } from './gleif';
import { searchOrcid } from './orcid';
import { searchOpenCorporates } from './opencorporates';
import { searchCompaniesHouse } from './companies-house';
import { searchSamGov } from './sam-gov';
import { hunterDomainSearch } from './hunter';
import type { ExternalCompany, ExternalPerson, ProviderId } from './types';

export type { ExternalCompany, ExternalPerson, ProviderId } from './types';
export { SOURCE_META } from './types';

/** All zero-key + key-gated provider calls for company search. */
async function allCompanySearches(query: string): Promise<ExternalCompany[]> {
  const results = await Promise.allSettled([
    searchClearbit(query),
    searchSecEdgar(query),
    searchWikidataCompanies(query),
    searchGleif(query),
    searchGithubOrgs(query),
    searchOpenCorporates(query),   // no-op if OPENCORPORATES_TOKEN unset
    searchCompaniesHouse(query),   // no-op if COMPANIES_HOUSE_TOKEN unset
    searchSamGov(query),           // no-op if SAM_GOV_TOKEN unset
  ]);
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

/** All providers that can search for people. */
async function allPersonSearches(query: string, email?: string): Promise<ExternalPerson[]> {
  const tasks: Promise<ExternalPerson[] | ExternalPerson | null>[] = [
    searchGithubPeople(query),
    searchWikidataPeople(query),
    searchOrcid(query),
  ];
  if (email && email.includes('@')) {
    tasks.push(lookupGravatar(email).then((p) => (p ? [p] : [])));
  }
  const results = await Promise.allSettled(tasks);
  const flat: ExternalPerson[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    if (Array.isArray(r.value)) flat.push(...r.value);
    else if (r.value) flat.push(r.value);
  }
  return flat;
}

/**
 * Dedupe companies across providers using a loose name+domain key.
 * We keep the highest-confidence entry for each key and merge identifiers
 * from lower-ranked duplicates so a single card can cite multiple sources.
 */
function mergeCompanies(items: ExternalCompany[]): ExternalCompany[] {
  const byKey = new Map<string, ExternalCompany>();
  for (const it of items) {
    const key = (it.domain || it.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = byKey.get(key);
    if (!existing || it.confidence > existing.confidence) {
      if (existing) {
        // Preserve identifiers from the displaced entry
        byKey.set(key, {
          ...it,
          identifiers: { ...(existing.identifiers || {}), ...(it.identifiers || {}) },
        });
      } else {
        byKey.set(key, it);
      }
    } else {
      // Merge this entry's identifiers into the winner
      existing.identifiers = { ...(existing.identifiers || {}), ...(it.identifiers || {}) };
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.confidence - a.confidence);
}

function mergePeople(items: ExternalPerson[]): ExternalPerson[] {
  const byKey = new Map<string, ExternalPerson>();
  for (const it of items) {
    const key = (it.email || it.name).toLowerCase().replace(/[^a-z0-9@.]/g, '');
    const existing = byKey.get(key);
    if (!existing || it.confidence > existing.confidence) {
      if (existing) {
        byKey.set(key, { ...it, identifiers: { ...(existing.identifiers || {}), ...(it.identifiers || {}) } });
      } else {
        byKey.set(key, it);
      }
    } else {
      existing.identifiers = { ...(existing.identifiers || {}), ...(it.identifiers || {}) };
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.confidence - a.confidence);
}

// ─── Public API ────────────────────────────────────────────────────────

export async function searchCompanies(query: string): Promise<ExternalCompany[]> {
  const raw = await allCompanySearches(query);
  return mergeCompanies(raw).slice(0, 15);
}

export async function searchPeople(query: string, email?: string): Promise<ExternalPerson[]> {
  const raw = await allPersonSearches(query, email);
  return mergePeople(raw).slice(0, 15);
}

/**
 * Enrich a company by domain or name. Calls company-search APIs in parallel
 * and also pulls employees via Hunter.io if the key is set.
 */
export async function enrichCompany(domainOrName: string): Promise<{ candidates: ExternalCompany[]; employees: ExternalPerson[] }> {
  const [candidates, employees] = await Promise.all([
    searchCompanies(domainOrName),
    domainOrName.includes('.') ? hunterDomainSearch(domainOrName) : Promise.resolve([] as ExternalPerson[]),
  ]);
  return { candidates, employees };
}

/** Per-provider enabled flag for UI that wants to show which keys are active. */
export function providerStatus(): Record<ProviderId, { enabled: boolean; requiresKey: boolean }> {
  return {
    'crm':             { enabled: true, requiresKey: false },
    'clearbit':        { enabled: true, requiresKey: false },
    'gravatar':        { enabled: true, requiresKey: false },
    'github':          { enabled: true, requiresKey: false },
    'sec-edgar':       { enabled: true, requiresKey: false },
    'wikidata':        { enabled: true, requiresKey: false },
    'gleif':           { enabled: true, requiresKey: false },
    'orcid':           { enabled: true, requiresKey: false },
    'opencorporates':  { enabled: !!process.env.OPENCORPORATES_TOKEN, requiresKey: true },
    'companies-house': { enabled: !!process.env.COMPANIES_HOUSE_TOKEN, requiresKey: true },
    'sam-gov':         { enabled: !!process.env.SAM_GOV_TOKEN, requiresKey: true },
    'hunter':          { enabled: !!process.env.HUNTER_TOKEN, requiresKey: true },
  };
}
