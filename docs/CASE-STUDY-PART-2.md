# Roadrunner CRM — Part 2: The Pivot

**Designer:** Paul Wentzell
**Project type:** AI-assisted product design + engineering
**Part 2 duration:** Apr 17–20, 2026 (follow-on to the original [Part 1](../Case-Study.md) build)
**Tools:** Claude Code, Claude API, Next.js 16, Tailwind, Zustand, TanStack Table, Phosphor Icons, pdf-parse, mammoth

> **Part 1** was about speed — can one designer spin up an AI-native CRM in five days?
> **Part 2** is about **trust** — now that the prototype exists, does the "AI" in it actually hold up when a real person types a real name?

---

## The moment that started Part 2

Near the end of the Part 1 build, I typed "Tom T" into the new-contact form to demo the AI duplicate detection.

Nothing happened.

The detector ran, the progress bar filled, the "No duplicates found" card appeared. Everything worked — except the data it was checking against was a procedurally-generated pool of 2,847 fake names that didn't include "Tom." The hardcoded name list had Thomas, Timothy, Todd, Tony — but no Tom.

The feature wasn't broken. It was **fake** — and for a product whose entire differentiator is "AI prevents dirty data," that's the kind of lie that kills a demo the first time anyone looks past the happy path.

Part 2 is the story of fixing that — not with a patch, but by rebuilding the AI layer against real, authoritative public data. Along the way, the product found its focus: **HR staffing**, where the dirty-data problem is most acute.

---

## The pivot in one sentence

**Replace every "AI" string that was attached to fabricated data with a real external lookup, backed by real public sources, and make the source of every suggestion visible to the user.**

---

## What changed

| | Before | After |
|---|---|---|
| Duplicate detection data | Hardcoded 2,847-name pool | Live queries against 11 public data sources |
| "Source" attribution | Hardcoded label saying "Roadrunner CRM" on fake records | Real provider badges on every result (GitHub, Wikidata, SEC EDGAR, GLEIF, etc.) |
| Enrichment data | Hardcoded switch based on company-name substring | Real-time fan-out to Clearbit + SEC + Wikidata + GLEIF + Hunter, field-level source attribution |
| Company search | Fuzzy match against 150 hardcoded company names | Live autocomplete across 200M+ global entities (incl. OpenCorporates, SAM.gov, Companies House) |
| Resume support | None | Drag-drop PDF / DOCX → parsed fields → prefilled candidate form → original file attached to Documents |
| Target audience | Generic B2B CRM | HR staffing (first focused vertical, configurable terminology for others) |
| Validation | None on most forms | Live field-level validation on every intake surface |

---

## The trust problem, and why it matters for AI products

Every AI feature makes an implicit claim: *"I found this for you."* The user's willingness to trust that claim depends entirely on whether they can answer two follow-up questions:

1. **Where did this come from?**
2. **How confident are you?**

When I audited the original build, every "AI" surface failed both tests. The "Duplicate Detection" card confidently reported matches with "87% confidence" badges, sourced from "Roadrunner CRM." But the confidence was random, and the source label was on fabricated rows inside a hardcoded JavaScript object.

That works for a portfolio demo you show for 45 seconds. It falls apart the moment someone actually uses it.

So the redesign started from a hard constraint:

> **Every AI-produced row in the UI must be traceable to a real external source. The source must be visible. The confidence must be defensible.**

This rule shows up throughout Part 2's architecture — not as a nice-to-have, but as a binding policy checked in at `docs/DATA-POLICY.md` so it survives future sessions.

---

## Choosing the data sources

The design constraint: free, real, and honest about their limits.

I audited ~20 candidate sources and picked 11 based on free-tier accessibility, coverage, and attribution honesty:

**Zero-setup (always on, no signup required):**
- **Clearbit Autocomplete** — company name → domain + logo
- **Gravatar** — email → real person profile
- **GitHub** — people + organizations, 60 req/hr unauthenticated
- **SEC EDGAR** — every US public company's name, CIK, and filings
- **Wikidata SPARQL** — notable people + companies with structured facts
- **GLEIF** — 2.4M verified legal entities with LEI codes
- **ORCID** — researchers, academics, affiliations

