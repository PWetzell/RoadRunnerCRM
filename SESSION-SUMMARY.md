# Roadrunner CRM — Development Session Summary
## AI-Assisted UX Design Case Study — April 16-17, 2026

---

## Project Overview
**Roadrunner CRM** is a full-featured B2B CRM application built as a portfolio case study demonstrating AI-assisted UX design. The app serves as a generic, reskinnable CRM template (Path C) targeting potential sale on platforms like Etsy.

**Tech Stack:** Next.js 16, Tailwind v4, Zustand, dnd-kit, Phosphor Icons, @tanstack/react-table, @zip.js/zip.js

---

## Session Narrative (Chronological)

### Phase 1: Card View System & Navigation

**Problem:** Sales and Recruiting modules lacked Card view options. Users could only see List and Kanban/Pipeline views.

**Solution:** Added Card view as a third view option to both Sales (List | Card | Status) and Recruiting (List | Card | Pipeline). Created `SalesCardView` and `RecruitingCardView` components with filters, sort, and saved views.

**UX Decision:** Card views navigate to the person's contact page when clicked (not the deal page), because users clicking a person's card expect to see that person's profile. This was a critical UX correction — the initial implementation navigated to the company page.

**Additional fixes:**
- Fixed SalesDataGrid toolbar where Views and Columns dropdown content was swapped
- Fixed drag distortion in column headers (CSS.Transform → CSS.Translate)
- Fixed SavedCardViewBar infinite render loop (Zustand selector returning new array)

### Phase 2: Card Layout Redesign

**Problem:** Tags and status badges were positioned in card headers, overlapping with the gear (settings) icon. Text content ran behind the gear icon on narrow cards.

**Design Decision:** All tags, status pills, and badges moved below the subtitle — never in the header area. The header contains only the avatar and name. Added `pr-8` (32px) right padding to prevent any content from going behind the gear icon.

**Applied consistently across:** Contacts, Sales, Recruiting, and Document card views.

### Phase 3: Seed Data Integrity

