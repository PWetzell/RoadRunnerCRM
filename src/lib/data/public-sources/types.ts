/**
 * Unified shapes for results from public data sources.
 *
 * Every provider returns data normalized to these shapes so the UI can
 * render them uniformly and show a consistent source badge.
 *
 * Provider IDs are stable strings, not enums, so new providers can be
 * added without breaking the type surface. The `SOURCE_META` map
 * (below) provides the display label, color, and icon for each.
 */

export type ProviderId =
  | 'crm'              // user's own CRM records (Zustand store)
  | 'clearbit'         // Clearbit Autocomplete
  | 'gravatar'         // Gravatar
  | 'github'           // GitHub REST API
  | 'sec-edgar'        // SEC EDGAR
  | 'wikidata'         // Wikidata SPARQL
  | 'gleif'            // GLEIF Legal Entity Identifier API
  | 'orcid'            // ORCID public API
  | 'opencorporates'   // OpenCorporates (token-gated)
  | 'companies-house'  // UK Companies House (token-gated)
  | 'sam-gov'          // US SAM.gov (token-gated)
  | 'hunter';          // Hunter.io (token-gated)

/**
 * Minimum match shape a provider must return for a candidate company.
 * Any fields the provider can't supply should be omitted (not stubbed).
 */
export interface ExternalCompany {
  /** Stable cross-provider id — typically the primary identifier this source uses. */
  id: string;
  source: ProviderId;
  /** Absolute URL back to the record on the source site, if applicable. */
  sourceUrl?: string;

  name: string;
  legalName?: string;
  domain?: string;
  logoUrl?: string;
  industry?: string;
  description?: string;

  country?: string;
  region?: string;
  city?: string;
  hq?: string;

  employees?: string;   // range string, not a number — matches CRM storage
  founded?: string;     // ISO year or full date
  website?: string;

  /** LEI (GLEIF), CIK (SEC), OpenCorporates id, etc. Keyed by provider id. */
  identifiers?: Partial<Record<ProviderId, string>>;

  /** 0-100. How confident the provider's result matches the input. */
  confidence: number;

  /** Which input fields this candidate matched on. */
  matchedFields?: string[];
}

/**
 * Minimum match shape a provider must return for a candidate person.
 */
export interface ExternalPerson {
  id: string;
  source: ProviderId;
  sourceUrl?: string;

  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;

  title?: string;
  company?: string;

  location?: string;
  country?: string;

  identifiers?: Partial<Record<ProviderId, string>>;

  confidence: number;
  matchedFields?: string[];
}

/** Display metadata keyed by provider. Used by the source-badge UI. */
export const SOURCE_META: Record<ProviderId, { label: string; short: string; color: string; bg: string; border: string }> = {
  'crm': {
    label: 'Your CRM',
    short: 'CRM',
    color: 'var(--brand-primary)',
    bg: 'var(--brand-bg)',
    border: 'var(--brand-primary)',
  },
  'clearbit': {
    label: 'Clearbit',
    short: 'Clearbit',
    color: '#7C3AED',
    bg: '#F3ECFF',
    border: '#C4B5FD',
  },
  'gravatar': {
    label: 'Gravatar',
    short: 'Gravatar',
    color: '#1E3A8A',
    bg: '#E0E7FF',
    border: '#93B4FF',
  },
  'github': {
    label: 'GitHub',
    short: 'GitHub',
    color: '#24292F',
    bg: '#F6F8FA',
    border: '#D0D7DE',
  },
  'sec-edgar': {
    label: 'SEC EDGAR',
    short: 'SEC',
    color: '#0B5394',
    bg: '#E0F0FA',
    border: '#7DB8E1',
  },
  'wikidata': {
    label: 'Wikidata',
    short: 'Wikidata',
    color: '#006699',
    bg: '#E0F2F8',
    border: '#8DC7DE',
  },
  'gleif': {
    label: 'GLEIF',
    short: 'GLEIF',
    color: '#0369A1',
    bg: '#E0F2FE',
    border: '#7DD3FC',
  },
  'orcid': {
    label: 'ORCID',
    short: 'ORCID',
    color: '#A6CE39',
    bg: '#F3F9E5',
    border: '#C8E088',
  },
  'opencorporates': {
    label: 'OpenCorporates',
    short: 'OpenCorp',
    color: '#333333',
    bg: '#F0F0F0',
    border: '#B0B0B0',
  },
  'companies-house': {
    label: 'Companies House',
    short: 'CH UK',
    color: '#00703C',
    bg: '#E0F2E8',
    border: '#85BBA0',
  },
  'sam-gov': {
    label: 'SAM.gov',
    short: 'SAM',
    color: '#112E51',
    bg: '#D6E6F2',
    border: '#7596C1',
  },
  'hunter': {
    label: 'Hunter.io',
    short: 'Hunter',
    color: '#FF501F',
    bg: '#FFEDE5',
    border: '#FFB699',
  },
};
