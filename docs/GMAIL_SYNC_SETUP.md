# Gmail Sync — Setup Guide

Stack: **Supabase** (free tier, 50K MAU / 500MB DB) + **Google OAuth** + **Gmail API direct**.
Total cost: **$0** — no paid third-party sync service.

The code is already scaffolded. You complete the steps below to wire it up.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier).
2. Pick a region close to you (US East is fine).
3. Wait ~1 min for provisioning.
4. Open **Project Settings → API**. Copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (click "Reveal" — keep this one secret)

## 2. Create a Google Cloud OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project (name it anything — "Roadrunner CRM" works).
2. **APIs & Services → Library** → search & enable **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: Roadrunner CRM
   - User support email + developer email: yours
   - Scopes: add these three:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Test users: add your own Gmail address (until you publish)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: "Roadrunner CRM Web"
   - Authorized redirect URIs: paste the callback URL from your Supabase dashboard
     (Supabase → **Authentication → Providers → Google** will show the exact URL,
     in the form `https://<your-project-ref>.supabase.co/auth/v1/callback`)
5. Copy the **Client ID** and **Client secret**.

## 3. Configure Google as a provider in Supabase

1. Supabase dashboard → **Authentication → Providers → Google** → toggle ON.
2. Paste the **Client ID** and **Client secret** from step 2.
3. Save.

## 4. Wire env vars in Roadrunner

Copy `.env.local.example` → `.env.local` (if you haven't already), then fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...            # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJ...                # service_role — server only
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

Restart `npm run dev` after editing env vars.

## 5. Run the database migration

In the Supabase dashboard → **SQL Editor → New query** → paste the contents of
[supabase/migrations/0001_gmail_sync.sql](../supabase/migrations/0001_gmail_sync.sql)
→ Run.

This creates:

- `contacts` — user-scoped contacts (join target for email matching)
- `gmail_connections` — stores the Gmail refresh token per user
- `email_messages` — every synced Gmail message
- `email_contact_matches` — which contacts appear in each message

All tables have row-level security — a customer can only see their own rows.

## 6. Test the flow

1. `npm run dev` → open the app.
2. The login screen now shows a **Continue with Google** button (since env vars are set).
3. Click it → Google asks for Gmail permissions → consent → redirects back, signed in.
4. Trigger a sync from the browser console (or build a button later):
   ```js
   await fetch('/api/gmail/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json())
   ```
   Expected: `{ synced: N, matched: M, lastSyncAt: "..." }`
5. Check the Supabase **Table Editor → email_messages** — your mail should be there.

## 7. Production checklist (when you ship)

- Publish the Google OAuth consent screen (otherwise only test users can sign in).
  Google requires verification for `gmail.readonly`/`gmail.send`/`gmail.modify` — a
  security review takes a few weeks.
- Add the production domain to **Authorized redirect URIs** in Google Cloud.
- Add your production URL to Supabase → **Authentication → URL Configuration → Site URL**.
- Set up a Supabase edge function cron (free) to run `/api/gmail/sync` every 15 min
  per active connection — or run sync on-demand from the UI.
