/**
 * Real company enrichment, backed by public data sources.
 *
 * The filename is historical — it used to be pure mock data. It now pulls
 * from the `/api/public-sources/enrich-company` endpoint, which in turn
 * fans out to Clearbit, SEC EDGAR, Wikidata, GLEIF, GitHub orgs, plus
 * optionally OpenCorporates / Companies House / SAM.gov / Hunter.io when
 * their free API keys are configured.
 *
 * Every returned field carries its real source. See docs/DATA-POLICY.md.
 */

import type { ProviderId } from '@/lib/data/public-sources/types';

export interface EnrichmentField {
  key: string;
  label: string;
  value: string;
  /** Real source — one of our ProviderId values. */
  source: ProviderId;
  /** Optional deep-link to the source record. */
  sourceUrl?: string;
  confidence: number;
  accepted?: boolean;
}

export interface EnrichmentResult {
  companyName: string;
  fields: EnrichmentField[];
  totalFound: number;
  avgConfidence: number;
  qualityScore: number;
  qualityLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'No data';
}

/**
 * Synchronous placeholder used while the real async fetch is in flight.
 * The NewCompanyPage wizard calls this synchronously from `goNext`, then
 * the `AIEnrichmentReview` component upgrades to live data via its own
 * effect using the `useCompanyEnrichment` hook.
 */
export function enrichCompany({ companyName }: { companyName: string; website?: string }): EnrichmentResult {
  return {
    companyName,
    fields: [],
    totalFound: 0,
    avgConfidence: 0,
    qualityScore: 0,
    qualityLabel: 'No data',
  };
}

/**
 * Build the enrichment result from a raw aggregator payload.
 * Used by `AIEnrichmentReview` after it fetches the real data.
 */
export function buildEnrichmentFromAggregator(
  companyName: string,
  candidates: import('@/lib/data/public-sources/types').ExternalCompany[],
  employees: import('@/lib/data/public-sources/types').ExternalPerson[],
): EnrichmentResult {
  const fields: EnrichmentField[] = [];

  // Pick the highest-confidence candidate as the "primary" record.
  const best = candidates[0];

  if (best) {
    if (best.legalName && best.legalName !== best.name) {
      fields.push({ key: 'legalName', label: 'Legal Name', value: best.legalName, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.domain) {
      fields.push({ key: 'domain', label: 'Domain', value: best.domain, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.website && best.website !== best.domain) {
      fields.push({ key: 'website', label: 'Website', value: best.website, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.industry) {
      fields.push({ key: 'industry', label: 'Industry', value: best.industry, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.hq) {
      fields.push({ key: 'hq', label: 'Headquarters', value: best.hq, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.employees) {
      fields.push({ key: 'employees', label: 'Employee Count', value: best.employees, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.founded) {
      fields.push({ key: 'founded', label: 'Founded', value: best.founded, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    if (best.description) {
      fields.push({ key: 'description', label: 'Description', value: best.description, source: best.source, sourceUrl: best.sourceUrl, confidence: best.confidence });
    }
    // Identifiers across providers
    if (best.identifiers) {
      for (const [provider, id] of Object.entries(best.identifiers)) {
        if (!id) continue;
        fields.push({
          key: `id-${provider}`,
          label: provider === 'gleif' ? 'LEI' : provider === 'sec-edgar' ? 'SEC CIK' : provider === 'companies-house' ? 'UK Co. No.' : provider === 'sam-gov' ? 'SAM UEI' : `${provider} ID`,
          value: id,
          source: provider as ProviderId,
          confidence: 95,
        });
      }
    }
  }

  // Pull complementary fields from OTHER providers that might fill gaps
  for (const c of candidates.slice(1, 5)) {
    const filledKeys = new Set(fields.map((f) => f.key));
    const push = (key: string, label: string, value?: string) => {
      if (value && !filledKeys.has(key)) {
        fields.push({ key, label, value, source: c.source, sourceUrl: c.sourceUrl, confidence: c.confidence });
      }
    };
    push('domain', 'Domain', c.domain);
    push('website', 'Website', c.website);
    push('industry', 'Industry', c.industry);
    push('hq', 'Headquarters', c.hq);
    push('employees', 'Employee Count', c.employees);
    push('founded', 'Founded', c.founded);
    push('description', 'Description', c.description);
  }

  // Key contacts from Hunter (only populated when HUNTER_TOKEN set)
  if (employees.length > 0) {
    const keyContacts = employees.slice(0, 4).map((e) => {
      const full = e.title ? `${e.name} (${e.title})` : e.name;
      return full;
    }).join(', ');
    fields.push({
      key: 'contacts',
      label: 'Key Contacts',
      value: keyContacts,
      source: 'hunter',
      confidence: Math.round(employees.slice(0, 4).reduce((s, e) => s + e.confidence, 0) / Math.min(4, employees.length)),
    });
  }

  const totalFound = fields.length;
  const avgConf = totalFound > 0 ? Math.round(fields.reduce((s, f) => s + f.confidence, 0) / totalFound) : 0;
  const qualityLabel: EnrichmentResult['qualityLabel'] =
    totalFound === 0 ? 'No data'
      : avgConf >= 90 ? 'Excellent'
      : avgConf >= 80 ? 'Good'
      : avgConf >= 65 ? 'Fair'
      : 'Poor';

  return {
    companyName,
    fields,
    totalFound,
    avgConfidence: avgConf,
    qualityScore: avgConf,
    qualityLabel,
  };
}
