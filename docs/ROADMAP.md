# Navigator CRM — Product Roadmap & Architecture Source of Truth

**Last updated:** 2026-04-20
**Status:** Phase 1 in progress — Public data enrichment

This document is the canonical product + architecture spec. Every future Claude Code session, contractor, or reviewer should read this before making changes. It captures decisions that aren't obvious from the code, and prevents accidental regressions (e.g. replacing real API calls with fake data).

---

## The Product in One Sentence

**Navigator CRM is an install-and-own desktop CRM for HR staffing firms, with AI-powered dirty-data prevention and optional Google Workspace integration.**

---

## Core Product Decisions (locked in)

| Decision | Choice | Rationale |
|---|---|---|
| **Target audience (v1)** | HR staffing / recruiting agencies | High-pain market, pays premium for Bullhorn/Crelate alternatives, fits existing data model (person + company deals), AI-dedup story is strong |
| **Distribution model** | Install-and-own (one-time license, Tauri desktop app) | Non-tech users want double-click install. No SaaS subscription, no server to host. |
| **Primary storage** | Local SQLite on the user's laptop | Offline-first — works without internet, data never leaves the laptop unless the user opts in. Fast. |
| **Optional sync** | Google Workspace (Sheets, Drive, Gmail, Calendar, Contacts) | Most non-tech users already have Google accounts. Using familiar tools (edit in Sheets, resumes in Drive) eliminates a learning curve. |
| **Dirty-data prevention** | Real public data sources (no fake data in AI paths) | See `DATA-POLICY.md`. Suggestions must be traceable to a real source, and the UI shows that source. |
| **Operating mode** | Runs entirely on the user's laptop — no server infrastructure | Google APIs are called directly from the desktop app with the user's own OAuth token. |

---

## Target User Profile

- **Persona:** Staffing agency recruiter, 2–20 seat firm
- **Tech comfort:** Low — comfortable with Gmail and Google Docs, not with IDE tools, not with servers
- **Existing pain points:**
  - Duplicate candidate records from different job boards / imports
  - Stale emails + wrong phone numbers ruining outreach
  - Tracking interview scheduling across Gmail threads and Calendar
  - Moving resumes around Google Drive manually
  - Paying $100+/seat/month to Bullhorn/Crelate for features they don't need
- **Installation expectation:** Download an installer, double-click, sign into Google, start working. ≤ 5 minutes end-to-end.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────┐
│  Tauri desktop shell (Windows .msi / Mac .dmg)     │
│  ← single-installer, auto-updater                  │
└──────┬─────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js app (existing codebase)     │
│  ← UI layer, unchanged                │
└──┬────────────┬────────────┬─────────┘
   │            │            │
   ▼            ▼            ▼
┌────────┐  ┌───────────────┐  ┌──────────────────────────┐
│ SQLite │  │ Google OAuth  │  │  Public data enrichment  │
│ (local)│  │  + Workspace  │  │  (read-only, no OAuth)   │
│ primary│◄►│  integration  │  │  • Clearbit              │
│ store  │  │  (optional)   │  │  • GitHub                │
└────────┘  │               │  │  • SEC EDGAR             │
            │  • Sheets     │  │  • Wikidata              │
            │  • Drive      │  │  • GLEIF                 │
            │  • Gmail      │  │  • Gravatar              │
            │  • Calendar   │  │  • ORCID                 │
            │  • Contacts   │  │  • OpenCorporates*       │
            └───────────────┘  │  • Companies House*      │
                               │  • SAM.gov*              │
                               │  • Hunter.io*            │
                               │  (* = optional free key) │
                               └──────────────────────────┘
