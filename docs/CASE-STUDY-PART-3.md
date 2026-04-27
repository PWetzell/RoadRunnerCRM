# Roadrunner CRM — Part 3: The Backend

**Designer:** Paul Wentzell
**Project type:** AI-assisted product design + engineering
**Part 3 start:** 2026-04-23 (follow-on to [Part 2](./CASE-STUDY-PART-2.md))
**Tools:** Claude Code (Opus 4.7), Supabase, Google OAuth, Gmail API, Next.js 16.2

> **Part 1** proved a designer could ship an AI-native CRM prototype in a week.
> **Part 2** replaced every fake AI surface with real public-data lookups.
> **Part 3** is about **turning the prototype into a product people can actually buy** — persistence, auth, and a live Gmail sync, built on a free stack that scales from one customer to thousands without a rewrite.

---

## The moment that started Part 3

End of Part 2, Roadrunner looked like a real product. It *felt* like one too — real data sources, real enrichment, real validation. But every contact, every note, every setting lived in the browser's local storage. Refresh the page on a different device and it was empty. Close the tab, clear the cache, lose everything.

The original plan was a two-month buildout for a real backend — auth, database, background jobs, Gmail integration. Standard SaaS scaffolding.

Then I said to Claude: *"We're vibe-coding this. The timeline is off. Let's sync Gmail with Roadrunner, I don't want to pay for anything, and I want it scalable beyond the demo — so when it becomes a product for sale, a customer can sync their own Gmail."*

Part 3 is the story of compressing that two-month plan into a same-day build, with three hard constraints: **free**, **real** (not a demo stub), and **multi-tenant from day one**.

---

## The three constraints, and the stack they forced

| Constraint | What it ruled out | What it selected |
|---|---|---|
| **$0 during build** | Nylas, Auth0, Firebase (paid Gmail), managed services | Supabase free tier, Google OAuth direct, Gmail API direct |
| **Real, not stub** | Mock email data, fake user accounts, in-memory sessions | Postgres, row-level security, OAuth round-trip, refresh tokens |
| **Scales to paying customers** | Single-tenant hacks, hardcoded user IDs, shared tokens | Per-user auth, per-user tokens, RLS from the first migration |

The stack that fell out:

- **Supabase** — Postgres + auth + SSR session handling. Free tier covers 50K monthly active users and 500MB of data. Same code runs at $25/month when we outgrow it.
- **Google OAuth** — free, gives us a refresh token per user. No per-message cost.
- **Gmail API direct** — free (1 billion quota units/day). Skips Nylas ($300+/month) entirely.
- **Next.js 16 App Router** — already in use from Parts 1 & 2. The new `proxy.ts` convention (replacing `middleware.ts`) refreshes the Supabase session on every request.

**Total monthly cost to operate this in production for the first 50K customers: $0.**

---

## Step 1 — Supabase (done 2026-04-23)

### What it is
A backend-as-a-service. Three things bundled together that you'd otherwise host yourself:
1. A Postgres database
2. An authentication system (sessions, OAuth token exchange, password reset)
3. An API layer that talks to both, with row-level security enforced in the DB itself

### Why we need it
Roadrunner's browser-only state is fine for a prototype, not for a product. Three things the browser physically cannot do:

- **Persist across devices** — browsers only have local storage, wiped on cache clear
- **Keep secrets secret** — anything in the browser is visible to the user, so Gmail refresh tokens would leak
- **Isolate customers** — Alice's data must not be visible to Bob, which requires a real database with per-user row scoping

### What we actually did
1. Created a Supabase project (`rpwtkiqssidsirsfbrxv`) in West US / Oregon, free tier.
2. Collected three credentials:
   - **Project URL** — `https://rpwtkiqssidsirsfbrxv.supabase.co`
   - **Publishable key** (`sb_publishable_...`) — public, safe in browser; RLS is what actually protects data
   - **Secret key** (`sb_secret_...`) — server-only master key, bypasses all security
3. Wrote them into `.env.local` and a private credentials log (`roadrunner-credentials.local.md`, gitignored by `*.local.md`).
4. Scaffolded the code layer:
   - `src/lib/supabase/client.ts` — browser client
   - `src/lib/supabase/server.ts` — server client + service-role admin client
   - `src/proxy.ts` — refreshes the session on every request
