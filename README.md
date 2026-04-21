# Roadrunner CRM

**AI-powered CRM that prevents dirty data at intake by cross-referencing every new record against 11 real public data sources.** Built by Paul Wentzell as a portfolio demonstration of AI-native product design.

![Light / dark mode screenshot](ai%20UI/Frame%202.png)

---

## Quick links

- 🚀 **Live demo:** *coming soon — Vercel deployment in progress*
- 📖 **Case study part 1:** [The original five-day build](./Case-Study.md)
- 📖 **Case study part 2:** [The pivot — from fake AI to real data](./docs/CASE-STUDY-PART-2.md)
- 🗺️ **Product roadmap:** [docs/ROADMAP.md](./docs/ROADMAP.md)
- 📋 **Data policy:** [docs/DATA-POLICY.md](./docs/DATA-POLICY.md) — why fake data is banned in AI paths
- 📡 **Data sources:** [docs/DATA-SOURCES.md](./docs/DATA-SOURCES.md) — every provider, every rate limit

---

## What it does

Most "AI CRM" demos fake their AI. They show a confidence badge next to a hardcoded label and call it a day.

Roadrunner CRM does the opposite: every AI-produced suggestion comes from a **real public data source**, every suggestion shows a **colored source badge** identifying the provider, and every badge is **clickable** so users can verify the data themselves.

Type a real name like "Linus Torvalds" in the new-contact form, and real profiles appear from GitHub, Wikidata, and ORCID — merged into a single card when the same entity is matched across multiple providers. Drag a PDF resume onto the upload card, and five seconds later you have a candidate record with extracted skills, LinkedIn URL, GitHub URL, employment history, and the original resume attached to the Documents module.

The product is specialized for **HR staffing** (placements, candidates, clients, recruiting pipeline stages) via a single config file that can be swapped for other verticals.

---

## Key features

- 🔍 **Real-data duplicate detection** across 11 public sources (Clearbit, SEC EDGAR, Wikidata, GLEIF, GitHub, ORCID, Gravatar, OpenCorporates, Companies House, SAM.gov, Hunter.io)
- 🏷️ **Source attribution on every suggestion** — colored badges, deep-links to the source record
- 📄 **Resume parsing** (PDF / DOCX) with automatic candidate creation + file attachment + skill extraction
- ✅ **Validation at intake** — live field-level validation on every form (email format, phone format, ZIP, URL, required, max length)
- 📊 **Density-configurable data grids** — Compact / Comfortable / Spacious + zebra striping, with sticky column pinning and drag-to-reorder
- 🎛️ **Master AI toggle** — one click disables every AI-branded panel app-wide
- 🌓 **Light + dark mode** with deliberate color contrast on zebra rows, header bars, and source badges
- 🔒 **Server-side proxy architecture** — API keys stay on the server, client never sees tokens

---

## Getting started

```bash
git clone https://github.com/PWetzell/RoadRunnerCRM.git
cd RoadRunnerCRM
npm install
npm run dev
# open http://localhost:3000
```

The zero-key providers (Clearbit, Gravatar, GitHub unauth at 60 req/hr, SEC EDGAR, Wikidata, GLEIF, ORCID) work immediately with no configuration.

### Optional: unlock the rest

Seven providers require free API tokens. Skipping them is fine — every provider gracefully no-ops without its key, and the other seven carry the demo.

```bash
cp .env.local.example .env.local
# fill in any of:
#   GITHUB_TOKEN           (5000 req/hr instead of 60)
#   OPENCORPORATES_TOKEN   (500 req/mo free)
#   COMPANIES_HOUSE_TOKEN  (unmetered free)
#   SAM_GOV_TOKEN          (1000 req/day free)
#   HUNTER_TOKEN           (25 searches/mo free)
```

Every key above is **free to obtain** and has a free-tier. See `docs/DATA-SOURCES.md` for signup links and rate limits.

---

## Architecture at a glance

