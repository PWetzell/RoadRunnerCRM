# Data Policy — Real Sources Only

**Status:** Binding rule for every session, every contributor.
**Owner:** See `ROADMAP.md` for product context.

---

## The Rule

**AI-powered features (duplicate detection, suggestions, enrichment) must be backed by real public data sources. Fake data is NOT permitted in these paths.**

---

## Rationale

The app's entire value proposition — and the reason it is being rebuilt from the previous Madios CRM — is AI-powered dirty-data prevention. That promise evaporates if the "AI suggestions" are hardcoded fake labels. Users discover this the first time they type a real name, no matching record exists in the fake pool, and the feature silently returns nothing. That happened. It cannot happen again.

---

## What Counts as "AI Paths"

| Feature | Must use real sources |
|---|---|
| `AIDuplicateDetection` — new person wizard | ✅ |
| `AIOrgDuplicateDetection` — new company wizard | ✅ |
| `AIEnrichmentPreview` — live preview on new company form | ✅ |
| `AIEnrichmentReview` — enrichment step in new company wizard | ✅ |
| `AIOrgHierarchy` — org chart suggestion panel | ✅ |
| `AIPrivacyAdvisory` — privacy classification panel | ✅ |
| `AISuggestionsWidget` — dashboard widget | ✅ (for enrichment-type suggestions) |
| Fake seed data for the user's own CRM records | ❌ OK — this is starter data, not an AI feature |

---

## Where Real Data Comes From

Every AI path routes through `src/lib/data/public-sources/` and its exported functions:

- `searchCompanies(query)` → fans out to Clearbit, SEC EDGAR, Wikidata, GLEIF, GitHub, OpenCorporates*, Companies House*, SAM.gov*
- `searchPeople(query, email?)` → fans out to GitHub, Gravatar, Wikidata, ORCID
- `enrichCompany(domainOrName)` → all of the above plus Hunter.io*
- \* = optional, gated on free API key in `.env.local`, graceful no-op when absent

---

## Source Attribution is Required

Every suggestion or enrichment field rendered in the UI **must** show a source badge (`SourceBadge` component) identifying which provider the data came from. This is non-negotiable — users must be able to trust or verify provenance.

See `src/lib/data/public-sources/types.ts` for the `SOURCE_META` map that drives badge colors and labels.

---

## Prohibited Patterns

The following are violations of this policy. If you find them, fix them, and cite this doc in the commit message.

- ❌ Hardcoded "source" strings (`'Crunchbase'`, `'LinkedIn'`) attached to fabricated values
- ❌ Procedurally-generated name pools used as the only matching target for AI dedup
- ❌ "Source: Your CRM" attribution on data that isn't actually sourced from the CRM store
- ❌ Hardcoded "confidence" scores on fabricated rows
- ❌ Fake enrichment payloads switched on company-name substring matching

---

## Approved Patterns

- ✅ Fan-out to multiple real providers in parallel, merged server-side
- ✅ `Promise.allSettled` so one slow/down provider doesn't block the others
- ✅ Silent fallback to `[]` on any provider failure (never throw to the UI)
- ✅ Aggressive caching at the provider level (rate limits exist)
- ✅ Dedupe + identifier-merge across providers so one entity can cite multiple sources
- ✅ Confidence scoring based on match quality (name/domain/email overlap), not a random number

---

## Exceptions (narrow)

These narrow exceptions exist and are acceptable:

1. **Seed data for the user's own CRM records** — a fresh install ships with a few fake contacts/deals so the app isn't empty. Users replace them with real records. This is starter content, not an AI claim.
2. **Internal CRM search** uses the user's Zustand/SQLite store (the user's real data). Its source badge is `crm`, which is correct.
3. **Unit tests** may mock provider responses.

---

## Related

- `docs/DATA-SOURCES.md` — provider reference (endpoints, rate limits, keys)
- `docs/ROADMAP.md` — product context
- `src/lib/data/public-sources/` — implementation
