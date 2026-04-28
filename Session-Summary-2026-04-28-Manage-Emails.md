# Roadrunner CRM — Session Summary (2026-04-28)

**Theme:** Manage Emails (Bulk + Sequencing) — full feature build, demo polish, accessibility pass.

A chronological record of everything built/changed this session.

## Tier 1 + Tier 2: Sent Tracking Foundation

**Sidebar nav**
- Added `/sent` to the sidebar between Sequences and Sales (PaperPlaneTilt icon)

**Bulk batch tracking**
- New `bulk-batch-store.ts`: tracks every bulk send with per-recipient pending → sent/failed status, `summarizeBatch()` helper, persisted to localStorage
- Wired `BulkEmailComposer` to record batches: creates pending batch up front, flips each recipient as the API resolves

**Sequence analytics**
- Added `getSequenceStats()` + per-step funnel computation to `sequence-store.ts`
- Sequences page got a Performance dashboard: 4 stat cards (Active, Completed, Replied, Reply Rate) + horizontal step funnel
- Per-step inline badges: "N sent · M replied · K waiting"

**Reply detection (client-side)**
- Added `markEnrollmentReplied()` + auto-detection on `/sequences` mount that scans contact email caches for inbound messages after the last step send

**Template usage tracking**
- Added `usageCount` + `lastUsedAt` fields to template store
- `trackUsage()` action wired into both `EmailComposer` and `BulkEmailComposer`'s `applyTemplate`
- Template picker sorts by most-used first, badges show `Nx` usage

## Manage Emails Nav Restructure

- Replaced separate "Sequences" + "Sent" sidebar items with an expandable **"Manage Emails"** parent containing two children: **Bulk** and **Sequencing**
- Auto-expands when you're on either child route
- Created `/bulk` page (rebranded `/sent`, scoped to bulk-only) with:
  - Stats row, search, filter tabs, "+ New bulk send" CTA opening composer modal
- Old `/sent` route now redirects to `/bulk`
- Removed "Bulk Email" button from `/contacts` (now lives at `/bulk`)

## AI Draft Assist

- Added "✨ AI draft" panel to `BulkEmailComposer` with goal textarea + tone (Professional/Casual/Direct/Warm) + length (Short/Medium/Long) dropdowns
- Streams drafts via existing `/api/ai/email/draft` SSE endpoint
- Bulk-specific instruction layer telling the model to preserve `{{firstName}}`/`{{company}}`/`{{senderName}}` merge fields
- Stop button mid-stream

## Demo Mode Send Simulation

- Both `BulkEmailComposer` and `/sequences` "Send next step" detect `gmailStatus.connected === false` and simulate per-recipient resolves on a timer instead of calling the real API
- Lets demo viewers click through send flows without firing real emails

## Demo Seed Data

**Bulk batches** — versioned seed (`v1` → `v6` over the session), eventually 15 demo batches:
- Q3 product update, Following up, Quick favor, Investor update (20 recipients), Q3 forecast workbook, SaaSConnect recap (3 attachments), RevOps webinar invite, Renewal reminder, Re-engagement, 60-second survey, Personal nudge, Newsletter, Welcome series, 1-year anniversary thank-you, Happy hour invite
- Mixed delivery states (sent/failed/pending), varied ages (8m to 20d), 7 unique inline-SVG attachment previews

**Sequences** — versioned seed (`v1` → `v2`), eventually 7 demo sequences:
- Inbound lead nurture, Outbound cold prospecting, Re-engagement campaign, Customer onboarding (5-step), Renewal cadence (60/30/7), Event follow-up, Webinar registrant nurture
- 50+ enrollments at varied positions (active mid-flight, completed, replied, paused, cancelled)

**Demo gating evolution:**
- First gated by Gmail-connected status (skip seed for real accounts)
- User reverted: now seeds everywhere, trash icon to delete individually

## Bulk Page UI Polish

**Stat card colors (multiple iterations):**
- Total Sent (brand blue) → Bulk Batches (info teal) → Delivery Rate (success green / danger red, never both blue) → Recipients
- Recipients went amber → slate → final lavender (`#EEF2FF` / `#3730A3`, WCAG AAA)

**Layout: fixed header + scrolling feed**
- Title + stats + search/sort row pinned at top
- Historical batches scroll independently below

**Search + sort**
- Sort dropdown: Newest first / Oldest first / Most recipients / Delivery rate
- Result count chip ("12 of 15") with pulse animation on filter change

**Cards**
- Removed distracting green delivery bar from feed cards (kept text counts)
- Added attachment chip (`📎 N`) when batch has attachments
- Added trash icon on hover for per-batch delete

