# Data Sources — Provider Reference

Every public data source Navigator CRM uses, the rate limits, the keys needed (if any), and which features consume each.

Governed by `DATA-POLICY.md`.

---

## Zero-Key Providers (always on)

### Clearbit Autocomplete
- **Endpoint:** `https://autocomplete.clearbit.com/v1/companies/suggest?query=...`
- **Auth:** None
- **Rate limit:** Small daily quota, unmetered per key
- **Returns:** Company name, domain, logo URL
- **Consumers:** `AIOrgDuplicateDetection`, `AIEnrichmentPreview`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/clearbit.ts`
- **Best for:** Fast as-you-type company name → domain + logo suggestions

### Gravatar
- **Endpoint:** `https://www.gravatar.com/<md5(email)>.json`
- **Auth:** None
- **Rate limit:** Unmetered
- **Returns:** Display name, avatar, bio, location, social links (if user has a public profile)
- **Consumers:** `AIDuplicateDetection` (when email is provided)
- **File:** `src/lib/data/public-sources/gravatar.ts`
- **Best for:** Email → real person profile

### GitHub (unauthenticated)
- **Endpoint:** `https://api.github.com/search/users?q=...`
- **Auth:** None required; free PAT raises rate limit
- **Rate limit:** 60 req/hr unauth, 5,000 req/hr with `GITHUB_TOKEN`
- **Returns:** Users + organizations with name, company, bio, location, email (when public), avatar, blog
- **Consumers:** `AIDuplicateDetection`, `AIOrgDuplicateDetection`, `AIEnrichmentPreview`
- **File:** `src/lib/data/public-sources/github.ts`
- **Best for:** Developer candidates, tech companies, open-source orgs

### SEC EDGAR
- **Endpoint:** `https://efts.sec.gov/LATEST/search-index?q=...`
- **Auth:** None (polite User-Agent required)
- **Rate limit:** Unmetered (be reasonable)
- **Returns:** US public companies, CIK, ticker, filings history
- **Consumers:** `AIOrgDuplicateDetection`, `AIEnrichmentPreview`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/sec-edgar.ts`
- **Best for:** Any US public company, authoritative data from filings

### Wikidata SPARQL
- **Endpoint:** `https://query.wikidata.org/sparql`
- **Auth:** None (polite User-Agent required)
- **Rate limit:** Unmetered; single query has 60s timeout
- **Returns:** Structured facts on notable people and orgs (HQ, founded, employees, parent company, industry)
- **Consumers:** `AIDuplicateDetection`, `AIOrgDuplicateDetection`, `AIEnrichmentPreview`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/wikidata.ts`
- **Best for:** Well-known companies and notable people

### GLEIF — Legal Entity Identifier Foundation
- **Endpoint:** `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=...`
- **Auth:** None
- **Rate limit:** Unmetered
- **Returns:** Verified legal entities with LEI codes, registered addresses, jurisdictions, hierarchies
- **Consumers:** `AIOrgDuplicateDetection`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/gleif.ts`
- **Best for:** Verifying "is this a real legal entity"; financial-industry counterparties

### ORCID
- **Endpoint:** `https://pub.orcid.org/v3.0/search?q=...`
- **Auth:** None
- **Rate limit:** Unmetered
- **Returns:** Researchers, academics, affiliations, publications
- **Consumers:** `AIDuplicateDetection`
- **File:** `src/lib/data/public-sources/orcid.ts`
- **Best for:** Academic / research placements

---

## Free Key-Gated Providers (optional, graceful no-op without key)

### GitHub (authenticated)
- **How to enable:** Create a free PAT at https://github.com/settings/tokens (public_repo scope is sufficient). Set `GITHUB_TOKEN` in `.env.local`.
- **Why bother:** Raises rate limit from 60 req/hr to 5,000 req/hr

### OpenCorporates
- **Endpoint:** `https://api.opencorporates.com/v0.4/companies/search?q=...`
- **How to enable:** Free developer account at https://api.opencorporates.com. Set `OPENCORPORATES_TOKEN` in `.env.local`.
- **Free tier:** 500 req/month
- **Returns:** 200M+ companies across 140+ jurisdictions with officers, incorporation dates, registered addresses
- **Consumers:** `AIOrgDuplicateDetection`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/opencorporates.ts`
- **Best for:** Non-US companies, official corporate registry data

### Companies House (UK)
- **Endpoint:** `https://api.company-information.service.gov.uk/search/companies?q=...`
- **How to enable:** Free account at https://developer.company-information.service.gov.uk. Set `COMPANIES_HOUSE_TOKEN` in `.env.local`.
- **Free tier:** Unmetered (reasonable usage)
- **Returns:** Entire UK corporate registry — every company, officer, filing
- **Consumers:** `AIOrgDuplicateDetection`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/companies-house.ts`
- **Best for:** Any UK company

### SAM.gov
- **Endpoint:** `https://api.sam.gov/entity-information/v3/entities?q=...`
- **How to enable:** Free key at https://sam.gov/content/api. Set `SAM_GOV_TOKEN` in `.env.local`.
- **Free tier:** 1,000 req/day
- **Returns:** US federal contractor entity records — post-2022 this is the system that replaced DUNS (UEI)
- **Consumers:** `AIOrgDuplicateDetection`, `AIEnrichmentReview`
- **File:** `src/lib/data/public-sources/sam-gov.ts`
- **Best for:** US businesses that do federal contracting; D&B-equivalent firmographics

### Hunter.io
- **Endpoint:** `https://api.hunter.io/v2/domain-search?domain=...`
- **How to enable:** Free account at https://hunter.io. Set `HUNTER_TOKEN` in `.env.local`.
- **Free tier:** 25 searches/month
- **Returns:** Domain → email patterns + named employees with titles
- **Consumers:** `AIEnrichmentReview` (Key Contacts field)
- **File:** `src/lib/data/public-sources/hunter.ts`
- **Best for:** Finding named contacts at a target company (B2B prospecting)

---

## Architecture

```
   Client components (AIDuplicateDetection, etc.)
                    │
                    ▼
         usePublicSourceSearch hooks
         (debounce, abort, cache)
                    │
                    ▼
         /api/public-sources/*  (Next.js route handlers — SERVER-SIDE)
                    │
                    ▼
      src/lib/data/public-sources/index.ts  (aggregator)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    clearbit.ts ← github.ts ← sec-edgar.ts ← wikidata.ts
    gleif.ts ← orcid.ts ← opencorporates.ts (opt) ← ...
```

All provider calls happen **server-side** so:
1. API keys never reach the browser
2. CORS issues are sidestepped (many sources don't serve CORS headers)
3. Aggressive server-side caching (`src/lib/data/public-sources/cache.ts`) stretches rate limits

---

## Adding a New Provider

1. Create `src/lib/data/public-sources/<name>.ts` exporting a function that returns `ExternalCompany[]` or `ExternalPerson[]`
2. Add the provider id to `ProviderId` union and `SOURCE_META` map in `types.ts`
3. Add env-var plumbing in `config.ts` if it requires a key
4. Import it into `index.ts` and add it to the appropriate `Promise.allSettled` fan-out
5. Document it in this file under the right section

Required conventions:
- **Never throw to the caller** — return `[]` on any error
- **Return `[]` if the provider requires a key and the key is not set**
- **Use `fetchWithTimeout` with a default 6000ms timeout**
- **Cache in memory via `getCache('<provider>')`** — entries expire after 1 hour
- **Confidence scores** — assign 50–90 based on how specific the match is; the aggregator sorts by this
