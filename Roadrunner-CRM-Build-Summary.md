# Roadrunner CRM — Build Session Summary
**Date:** April 15, 2026
**Project:** Navigator CRM App (`C:\Paul\navigator-crm-app`)
**Framework:** Next.js 14+ App Router · TypeScript · Zustand · Tailwind CSS · Phosphor Icons · @dnd-kit · TanStack Table

---

## 1. Project Overview

**Roadrunner CRM** is a demo portfolio CRM application built for an HR recruiting agency context. The application manages:
- **Contacts** — individuals and organizations (clients, candidates, hiring managers)
- **Sales** — search engagements / placement deals (retained, contingency, RPO)
- **Settings** — user profile, appearance, notifications

The design system uses Acme CSS custom properties (`--brand-primary`, `--ai`, `--surface-raised`, `--border`, etc.) for consistent theming across all components.

---

## 2. Features Built

### 2.1 Contacts Module

#### DataGrid (List View)
- TanStack Table with full column visibility, ordering, and sorting
- **Column drag-to-reorder:** drag column headers horizontally to reorder; also drag rows in the Columns dropdown vertically (using `@dnd-kit` with `verticalListSortingStrategy`)
- **DotsSixVertical grabber icon** on column headers (revealed on hover with WCAG-AA contrast), and permanently visible in the Columns dropdown
- **Saved Views** — save current column layout with a custom name, restore later
- **Incomplete badge** in the grid — rows with missing data show a purple "Incomplete" pill instead of a dash, prompting user action
- **Tagged contacts surfaced in Sales** — contacts with Sales Tag or Prospect tag appear as warm-lead rows in the Sales grid
- Scrollable table wrapped in `bg-[var(--surface-card)] border border-[var(--border)] rounded-xl`
- Toolbar: View dropdown, Columns dropdown, Reset button, and count on the right (`ml-auto`)

#### Card View
- Responsive CSS grid (`repeat(auto-fill, minmax(240px, 1fr))`)
- Each card: 48px avatar (circular for people, square for orgs), name, title/industry, up to 2 tag pills, status badge (Complete / Incomplete)
- Clicking a card navigates to `/contacts/[id]`
- Respects existing `filter` (all / org / person) and `search` state from `useContactStore`
- Matching-height toolbar row with contact count (prevents layout bounce when switching views)

#### Filter Bar (`ContactFilterBar.tsx`)
- **List | Card** toggle at the left (matching Sales toggle style)
- **All | Organizations | People** filter chips (rounded-full pill container)
- **New Contact** button (solid blue, rounded-full)

#### AI Insights Bar (`AIInsightsBar.tsx`)
- Shows stale/incomplete contact count (Warning icon, amber pill)
- Shows AI-added contacts count today (Sparkle icon, AI-purple pill)
- Shows "All contacts complete" when no issues (green pill)
- Styled with `border border-[var(--ai-border)] rounded-lg w-full min-h-[48px]`

#### Contact Store (`contact-store.ts`)
- State: `contacts`, `filter`, `view` (`'list' | 'card'`), `search`
- `setView()`, `setFilter()`, `setSearch()`

### 2.2 Sales Module

#### DataGrid (List View)
- Same column drag-to-reorder as Contacts (horizontal header + vertical Columns dropdown)
- **DotsSixVertical grabber** with identical WCAG-AA contrast pattern
- **Saved Views** — persisted to `roadrunner-sales` localStorage key
- **Column color customization** — per-stage header color pickers (persisted)
- **Tagged leads** — contacts with Sales Tag/Prospect tags without a deal appear as warm yellow rows at top
- Headers: `bg-[var(--surface-raised)]`, `text-[11px] font-bold uppercase tracking-wider`, left-aligned
- All row cells left-aligned (`text-left align-middle`)
- Columns: Name, Stage, Priority, Person, Organization, Amount, Last Communication, Expected Close, Owner, Created At (hidden by default), Last Updated, Actions

