# Roadrunner CRM — Overnight Build Summary
**Date:** April 15–16, 2026
**Session:** Autonomous build while Paul sleeps

---

## What Was Built

### 1. Documents System (full module)
**Files created:**
- `src/types/document.ts` — types: CrmDocument, DocumentCategory, FileFamily, preview helpers
- `src/stores/document-store.ts` — Zustand store with persist, attach/remove from hard drive, filtered queries
- `src/lib/data/seed-documents.ts` — 12 seed documents (contracts, proposals, invoices, resumes, etc.)
- `src/components/documents/DocumentCard.tsx` — thumbnail card with file-type icon, colored badge, hover actions
- `src/components/documents/DocumentGrid.tsx` — sortable table view (same pattern as Contacts/Sales grids)
- `src/components/documents/DocumentCardView.tsx` — responsive card grid with thumbnails
- `src/components/documents/DocumentPreviewPanel.tsx` — slide-in preview panel (images inline, PDF/office placeholders)
- `src/components/documents/DocumentFilterBar.tsx` — view toggle + category filter + upload button
- `src/components/documents/DocumentSearchBar.tsx` — search in Topbar
- `src/components/documents/UploadDocumentDialog.tsx` — drag-and-drop file upload, category picker, description
- `src/components/detail/DocumentsTab.tsx` — reusable documents sub-tab for contact + deal detail pages
- `src/app/documents/page.tsx` — standalone `/documents` page
- `public/doc-thumbs/*.svg` — placeholder thumbnail SVGs for each file type

**Key decisions:**
- Any file type supported — preview engine adapts by MIME type
- Files stored as browser object URLs (demo) — production would use S3
- Documents can be linked to contacts AND/OR deals
- Card view shows visual thumbnails; grid view shows sortable table
- Preview panel slides in from the right with full metadata + download button
- Upload supports drag-and-drop and file browser
- Confirmation dialog before removal

### 2. Documents Tab on Detail Pages
- Added "Documents" tab to both Contact and Sales detail pages
- Shares the same DocumentsTab component — filtered by contactId/dealId
- Upload from within a detail page auto-links to that contact/deal

### 3. Recruiting Dashboard (`/recruiting`)
**Files created:**
- `src/types/recruiting.ts` — RecruitingStage, CandidateCard, stage mapping from Deal pipeline
- `src/components/recruiting/RecruitingKanban.tsx` — kanban board: Sourced → Screening → Interview → Offer → Placed / Rejected
- `src/components/recruiting/RecruitingInsightsBar.tsx` — AI insights bar with recruiting KPIs
- `src/app/recruiting/page.tsx` — page with search, kanban, insights

**Key decisions:**
- Data is PROJECTED from existing Sales + Contacts stores (not duplicated)
- Deals map to placements, person contacts map to candidates
- AI match scores computed deterministically from deal probability + contact completeness
- Each candidate card shows: name, title, company, deal amount, AI match score bar, source, date
- Modeled after Greenhouse/Lever/Bullhorn pipeline views

### 4. Reporting Dashboard (`/reporting`)
**Files created:**
- `src/app/reporting/page.tsx` — full reporting dashboard

**Sections:**
- AI Report Summary bar (win rate, velocity, forecast)
- 6 KPI tiles (Total Deals, Open Pipeline, Weighted Forecast, Won Revenue, Win Rate, Avg Velocity)
- Pipeline Funnel chart (horizontal bars by stage)
- Revenue by Source chart (horizontal bars by source)
- Deal Metrics (avg deal size, win rate, velocity, lost revenue)
- CRM Health (active contacts, incomplete contacts, documents, open deals)

**Key decisions:**
- All data derived live from existing stores — no separate reporting backend
- Modeled after Salesforce/HubSpot reporting layouts
- Uses same card styling as the rest of the app

### 5. Admin Dashboard (`/admin`)
**Files created:**
- `src/app/admin/page.tsx` — full admin dashboard

**Sections:**
- System Overview (6 KPI tiles: users, contacts, deals, documents, roles, storage)
- System Health (API, database, AI service, storage — status cards with healthy/warning indicators)
- User Management (demo user list with name, email, role, status, last login)
- Roles & Permissions (5 roles: Admin, Manager, Sales Rep, Recruiter, Read Only — with permission badges)
- Audit Log (8 recent actions with icons, targets, users, timestamps)
- Data Management (export, import, purge, sync — action buttons)
- AI Usage (calls today, monthly, model, avg response time)