5. Wrote the first migration (`supabase/migrations/0001_gmail_sync.sql`) — four tables with RLS:
   - `contacts`
   - `gmail_connections`
   - `email_messages`
   - `email_contact_matches`

### What was surprising
Supabase mid-migrated their key format from legacy JWT anon/service_role keys to `sb_publishable_*` / `sb_secret_*` while we were setting up. The SDK accepts both, so env var names (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) stay the same — but every tutorial and forum answer on the internet is now out of date.

### What broke
Next.js 16 deprecated the `middleware` file convention in favor of `proxy`. First dev-server run errored: *"The 'middleware' file convention is deprecated. Please use 'proxy' instead."* Fix: rename `middleware.ts` → `proxy.ts`, rename the exported function from `middleware` to `proxy`, nuke `.next/` to clear Turbopack's cache. Four-minute detour.

---

## Step 2 — Google Cloud OAuth (done 2026-04-23)

### What it is
An OAuth client is Google's way of saying "these credentials represent *this specific app*, so I know who's asking when a user consents." Setting one up gives us a **Client ID** (public) and **Client Secret** (private) that Supabase uses to perform the handshake on behalf of Roadrunner.

### What we did
1. Created a Google Cloud project: `roadrunner-crm` (ID permanent)
2. Enabled the **Gmail API** (1B quota units/day, free)
3. Configured the **Google Auth Platform** — app name, support email, publishing mode
4. Selected **External** audience (internal is Workspace-only)
5. Declared the six OAuth scopes the app will request:
   - `openid`, `userinfo.email`, `userinfo.profile` — identity
   - `gmail.readonly`, `gmail.send`, `gmail.modify` — Gmail access
6. Added `pwentzell64@gmail.com` as a test user (required while the app is unverified)
7. Created an **OAuth Client** (Web application type)
8. Registered the Supabase callback URL as an authorized redirect URI:
   `https://rpwtkiqssidsirsfbrxv.supabase.co/auth/v1/callback`

### What was surprising
The Google Cloud OAuth UX got rebranded to "Google Auth Platform" mid-2026 — the new flow is cleaner but almost every tutorial on the internet references the old "OAuth consent screen" wizard. The concepts map 1:1, but button names don't.

### Why three categories of scope
Google splits scopes into **non-sensitive** (email, profile, openid), **sensitive** (gmail.send), and **restricted** (gmail.readonly, gmail.modify). Restricted scopes require Google verification — a 2–6 week security review — before non-test-users can sign in. We'll submit for verification when the app is ready to ship; until then the test-user allowlist gates access.

---

## Step 3 — Linking Supabase and Google (done 2026-04-23)

Paste the Client ID and Client Secret into **Supabase → Authentication → Providers → Google**, toggle Enable to ON, save. Two minutes.

### What this actually does
When a user clicks "Continue with Google," Supabase is the one that redirects to `accounts.google.com` with our Client ID. Google returns an auth code to the Supabase callback. Supabase (using the Client Secret) exchanges that code with Google for tokens, then hands off to *our* callback with its own session code.