#### Kanban / Status View (`SalesKanban.tsx`)
- Columns for each deal stage: Prospect → Qualified → Proposal → Negotiation → Closed Won / Lost
- **Green progress bar** on each card that fills to 100% as the deal moves through stages; bar has a light background track so even 1% is visible
- **Person-first cards:** each card leads with the person avatar + name (32px), org as small subtitle chip, deal/role title below, amount top-right
- Stage column headers support custom colors (editable via color picker)
- Cards stack vertically per column; columns in a responsive horizontal scroll

#### Sales Insights Bar (`SalesInsightsBar.tsx`)
- Shows: open deal count, weighted forecast ($), total open pipeline ($), stalled deals (21+ days)
- Styled identically to Contacts AI Insights Bar

#### Sales Filter Bar (`SalesFilterBar.tsx`)
- **List | Status** toggle (left)
- **All | Open | Won | Lost** filter chips
- **New Lead** button (solid blue, rounded-full)
- Search has been moved to the Topbar (`SalesSearchBar.tsx`) — filter bar no longer contains a search input

#### Sales Search Bar (`SalesSearchBar.tsx`)
- Lives in the Topbar (same position as Contacts search bar)
- Connects to `useSalesStore` search state
- Identical styling to the Contacts search bar

#### Sales Store (`sales-store.ts`)
- Persisted to localStorage key `roadrunner-sales`
- State: `deals`, `stageFilter`, `view`, `search`, `columnOrder`, `columnVisibility`, `stageColors`, `savedViews`
- `convertToCustomer()` — closes a deal as Won and tags the organization as 'Customer'

#### Lead Wizard (`/sales/new`)
- Multi-step form for creating a new search engagement
- Steps: Contact info → Organization → Deal details → Review
- Sets `priority: 'medium'` by default

#### Deal Detail (`/sales/[id]`)
- Full deal view with activity log, stage progression, notes

### 2.3 Layout & Navigation

#### Topbar (`Topbar.tsx`)
- Fixed 56px height
- Accepts `children` slot for page-specific controls (search bars)
- Roadrunner CRM logo (white SVG) in the sidebar nav, 15% larger than default, then enlarged another 10%
- Black favicon generated from the logo

#### Sidebar Navigation
- Roadrunner logo at top (white, responsive size)
- Navigation links: Dashboard, Contacts, Sales, Settings

#### Auth Gate
- User profile menu accessible by clicking avatar in the header
- Log out → redirects to login dialog
- Login dialog gates entry to the app

### 2.4 Settings

#### User Profile Settings
- Edit name, email, avatar color
- Relationship type editing (edit only, no delete)

#### Appearance Settings
- Theme toggle (light/dark/system)
- Default grid view preference

#### Notifications Settings

### 2.5 Status / Badge System

| Badge | Color | Meaning |
|-------|-------|---------|
| Incomplete | Purple pill | Contact or deal missing required fields |
| Complete | Green pill | All fields filled |
| Stalled | Amber/Warning pill | Deal not updated in 21+ days |
| AI-added | AI purple pill | Contact added by AI today |
| New Lead | Warm yellow row | Contact with Sales tag, no deal yet |

**Design rule:** No red for Sales (too alarming for a recruiting context). Purple = incomplete, Green = complete, Amber = warning/stalled.

---

## 3. Key Technical Decisions

### Column Drag-to-Reorder (Both Grids)
```
@dnd-kit/core: DndContext, closestCenter, PointerSensor
@dnd-kit/sortable: SortableContext, useSortable, verticalListSortingStrategy
```
- Header drag: horizontal, `arrayMove` on `DragEndEvent`, updates `columnOrder`
- Dropdown drag: vertical, same `arrayMove` logic
- `actions` column always pinned to end in Sales grid (excluded from reorderable set)
- Both write to the same `columnOrder` state so they stay in sync

### Layout Bounce Prevention
Unified vertical spacing across Contacts and Sales pages:
- Topbar: fixed `h-[56px]`
- AI Insights bar: `min-h-[48px]`
- Filter bar: `min-h-[36px]`
- Grid toolbar row: `min-h-[34px]` (placeholder rows in kanban/card views match this height)
- Page padding: `px-5 pt-5 pb-2`, inner `gap-3`