**Problem:** Same person appeared at multiple companies (e.g., Sarah Chen at both Meridian and Harborline). Deal names referenced wrong contact IDs (deal "Alex Rivera" pointed to Lisa Park's ID).

**Solution:** Created 3 new seed contacts with proper company associations:
- James Harford — Head of Talent Acquisition at Harborline Financial
- Alex Rivera — Staff Data Engineer (between roles)
- Priya Shah — Senior Analyst at Clearpath Advisors

**UX Impact:** Eliminated confusing duplicate appearances in card views. Added deduplication in Recruiting card view (one card per person, most recent deal wins). Filtered empty "ghost" cards from Sales card view.

### Phase 4: Document Management Overhaul

**Problem:** Documents didn't persist after page navigation. No resume category existed (critical for a recruiting CRM). No content previews in card view. MD (markdown) files were included — HR people don't use markdown.

**Solutions implemented:**

1. **Resume category** — Added as the first document category
2. **Document persistence** — Files converted to data URLs via FileReader and stored in localStorage
3. **Real content previews** — Text extraction from DOCX, PPTX, XLSX using @zip.js/zip.js. Every seed document includes `textContent` for card preview rendering
4. **File-type-specific preview thumbnails:**
   - PDF: white page with clean text
   - DOCX: white page with blue left margin (Word style)
   - PPTX: dark navy slide with orange accent bar (PowerPoint style)
   - XLSX: green header with numbered grid rows (Excel style)
   - ZIP: dark header with monospace file listing
5. **Per-extension unique colors** — Each file type gets its own color (PDF=red, DOCX=blue, XLSX=green, PPTX=amber, etc.) instead of grouping by family
6. **Accepted file types** — Matches industry CRMs (Salesforce, HubSpot): BMP, CSV, DOC, DOCX, GIF, JPG, MOV, MP3, MP4, PNG, PPT, PPTX, PDF, RTF, SVG, TXT, WAV, XLS, XLSX, ZIP
7. **Video & audio file family support** — Added FileVideo, FileAudio icons
8. **MD file removed** — Changed to DOCX (Clearpath intake notes)

### Phase 5: Tour System Rewrite

**Problem:** Tour links were unreliable — sometimes worked, sometimes just navigated without showing the tour. The help panel had a timer-based approach that caused race conditions.

**Root cause analysis:** Tour state was in component-local `useState` inside HelpPanel. When `router.push` navigated to a new page, the outside-click handler fired, `onClose` set `helpOpen=false`, unmounting HelpPanel and destroying tour state.

**Architecture decision:** 
- Created `tour-store.ts` (Zustand) — tour state survives unmount/remount
- Created `ActiveTourOverlay` component — lives in Topbar independently of HelpPanel
- Help panel auto-closes when tour starts; tour runs independently
- Help icon shows X during active tour or open panel; clicking X exits tour
- TourSpotlight retries finding target elements (handles page render timing)
- No timers anywhere — everything is immediate

**Tour content expanded:**
- Dashboard: 7 steps including inline widget settings preview
- Contacts: 5 steps
- Sales: 6 steps (type filter, stage filter, new lead button)
- Recruiting: 4 steps (view toggle, pipeline, filters)
- Documents: 3 steps (filter, grid, upload with accepted file types listed alphabetically)
- Reporting: 6 steps (AI summary, views, add widget, charts, export CSV, print)
- Admin: 5 steps (system health, users, roles, audit, data management)

### Phase 6: Settings & Sidebar Intelligence

**Problem:** Sidebar only showed alert badges for Contacts. No way to toggle alerts on/off. Insights bars couldn't be hidden. Settings page had no real functionality.

**Solutions:**

1. **Sidebar badges for all modules:**
   - Contacts: incomplete profiles (warning yellow)
   - Sales: stalled deals 14+ days idle (danger red)
   - Recruiting: candidates needing action (AI purple)
   - Documents: uncategorized files (gray, off by default)

2. **Settings page rebuilt:**
   - Account section: editable name, email, password change flow
   - Sidebar Badge toggles: on/off per module
   - Page Insights Bar toggles: on/off per page (Dashboard, Contacts, Sales, Recruiting, Documents, Reporting)
   - Sticky header with X close button

3. **Insights bars — alert context:**
   - Sales: stalled count always visible (aligned to 14 days), not conditional
   - Recruiting: "needs action" count + stalled count always shown
   - Documents: uncategorized count always shown
   - Users see what the sidebar badge means when they open the page

### Phase 7: Status Columns & Grid Intelligence

**Problem:** Sidebar badges showed alert counts but the grid had no visual indicator of which rows were the problem. Users couldn't identify stalled deals or candidates needing action.

**Solution:** Added Status column to Sales and Recruiting grids:
- **Sales:** On Track (green), Stalled (warning), Won (green), Lost (red)
- **Recruiting:** On Track, Needs Action, Stalled, Placed, Rejected
- Stalled rows highlighted with subtle yellow background tint
- Status is a computed column with working inline search filter

### Phase 8: SharedDataGrid — One Codebase for All Grids

**Problem:** Four separate grid implementations with inconsistent behavior. Column resize, sort, filter, drag-to-reorder, and width persistence worked differently (or not at all) across Contacts, Sales, Recruiting, and Documents grids.

**Architecture decision:** Created `SharedDataGrid<T>` — a single generic grid component extracted from the working Contacts DataGrid. All four grids now use this one component.

**SharedDataGrid features (identical across all grids):**
- Column sort (click header)
- Column inline search filter (funnel icon)
- Column drag-to-reorder (grab handle)
- Column drag-to-resize (right edge handle)
- Column visibility toggle (Columns dropdown)
- Saved views (View: Default dropdown)
- Reset to defaults
- Minimum column width: 80px
- Header label truncation with tooltip on hover
- Cell content truncation (never wraps)
- Row tooltips showing full cell value
- Column widths persisted in localStorage via `grid-layout-store.ts`
- `table-layout: fixed` for consistent sizing
- `@tanstack/react-table` for proper column management
- `defaultColumn: { minSize: 0 }` to allow shrinking

**Each grid page is now just:** column definitions + data preparation + `<SharedDataGrid />`. No duplicate rendering code.

### Phase 9: Tag & Pill Visual System

**Problem:** Tags across the app had inconsistent styling — some had borders, some didn't. File type badges used solid dark backgrounds while everything else used light backgrounds. Tag icons were all the same generic tag icon.

**Design system established:**

1. **All tags/pills follow one pattern:** Light background + colored text + colored border + contextual icon
2. **8-color WCAG-compliant palette:** Blue, green, red, purple, orange, cyan, pink, amber — all meeting 4.5:1 contrast ratio
3. **Contextual iconography for tags:**
   - monthly/quarterly → calendar
   - resume → CV/document icon (ReadCvLogo)
   - candidate → person icon
   - report → article icon
   - forecast → notepad
   - JD → clipboard text
   - signed/active → checkmark
   - paid/fees → dollar sign
   - sent → paper plane
   - slate → briefcase
   - NDA/legal → shield
4. **Contextual icons for stage pills (Recruiting):**
   - Sourced → funnel
   - Screening → magnifying glass
   - Interview → handshake
   - Offer → arrow
   - Placed → check circle
   - Rejected → X circle
5. **Contextual icons for status pills:**
   - On Track → arrow
   - Stalled → clock
   - Needs Action → warning triangle
   - Placed → check circle
   - Rejected → X circle
6. **Color overrides** for tags that appear together (e.g., resume=blue, candidate=purple) to ensure visual distinction

### Phase 10: Document Grid — Additional Columns

**Problem:** Documents grid had only 6 columns — not enough for the table to overflow the viewport, preventing column resize from working properly with `table-layout: fixed`.

**Columns added:**
- Description — document notes/summary
- Tags — with contextual icons and hash-based colors
- Location — clickable link showing associated person/org name, navigates to that contact's Documents tab

**Data sourced from existing fields:** `doc.description`, `doc.tags`, `doc.contactId` (looked up against contact store for name).

### Phase 11: Recruiting Grid — Additional Columns

**Problem:** Same viewport overflow issue as Documents — too few columns for proper column sizing.

**Columns added (all from existing Deal data):**
- Deal Name — the search/placement name
- Title — candidate's job title (was only in name cell subtitle)
- Last Comm — last communication type
- Expected Close Date
- Priority

**CandidateCard type updated** with `lastCommType`, `expectedCloseDate`, `priority` fields populated from the Deal record during card construction.

---

## Technical Architecture Decisions

### State Management Pattern
- Zustand stores with `persist` middleware for data that survives refresh
- `merge` functions on stores to backfill new fields into old persisted data
- Shared `EMPTY_STYLE` / `EMPTY_WIDTHS` references to prevent Zustand selector infinite loops
- Raw state selectors + `useMemo` instead of derived selectors that return new arrays

### Grid Architecture
- One `SharedDataGrid<T>` component used by all 4 grid pages
- `@tanstack/react-table` for column management, sorting, filtering
- `useGridLayoutStore` for persisting column widths per grid ID
- `table-layout: fixed` for strict column width enforcement
- Column definitions are the only thing each page provides — all rendering is shared

### Tour Architecture
- Tour state in Zustand store (survives component unmount during navigation)
- `ActiveTourOverlay` renders independently of HelpPanel open/close state
- `TourSpotlight` with retry logic for finding DOM elements after page transitions
- `showSettingsPreview` flag for inline widget settings demo in tour tooltip

### Document Preview Architecture
- `@zip.js/zip.js` for extracting text from DOCX/PPTX/XLSX (Office XML formats)
- `textContent` field on CrmDocument — extracted during upload, persisted in localStorage
- `FileTypePreview` component with distinct visual styles per file format
- `getExtColor()` function for per-extension unique colors

---

## Files Created This Session
- `src/stores/tour-store.ts` — Zustand store for tour state
- `src/stores/grid-layout-store.ts` — Generic grid layout persistence (column widths per grid)
- `src/components/ui/SharedDataGrid.tsx` — Single shared grid component for all pages
- `src/components/help/ActiveTourOverlay.tsx` — Independent tour renderer
- `NEXT-SESSION-TODO.md` — Priority tasks for next session

## Dependencies Added
- `@zip.js/zip.js` — DOCX/PPTX/XLSX text extraction for document previews

---

## Next Session Priorities
1. **Rule-based alert system** — Rebuild Create Alert as a proper rule engine with triggers, conditions, frequency, and manual reminders with recurrence
2. **Grid column squeeze testing** — Verify all grids squeeze to 80px consistently
3. **Update session summary** after alert system completion
4. **Template packaging** — Prepare for potential sale beyond portfolio
