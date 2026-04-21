/**
 * Wikidata SPARQL — structured data on notable people and organizations.
 *
 * Endpoint: https://query.wikidata.org/sparql
 * Cost: free, no auth. Polite User-Agent required.
 *
 * We run a single narrow query per request type (person vs company) to keep
 * latency low. Wikidata is best for well-known entities (Fortune-ish orgs,
 * notable people); sparse for smaller ones.
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany, ExternalPerson } from './types';

const companyCache = getCache<ExternalCompany[]>('wikidata-co', 200, 60 * 60 * 1000);
const personCache = getCache<ExternalPerson[]>('wikidata-per', 200, 60 * 60 * 1000);

interface SparqlResult {
  results?: { bindings?: Record<string, { value: string }>[] };
}

async function sparql(query: string): Promise<SparqlResult | null> {
  try {
    const url = `${PROVIDER_CONFIG.wikidata.baseUrl}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/sparql-results+json' } });
    if (!res.ok) return null;
    return (await res.json()) as SparqlResult;
  } catch {
    return null;
  }
}

function entityId(uri: string): string {
  const m = uri.match(/\/(Q\d+)$/);
  return m ? m[1] : uri;
}

export async function searchWikidataCompanies(query: string): Promise<ExternalCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  const hit = companyCache.get(key);
  if (hit) return hit;

  // Look for instances of business, company, organization (Q4830453, Q783794, Q43229)
  const sparqlQuery = `
    SELECT ?item ?itemLabel ?desc ?website ?hqLabel ?logo ?inception ?employees WHERE {
      SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:api "EntitySearch" .
        bd:serviceParam wikibase:endpoint "www.wikidata.org" .
        bd:serviceParam mwapi:search "${q.replace(/"/g, '\\"')}" .
        bd:serviceParam mwapi:language "en" .
        ?item wikibase:apiOutputItem mwapi:item .
      }
      ?item wdt:P31/wdt:P279* ?type .
      VALUES ?type { wd:Q4830453 wd:Q783794 wd:Q43229 wd:Q891723 }
      OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "en") }
      OPTIONAL { ?item wdt:P856 ?website }
      OPTIONAL { ?item wdt:P159 ?hq . ?hq rdfs:label ?hqLabel FILTER(LANG(?hqLabel) = "en") }
      OPTIONAL { ?item wdt:P154 ?logo }
      OPTIONAL { ?item wdt:P571 ?inception }
      OPTIONAL { ?item wdt:P1128 ?employees }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT 5
  `;

  const res = await sparql(sparqlQuery);
  const rows = res?.results?.bindings || [];
  const out: ExternalCompany[] = rows.map((r, i): ExternalCompany => {
    const id = entityId(r.item?.value || '');
    const website = r.website?.value;
    const domain = website ? website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : undefined;
    return {
      id: `wikidata:${id}`,
      source: 'wikidata',
      sourceUrl: r.item?.value,
      name: r.itemLabel?.value || q,
      description: r.desc?.value,
      website,
      domain,
      logoUrl: r.logo?.value,
      hq: r.hqLabel?.value,
      founded: r.inception?.value?.slice(0, 10),
      employees: r.employees?.value,
      identifiers: { wikidata: id },
      confidence: Math.max(50, 80 - i * 6),
      matchedFields: ['name'],
    };
  });

  companyCache.set(key, out);
  return out;
}

export async function searchWikidataPeople(query: string): Promise<ExternalPerson[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  const hit = personCache.get(key);
  if (hit) return hit;

  const sparqlQuery = `
    SELECT ?item ?itemLabel ?desc ?employerLabel ?occupationLabel ?image ?birthCountryLabel WHERE {
      SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:api "EntitySearch" .
        bd:serviceParam wikibase:endpoint "www.wikidata.org" .
        bd:serviceParam mwapi:search "${q.replace(/"/g, '\\"')}" .
        bd:serviceParam mwapi:language "en" .
        ?item wikibase:apiOutputItem mwapi:item .
      }
      ?item wdt:P31 wd:Q5 .   # instance of: human
      OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "en") }
      OPTIONAL { ?item wdt:P108 ?employer . ?employer rdfs:label ?employerLabel FILTER(LANG(?employerLabel) = "en") }
      OPTIONAL { ?item wdt:P106 ?occupation . ?occupation rdfs:label ?occupationLabel FILTER(LANG(?occupationLabel) = "en") }
      OPTIONAL { ?item wdt:P18 ?image }
      OPTIONAL { ?item wdt:P27 ?birthCountry . ?birthCountry rdfs:label ?birthCountryLabel FILTER(LANG(?birthCountryLabel) = "en") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT 5
  `;

  const res = await sparql(sparqlQuery);
  const rows = res?.results?.bindings || [];
  const out: ExternalPerson[] = rows.map((r, i): ExternalPerson => {
    const id = entityId(r.item?.value || '');
    return {
      id: `wikidata:${id}`,
      source: 'wikidata',
      sourceUrl: r.item?.value,
      name: r.itemLabel?.value || q,
      bio: r.desc?.value,
      title: r.occupationLabel?.value,
      company: r.employerLabel?.value,
      country: r.birthCountryLabel?.value,
      avatarUrl: r.image?.value,
      identifiers: { wikidata: id },
      confidence: Math.max(50, 78 - i * 6),
      matchedFields: ['name'],
    };
  });

  personCache.set(key, out);
  return out;
}