```
                        Client components
                              │
                              ▼
              useDebouncedQuery hook (350ms debounce)
                              │
                              ▼
        /api/public-sources/* (Next.js route handler — server-side)
                              │
                              ▼
     aggregator.searchCompanies / searchPeople / enrichCompany
                              │
                       Promise.allSettled
                              │
     ┌────────┬──────┬────────┼────────┬────────┬────────┬─────┐
     ▼        ▼      ▼        ▼        ▼        ▼        ▼     ▼
   Clearbit SEC  Wikidata  GLEIF   GitHub  OpenCorp   SAM   Hunter
                              │
                              ▼
                merge by entity key + sort by confidence
                              │
                              ▼
                        JSON response
                              │
                              ▼
                 Cards with source badges
```

All external API calls run **server-side** via Next.js route handlers in `src/app/api/public-sources/*`, never from client components. This keeps keys out of the client bundle and sidesteps CORS restrictions.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS** with design-token CSS variables
- **Zustand** for client state (persisted to localStorage)
- **TanStack Table** for data grids
- **Phosphor Icons** for iconography
- **pdf-parse + mammoth** for resume text extraction
- **Public data APIs** — Clearbit, GitHub, SEC EDGAR, Wikidata SPARQL, GLEIF, ORCID, Gravatar, OpenCorporates, Companies House, SAM.gov, Hunter.io

---

## Repo layout

```
src/
├── app/                              # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── public-sources/           # Server-side proxies to external providers
│   │   └── resume/parse/             # Resume parser endpoint
│   ├── contacts/ sales/ recruiting/  # CRM workspaces
│   └── layout.tsx                    # Root shell + Suspense boundaries
├── components/                       # React components
│   ├── contact-flow/ai/              # AI duplicate detection + source badges
│   ├── detail/                       # Shared detail-page cards
│   ├── ui/SharedDataGrid.tsx         # Density + zebra + pinning
│   └── ...
├── lib/
│   ├── data/public-sources/          # One file per data provider + aggregator
│   ├── resume/parser.ts              # PDF/DOCX extraction
│   ├── vertical/hr-staffing.ts       # Vertical-specific labels
│   └── validation.ts                 # Reusable field-rule engine
├── stores/                           # Zustand stores
└── types/                            # TypeScript domain types

docs/
├── CASE-STUDY-PART-2.md              # The pivot from fake AI to real data
├── ROADMAP.md                        # Product direction
├── DATA-POLICY.md                    # Binding rule: no fake data in AI paths
└── DATA-SOURCES.md                   # Provider reference

Case-Study.md                         # Part 1: the original five-day build
```

---

## Design decisions worth calling out

- **Source attribution is a UX problem, not a backend one.** Colored badges that match each provider's brand, deep-links to the source record, multi-source merging on the same card — the whole trust story is in the presentation layer.
- **Graceful degradation is mandatory.** Every provider call is wrapped in `Promise.allSettled` with empty-array fallbacks. A down provider never propagates an error to the UI — users just see fewer cards.
- **Specialization via config, not fork.** The HR staffing vertical is a single file (`src/lib/vertical/hr-staffing.ts`) that overrides labels and pipeline stages. Swapping verticals is a file replacement, not a codebase rewrite.
- **Validation at intake prevents downstream cleanup.** Every form field is live-validated on blur with a red border + error chip; the Save button stays disabled until the form is clean. Intake friction is cheaper than cleanup later.
- **No fake data in AI paths.** See `docs/DATA-POLICY.md` — binding rule that keeps future sessions honest about what's real.

---

## Development notes

- **Typecheck:** `npx tsc --noEmit`
- **Production build:** `npx next build`
- **Dev server:** `npm run dev` (Turbopack)
- The project uses **Turbopack** in both dev and build. Compile times are sub-5s.

---

## Credits

Built by **Paul Wentzell** with Claude Code as the pair programmer. The collaboration pattern itself is the subject of both case studies — one designer, one AI, one focused build.

Connect: [paulwentzell.com](https://pwetzell.github.io) · [LinkedIn](https://www.linkedin.com/in/paulwentzell)

---

## License

MIT