### WCAG AA Compliance for Icons
- `text-primary` on `surface-card` ≈ 13:1 (AAA) — used for drag handles on hover
- `text-secondary` on `surface-card` ≈ 6.2:1 (AA) — used for always-visible grabber icons
- `text-tertiary` ≈ 4.0:1 (fail for small icons) — NOT used for interactive elements

### Zustand Persist
Sales store persists: `stageColors`, `savedViews`, `columnOrder`, `columnVisibility` to `localStorage` key `roadrunner-sales`.
Contact store does NOT persist view preference (session-only by design).

### Infinite Render Fix
`useSalesStore((s) => s.getFilteredDeals())` returned a new array reference every render → caused infinite re-render loop. Fixed by selecting raw state slices and applying filtering in `useMemo`.

---

## 4. Files Created / Modified

### New Files
| File | Purpose |
|------|---------|
| `src/components/sales/SalesDataGrid.tsx` | Full sales list grid with dnd, saved views, column color |
| `src/components/sales/SalesKanban.tsx` | Kanban/status view with progress bar, person-first cards |
| `src/components/sales/SalesFilterBar.tsx` | View toggle + stage filter + New Lead button |
| `src/components/sales/SalesInsightsBar.tsx` | AI pipeline forecast bar |
| `src/components/sales/SalesSearchBar.tsx` | Search bar for Topbar (mirrors Contacts) |
| `src/components/contacts/ContactsCardView.tsx` | Responsive card grid for contacts |
| `src/components/contacts/ContactFilterBar.tsx` | List/Card toggle + type filter + New Contact |
| `src/components/contacts/AIInsightsBar.tsx` | AI insights bar for contacts |
| `src/app/sales/page.tsx` | Sales page with view routing |
| `src/app/sales/new/page.tsx` | New lead wizard |
| `src/app/sales/[id]/page.tsx` | Deal detail page |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/contacts/DataGrid.tsx` | dnd column reorder, grabber icons, toolbar styling, Incomplete badge |
| `src/stores/sales-store.ts` | persist middleware, stageColors, savedViews, convertToCustomer |
| `src/stores/contact-store.ts` | Added view ('list'|'card'), setView() |
| `src/app/contacts/page.tsx` | Gap unified to gap-3, SalesSearchBar wiring pattern |
| `src/components/layout/Topbar.tsx` | children slot for search bars |
| `src/components/layout/Sidebar.tsx` | Roadrunner logo integration |

---

## 5. Business Context: HR Recruiting Agency

The CRM was reframed from generic deals to **HR recruiting agency search engagements**:

- **Deals** = Search engagements (e.g., "VP of Engineering Search — Acme Corp")
- **Amount** = Placement fee (e.g., retained: 25-30% of salary; contingency: 15-20%)
- **Stage** = Prospect → Qualified → Proposal → Negotiation → Closed Won/Lost
- **Contact types** = Hiring managers, HR leads, candidates, organizations
- **Pipeline forecast** = Weighted by probability of placement closing
- **Stalled** = Engagement not updated in 21+ days — recruiter needs to follow up

---

## 6. Plan File Reference

A detailed implementation plan exists at:
`C:\Users\pwent\.claude\plans\lovely-pondering-journal.md`

This plan covers three major features:
1. Person-first leads in Sales (kanban cards anchor on person, not org)
2. Drag-to-reorder in Columns dropdown (both Sales and Contacts grids)
3. Contacts Card view

**Status as of April 15, 2026:** All three features are complete and verified.

---

## 7. Outstanding / Future Work

| Item | Status | Notes |
|------|--------|-------|
| Persist Contacts view preference | Not done | Contact store has no persist middleware; session-only by design |
| Column drag in kanban (reorder stages) | Out of scope | Stages are a fixed enum |
| Drag cards between kanban columns | Out of scope | Separate feature request |
| Bulk card-select in Contacts card view | Out of scope | Future feature |
| Email/calendar integration | Not started | Future milestone |
| Candidate pipeline (separate from Sales) | Not started | Future milestone |

---

*Generated by Claude Code — Roadrunner CRM Build Session, April 15, 2026*
