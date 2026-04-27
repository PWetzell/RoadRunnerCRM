# Session summary — 2026-04-24

Chronological log of what shipped this session. Each numbered block is a
discrete piece of work; the "Why" lines explain the user-facing intent so
future sessions can pick up context without re-reading the transcript.

---

## 1. Document Preview Panel — header cleanup + deep-link

**Why:** The preview header repeated the category as both a tag and a
free-text label next to file size. And the "Location" link on the preview
dumped the user on the contact's Overview tab instead of the document
itself — wrong destination for a link that says "this file lives on
Sarah's Documents tab."

**Changes:**
- `src/components/documents/DocumentPreviewPanel.tsx` — removed the
  redundant `· {doc.category}` text after file size (tags already show it).
- `src/components/documents/DocumentPreviewPanel.tsx` — Location link now
  deep-links: `/contacts/${linkedContact.id}?tab=documents&docId=${doc.id}`.
- `src/app/contacts/[id]/page.tsx` — added `useSearchParams` reader for
  `?tab=` + `?docId=`, seeded `initialDocId` state, strips the query on
  mount via `router.replace` so a refresh doesn't re-open the preview.
- `src/components/detail/DocumentsTab.tsx` — added `initialPreviewId` +
  `onInitialPreviewConsumed` props; seeds `previewId` state on mount so
  the target doc opens in the preview pane automatically.

## 2. Org Chart — dead Add Contact button fixed

**Why:** The Add Contact button on a contact's Org Chart tab did
nothing. Should open the same creation surface as the `/contacts` grid so
duplicate detection, enrichment, and validation all converge on one flow.

**Changes:**
- `src/components/detail/OrgChartTab.tsx` — wired the Add Contact button
  to open a `SlidePanel` containing `ContactTypeChooser`. Unified entry
  point = one creation flow everywhere in the app.

## 3. Help tours — infrastructure additions

**Why:** Needed tours for Person/Company creation, Lists, and Gmail.
Tours existed in `TOUR_STEPS` for Person/Company but weren't listed in
the Help panel's Tours tab because `SECTION_HELP` had no entries for
those keys.

**Changes:**
- `src/components/gmail/GmailSyncBanner.tsx` — added `data-tour` anchors:
  `gmail-banner`, `gmail-connect-btn`, `gmail-sync-now`, `gmail-import`.
- `src/lib/tour-steps.ts` — added a new `'gmail'` tour (5 steps) with
  honest copy about the "synced 11h ago but Sync now can still fail"
  case (refresh-token state, not a bug).
- `src/components/onboarding/OnboardingImportModal.tsx` — fixed
  misleading "everyone's already a contact" empty-state copy to
  acknowledge sync may have failed: *"Your inbox might be quiet, your
  top senders might already be contacts, or Gmail might need a fresh
  pull. Try Sync now on the banner and reopen this."*
- `src/components/help/HelpPanel.tsx` — added four `SECTION_HELP`
  entries so the tours list: `/contacts/new/person`,
  `/contacts/new/company`, `lists`, `gmail`. Added
  `ROUTE_AGNOSTIC_KEYS` set so `TourRow` doesn't try to `router.push`
  keys that aren't valid URLs.

## 4. First tour rewrite — rejected

Wrote Person/Company/Lists tours that labeled pages but started
mid-flow (user already on `/contacts/new/person`, list tour never
showed a list view). Rejected: *"these are new tours are terrible! list
tour never even shows the list view."*

Lesson captured: a tour must start at the ACTION that triggers the
flow, not in the middle of the flow. For "create a contact" that means
start on `/contacts` and spotlight `+ New Contact`, not start on the
form page.

## 5. Second tour rewrite — entry-point flow

**Changes:**
- Added 3 missing `data-tour` anchors:
  - `new-contact-btn` in `src/components/contacts/ContactFilterBar.tsx`
  - `lists-pin-manager` in `src/components/layout/Sidebar.tsx`
  - `detail-favorite-star` in `src/components/detail/DetailHeader.tsx`
- `src/lib/tour-steps.ts` — Person tour rewritten to start at
  `/contacts` → spotlight `+ New Contact` (auto-open chooser via
  `clickTarget`) → spotlight Person card → navigate into the form.
- Company tour rewritten the same way.
- Lists tour rewritten to deep-link into
  `/contacts?list=list-contacts-portsmouth` on step 1 so the user
  actually sees a filtered list view before the tour explains it.
- `src/components/help/HelpPanel.tsx` — fixed navigation comparison to
  include query strings (`usePathname()` drops `?list=X`, which
  previously would have caused an infinite navigation loop for lists).

## 6. Third tour rewrite — "bubble disappears on step 2"

**Root cause:** `clickTarget: true` fires `el.click()` the moment the
spotlight mounts. On the Person/Company card step, that click
**navigates away** before the bubble can render. The user saw step 1,
hit Next, and step 2 flashed and vanished.

**Rule codified in comments:** `clickTarget` is safe only when the
click does something IN-PLACE (opens a dropdown, slide panel, picker
portal). Never use it when the click navigates between routes.

**Changes:**
- `src/lib/tour-steps.ts` — removed `clickTarget` from step 2 of both
  Person and Company tours (the card click navigates). Added
  `navigateTo: '/contacts/new/person'` / `'/contacts/new/company'` to
  step 3 so hitting Next triggers the page change instead.

## 7. Fourth tour rewrite — "you mention form entries but don't show the form"