Three callbacks are involved:
1. **Google → Supabase** — `rpwtkiqssidsirsfbrxv.supabase.co/auth/v1/callback` (declared in Google Cloud)
2. **Supabase → Roadrunner** — `localhost:3000/auth/callback` (declared in Supabase's "Site URL" config)
3. **Roadrunner → dashboard** — `/dashboard` after our code exchanges the Supabase code for a session

Each callback is a layer of indirection that isolates our app from the raw OAuth protocol. We never touch Google's tokens directly — Supabase does, and surfaces them to us through a server-only API (`getSession()`) and a `provider_refresh_token` field we persist to `gmail_connections`.

---

## Step 4 — Database migration (done 2026-04-23)

Four tables, row-level security on all of them:

| Table | Purpose |
|---|---|
| `contacts` | User's CRM contacts — the join target for email matching |
| `gmail_connections` | One row per user, stores the `provider_refresh_token` |
| `email_messages` | Every synced Gmail message, unique by `(user_id, gmail_message_id)` |
| `email_contact_matches` | Junction table — which contacts appear in each message (from/to/cc) |

### Why RLS matters
Without row-level security, a bug or leaked session could let one customer read another's mail. With RLS, Postgres enforces `auth.uid() = user_id` on every query — a failure mode at the database layer, not the app layer. The service-role key bypasses RLS, which is why it's server-only (never shipped to the browser).

### One surprise
Supabase's SQL Editor fires a "destructive operations detected" warning on any migration that uses `drop trigger if exists` or `create or replace function`. Those are standard idioms for making migrations re-runnable — the warning is over-cautious, not a real issue.

---

## Step 5 — The first real sign-in (done 2026-04-23) ✅

The moment of truth. Dev server restarted, `.env.local` picked up, "Continue with Google" button appeared in the login UI, clicked it.

### The flow, as it happened
1. **Redirect to Google** — `accounts.google.com/v3/signin/accountchooser?access_type=offline&client_id=197489700665-...`
   - `access_type=offline` requested a **refresh token** — without this Gmail sync breaks after an hour
2. **Account chooser** — picked `pwentzell64@gmail.com`
3. **"Google hasn't verified this app"** — friendly test-user version (not the scary "unsafe" warning). Clicked Continue.
4. **Consent phase 1** — name, profile picture, email. Continue.
5. **Consent phase 2** — three Gmail scopes with checkboxes. Selected all, Continue.
6. **Redirect back** — `localhost:3000/auth/callback?code=04e932d0-b4a6-42d1-b5b4-f0a4ba5ded91`
7. **Dashboard loaded**, signed in as the real Gmail account.

### Server log
```
GET /auth/callback?code=04e932d0-b4a6-42d1-b5b4-f0a4ba5ded91  307 in 1357ms
GET /dashboard  200 in 205ms
```

Zero errors. Our callback handler did the code exchange, extracted the `provider_refresh_token`, upserted it into `gmail_connections`, and redirected to the dashboard.

### What this proves
- **Real OAuth works end-to-end** — no mocks, no stubs, no hardcoded tokens
- **Multi-tenant from day one** — each user gets their own `auth.users` row, their own `gmail_connections` row, their own RLS-scoped data
- **Free tier handles it** — $0 spend. Supabase free tier covers 50K MAU, Google OAuth is unmetered, Gmail API quota is 1B units/day. Scaling to 1,000 paying customers would cost $25/month (Supabase Pro); scaling to 50,000 would cost $25/month *plus* compute.
- **Two-month plan compressed to one day** — the original estimate for this milestone was 8 weeks of backend scaffolding. Actual time: ~4 hours across two sessions.

### What's still missing
- **App not verified** — only test users can sign in. Submit for Google verification before public launch.
- **Production domain unset** — Supabase Site URL still points to localhost. Swap to production URL at launch.
- **Contacts table not yet migrated from Zustand** — Roadrunner's existing browser-only contacts still live in local storage. That's why the first sync returned 0 contact matches against 25 real emails — the join target is empty.
- **No user-facing "Sync Gmail" button yet** — sync works via API call, but the dashboard needs a UI trigger + a background cron job for hands-free sync.

---

## Step 6 — First real Gmail sync (done 2026-04-23) ✅

### The complication
After Step 5's sign-in, the Supabase session cookie got cleared (browser reload, cache invalidation — the usual dev-server churn). Re-signing in meant clicking "Continue with Google" again, which ordinarily would work in ~2 seconds. But the test harness running this preview is sandboxed to localhost and physically can't navigate to `accounts.google.com`, so the OAuth redirect dies in mid-air.

### The fix
The refresh token was already in `gmail_connections` from the Step 5 sign-in — the browser session is stateless, but the database-backed OAuth grant is permanent (until Paul revokes access in his Google account). So the cookie isn't needed to prove Gmail sync works. I added a dev-only route (`/api/gmail/sync/dev`, gated on `NODE_ENV !== 'production'`) that uses the service role to look up the user by email, read the refresh token, and run the same sync pipeline the prod route uses.

### The call
```
POST /api/gmail/sync/dev
{ "email": "pwentzell64@gmail.com", "pageSize": 25 }
```

### The response
```json
{
  "user_id": "9d600c0d-d89b-423d-bbf9-e80dc0a4db89",
  "query": "after:2026/03/24 (in:inbox OR in:sent)",
  "synced": 25,
  "matched": 0,
  "preview": [
    { "from": "welcome@supabase.com", "subject": "Welcome to Supabase" },
    { "from": "noreply@github.com", "subject": "[GitHub] A third-party OAuth application has been added to your account" },
    { "from": "jkennedy@vividcloud.com", "subject": "Re: 3D Assets for Pickle Robot" },
    { "from": "jkennedy@vividcloud.com", "subject": "3D Assets for Pickle Robot" },
    { "from": "jobalerts-noreply@linkedin.com", "subject": "\u201CProduct Designer\u201D: Deloitte - Lead, UX Product Designer and more" }
  ]
}
```

Real messages from Paul's real inbox — the Supabase welcome email from Step 1, the GitHub OAuth confirmation from enabling sign-in, a real client thread about Pickle Robot, LinkedIn job alerts. Zero mocks.

### What this proves
- **The refresh token works** — Google traded it for a fresh access token without a second consent screen
- **The Gmail API works** — `listMessageIds` + `getMessage` against live Gmail returned real inbox content
- **The database write path works** — 25 rows landed in `email_messages` with RLS enforced (service role writes, but subsequent user-scoped reads will be filtered)
- **Contact matching is wired, just starved** — the 0 matches is expected: `contacts` is empty because the Zustand→Supabase migration hasn't run yet. The moment that migration lands, the same 25 messages will retroactively match.

### What was surprising
The dev-route workaround is actually the right primitive for a future cron job: Supabase's scheduled functions will need to sync Gmail for users who aren't actively browsing (no cookie available), using stored refresh tokens + service role. The "dev" route is 80% of what the "cron" route will be — just swap the email-lookup for a `for user in gmail_connections` loop.

---

## Step 7 — Contacts migration (done 2026-04-23) ✅

### The goal
Move 133 contacts (21 organizations + 112 people) from Zustand's browser-only store into Supabase's `contacts` table. Without this, every Gmail sync produces zero matches — the join target is empty. With it, the existing CRM data becomes the matching substrate for every downstream feature.

### The scope choice
Zustand's `ContactWithEntries` shape is rich: multi-entry addresses, emails, phones, websites, identifiers, industries. Supabase's `contacts` table is currently flat: one name, one email, one phone. Two options:

- **A. Mirror the schema** — extend Supabase to match Zustand exactly. Big SQL migration, feature-complete, but locks in the schema before we know which rich fields actually get used post-launch.
- **B. Flatten to essentials** — copy just `{name, primary_email, primary_phone, type, org_name, title}` for now. Enough for Gmail matching to work, addresses/websites/industries migrate incrementally as the features that need them ship.

Picked B. The rich entries are a design surface that's still shifting — migrating them now would be premature commitment. Email matching is the load-bearing use case today.

### The implementation
- `src/app/api/contacts/import/dev/route.ts` — dev-only POST endpoint, gated on `NODE_ENV`
- Reads `SEED_CONTACTS + BULK_CONTACTS` from the existing Zustand init file (same data the app has always shown)
- Flattens each contact: takes the primary email entry (or first email, or legacy `.email` field), same for phone
- Uses delete-then-insert for idempotency (no schema change needed — avoids adding a `legacy_id` column we'd only need for upserts)
- Runs under the service role, so RLS doesn't block the write

### The call
```
POST /api/contacts/import/dev
{ "email": "pwentzell64@gmail.com" }
```

### The response
```json
{
  "user_id": "9d600c0d-d89b-423d-bbf9-e80dc0a4db89",
  "imported": 133,
  "by_type": { "org": 21, "person": 112 },
  "sample": [
    { "name": "Fidelity Investments", "email": "institutional@fidelity.com", "type": "org" },
    { "name": "Stripe, Inc.", "email": "sales@stripe.com", "type": "org" },
    { "name": "Sarah Chen", "email": "s.chen@fidelity.com", "type": "person" },
    { "name": "Marcus Webb", "email": "m.webb@stripe.com", "type": "person" }
  ]
}
```

### Final Supabase row counts after this step
```
contacts:                133   (21 orgs + 112 people)
email_messages:           69   (real Gmail messages from last 30 days)
gmail_connections:         1   (your refresh token)
email_contact_matches:     0   (seed contacts don't overlap with real-inbox senders)
```

### Why the match count is zero — and why that's correct
The seed contacts are synthetic business personas (Fidelity, Stripe, HubSpot employees). Paul's actual inbox is dominated by LinkedIn job alerts, Lowe's marketing, Dice recruiting, and a real client thread with `jkennedy@vividcloud.com` (Pickle Robot). Zero overlap. The matching pipeline ran correctly against all 69 messages × 133 contacts — it just found no intersection.

The moment a real business contact gets added (e.g. jkennedy@vividcloud.com as a person contact), the next sync retroactively creates 3 matches against his three Pickle Robot messages. The pipeline is live — it's just waiting for real data to land in the contacts table.

### What's still missing
- The UI still reads from Zustand. App still looks identical to Part 2 to the user.
- Notes and relationships are still browser-only — next migration wave.
- No cron job yet. Paul has to trigger sync manually until the Supabase scheduled function is wired up.

---

## Step 8 — Proving matching with real data (done 2026-04-23) ✅

Before moving on, we added Jason Kennedy (`jkennedy@vividcloud.com`) — a real client from the Pickle Robot thread in Paul's inbox — as a 134th contact, then re-ran the sync. The result:

```
synced:  87 messages
matched: 5 contact matches   (up from 0)
```

Breakdown: 3 messages from Jason Kennedy (matched as `from`) + 2 replies Paul sent back to him (matched as `to`). Exactly the shape of a real conversation thread.

This confirms the end-to-end pipeline — OAuth token refresh → Gmail API fetch → DB upsert → contact join — works on real data, not just seed fixtures. Every future real-business contact added will retroactively match their historical emails on the next sync.

---

## Step 9 — Sync Gmail button in the dashboard (done 2026-04-23) ✅

### The goal
Turn the API-only sync pipeline into something a non-technical user can trigger. Before this, Paul was the only person who could sync Gmail — and only by making API calls from a dev console. A real customer needs a button.

### What we built
- **`src/app/api/gmail/status/route.ts`** — returns the user's Gmail connection state: connected email, last-sync timestamp, message count. Uses cookie auth (real session required).
- **`src/components/gmail/GmailSyncBanner.tsx`** — a banner component that:
  - Renders nothing for users without a Supabase session (demo-mode doesn't show it)
  - Shows a "Gmail not connected" prompt if they have a session but no OAuth connection
  - Shows `Gmail connected as {email} · {N} messages tracked · synced {X}m ago` with a **Sync now** button when connected
  - On click, POSTs to `/api/gmail/sync` (cookie-authenticated prod route), spins the icon while syncing, and surfaces a toast: `"Synced — {N} messages tracked · {M} contact matches"`
- **Dashboard integration** — added to `src/app/dashboard/page.tsx` above the existing `WeeklyEmailBanner`, same visual vocabulary (brand color, duotone envelope icon, same border radius).

### Why this matters for the case study
The two dev routes (`/api/contacts/import/dev`, `/api/gmail/sync/dev`) were workarounds for the preview browser's OAuth sandbox. The **production** path is cleanly separated: the banner uses `/api/gmail/sync` (cookie auth), never the dev route. The dev routes are gated on `NODE_ENV !== 'production'` and won't exist in a deployed build.

This is the first user-facing piece of Gmail that will be sold to customers: one button, one toast, persistent Gmail connection state. All of it backed by the OAuth + RLS + service-role architecture we put in place in Steps 1-4.

### Verification
- Dashboard compiles and renders with no console errors or server errors.
- Banner correctly returns null when the user has no Supabase session (demo-mode users see nothing, as designed).
- `/api/gmail/status` returns the correct shape (`{ connected: false, reason: 'unauthenticated' }` when no cookie; `{ connected: true, email, lastSyncAt, messageCount }` when connected).
- Full live verification (banner renders, Sync now button triggers real sync) requires signing in through Paul's real browser — the preview sandbox can't complete the OAuth redirect.

---

## What's left for Part 3 to be "sellable"
- Notes + relationships migration (same pattern as contacts, different tables)
- Point the UI reads to Supabase instead of Zustand (the 61-file refactor)
- Google OAuth verification submission (2–6 week security review)
- Production domain + Supabase Site URL swap
- Supabase scheduled function for hands-free Gmail sync (once a day for every connected user)

---

## The tally

Original plan: two months of backend work before Gmail sync could exist.
Actual: one day, $0 monthly cost, fully multi-tenant, RLS-enforced isolation, real OAuth round-trip.

The case study for Part 3 is mostly about the **compression** — the same things that would have been a full sprint on a traditional team became a sub-turn-by-turn walkthrough, because every hard problem was already solved by someone else (Supabase owns auth + session management, Google owns OAuth + Gmail API, Next.js owns the server + routing) and the only code we actually wrote was ~200 lines of glue that tells them how to talk to each other.