**Free-account (graceful no-op if the user doesn't set a key):**
- **GitHub authed** — raises rate limit 83×
- **OpenCorporates** — 200M+ companies, 140+ jurisdictions
- **Companies House (UK)** — full UK registry
- **SAM.gov** — US federal contractor entities (the post-DUNS system)
- **Hunter.io** — domain → named contacts

**Explicitly excluded** (because their paid-only APIs can't honestly ship in a free portfolio demo):
- LinkedIn (no viable free API)
- Crunchbase (paywalled)
- D&B Direct+ (enterprise pricing — tried to find a free tier, none exists that's meaningful)
- ZoomInfo, Apollo, Lusha (all paid)

The exclusion list mattered. The original mock had sources labeled "Crunchbase" and "LinkedIn" on fake data. Part of integrity was removing those labels entirely rather than replacing them with equivalent-quality scrapes.

---

## The architecture: server-side proxy + aggregator fan-out

Every external call routes through a Next.js route handler (`/api/public-sources/...`), not a direct fetch from the browser. Three reasons:

1. **CORS.** Most public data providers don't serve CORS headers. A client-side fetch would fail.
2. **API keys.** Any token-gated provider's key must stay on the server. Never bundle keys to the client.
3. **Caching + rate-limit protection.** Free tiers have limits. An in-memory LRU cache with 1-hour TTL on every provider stretches budgets and speeds up repeat queries.

The aggregator (`src/lib/data/public-sources/index.ts`) runs every query as a parallel fan-out via `Promise.allSettled` — one slow or down provider can't block the others. Results are merged by entity key (domain + name for companies, email + name for people), with a cross-provider identifier map so a single card can cite multiple sources.

This is why, when you type "Apple" in the new-company form, the top result shows **both a Wikidata and a GitHub badge on the same card** — the aggregator matched `apple.com` across both providers and merged them into one entity, preserving attribution for both.

```
Client component (AIDuplicateDetection)
        │
        ▼
useDebouncedQuery hook (350ms debounce, AbortController)
        │
        ▼
/api/public-sources/search-companies (server-side)
        │
        ▼
aggregator.searchCompanies(q)
        │
   Promise.allSettled
        │
   ┌────┴────┬─────┬─────┬─────┬──────┐
   ▼         ▼     ▼     ▼     ▼      ▼
 Clearbit  SEC  Wiki  GLEIF GitHub ...
   │         │     │     │     │      │
   └────┬────┴─────┴─────┴─────┴──────┘
        ▼
  merge by entity + sort by confidence
        ▼
   JSON response
        ▼
  React state → rendered card with source badges
```

---

## Source attribution as a design decision, not a data problem

The moment I committed to real data, the UI problem reframed. It wasn't "show the match" — it was **"make it obvious where the match came from."**

That's a typography, color, and information-hierarchy problem as much as it is a backend one.

Each provider got a permanent color + label pair in a central `SOURCE_META` map (`src/lib/data/public-sources/types.ts`):

- GitHub: dark slate on pale gray
- Wikidata: navy on sky blue
- SEC EDGAR: deep blue on a lighter blue
- GLEIF: teal on pale cyan
- Clearbit: violet on lavender
- Hunter: orange-red on peach

These aren't arbitrary — they match each provider's real brand palette where appropriate, or a neutral tint where the provider doesn't have a strong color identity. The badges are small (11px bold uppercase), read as a "meta chip" rather than shouting, and don't compete with the primary content of the card.

More subtle: **the badges are clickable**. Every result links out to the source record — Wikidata's Q-number page, SEC's EDGAR filing history, GitHub's user profile. A user can verify any suggestion in one click. That's what turns "the AI says" into "three independent public registries agree."

---

## Specialization: HR staffing as the first vertical

With real data flowing in, the product needed a focus. Generic "B2B CRM" is a crowded graveyard. HR staffing chose itself for three reasons:

1. **The dirty-data problem is most acute in recruiting.** Candidates get imported from LinkedIn, Indeed, referral emails, resume inboxes. Dupes everywhere, stale emails, out-of-date titles. The AI-prevention story lands harder here than anywhere else.
2. **The existing data model already fit.** Deals of `type: 'person'` = candidates. Deals of `type: 'company'` = client engagements. The pipeline stages just needed new labels.
3. **The demo story writes itself.** "Drag a resume on. Watch it parse. Five seconds later you have a candidate record with skills, LinkedIn, GitHub, and the resume attached." That's a 10-second video that sells the whole architecture.

The vertical is expressed as a single config file (`src/lib/vertical/hr-staffing.ts`). It defines:

- Label overrides (Deals → Placements, Leads → Candidates, Company filter → Clients)
- Pipeline stage labels (Lead → Sourced; Qualified → Screened; Proposal → Client review; Negotiation → Interview; Closed-Won → Placed; Closed-Lost → Not a fit)
- Recruiting-specific source enum (LinkedIn, Indeed, Referral, Cold outreach, etc.)

Every UI string reads from this file. Nothing is hardcoded. **Swapping the vertical** — to real estate, executive search, or financial advisor management — is a single-file replacement, not a codebase-wide rewrite. That decision took 30 minutes to make and saved every future specialization from being a fork.

---

## The feature that changed the demo: resume parsing

Before Part 2, the Documents module in the CRM was a storage bucket. Files came in, lived there, got searched. Useful but unremarkable.

Part 2 added a **closed-loop resume-to-candidate pipeline** that rewired the Documents module from passive storage to an active intake surface.

The full flow:

1. User drags a PDF or DOCX onto the "Or start from a resume" card at `/contacts/new`
2. Client POSTs the file to `/api/resume/parse`
3. Server extracts text using `pdf-parse` (for PDFs) or `mammoth` (for DOCX), then runs a set of extraction passes:
   - Name detection (first-of-file capitalized 2–4-word lines)
   - Email via regex with domain validation
   - Phone with normalization
   - Skill extraction against a 100+ token tech/HR vocabulary
   - Employment history via a section-aware delimiter-aware parser
   - URL extraction (LinkedIn, GitHub, personal site)
   - Headline inference from the first-page title
4. Each field returns with a **confidence score** (98 for email, 85 for name, 50–95 for skills depending on density)
5. The parsed payload + the raw file bytes are stashed in sessionStorage
6. Client redirects to `/contacts/new/person?from=resume`
7. The new-person page shows a blue "Prefilled from resume" banner and hydrates the form
8. User reviews, edits, moves through the 3-step wizard with the same live validation every other intake form has
9. On **Save Candidate**, three things happen in the same action:
   - The Person record is saved with structured `skills[]`, `linkedinUrl`, `githubUrl`, `websiteUrl`
   - Any extracted URLs become proper Website entries on the contact
   - The original resume file is uploaded to the Documents module with category `resume`, tagged `Recruiting`, and linked to this candidate via `contactId`
10. The new candidate's profile opens, with a "Skills" card on the Details tab rendering every extracted skill as an AI-styled chip, and the resume visible + downloadable from the Documents tab

The whole flow — from dragging a file to having a complete candidate record — takes about five seconds. And unlike the LinkedIn / Crunchbase stuff I excluded, every piece of this runs locally in the browser or server. No paid API. No scrape. Just a parser and a good data model.

This feature is the clearest example of what Part 2 is really about: **taking the AI promise from theatrical to operational.**

---

## UX decisions that came out of Part 2

A few decisions that aren't about data sources but shape the daily experience:

### Validation at intake, not during cleanup

The original app had almost no form validation. Users could save contacts with no last name, invalid emails, phone numbers like "123". The AI was busy finding duplicates against the bad data instead of preventing the bad data from entering.

Part 2 added live field-level validation to every intake surface — New Person, New Company, New Placement, Settings, Alert Rules, Todos, Products & Services. Each field shows a red border + error pill as soon as the value is invalid on blur. The Save button stays disabled until the form is clean.

The design logic: **the moment the user has typed a bad value is the moment they're closest to the context to fix it.** Saving garbage and asking the user to clean it up a month later is a worse UX than a half-second of red-border friction on intake. The validation infrastructure is one shared `rulesMap` + two reusable form components (`EditForm`, `EntryEditForm`), so every future form gets validation for free.

### Grid density with zebra striping

Every data-heavy section (Contacts, Sales, Documents, Recruiting) uses a shared `SharedDataGrid`. The original version had a single row height — generous by most standards (~48px per row).

Part 2 added three user-controllable density presets (Compact / Comfortable / Spacious) + a zebra-stripe toggle, accessible either per-grid via a toolbar button or globally in Settings. The implementation uses CSS custom properties applied to the grid root, so cell renderers (avatars, chips, fonts) scale automatically without prop drilling. A single class swap changes row height, padding, avatar size, and chip font size across every grid in the app.

There's a subtle color-science decision here too: in both light and dark mode, the header bar is drawn one shade **more contrasting than the zebra stripe**, so the visual hierarchy holds — header reads as the dominant element, stripes as a secondary scannability aid. Getting this balance right in dark mode took three iterations.

### Settings architecture: master switches + sub-toggles

The original Settings page had 13 separate toggles for alerts and AI features. Turning them all off one at a time was tedious. Users wanted a "turn off all AI" button.

Part 2 restructured Settings around the pattern **one master switch + fine-grained sub-toggles**:

- **AI Insights** master toggle (top of Settings)
  - When off, every AI-branded panel hides app-wide: duplicate detection, enrichment, record-health card, page insights bars, AI Suggestions widget
  - The sub-toggles under Notifications (`staleAlerts`, `aiSuggestions`) get visually disabled with "Disabled — turn on AI features above to use"
- Same pattern on Sidebar Badges and Page Insights Bars sections

The cognitive payoff: if the user just wants the CRM without any AI theater, one click cleans up the entire app. Power users still get the fine-grained controls. This is the kind of accessibility decision that doesn't show up in feature lists but lowers the daily friction for anyone who's AI-skeptical.

---

## What's visible in the live demo

When a hiring manager opens the deployed demo and starts exploring:

1. **Dashboard** — seeded with recruiter-shaped widgets (stalled deals, next actions, incomplete contacts). The "Weekly summary" email banner appears if they haven't dismissed it.
2. **Contacts → + Add Contact → Person** → type "Linus" — real suggestions from GitHub, Wikidata, ORCID appear with colored source badges. Linus Torvalds shows up with *both* a GitHub badge and a Wikidata badge on the same card because the aggregator merged the match.
3. **Contacts → + Add Contact → Company** → type "Shopify" — Clearbit returns the domain, SEC EDGAR returns the real CIK, GLEIF returns the Irish subsidiary, Wikidata returns HQ + employee count + founding date. All on one form as the user types.
4. **Contacts → + Add Contact → Upload resume** — drag any PDF / DOCX resume on. Watch the parse progress. Land on a prefilled candidate form with a banner showing what was extracted. Save. Land on a candidate profile with a Skills card and the resume attached in Documents.
5. **Placements** (formerly Sales) — seeded with real recruiter-shaped placements (Vertex Sr. Data Scientist retained, Meridian VP Compliance, Clearpath 3 Investment Analysts contingent). Drag cards between Sourced / Screened / Client review / Interview / Placed columns.
6. **Settings → AI Insights master toggle** — flip it off. Watch every AI panel disappear across the app.
7. **Settings → Grid Density** — flip between Compact, Comfortable, Spacious. Toggle zebra striping. See every grid update instantly.
8. **Help → Settings Tour** — 8-step guided walkthrough of every Settings section with spotlights.

None of this is mockup. Every interaction persists in localStorage. Every AI result came from a real public API.

---

## What I learned in Part 2

**Real-data AI is mostly a trust UX problem, not a model problem.** The difference between a believable AI product and an impressive demo is how honest it is about where information came from. Source badges, confidence scores, deep-links — these are 20% of the feature's code and 80% of why people trust it.

**Graceful degradation is a required feature, not a polish item.** The aggregator fans out to 11 providers. Any of them can fail, timeout, or rate-limit. The architecture treats this as expected — `Promise.allSettled`, empty-array fallbacks, no exception bubbles to the UI. Users never see "something went wrong" for a dead provider; they just see fewer cards. This makes the whole system robust without any monitoring.

**Specialization makes the product.** Before Part 2 the CRM was generic. After the HR staffing terminology pass, the same app feels like it was custom-built for recruiters. One config file, massive perceived fit. The lesson: the vertical is a product decision that only takes hours once the architecture supports it.

**Preventing bad data is cheaper than fixing it.** Validation at intake is tedious engineering work that users never notice. But it compounds — every valid record makes every downstream feature (search, dedup, AI enrichment, reporting) work better. Part 2's validation pass was the least visible change and probably the most durable.

**AI that hides its seams is dishonest; AI that shows them is trustworthy.** The source badges, the confidence scores, the "Prefilled from resume" banner, the deep-link to each source — these don't try to make the AI look magical. They make it look accurate. For enterprise users with data-quality concerns, that's the entire difference.

---

## Tech notes

Running the demo locally:

```bash
git clone <repo>
cd navigator-crm-app
npm install
npm run dev
# open http://localhost:3000
```

The zero-key providers work immediately. To unlock the rest:

```bash
cp .env.local.example .env.local
# fill in any of: GITHUB_TOKEN, OPENCORPORATES_TOKEN,
# COMPANIES_HOUSE_TOKEN, SAM_GOV_TOKEN, HUNTER_TOKEN
# all free-tier sign-ups, none required
```

Stack:

- Next.js 16 (App Router, Turbopack)
- Tailwind CSS with design tokens
- Zustand for client state (persisted to localStorage)
- TanStack Table for data grids
- Phosphor Icons for iconography
- pdf-parse + mammoth for resume extraction
- Public data APIs (Clearbit, GitHub, SEC EDGAR, Wikidata, GLEIF, ORCID, OpenCorporates, Companies House, SAM.gov, Hunter, Gravatar)

Repo conventions:

- `docs/ROADMAP.md` — product direction and future work
- `docs/DATA-POLICY.md` — binding rule: no fake data in AI paths
- `docs/DATA-SOURCES.md` — full reference for every public data provider
- `src/lib/data/public-sources/` — one file per provider, aggregator, cache
- `src/lib/vertical/hr-staffing.ts` — the vertical config
- `src/lib/resume/parser.ts` — resume extraction logic

---

## What's next

A selection of the work already scoped in `docs/ROADMAP.md`:

- **Full SQLite migration** — move off localStorage to real local persistence with export/import
- **Google Workspace integration** — Contacts, Drive, Gmail, Calendar via OAuth
- **Expanded resume parsing** — NER pass with LLM refinement for fuzzy employment history
- **Interview scheduling flow** — Calendar-backed, candidate + client + recruiter tri-view
- **Skill-based matching** — score candidates against open placements using their parsed skills
- **Additional verticals** — real estate, executive search, financial advisor networks (each a single config file)

---

## Credits

Built with Claude Code. Claude was the pair programmer for every architectural decision, every provider integration, every design token, and every retry when a provider's API turned out to be flakier than expected. The collaboration pattern is the real subject of both case studies — one designer, one AI, one week to find out what's possible.

---

## Related

- [**Part 1: The Original Build**](../Case-Study.md) — how the prototype came together in five days using Claude + Figma MCP + a made-up design system.
- `docs/ROADMAP.md` — product direction.
- `docs/DATA-POLICY.md` — why fake data is banned in AI paths.
- `docs/DATA-SOURCES.md` — every provider, every rate limit.

---

# Part 3: UX Polish — The Decisions Behind the Details

**Duration:** Apr 21, 2026 (one-day polish sprint before portfolio push)

Part 1 was speed. Part 2 was trust. Part 3 was **craft** — a full day spent making the existing features feel considered, consistent, and hiring-manager-ready. Every change in this section came from a specific UX principle or industry precedent, not from "make it prettier." What follows is the decision log.

---

## 1. Sticky Actions column on every grid

**The call:** Pin edit/delete icons to the right edge of every data table so users never have to scroll horizontally to find them. Add an "Actions" header label. Show icons on row hover only.

**The principle:** **Fitts's Law** — frequently-used controls should be close and always reachable. Hiding edit/delete behind horizontal scroll violates this. Hover-only visibility keeps visual noise low while preserving discoverability.

**Industry precedent:** Salesforce, HubSpot, Linear, and Notion all pin row actions to the right edge of data tables. This is the default in every mature CRM.

**Implementation detail:** Since every grid in the app uses a shared `SharedDataGrid` component (Contacts, Placements, Recruiting, Documents, Custom Reports), one change pinned Actions globally.

---

## 2. Private contact filter — match the app's filter language

**The call:** Add a "Private" filter pill to the Contacts filter bar. Initially shipped it in red. Walked it back to brand blue to match Favorites and the type filter.

**The principle:** **Color consistency + semantic color reservation.** Red should mean *danger* or *destructive*, not *category*. A red "Private" pill implied the filter was dangerous — it's not, it's just a category.

**What this shows:** Restraint. The instinct was "private = hide = red." The right move was "category filter = the color all other category filters use."

---

## 3. 3-dot menu → inline icons when the action count is small

**The call:** Replaced the Placements grid's 3-dot overflow menu (with "Open deal" and "Delete" inside) with two inline icons.

**The principle:** **Progressive disclosure at the wrong layer.** A 3-dot menu is the right pattern when you have 5+ actions. With only 2 actions, it adds an extra click with zero payoff. The overflow menu is a tool for hiding density, not complexity.

**Industry precedent:** Linear, Height, and Shortcut all use inline icons when action count ≤ 3.

---

## 4. Tabbed help panel — ending the scrollfest

**The call:** The help panel was ~770px of vertical scroll in a 600px viewport — AI ask + tips + eleven tour cards + quick links, all stacked. Redesigned into a pill-segmented **Tips / Tours / Resources** tab system with the current-page's tour pinned at the top of the Tours tab as "Recommended for this page."

**The principles:**
- **Minimize scrollfests in fixed-height UI.** Side panels and popovers have a hard ceiling; stacked content past the fold is invisible.
- **Consistency of pattern.** First attempt used underline tabs — I pointed out they didn't read as navigation. Shipped as pill-segments matching the List/Card toggle and All/Organizations/People filter already used throughout the app.
- **Remove decorative metrics.** A "12" count badge on the Tours tab was dropped — a raw number without units is noise, not information.

**What this shows:** A count only helps if the user can act on it ("12 unread") or compare it to something meaningful ("12 of 40 complete"). A naked "12" of tours is just clutter.

---

## 5. Chart palette picker — user agency over visual output

**The call:** Add a palette selector to every chart widget (Pipeline by stage, Deals by source, Custom Reports). Eight curated palettes — brand, AI-themed, analytical, etc.

**The principle:** **User agency.** Dashboards are personal. Hardcoded palettes say "I know what's best for you"; customization says "this is yours." The moment a user can't recolor a chart to match their presentation deck, they stop using the tool.

**Industry precedent:** Mixpanel, Amplitude, Looker, Tableau — all expose palette pickers.

---

## 6. Admin card customization — restrict the surface to what matters

**The call:** Admin cards (User Management, AI Usage, System Health) got a customization popover. First draft let users change card background, border color, inner tile background, tag colors, name/email typography, value and subtitle text styles. Cut it down to **inner tile background + tag styling + typography for names/emails/values/subtitles** — dropped card body background and card border as editable fields.

**The principle:** **Limit customization surface to where it matters.** Forty knobs creates decision paralysis and inconsistent output across a team. Three to five knobs that cover 90% of real use cases is the right balance.

**What got cut and why:**
- **Card body background** — if every admin card has a different body color, the dashboard stops feeling like one surface.
- **Card border color** — borders should be part of the shared design system, not per-card.
- **Inner tile background** (kept) — this is the content-level customization users actually want.

---

## 7. 3-column popover layout for customization

**The call:** The customization popover's 6+ fields in a single column felt long. Restructured as three columns: **Appearance** / **Sub-elements** / **Typography**.

**The principle:** **Horizontal grouping beats vertical stacking for categorical content.** Vertical lists force scanning top-to-bottom. A 3-column layout lets users glance and locate — their eyes pattern-match on category labels instead of reading through every row.

---

## 8. Color chip system — saturated + tints + Ink/Paper ends

**The call:** Color pickers shipped with 10 saturated chips. Added a second row of tints. Anchored both rows with **Ink (black)** and **Paper (white)** at the ends. Pushed the tints darker twice when they read as "too light" against white card backgrounds (`#F8FAFC` → `#F1F5F9` → `#E8EEF5`).

**The principle:** **Scaffolded color systems.** This mirrors how Material Design and Tailwind structure color tokens — base hues, plus tint/shade ramps, plus neutral anchors. Designers recognize the pattern instantly, which builds trust in the app's design literacy.

**The iteration detail:** Tints shipped at Tailwind's `slate-50` default. The iteration to `#E8EEF5` was driven by one observation — the chip was so close to the card background that users couldn't tell they'd selected anything. Visibility of selection is non-negotiable.

---

## 9. Right-pane contact chooser instead of full-page route

**The call:** The "+ New Contact" button in the Contacts grid used to route to a full-page wizard at `/contacts/new`. Moved it into a slide-over right pane that appears over the grid.

**The principle:** **Context preservation.** Full-page routes break the user's task context — they lose their place in the grid, their filter state, the row they were about to click. Slide-over panels keep the grid visible behind them and let the user abandon the new-contact flow without losing anything.

**Industry precedent:** Notion, Linear, Things, and Figma all use slide-overs or modals for "quick-add" tasks initiated from a primary surface.

---

## 10. Multiple exit paths for the contact form

**The call:** The full-page new-contact form had only the browser's back button and a breadcrumb as ways to leave. Added a prominent X in the form's top-right corner + ESC keyboard support + the breadcrumb already there.

**The principle:** **User control and freedom** (Nielsen heuristic #3). A single exit method fails users who click outside expecting dismissal or who reach for ESC. Three exit paths = zero stuck users.

---

## 11. Toast notifications for every significant action

**The call:** Added a four-severity toast system (success / error / warning / info) and wired it into every contact save, deal save, document upload, resume parse, stage drag, and settings change. Destructive actions (contact delete, deal delete) got toasts with an **Undo** action.

**The principles:**
- **Acknowledgment of action** (Shneiderman's rule 4). Every destructive or permanent action needs confirmation feedback. Silent success is disorienting — users re-perform the action because they're unsure it worked.
- **Reversibility reduces fear.** Undo-in-toast is the gold-standard pattern — Gmail archive/trash, Slack message delete, Figma layer delete. It lets users act fast without second-guessing.

**The refinement:** First pass missed contact deletion instrumentation. Caught by the direct question *"if I delete a contact will I see a toast?"* — which exposed the gap. Toast + Undo added to both Contacts and Placements delete flows.

---

## 12. Column pinning, persisted

**The call:** Added left/right column pinning to every grid via the Columns dropdown. Pin buttons always visible (not hover-only). Pinning state persists across refresh via Zustand's `persist` middleware.

**The principle:** **User-controlled information priority.** Wide tables force horizontal scroll; pinning lets users decide which columns stay visible. This is the same pattern Excel has used for 30 years, which is why it feels right immediately.

**The discoverability fix:** First pass had pin icons hidden until hover — following the same hover-reveal pattern as other column actions. User feedback caught that nobody knew pinning existed. Made pin icons always visible in the Columns dropdown. **Frequency of use trumps visual quiet when the feature is hidden.**

---

## 13. Grid help tour

**The call:** Added a route-agnostic "Grids" tour that teaches the shared toolbar every data grid uses in the app — Views, Columns (with pinning), Density, Reset, sticky Actions, the header interactions (sort, filter, drag, resize).

**The principle:** **Feature discoverability.** All those grid controls are powerful but hidden. A tour is the lowest-effort way to expose them without cluttering the UI with persistent tooltips. Progressive onboarding beats tooltip-everywhere because it lets users opt in when they want to learn.

**The scoping decision:** The tour targets elements that only exist on list-view pages. Launching from a non-grid page (Settings, Admin) auto-navigates to `/contacts` first — so the tour always has targets to spotlight. Avoids the "tour starts, nothing to highlight, user confused" failure mode.

---

## The through-lines

Six themes run through all thirteen decisions:

| Theme | Where it showed up |
|---|---|
| **Consistency of pattern** | Private filter matching Favorites · pill tabs matching List/Card · color chip system matching Material/Tailwind |
| **Reduce friction for frequent actions** | Sticky Actions · inline icons · right-pane over full-page · column pinning |
| **Reserve semantic weight** | No red for non-danger · no decorative counts · restrict customization surface |
| **Multiple paths for users** | ESC + X + breadcrumb · toast + Undo |
| **Customization where it matters, not everywhere** | Inner tile yes, card border no · 5 knobs not 40 |
| **Hide complexity until needed, but not so deep it disappears** | Hover-only icons except pinning · tours over tooltips · tabbed panel |

Every one of these is a small choice. The case study's point is that **small, principled choices compound** — a CRM where the edit icon is always in the same place, the filter pills use the same color language, and the help panel doesn't bury the tour you need is a CRM that respects the user's time. That respect is what separates a demo from a product.

---

**Credits (Part 3):** One day. Claude Code as pair programmer. Every decision above was discussed, challenged, and shipped collaboratively.
