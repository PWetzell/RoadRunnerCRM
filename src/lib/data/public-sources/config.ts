/**
 * Runtime config for public-source providers.
 *
 * Every token/key is OPTIONAL. When a key is missing, the corresponding
 * provider silently returns no results instead of throwing — so the app
 * ships with zero required credentials and gracefully levels up as the
 * user drops keys into .env.local.
 */

export const PROVIDER_CONFIG = {
  // Zero-key providers — always on
  clearbit: { baseUrl: 'https://autocomplete.clearbit.com/v1/companies/suggest' },
  gravatar: { baseUrl: 'https://www.gravatar.com' },
  sec: { baseUrl: 'https://efts.sec.gov/LATEST/search-index', submissionsBase: 'https://data.sec.gov/submissions' },
  wikidata: { baseUrl: 'https://query.wikidata.org/sparql' },
  gleif: { baseUrl: 'https://api.gleif.org/api/v1' },
  orcid: { baseUrl: 'https://pub.orcid.org/v3.0' },

  // GitHub — works unauth at 60 req/hr; with token raised to 5000 req/hr
  github: {
    baseUrl: 'https://api.github.com',
    token: process.env.GITHUB_TOKEN || '',
  },

  // Key-gated providers
  opencorporates: {
    baseUrl: 'https://api.opencorporates.com/v0.4',
    token: process.env.OPENCORPORATES_TOKEN || '',
  },
  companiesHouse: {
    baseUrl: 'https://api.company-information.service.gov.uk',
    token: process.env.COMPANIES_HOUSE_TOKEN || '',
  },
  samGov: {
    baseUrl: 'https://api.sam.gov/entity-information/v3',
    token: process.env.SAM_GOV_TOKEN || '',
  },
  hunter: {
    baseUrl: 'https://api.hunter.io/v2',
    token: process.env.HUNTER_TOKEN || '',
  },
} as const;

/** Common fetch options — identifies the app politely to source servers. */
export const COMMON_HEADERS: HeadersInit = {
  'User-Agent': 'NavigatorCRM/1.0 (+https://github.com/paulw) data-quality-suite',
  'Accept': 'application/json',
};

/**
 * SEC EDGAR requires a User-Agent in the specific format
 * "Company Name contactemail@domain.com". Without it, they return 403
 * "Undeclared Automated Tool". Override in .env.local with SEC_CONTACT_UA.
 */
export const SEC_UA: string = process.env.SEC_CONTACT_UA || 'Navigator CRM admin@navigatorcrm.example';

/**
 * Wrap a fetch in a timeout so slow providers don't stall the whole response.
 * All provider modules should use this.
 */
export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctl.signal,
      headers: { ...COMMON_HEADERS, ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}
