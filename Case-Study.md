# Roadrunner CRM — Portfolio Case Study

**Designer:** Paul Wentzell
**Project type:** AI-assisted UX design demonstration
**Duration:** Apr 12–16, 2026
**Tools:** Claude Code, Claude API, Figma MCP, Next.js, Tailwind, Zustand, dnd-kit, Phosphor Icons

---

## The premise

I spent years designing enterprise CRM workflows for financial services — back when AI wasn't an option. Roadrunner CRM is my answer to the question I kept asking myself:

> **What would that work look like if AI had been in the toolbox?**

This isn't a theoretical design — it's a functioning prototype built in five days using AI at every layer: AI built the design system, AI generated the Figma screens, and AI powers the product's own features.

---

## The three-layer AI story

This project tells hiring managers a single coherent story by threading AI through every layer of the stack:

| Layer | What it is | How AI shows up |
|-------|-----------|-----------------|
| **1. Design System (Acme)** | Tokens, components, handoff docs | Built in 3 days using Claude Code + Figma MCP (vs. ~3 weeks manual) |
| **2. Figma Screens** | Navigator CRM mockups | Generated locally via Claude Code + Figma plugin |
| **3. The Product** | Roadrunner CRM working app | Real AI features: duplicate detection, deal scoring, next-step suggestions, match scoring, auto-populate, anomaly flagging |

The story is: *a designer who ships AI-native products, not just AI-themed decks.*

---

## What shipped

**Eight modules, fully functional:**

### 1. Contacts
- Two-type model (Person / Organization) with filtering, search, saved views
- Grid + card views with drag-to-reorder columns
- Detail pages with tabs: Overview · Details · Org Chart · Documents
- Editable section cards with SectionCard pattern (pencil → inline form → Save)
- AI auto-populate with teal-flash confirmation animation
- Stale/incomplete detection with AI-badge transparency
- Multi-entry arrays for emails, phones, addresses, websites

### 2. Sales
- Person-first AND Company-first lead types (supports between-jobs candidates)
- List grid + Status kanban views
- Completeness progress bar per deal (weighted checklist)
- Detail tabs: Overview · Details · Qualify · Documents
- Qualify tab: Company Details, Revenue Volume, Sales Volume, Products & Services cards — each editable via pencil
- Drag-to-change-stage on kanban (released Apr 16)
- Conversion to Customer flow

### 3. Recruiting
- Projects existing Sales data through a recruiting lens (no duplication)
- Kanban pipeline: Sourced → Screening → Interview → Offer → Placed / Rejected
- AI match scores on candidate cards (probability + contact completeness + deal size)
- List view with sortable columns

### 4. Documents
- Any file type, drag-and-drop upload from hard drive
- Grid + card/thumbnail views
- Preview panel slides in from the right (images inline, PDF placeholders)
- Category taxonomy (Contract, Proposal, Invoice, Report, etc.)
- Documents tab embedded in contact + deal detail pages
- File-family-specific placeholder thumbnails (PDF, DOCX, XLSX, PPTX, ZIP, image, text)

### 5. Dashboard
- Fully customizable widget grid with dnd-kit sortable reorder
- Preset views: Sales Rep · Recruiter · Manager (role-aware)
- Save-as-new-view, rename, delete
- Widget types: KPI counters, Pipeline chart, Deals-by-Source chart, Recent deals/contacts lists, Stalled deals list, To-do, AI Suggestions
- Per-widget Edit Card popover: icon (searchable ~110 Phosphor icons), header color, icon color, text color, text size (SM/MD/LG/XL/XXL), alignment, title/value/subtitle controls
- Three widget sizes (Compact / Medium / Wide) + drag-corner free resize
- Auto-scroll when resizing past viewport bottom
- Container-query responsive content (widgets scale internally with size)
- Option A item caps: list widgets cap by size + "View all →" deep link

### 6. Reporting
- 6 KPI tiles (Open Deals, Pipeline Value, Won Revenue, Win Rate, Velocity, Total Deals)
- Pipeline Funnel chart (stacked bars by stage)
- Revenue by Source chart
- Deal Metrics (avg deal size, win rate, velocity, lost revenue)
- CRM Health (active contacts, incomplete, documents, open deals)
- Every report card has the Edit Card gear for customization