**Attachments + lightbox**
- `BatchAttachment` type with name/size/mimeType/previewUrl
- Detail panel attachment section with 64×64 thumbnails (image preview / inline-SVG mockups for PDFs)
- Click thumbnail → fullscreen lightbox with backdrop fade + zoom-in animation, Esc/click closes

## Animations & Micro-interactions

Added to `globals.css`:
- `panelSlideIn` (overshoots +12px, settles)
- `backdropFadeIn`
- `statCardIn` with staggered `--stat-delay`
- `batchCardIn` with staggered `--card-delay`
- `bulk-card-hover` (lift -2px + soft shadow)
- `attachment-thumb` (scale + rotate on hover, image parallax)
- `lightboxZoomIn`
- `cta-press` (brightness + scale-down on press)
- `resultPulse`, `gentleFloat`, `countUpShimmer`, `trashWiggle`
- All respect `prefers-reduced-motion: reduce`

Wired into the bulk page:
- Stat cards count up from 0 with cubic ease (via `useCountUp` hook)
- Batch cards stagger-fade on mount
- Detail panel slides in from right
- Recipient rows stagger-slide
- Delivery progress bars animate width 0→target

## Reusable SearchInput

- New `src/components/ui/SearchInput.tsx` with three sizes (xs/sm/md), built-in clear-X button, Esc-to-clear, WCAG-compliant contrast
- Replaced search inputs everywhere:
  - `/bulk` page
  - `ContactSearchBar`, `SalesSearchBar`, `DocumentSearchBar`
  - `/sequences` enroll-contact picker
  - `BulkEmailComposer` recipient picker
  - All TanStack column-header filter inputs in `SharedDataGrid`

## Sequences Page Polish

**Card colors aligned with /bulk** — same 6-tone palette across both pages

**Reply Rate fix** — was painting danger-red below 5% (cold-outreach industry avg is naturally 1-5%); changed to always success-green, fades to info-teal when no sends yet

**Step funnel — three iterations:**
1. First: gradient bars with overlay text (failed WCAG)
2. Second: bars with labels outside + drop-off chips between rows
3. Final: actual funnel SHAPE — each step is a card whose width = `% of step 1 cohort`. Cards literally narrow downward, like Mixpanel/Amplitude/GA4. Drop-off chips between cards. Caption explaining the encoding (12px / `text-secondary`, AAA contrast).

**Step accordion**
- Each step is now an accordion (HubSpot/Apollo pattern). Step 1 expands by default, others collapsed
- Click anywhere on header to toggle
- Body textarea auto-grows via `scrollHeight` ref — no nested scroll
- First version had nested `<button>` (invalid HTML, clicks were dropping); restructured to three sibling buttons for toggle/trash/caret
- Hover treatment matches Activity panel email rows: brand-blue border + soft brand-tinted shadow

**Sequences list (left panel)**
- Search + sort dropdown (Newest first / Oldest first / Most enrolled / Most replied)
- Default sort: `Newest first by createdAt`
- Result count chip
- Each row shows "Created [relative date]"

**Timeline strip in editor header**
- Created · Last edit · Cadence length · Latest finish (= max `enrolledAt + cadenceDays` of active enrollments)

**Per-step Day-N badges** — accordion header shows cumulative day offset ("Day 0", "Day 3", "Day 7") so cadence shape is visible without expanding

**Enrollments table** — added Started + Expected end columns

## Auth Screen Refactor

- Login screen reordered: **Demo button moved to top** as headline action with brand-blue fill
- Header: "Take a look around. Jump straight into the demo — no signup, no email."
- "Loading demo…" → "Launch Demo"
- OR divider
- Personal-account login below with its own "Welcome back." header
- Log-in button switched to outlined-brand (secondary visual priority)
- Tagline trimmed

## Bug Fixes Throughout

- 3-state attachment sort cycle (greens / grays / em-dashes)
- Fixed sort not applying via custom `sortingFn` reading from `row.original`
- localStorage migration for stale `unread` column id
- `meta.onSortClick` pattern in `SharedDataGrid` so click anywhere on column header triggers same handler
- Various seed-version bumps when content changed (forces re-seed without manual localStorage clearing)
- Orphan "New Sequence" auto-cleanup (later relaxed since clicking "+ New" is legitimate data capture)

## Deployment Status

**Nothing committed or pushed this session.** All changes local on dev box. Last commit on `main` is still `cb3aaf8 Trigger Vercel redeploy`. ~29 files modified + ~10 new files (sent/, sequences/, bulk/, BulkEmailComposer.tsx, bulk-batch-store.ts, sequence-store.ts, template-store.ts, SearchInput.tsx). Type-check stays at 169 baseline (all pre-existing in unrelated api/seed files).

Ready to commit + push when given the word.
