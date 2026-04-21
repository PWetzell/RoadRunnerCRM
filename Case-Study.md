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

**Near-term (portfolio polish):**
- Real inline PDF preview (pdf.js)
- AI help chat backend (connect to Claude API)
- Framer prototype page connecting all the flows
- Case study page on paulwentzellux.com (3-layer narrative)

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