```

---

## Phased Delivery Plan

### Phase 1 — Public Data Enrichment (IN PROGRESS, current session)

**Goal:** Real external data powers duplicate detection and enrichment. "Tom T" returns real matches with source attribution.

- [x] Provider scaffolding (`src/lib/data/public-sources/`)
- [x] Zero-key providers: Clearbit, Gravatar, GitHub, SEC EDGAR
- [ ] Zero-key providers: Wikidata, GLEIF, ORCID
- [ ] Key-gated scaffolds: OpenCorporates, Companies House, SAM.gov, Hunter
- [ ] Aggregator façade (`searchPeople`, `searchCompanies`, `enrichCompany`, `enrichPerson`)
- [ ] API route handlers (Next.js `/api/public-sources/[provider]`)
- [ ] Wire `AIDuplicateDetection` to real providers
- [ ] Wire `AIOrgDuplicateDetection` to real providers
- [ ] Replace fake `company-enrichment.ts` payload with real multi-source enrichment
- [ ] Every suggestion in the UI shows a colored source badge (GitHub, Wikidata, SEC, etc.)
- [ ] `DATA-POLICY.md` + `DATA-SOURCES.md` + `.env.local.example`
- [ ] `CLAUDE.md` updated to point at `DATA-POLICY.md` so future sessions don't regress to fake data

### Phase 2 — Desktop Packaging (Tauri)

**Goal:** The app ships as a double-click installer for Windows and Mac.

- [ ] Add Tauri to the project (`src-tauri/` alongside existing `src/`)
- [ ] `tauri dev` runs the existing Next.js app inside a native window
- [ ] Fix any browser-only APIs that don't work in Tauri (file:// quirks)
- [ ] App icon, splash screen, Windows + Mac code signing setup
- [ ] GitHub Actions workflow to build installers for both OSes
- [ ] Auto-updater wiring (Tauri has one built in)
- [ ] Non-tech user QA — fresh laptop → install → first run → usable

### Phase 3 — SQLite Migration (Primary Storage)

**Goal:** Data lives in a real local database, not localStorage. Survives browser cache clears, supports proper querying.

- [ ] Add `better-sqlite3` (or similar) as the storage layer
- [ ] Schema migrations for contacts, deals, documents, activity log, etc.
- [ ] Migrate Zustand persist layer → SQLite adapter
- [ ] Export/import of the SQLite file so users can back up
- [ ] Seed data becomes a SQLite file, not JS arrays

### Phase 4 — Google Workspace Integration

**Goal:** Users sign in with Google once, and the CRM talks to their Sheets / Drive / Gmail / Calendar / Contacts.

- [ ] Google OAuth 2.0 flow (PKCE, installed-app profile)
- [ ] Store refresh token securely (OS keychain via Tauri)
- [ ] Sheets: two-way sync for contacts/deals (opt-in)
- [ ] Drive: document storage for the Documents module (resumes, contracts)
- [ ] Gmail: read-only email thread history on contact profiles + "send from Gmail" action
- [ ] Calendar: create/view events for interview scheduling
- [ ] Google Contacts: one-time import on first run

### Phase 5 — HR Staffing Polish

**Goal:** Specific UX/data tuning for the v1 audience.

- [ ] Terminology pass: "Deals" → "Placements", "Lead" → "Candidate", etc. (configurable label set)
- [ ] Resume parsing (PDF/DOCX → fields) — use local PDF parsing libs, no API
- [ ] Placement fee / commission tracking on deal records
- [ ] Candidate pipeline templates (Sourced → Screened → Interview → Offer → Placed)
- [ ] Email templates for common recruiter outreach
- [ ] Interview scheduling flow — select candidate + client + calendar slots
- [ ] Simple reporting: time-to-fill, placements per recruiter, revenue per client

### Phase 6 — Productization

**Goal:** Ready to sell.

- [ ] License key validation (offline-capable — signed license file)
- [ ] Onboarding wizard on first launch
- [ ] In-app help content specific to HR staffing
- [ ] Marketing site (separate project) with download links
- [ ] Payment gateway (Stripe? Gumroad? Paddle?) for one-time license sales
- [ ] Demo mode (pre-seeded data) for people evaluating before buying

---

## Technology Decisions

### What we're using

- **Next.js (App Router)** — existing UI layer, kept as-is
- **Tauri** (Phase 2) — desktop shell. Chose Tauri over Electron because: smaller installer (5–15MB vs 100MB+), uses OS native webview, faster startup, Rust backend is more secure for a distributed desktop app.
- **SQLite** (Phase 3) — canonical local storage. Single file, easy to back up, supported everywhere.
- **Zustand** — current client state. Stays as the in-memory layer on top of SQLite.
- **TanStack React Table** — data grids, already in use.
- **Google APIs** (Phase 4) — Sheets API v4, Drive API v3, Gmail API v1, Calendar API v3, People API v1.

### What we're explicitly NOT using

- **Electron** — larger bundle, less efficient, Chromium bundled is overkill
- **Cloud database (Postgres, Supabase, Firebase)** — would require a server, breaks the install-and-own model
- **Paid SaaS backend services** (Clerk, Auth0, Vercel hosting) — same reason
- **LinkedIn Sales Navigator API** — no free tier, closed ecosystem
- **Crunchbase Enterprise API** — no free tier
- **D&B Direct+** — no free tier, costs thousands/month
- **Any fake data in production AI paths** — see `DATA-POLICY.md`

---

## Data Sources — Summary

Full details in `DATA-SOURCES.md` (to be written as part of Phase 1).

### Zero-key (always on)
- **Clearbit Autocomplete** — company name → domain/logo
- **Gravatar** — email → name/avatar/bio
- **GitHub** (unauth, 60/hr) — people + orgs
- **SEC EDGAR** — US public companies + filings
- **Wikidata SPARQL** — notable people + companies
- **GLEIF** — legal entity identifiers, corporate hierarchies
- **ORCID** — academic researchers

### Free key (optional, graceful no-op when missing)
- **GitHub (authed)** — raises limit to 5000/hr
- **OpenCorporates** — 200M+ global companies, 500 req/mo free
- **Companies House (UK)** — unlimited free with key
- **SAM.gov** — US federal contractor registry
- **Hunter.io** — domain → email patterns, 25/mo free

### Paid — NOT USED
- LinkedIn, Crunchbase, ZoomInfo, Apollo, D&B Direct+, People Data Labs (beyond free tier)

---

## Non-Obvious Gotchas For Future Sessions

1. **Do not replace real API calls with fake data.** `DATA-POLICY.md` is the rule. If a provider is flaky or rate-limited, cache it — don't fake it.

2. **API keys are ALWAYS optional.** Every provider must fall back to empty results if the key is missing. No provider should throw on missing config.

3. **Server-side only for external APIs.** Fetches happen in Next.js route handlers (`/api/public-sources/*`), not in client components. This keeps CORS working and keeps keys out of the client bundle.

4. **Cache aggressively.** Free tiers run out fast. Use `src/lib/data/public-sources/cache.ts`.

5. **Tauri-specific APIs must be isolated.** When Phase 2 adds Tauri, any `@tauri-apps/api` calls must be dynamic-imported and gated on `typeof window !== 'undefined' && (window as any).__TAURI__` so `next dev` still works in a normal browser.

6. **Offline-first.** Every feature must work without internet. Public data sources should fail silently. Google sync should queue pending writes.

7. **Non-tech user UX.** Every destructive action requires confirmation. Every error message must be human-readable, not technical. Assume the user has never heard of "API" or "OAuth."

---

## Related Documents

- `docs/DATA-POLICY.md` — *(to be written)* Rules about real vs fake data in AI paths
- `docs/DATA-SOURCES.md` — *(to be written)* Full provider reference
- `docs/SESSION-SUMMARY-2026-04-20.md` — Last session's implementation notes
- `CLAUDE.md` — Project-wide rules for Claude Code sessions
- `AGENTS.md` — Agent behavior rules
- `Case-Study.md` — Portfolio case study notes