**Key decisions:**
- Modeled after Salesforce Setup + HubSpot Admin
- Demo data (users, audit log) is static but realistically structured
- Action buttons are stubs (clicking shows the UI but doesn't perform real operations)
- Roles match the dashboard preset views (Sales Rep, Recruiter, Manager)

### 6. Navigation Updates
- Root `/` now redirects to `/dashboard` instead of `/contacts`
- All pages wired in Sidebar (was already done in a prior session): Dashboard, Contacts, Sales, Recruiting, Documents, Reporting, Admin

---

## Architecture Decisions

### Template-Ready Design (Path C)
- All components use neutral B2B terminology
- No framework-specific patterns that would prevent reskinning
- Design tokens (CSS custom properties) drive all colors, so theme changes are one-file edits
- Stores are modular — each feature has its own Zustand store
- Seed data is realistic but generic enough for any B2B CRM context

### AI Integration Points
- **Documents:** AI summarization of document contents (placeholder for production)
- **Recruiting:** AI match scores on candidate cards (deterministic demo, would call Claude in production)
- **Reporting:** AI Report Summary bar aggregates key insights
- **Admin:** AI Usage metrics section (tracks API calls, model, response time)
- **Existing:** Auto-populate, duplicate detection, deal scoring, next-step suggestions (from prior sessions)

### Consistency
- All grids use the same sortable-header pattern (Contacts → Sales → Documents)
- All filter bars follow the same layout (view toggle | filter pills | action button)
- All detail pages use the same tab pattern (DetailTabs component)
- All insights bars use the same teal AI-branded design
- Card views follow the same responsive CSS grid pattern
- Edit patterns use SectionCard + CardEditForm everywhere

---

## What's NOT Done (potential follow-ups)

1. **Documents — inline PDF viewer** — would use pdf.js or Google Docs Viewer
2. **Documents — Office file preview** — would need server-side conversion (LibreOffice headless)
3. **Documents — AI summarization** — "Summarize this document" button that calls Claude
4. **Recruiting — list view** — kanban is built; list/table view is stubbed
5. **Recruiting — drag-to-change-stage** — kanban cards don't drag between columns yet
6. **Reporting — date range filters** — charts show all-time data; would benefit from date pickers
7. **Reporting — export to PDF/CSV** — button stubs exist but don't generate files
8. **Admin — real user CRUD** — demo users are static; would need auth integration
9. **Admin — real audit log** — currently static; would subscribe to store changes
10. **Option A item caps** — list/todo/AI widgets still show all items; "View all →" pattern not yet applied
11. **Icon picker on widgets** — built but could extend the phosphor catalog
12. **Drag-to-reorder cards on detail pages** — SectionCard supports it but not all tabs wire it up

---

## Files Created This Session

| Directory | Files |
|-----------|-------|
| `src/types/` | `document.ts`, `recruiting.ts` |
| `src/stores/` | `document-store.ts` |
| `src/lib/data/` | `seed-documents.ts` |
| `src/components/documents/` | `DocumentCard.tsx`, `DocumentGrid.tsx`, `DocumentCardView.tsx`, `DocumentFilterBar.tsx`, `DocumentSearchBar.tsx`, `DocumentPreviewPanel.tsx`, `UploadDocumentDialog.tsx` |
| `src/components/detail/` | `DocumentsTab.tsx` |
| `src/components/recruiting/` | `RecruitingKanban.tsx`, `RecruitingInsightsBar.tsx` |
| `src/app/documents/` | `page.tsx` |
| `src/app/recruiting/` | `page.tsx` |
| `src/app/reporting/` | `page.tsx` |
| `src/app/admin/` | `page.tsx` |
| `public/doc-thumbs/` | 7 SVG placeholder thumbnails |

## Files Modified This Session

| File | Changes |
|------|---------|
| `src/app/contacts/[id]/page.tsx` | Added Documents tab |
| `src/app/sales/[id]/page.tsx` | Added Documents tab |
| `src/components/detail/DetailTabs.tsx` | Added "Documents" to tab list |
| `src/components/sales/detail/SalesDetailTabs.tsx` | Added "Documents" to tab list |
| `src/app/page.tsx` | Root redirect changed from `/contacts` to `/dashboard` |

---

---

## Additional Build (continued overnight)

### 7. Alert / Notification System (full module)
**Files created:**
- `src/types/alert.ts` — AlertType (22 types across Sales, Contacts, Documents, Recruiting, AI, System, Custom, Reminders, Tasks), AlertSeverity (info/success/warning/critical), AlertSettings, CrmAlert
- `src/stores/alert-store.ts` — Zustand store with persist. Add/mark-read/dismiss/remove alerts, settings management, filtered visible alerts, unread count.
- `src/lib/data/seed-alerts.ts` — 12 seed alerts covering deal wins, stalled deals, AI suggestions, document expiry, candidate matches, follow-up reminders, system updates
- `src/components/alerts/AlertPanel.tsx` — Dropdown panel from bell icon. Shows new/earlier sections, severity icons, time-ago, dismiss per-alert, mark-all-read, link to settings + custom alert creation
- `src/components/alerts/AlertSettingsPanel.tsx` — Sub-panel: min severity picker, desktop notification toggle, sound-on-critical toggle, per-type toggles grouped by category (Sales, Contacts, Documents, Recruiting, AI, System, Custom, Reminders, Tasks)
- `src/components/alerts/CreateAlertDialog.tsx` — In-panel form: title, message, severity picker, optional link. Creates custom alerts/reminders.

**Bell icon in Topbar now:**
- Shows unread badge count (red dot with number)
- Click opens the alert panel
- Panel shows filtered alerts respecting user settings
- Settings sub-panel lets users control exactly which types/severities they see
- "Create custom alert" button for personal reminders/escalations

### 8. Help System (full module)
**Files created:**
- `src/components/help/HelpPanel.tsx` — Context-aware help panel from question mark icon

**Features (modeled after Salesforce Help, HubSpot Knowledge Base, Intercom):**
- **Context-sensitive tips** — detects current page and shows relevant tips (Dashboard, Contacts, Sales, Recruiting, Documents, Reporting, Admin each have their own tip set)
- **Guided walkthroughs** — step-by-step tours per section with progress dots, Back/Next/Done navigation. 7 walkthroughs covering all app sections.
- **Quick links** — Keyboard shortcuts, Documentation, Contact support, What's new, Report a bug
- **AI Help** — "Ask AI" input that would connect to Claude for natural-language help (UI ready, backend stub)

### Files Created (additional)
| Directory | Files |
|-----------|-------|
| `src/types/` | `alert.ts` |
| `src/stores/` | `alert-store.ts` |
| `src/lib/data/` | `seed-alerts.ts` |
| `src/components/alerts/` | `AlertPanel.tsx`, `AlertSettingsPanel.tsx`, `CreateAlertDialog.tsx` |
| `src/components/help/` | `HelpPanel.tsx` |

### Files Modified (additional)
| File | Changes |
|------|---------|
| `src/components/layout/Topbar.tsx` | Bell icon → alert panel with badge count. Question icon → help panel. Both context-aware. |

---

---

## 9. Edit Card Everywhere (ConfigurableCard + InlineCardSettings)
**Files created:**
- `src/stores/card-style-store.ts` — Zustand store with persist for per-card style overrides (headerColor, iconName, iconColor, titleColor/Size, contentColor/Size, subtitleColor/Size, alignment). Keyed by stable cardId.
- `src/components/ui/ConfigurableCard.tsx` — Wrapper component: title + gear icon + sticky-header-style card chrome. Writes to card-style-store via `onStyleChange` callback. Reuses `WidgetSettingsPopover`.
- `src/components/ui/InlineCardSettings.tsx` — Drop-in gear-icon overlay for cards that have custom layouts (kanban). Includes `useCardStyleVars()` and `useCardHeaderColor()` hooks for parents to read style.

**Applied to:**
- Reporting page — 4 cards (Pipeline Funnel, Revenue by Source, Deal Metrics, CRM Health) each now have gear → Edit Card popover
- Admin page — 6 cards (System Health, User Management, Roles & Permissions, Audit Log, Data Management, AI Usage) now editable
- Sales kanban cards — gear icon overlay on every deal card in the kanban; CSS vars applied to name/org/amount/deal
- Recruiting kanban cards — same pattern via InlineCardSettings hooks

**Infrastructure change:** `WidgetSettingsPopover` now accepts optional `onStyleChange` callback. When provided, ALL style writes route through it instead of the dashboard store. This is what lets the same popover work for dashboard widgets (→ dashboard-store) AND kanban/report/admin cards (→ card-style-store) with no fork.

## 10. Option A — Item Caps + View All on Dashboard List Widgets
**Files modified:**
- `src/types/dashboard.ts` — added `itemLimitForSize(size)` helper (1×1→2 items, 2×2→5, 4×2→7, larger→10)
- `src/components/dashboard/widgets/ListWidget.tsx` — items cap by widget size, "View all (N) →" footer links deep into `/sales` or `/contacts`
- `src/components/dashboard/widgets/AISuggestionsWidget.tsx` — suggestions cap by widget size
- `src/components/dashboard/widgets/TodoWidget.tsx` — visible todos cap by size, "+N more" expand button reveals all inline, "Show less" collapses

**Benefit:** No more internal scroll on widget cards — the promise Paul pushed for. Widgets behave as previews that deep-link into the full module.

---

---

## 11. Drag-to-Change-Stage on Sales Kanban
- Added dnd-kit Draggable to each KanbanCard + Droppable to each stage column
- Cards dim to 30% opacity while dragging
- Drop zones highlight with brand-color dashed border when hover
- DragOverlay shows floating card preview with slight rotation
- Drop writes new stage + sets `closedAt` if moving to closed-won/closed-lost
- Disabled while popover is open (so gear click doesn't trigger drag)

## 12. Recruiting List View
- `src/components/recruiting/RecruitingList.tsx` — sortable table with Candidate, Stage, Company, Amount, AI Match, Last Activity, Source columns
- Wired into `/recruiting` page alongside existing kanban
- Sort by any column (defaults to Match Score descending)
- Match score visualizes with colored bar (green ≥70%, amber ≥40%, red below)
- "Between roles" badge for candidates without a company

## 13. Standalone /todos Page
- `src/app/todos/page.tsx` — aggregates todo items across ALL TodoWidgets on ALL dashboard views
- Open / Done / All filter tabs
- Add new task (routes into first TodoWidget on the active view)
- Toggle done / remove works bidirectionally with TodoWidget state
- Each row shows which dashboard view the todo came from

## 14. Keyboard Shortcuts
- `src/components/keyboard/KeyboardShortcuts.tsx` — global shortcut handler + help modal
- Mounted at app layout via `<KeyboardShortcuts />`
- Press `?` for the full shortcut list
- Shortcuts:
  - `/` focus search · `n` open notifications · `Esc` close
  - `g d` dashboard · `g c` contacts · `g s` sales · `g r` recruiting
  - `g f` documents (files) · `g p` reporting · `g a` admin · `g t` to-dos
  - `c` new contact · `d` new deal
- Disabled while typing in inputs / textareas (except Esc to blur)

## 15. Alert Auto-Generation from Data Events
- `src/hooks/useAlertAutoGen.ts` — watches sales + contact stores
- `src/components/alerts/AlertAutoGenMount.tsx` — mounts the hook at layout level
- Auto-fires alerts for:
  - Deals stalled >21 days (warning)
  - Deals entering Negotiation (AI suggestion — close it)
  - Incomplete contacts (info, batched when count ≥3)
- Uses `firedRef` to prevent duplicate alerts for the same condition
- Runs on every store change — new alerts appear in the bell panel live

## 16. Case Study Documentation
- `Case-Study.md` — portfolio-ready case study at the repo root
  - The three-layer AI narrative (Design System / Figma / Product)
  - Full module breakdown (Contacts, Sales, Recruiting, Documents, Dashboard, Reporting, Admin, Alerts, Help)
  - Design principles (AI signature color, no scroll in cards, edit everywhere, etc.)
  - Key design decisions with tradeoffs
  - Build timeline (Day 1-5)
  - Honest velocity claim
  - Next steps / template roadmap
  - Tech stack + folder structure

---

## Files Created (additional batch)

| Directory | Files |
|-----------|-------|
| `src/components/recruiting/` | `RecruitingList.tsx` |
| `src/components/keyboard/` | `KeyboardShortcuts.tsx` |
| `src/components/alerts/` | `AlertAutoGenMount.tsx` |
| `src/hooks/` | `useAlertAutoGen.ts` |
| `src/app/todos/` | `page.tsx` |
| `/` (repo root) | `Case-Study.md` |

## Files Modified (additional batch)

| File | Changes |
|------|---------|
| `src/components/sales/SalesKanban.tsx` | dnd-kit DndContext + Draggable cards + Droppable columns + DragOverlay preview |
| `src/app/recruiting/page.tsx` | Wired in RecruitingList for the list view toggle |
| `src/app/layout.tsx` | Mounted KeyboardShortcuts + AlertAutoGenMount |

---

## Genuinely still pending (not attempted)
1. Real inline PDF preview (pdf.js or cloud viewer) — UI placeholder only
2. AI help chat backend — UI input in HelpPanel but no Claude API wiring for it
3. Alert browser Notification API integration — UI toggle in settings but no `Notification.requestPermission()` wiring
4. Multi-tenant template config for resale (Path B) — Path C (lean template, reskin by file edits) is what's shipped
5. Real user CRUD + auth integration (currently demo users + demo auth)

---

*Overnight autonomous build — Roadrunner CRM, April 15–16, 2026*

*Overnight autonomous build — Roadrunner CRM, April 15–16, 2026*