### 7. Admin
- System Overview with KPI tiles
- System Health (API, DB, AI service, storage) with severity indicators
- User Management (5 demo users with roles)
- Roles & Permissions (Admin, Manager, Sales Rep, Recruiter, Read Only — with permission badges)
- Audit Log (8 recent actions)
- Data Management action buttons (export, import, purge, sync)
- AI Usage metrics (calls today, this month, model, avg response)

### 8. Cross-cutting systems

**Alerts / Notifications**
- 22 alert types across Sales, Contacts, Documents, Recruiting, AI, System, Custom, Reminders, Tasks
- 4 severity levels (info, success, warning, critical)
- Bell icon with unread badge count
- Settings sub-panel: min severity threshold, per-type toggles by category, desktop notifications, sound-on-critical
- Custom alert creation (title, message, severity, link)

**Help / Guided walkthroughs**
- Context-aware tips that change based on current page
- 7 guided walkthroughs (Dashboard, Contacts, Sales, Recruiting, Documents, Reporting, Admin)
- Step-by-step tours with progress dots + Back/Next/Done
- AI Help input (UI ready for Claude integration)
- Quick links (keyboard shortcuts, docs, support, what's new, bug report)

**Edit Card universal pattern**
- Same gear-icon-opens-popover UX on dashboard widgets, report sections, admin panels, kanban cards
- Header color, icon, icon color, text color, text size, alignment
- Per-widget title/value/subtitle typography controls
- Draggable popover (never cut off)
- Persistent via Zustand → localStorage

---

## Design principles

1. **AI has a single visual signature** — teal (#1FA4B6) throughout. Users learn in seconds: teal = AI involvement. Never ambiguous.
2. **AI badges on fields** — transparent, auditable. You always know what AI touched.
3. **Animated field fill** — AI action is visible, not invisible background magic.
4. **Confidence scores on suggestions** — smart signal, never a hard block.
5. **No scroll inside cards** — cards are previews, not containers. "View all →" deep-links into modules.
6. **Demo-ready without a live key** — realistic fallback responses show the full experience.
7. **No framework coupling** — single Next.js/Tailwind codebase, generic B2B terminology, easy to reskin as a template.
8. **Consistency is UX** — same SectionCard edit pattern across Contacts, Sales, Documents. Same filter-bar layout everywhere. Same grid behavior.

---

## Key design decisions (with tradeoffs)

### Edit Card everywhere, not just on the Dashboard
**Decision:** Every card surface (dashboard widgets, report sections, admin panels, kanban cards) shares the same gear-icon-opens-Edit-Card UX.

**Why:** Users don't distinguish between "widget" and "card" — they just see surfaces. If the dashboard is customizable but the kanban isn't, it feels arbitrary.

**Tradeoff:** More infrastructure (separate card-style-store, InlineCardSettings hook, ConfigurableCard wrapper). Paid back immediately in consistency.

### Person-first leads (between-jobs candidates)
**Decision:** Deal.type = 'person' | 'company'. Person leads don't require an associated company.

**Why:** A common recruiter workflow — a strong candidate between roles — was impossible to represent with an org-required model. My own current status inspired the fix.

**Tradeoff:** Had to make orgContactId optional in the Deal type. Broke a few assumptions that needed guarding. Worth it.

### Kanban card drag-to-change-stage with dnd-kit
**Decision:** Use dnd-kit's Draggable + Droppable instead of HTML5 drag-and-drop.

**Why:** Same library already used for grid column reorder. Accessibility support, keyboard nav, touch support, animated drop preview.

### Projected recruiting data (no separate store)
**Decision:** Recruiting module projects Sales deals + Contacts through a recruiting lens instead of maintaining a separate recruiting store.

**Why:** A person-type deal IS a recruiting engagement. Duplicating data creates sync bugs. Projection keeps it clean.

**Tradeoff:** Recruiting-specific fields (candidate preferences, salary history, interview notes) would need to extend the deal model. Acceptable for this demo.

### No scroll inside cards
**Decision:** List widgets cap items by widget size + "View all →" footer. Todo shows "+N more" expand button.

**Why:** Industry research — Linear, Stripe, Vercel, Notion all converged on this pattern. Scrollable cards feel dated and hide information.

**Tradeoff:** "View all →" means users leave the widget. That's actually the goal — the dashboard becomes a launchpad.

### Drag-from-anywhere popover (with auto-scroll)
**Decision:** Edit Card popover is draggable anywhere on screen with viewport-clamped positioning. Drag-resize on widgets extends the page temporarily so there's always room.

**Why:** Users pick colors and want to SEE the effect on the card. A popover stuck over the card they're editing is unusable.

---

## The build story (what I actually did)

**Day 1 (Apr 12):** Design system + Figma screens
- Built Acme design system in 3 days using Claude Code + Figma MCP
- Started Navigator CRM Figma mocks
- Decided on Phosphor Icons (6 weights, duotone as AI signature)

**Day 2 (Apr 13):** CRM prototype scaffold
- Set up Next.js + Tailwind + Zustand
- Built Contacts module with person/org types
- Wired Anthropic Claude API with demo-mode fallback
- AI auto-populate + duplicate detection working

**Day 3 (Apr 14):** Sales module
- Deal pipeline with stages (Lead → Negotiation → Closed)
- Kanban + list views
- AI deal scoring + next-step suggestions
- Fixed layout bounce between views (unified padding + placeholder toolbars)

**Day 4 (Apr 15):** Deep feature work
- Detail page tab pattern (Overview / Details / Qualify / Documents)
- Completeness progress bar per lead type
- Editable SectionCard pattern everywhere
- Sales kanban gets People/Company toggle
- Hydration error fix (dnd-kit mount guard)

**Day 5 (Apr 16, overnight):** Scope expansion + template polish
- Documents system (types, store, upload from hard drive, preview panel)
- Recruiting dashboard (kanban + AI match scores)
- Reporting dashboard (KPIs, funnel, charts)
- Admin dashboard (users, roles, audit log, AI usage)
- Alert system (22 types, 4 severities, settings, custom alerts)
- Help system (context-aware tips, 7 guided walkthroughs)
- Universal Edit Card pattern across all card surfaces
- Drag-to-change-stage on Sales kanban
- Standalone /todos page
- Recruiting list view
- This case study

---

## Post-v1 — what kept shipping (Apr 17 – Apr 28)

The five-day sprint produced a working CRM. The next two weeks turned it into a product. Each area below was a multi-commit effort with its own rationale, not a one-off polish pass.

### Real backend (Supabase + Postgres)
v1 stored everything in browser-local Zustand. That made "real working CRM" a stretch — open in a second browser and the workspace was empty. Migrated every persisted store to Supabase Postgres with Row Level Security on every table. Built a signed `exec_sql` installer for migrations so schema pushes don't need a raw DB password in CI. Demo users still get browser-local sandbox state; real users get durable cloud state. Single codepath, branched on identity.

### Gmail sync + OAuth
A CRM that can't see a sender's email thread is a Rolodex. Wired Google OAuth with refresh-token capture, a Gmail sync worker that resolves senders to contacts and stitches threads onto every Overview timeline, and a top-sender import surface that turns the first sync into onboarding. Hourly cron initially — Vercel Hobby plan rejected anything more frequent than daily, so the schedule was rewritten and a separate `/api/debug/run-migration-NNNN` endpoint was added for ad-hoc DDL pushes.

### Manage Emails (Bulk + Sequences)
First pass treated bulk send and follow-up cadences as actions on the contact list — buried in a kebab menu. Recruiters at staffing CRMs never used the equivalent feature there because they couldn't find it. Promoted both to top-level modules:

- **Bulk Email** page: four stat cards (Total sent, Bulk batches, Delivery rate, Recipients), scannable history feed with attachment previews, AI-drafted copy.
- **Sequences** page: live performance row (Active, Completed, Reply rate, Replied), step funnel visualizing drop-off between touch one and touch three, per-enrollment due-date table.

Both render inside the same density tokens as the rest of the app — flipping Compact retightens the sequence funnel along with the grids.

### Density preset architecture
Every grid started with hardcoded font and padding utilities — `text-[13px]`, `px-3`, `py-2` repeated across four grids and dozens of cells. When users asked "can I fit more rows on screen," the only answer was a sprint editing every component. Built three configs that emit CSS custom properties on the page wrapper:

- `DENSITY` — driven onto the data grid root
- `CARD_DENSITY` — driven onto the card-view root
- `DETAIL_DENSITY` — driven onto the detail-page wrapper

Every grid cell, card tile, and detail section reads `var(--grid-font)`, `var(--card-p)`, `var(--detail-card-px)`. User picks Compact / Comfortable / Spacious and the data grid, card view, and detail page all retighten in one paint with no per-component edits. Compact landed at twenty-pixel rows after iterating 8 → 12 → 16 → 20.

### Help tour expansion
Original launch had seven walkthroughs. Added tours for `/bulk`, `/sequences`, AI assistance flows, and a density-preset step in the contacts tour. Total now sits at fourteen contextual tours, all reachable from the help panel on any page — no autoplay, no install cutscenes, no buried "restart tutorial" setting.

### Login / AuthGate rework
Headline iterated to "Contact creation, reimagined with intelligent AI" with fluid responsive sizing via `clamp()`. Spotlight flash sits behind the bird (pure white, no warm tint). Bird position pulled up 20px via `translateY` so the headline fits closer to the visual anchor. Demo path: Launch Demo seeds every store synchronously (no awaited Supabase calls — they hang on second invocation) and routes to `/contacts` so the user lands inside the wow surface. Sign-out forces a clean AuthGate by resetting local React state when `isAuthenticated` flips false.

### Grid styling unification
Originally four data grids — contacts, sales, recruiting, documents — diverged in font weights, row colors, and chip styling. Pulled them all through one shared `SharedDataGrid` component reading the same density tokens. Bulk-replaced every hardcoded `text-[Npx]` row utility with `text-[length:var(--grid-font)]` so all four grids respond identically to density preset.

### Visual density across the chrome
Top-of-page banners (AI Insights, Gmail Sync), filter bars, and grid toolbars all reduced ~25% in spacing and 2px in font size to give the data more room. Sales filter pills now match contacts filter pills. Sequences page typography reduced 1.5–2px across 66 declarations. Bulk email cards tightened 25% in vertical real estate. Detail headers and tabs tightened 25% on contact + sales detail pages.

### Lavender stat-card token (late add)
The Recipients tile on `/bulk` and the Replied tile on `/sequences` needed their own color category — distinct from brand-blue / info-teal / success-green so the four cards in each performance row each read as their own bucket. Added `--lavender` / `--lavender-bg` / `--lavender-fg` semantic tokens with light + dark pairs. Existing stat cards swapped to the new tokens; no per-component work.

---

## What I'd do differently

Honest, one paragraph.

I'd wire the real providers from day one instead of letting the fake pool ship first — the rebuild was instructive but expensive. I'd put validation on every intake surface before writing a single AI feature, not after. I'd ship the Postgres backend alongside v1 instead of letting "browser-local only" be the story for a week; the sandbox framing was convenient for a portfolio sprint and wrong for a CRM. On tours, I'd write the first one by walking through the app as a new user instead of starting mid-flow — four rewrites taught the same lesson I could have gotten for free. And on state-management refactors: I'd verify the change in the browser before committing. One pass at making column reorder, sort, filters, and saved views all survive a refresh shipped a TanStack table state refactor that caused an infinite render loop in the data grid; eight commits, two reverts, the work rolled back to the prior baseline. The lesson costs nothing in retrospect: visual-only edits are safe to batch; state-engine changes go in one isolated commit with a browser-verified diff before push. The pattern that held best across the whole build was pairing every Claude-generated decision with a cited precedent from my career. The pattern I'd drop is trusting first-pass wiring on toasts, tours, or state to be complete.

---

## Open items

These are real product gaps, not roadmap aspirations.

- **Column reorder, sort, filters, and saved views don't survive refresh.** Column widths, pinning, and density do. Today's persistence-fix attempt (Apr 28) caused an infinite render loop in TanStack table and was rolled back. To revisit as one isolated, browser-verified commit.
- **Compact-density cards on Overview / Details detail pages don't visibly tighten when the user picks Compact.** Wrapper has `data-detail-density="compact"` set, CSS vars are emitted, but several cards' internal padding ignores the vars. Multiple wire-up attempts on Apr 28 didn't visibly land; reverted. Tomorrow's first task: open DevTools side-by-side, identify which cards aren't reading the vars before writing any code.
- **Privacy cleanup pending in published case study copy.** Madison Resources is named in 6+ places in the Framer-published case study; per portfolio criteria it should be anonymized in public copy. Suggested replacement: "a national staffing platform."
- **Live demo claim "everything stays exactly as you left it" on refresh** overstates current behavior. Should narrow to "your widths, pins, and density stay" until the persistence work lands.

---

## The velocity claim (honest)

I built this using Claude Code with continuous prompting — not a one-shot prompt. Every feature was:
1. Designed (by me, in my head + Figma where applicable)
2. Decomposed into steps (with AI collaboration)
3. Implemented via iterative prompting (20-50 prompts per feature)
4. Tested + refined against live feedback

**The net result:** ~5 days for what would have been 2-3 weeks of solo manual work in 2024, or 6-10 weeks with a small team.

The velocity comes from *not typing* rather than *not thinking*. Claude Code writes the code so I can spend 90% of my time on design decisions, architecture, and UX iteration instead of syntax.

---

## What's next (roadmap)

**Near-term (the actual open list, in priority order):**
- Compact-density cards visibly tightening on Overview / Details detail pages
- Column reorder / sort / filter / saved-view persistence across refresh
- Privacy cleanup in Framer case study copy
- Real inline PDF preview (pdf.js) — long-deferred
- AI help chat backend (connect to Claude API)

**If this becomes a template (Etsy / side product):**
- Configurable terminology (swap "Deal" → "Project", "Placement" → "Sale", etc.)
- Multi-tenant data isolation
- Real auth + user management (currently demo users)
- API wrappers for Salesforce/HubSpot import
- Role-based permission enforcement (currently cosmetic)
- Billing / subscription hooks
- Template marketplace listing

---

## Files / tech stack

**Framework:** Next.js 16 (App Router, React Server Components where static)
**Language:** TypeScript strict mode, zero `any` in app code
**Styling:** Tailwind v4 with container queries, CSS custom properties for design tokens
**State:** Zustand with persist middleware (localStorage)
**Icons:** Phosphor Icons (duotone for AI features)
**Drag:** dnd-kit (accessible, touch-friendly)
**AI:** Anthropic Claude API (claude-sonnet-4-20250514), demo-mode fallback

**Codebase size (rough):** ~14,000 lines of TypeScript/TSX, ~80 component files, ~10 Zustand stores

**Folder structure:**
```
src/
  app/                  → Next.js routes
    dashboard/
    contacts/[id]/
    sales/[id]/
    recruiting/
    documents/
    reporting/
    admin/
    todos/
  components/
    layout/             → Sidebar, Topbar
    detail/             → Shared detail-page components (SectionCard, tabs)
    contacts/
    sales/
    recruiting/
    documents/
    dashboard/
      widgets/          → Each widget type
    alerts/
    help/
    ui/                 → ConfigurableCard, ConfirmDialog, InlineCardSettings
  stores/               → Zustand stores
  types/                → TypeScript type definitions
  lib/
    data/               → Seed data
    phosphor-icons.ts   → Curated icon catalog for picker
    leadCompleteness.ts → Per-type completeness calculation
  public/
    doc-thumbs/         → Document thumbnail placeholders
```

---

## Contact

**Paul Wentzell**
Portfolio: paulwentzellux.com
This project: Roadrunner CRM (github repo TBD)