**Root cause (from screenshots):** the per-step `navigateTo` effect
lived inside `HelpPanel.tsx`, but `HelpPanel` auto-closes when a tour
starts. So only **step 1's** `navigateTo` ever fired — every
subsequent step was stuck on whatever page step 1 landed on.

Symptoms:
- Person/Company tours: user stayed on `/contacts` and form steps 4–6
  had nothing to highlight (form wasn't mounted).
- Lists tour: step 6 described "Create new list" inside a picker that
  didn't exist because step 5's navigation to `/contacts/per-1` never
  fired.

**Changes:**
- `src/components/help/ActiveTourOverlay.tsx` — added the `navigateTo`
  `useEffect` here (this component stays mounted for the entire tour,
  so the effect fires on every step advance).
- `src/components/help/HelpPanel.tsx` — removed the duplicate effect
  so the two don't race.
- `src/lib/tour-steps.ts` — also removed `clickTarget` from the Lists
  Pin Manager step because the dropdown opened directly over where the
  bubble sits. Bubble now just describes the gear; user opens it
  themselves if curious.

## 8. Gmail integration — industry comparison

**Why:** With Gmail OAuth + sync + contact-match + top-sender import
in place, how does Roadrunner stack up against the leaders?

### Capability matrix

| Capability | HubSpot | Salesforce | Pipedrive | Close | Attio | Folk | monday | **Roadrunner** |
|---|---|---|---|---|---|---|---|---|
| OAuth connect | yes | yes (EAC) | yes | yes | yes | yes | yes | **yes** |
| Message → contact matching | yes | yes | yes | yes | yes | yes | yes | **yes** |
| Send from CRM, lands in Gmail Sent | yes | yes | yes | yes (native) | yes | yes | yes | **yes (Activity-card composer)** |
| Gmail-side sidebar extension | yes | yes (Inbox) | yes | yes | no | yes (Folk X) | no | no |
| Open/click tracking | yes | yes (Einstein) | yes | yes | no | yes | partial | no |
| Templates w/ merge fields | yes | yes | yes | yes | partial | yes | yes | no |
| Sequences / cadences | yes | yes (HVS) | yes | yes (flagship) | no | yes (2024) | partial | no |
| Bulk / mail-merge send | yes | yes (MC) | yes | yes | no | yes (flagship) | yes | no |
| Meeting-link scheduler in compose | yes | yes | yes | yes | no | yes | yes | no |
| Calendar event sync → timeline | yes | yes | yes | yes | yes | yes | yes | no |
| Shared / team inbox | yes | yes | partial | yes (flagship) | no | yes | no | no |
| Contact enrichment from email signatures | partial | yes (Einstein) | no | no | yes (flagship) | yes (flagship) | no | no |
| AI reply/summary on threads | yes (Breeze) | yes (Einstein) | yes | yes | yes | yes | yes | **partial (draft)** |
| Import contacts from top senders | no | no | partial | no | yes | yes (flagship) | no | **yes** |
| Auto-reply / bounce detection | yes | yes | yes | yes | partial | yes | partial | no |

### Where Roadrunner lands today

- **Ahead of entry-tier (monday, basic Pipedrive)** on capture +
  onboarding.
- **At parity with Attio/Folk** on email capture. Your top-sender
  import flow is actually *better* than HubSpot/Salesforce — only
  Attio and Folk do top-sender suggestion well.
- **Behind every major on activation** — the features that make email
  revenue-generating (tracking, templates, sequences, bulk, scheduler)
  don't exist yet. That's the "we sync email" vs. "we do sales through
  email" gap that Close and HubSpot win deals on.

### Gaps ranked by payoff

**Tier 1 — table stakes for a paid CRM:**
1. Email templates with merge fields (~1 week)
2. Open/click tracking (~1 week)
3. Calendar sync (~1 week)

**Tier 2 — differentiators for the recruiting case study:**
4. Sequences / cadences (2–3 weeks) — Close's moat. For recruiting
   specifically, this is how outbound sourcing works.
5. Signature parsing for enrichment (~1 week) — Attio / Folk flagship.
6. Meeting scheduler link in compose (1–2 weeks)

**Tier 3 — long tail:**
7. Gmail-side Chrome extension
8. Shared team inbox (multi-user only)
9. Bulk mail-merge send
10. Auto-reply / OOO detection

### Four options presented

- **A.** Templates + tracking (1–2 wk). Best bang-for-buck; makes the
  composer demo-competitive with HubSpot.
- **B.** Sequences (2–3 wk). Go straight for Close's moat; fits
  recruiting case study.
- **C.** Calendar sync + signature enrichment (1–2 wk). Attio/Folk
  parity; keeps the "effortless capture" angle.
- **D.** Harden what exists. Fix refresh-token issue, signature
  attachments, thread replies. Lower ceiling, higher polish.

**Awaiting Paul's pick.**

---

## Files touched this session

- `src/app/contacts/[id]/page.tsx`
- `src/components/contacts/ContactFilterBar.tsx`
- `src/components/detail/DetailHeader.tsx`
- `src/components/detail/DocumentsTab.tsx`
- `src/components/detail/OrgChartTab.tsx`
- `src/components/documents/DocumentPreviewPanel.tsx`
- `src/components/gmail/GmailSyncBanner.tsx`
- `src/components/help/ActiveTourOverlay.tsx`
- `src/components/help/HelpPanel.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/onboarding/OnboardingImportModal.tsx`
- `src/lib/tour-steps.ts`
