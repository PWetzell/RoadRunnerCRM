'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/user-store';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useAlertStore } from '@/stores/alert-store';
import { useListStore } from '@/stores/list-store';
import { useDocumentStore } from '@/stores/document-store';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { SignIn, Sparkle, Lightning, ShieldCheck, Envelope, ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import PasswordRequirements, {
  passwordMeetsRequirements,
  firstFailingRule,
} from '@/components/auth/PasswordRequirements';
import { DEMO_CREDENTIALS, isDemoEmail } from '@/lib/auth/demo-accounts';

const SUPABASE_ENABLED =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * AuthGate — the welcome screen.
 *
 * Two top-level tabs per Paul's spec (2026-04-27 redesign):
 *   • Log in (returning users — email + password)
 *   • Create account (new users — name + email + password)
 *
 * Deliberate omissions on this screen:
 *   • No Google OAuth button.
 *   • No "Connect Gmail" / "Add Gmail account" affordance — that step lives
 *     in `/onboarding/welcome` and runs only AFTER the user creates an
 *     account. The Gmail integration is never the front door of the app
 *     anymore; it's an integration choice surfaced post-signup.
 *   • No "demo / guest" mode when Supabase is configured. (The legacy
 *     guest form is preserved as a fallback only when Supabase env vars
 *     are missing — i.e. local dev without a backend.)
 *
 * Industry parallels: HubSpot, Salesforce, Pipedrive, Close — all use a
 * pure email/password welcome screen with integrations introduced inside
 * a post-signup onboarding wizard rather than bundled into the auth dance.
 */

type Mode = 'login' | 'signup' | 'forgot' | 'check-email' | 'reset-sent';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const signIn = useUserStore((s) => s.signIn);

  const [hydrated, setHydrated] = useState(false);
  // Log in is ALWAYS the default — Paul's call (2026-04-27). The "Try the
  // demo" button on the Log in screen is the primary path for first-time
  // visitors (especially hiring managers landing from the portfolio link),
  // so the Log in view is the right landing for both:
  //   • Returning users → familiar email/password form, fast path back in
  //   • First-time visitors → see the demo button immediately, plus a
  //     visible "Create account" tab one click away if they want their own
  // Earlier logic auto-flipped to "Create account" for un-visited browsers,
  // but that hid the demo CTA from the people most likely to use it.
  const [mode, setMode] = useState<Mode>('login');

  // Form state. Kept across tab switches so the user doesn't lose what
  // they typed when toggling between Log in / Create account.
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Separate from `submitting` so the demo button has its own loading
  // state and clicking it doesn't grey out the main Log in button (and
  // vice-versa).
  const [demoLoading, setDemoLoading] = useState(false);

  // Email shown on the "check your inbox" / "reset link sent" screens —
  // captured at submit time so editing the field afterward doesn't change
  // the success copy.
  const [pendingEmail, setPendingEmail] = useState('');

  // Resend-verification flow on the check-email screen. Tracked
  // separately from `submitting` so the resend button has its own
  // loading state and doesn't grey out the primary CTA.
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    setHydrated(true);
    // No prior-visits logic anymore — Log in is the default for everyone.
    // See the `useState<Mode>('login')` comment above for the rationale.
  }, []);

  // Stamp the visited flag on successful auth so the next return defaults
  // to the Log in tab. Cleared on sign-out by user-store.
  function markVisited() {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('roadrunner_visited', '1');
    } catch {
      // Private mode / storage quota — silent fail is fine; worst case
      // they see the Create-account tab again next visit.
    }
  }

  // Reset per-session "I dismissed this banner" flags whenever a brand-new
  // account is created. A fresh signup almost always means a different
  // identity than whoever last clicked Ignore on the same browser, so the
  // Gmail-connect banner should re-appear by default. (Without this, Paul
  // signing up a new test account inherits the stale dismissal from his
  // previous test account and never sees the connect CTA on /contacts.)
  function clearTransientDismissals() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('roadrunner.gmailBanner.dismissed');
      }
    } catch {
      // localStorage blocked — banner just stays in whatever state the
      // browser last remembered. Not fatal.
    }
  }

  // Hydrate auth state from Supabase session if configured. When a real
  // session is present, also pull the user's Supabase contacts into the
  // Zustand store so the Contacts grid reflects cloud data.
  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    const supabase = createClient();

    /**
     * Decide what data to show this user based on their email:
     *   • Demo whitelist → seed every Zustand store with the full demo
     *     dataset (170 contacts + sample deals, alerts, lists, documents,
     *     custom reports).
     *   • Anyone else → wipe any stale demo data left in localStorage
     *     from a prior session, then attempt to hydrate real contacts
     *     from Supabase. Empty grid + Gmail-connect banner is the correct
     *     first-paint for a fresh real user.
     *
     * Running on every auth event (initial getUser AND onAuthStateChange)
     * means we re-evaluate when accounts switch on the same browser —
     * critical so the demo account's seed data doesn't bleed into a real
     * account's view (the bug Paul hit on 2026-04-27 where his brand-new
     * pwentzell64 account showed 50 demo alerts, fake saved lists, and
     * fake admin audit-log entries from a prior demo session).
     */
    /**
     * Track the email of the most recently dispatched session in
     * localStorage so we can tell "fresh sign-in by a new identity" apart
     * from "the same user just reloaded the page."
     *
     * The bug this guards against: previously, every page load called
     * `clearAll()` on every store for non-demo users (then refetched
     * `/api/contacts`). That wiped Zustand-only fields — entries
     * (addresses/emails/phones/websites added via inline AI), saved
     * lists, custom reports, etc. — every time the page reloaded,
     * because the API only round-trips DB-backed columns. From the
     * user's POV: "I added a website, hit refresh, it was gone."
     *
     * With this guard, clearAll only fires when `email` differs from
     * the last-seen identity (or there's no last-seen at all). Same
     * user refreshing the page is now a no-op for these stores —
     * persist hydration restores their state from localStorage and we
     * leave it alone.
     */
    const LAST_USER_KEY = 'roadrunner.lastDispatchedEmail';
    const getLastUser = (): string => {
      try { return typeof window !== 'undefined' ? (localStorage.getItem(LAST_USER_KEY) || '') : ''; }
      catch { return ''; }
    };
    const setLastUser = (e: string) => {
      try { if (typeof window !== 'undefined') localStorage.setItem(LAST_USER_KEY, e); } catch {}
    };

    const dispatchDataForUser = async (email: string) => {
      const contactStore = useContactStore.getState();
      const salesStore = useSalesStore.getState();
      const alertStore = useAlertStore.getState();
      const listStore = useListStore.getState();
      const documentStore = useDocumentStore.getState();
      const customReportStore = useCustomReportStore.getState();

      const lastUser = getLastUser().toLowerCase().trim();
      const currentUser = (email || '').toLowerCase().trim();
      const identityChanged = lastUser !== '' && lastUser !== currentUser;

      if (isDemoEmail(email)) {
        // If the previous session was a different (real) account, wipe
        // first so its lingering localStorage doesn't leak into the
        // demo view. Otherwise (same demo user reloading), seedDemoData
        // is itself idempotent — it only paints the dataset on a cold
        // store and leaves any in-progress edits alone.
        if (identityChanged) {
          contactStore.clearAll();
          salesStore.clearAll();
          alertStore.clearAll();
          listStore.clearAll();
          documentStore.clearAll();
          customReportStore.clearAll();
        }
        contactStore.seedDemoData();
        salesStore.seedDemoData();
        alertStore.seedDemoData();
        listStore.seedDemoData();
        documentStore.seedDemoData();
        customReportStore.seedDemoData();
        setLastUser(currentUser);
        return;
      }

      // Real user. Only wipe localStorage when the identity actually
      // changes (different account signing in on the same browser, or
      // first-ever sign-in after the demo). Reloading the SAME real
      // user's session keeps their localStorage intact so locally-
      // edited fields (entries, saved lists, etc.) survive.
      if (identityChanged || lastUser === '') {
        contactStore.clearAll();
        salesStore.clearAll();
        alertStore.clearAll();
        listStore.clearAll();
        documentStore.clearAll();
        customReportStore.clearAll();
      }

      try {
        const res = await fetch('/api/contacts');
        if (!res.ok) {
          setLastUser(currentUser);
          return;
        }
        const body = await res.json();
        if (Array.isArray(body.contacts) && body.contacts.length > 0) {
          // Merge cloud contacts with any locally-stored copies: prefer
          // the local copy when ids match (it has the user's offline
          // edits — entries, dismissed suggestions, custom card layout),
          // otherwise fall back to the cloud version. Cloud-only ids
          // get appended. This is the same merge-by-id pattern the
          // contact-store uses for demo seeds.
          const localContacts = useContactStore.getState().contacts;
          const localById = new Map(localContacts.map((c) => [c.id, c]));
          const cloudIds = new Set<string>(body.contacts.map((c: { id: string }) => c.id));
          // Local wins overall so the user's offline edits (entries,
          // hiddenCards, dismissedSuggestions, tags, avatarColor, etc.)
          // survive the round-trip — but cloud-authoritative audit fields
          // (`createdBy` today; future audit columns can join this list)
          // get a one-way `??` backfill so they propagate into rows that
          // were persisted to localStorage BEFORE the API started
          // returning them. Without this, Paul's Gmail-imported contacts
          // (Holly et al.) keep displaying "Created by Unknown" forever
          // because the stale local copy shadows the corrected cloud
          // value the API now provides.
          const merged = body.contacts.map((cloud: { id: string; createdBy?: string; recentEmail?: { hasNew: boolean; hasAttachment: boolean; attachmentCount: number; newAttachmentCount: number; unreadCount: number; unreadAttachmentCount: number; lastEmailAt: string | null } }) => {
            const local = localById.get(cloud.id);
            if (!local) return cloud;
            return {
              ...local,
              createdBy: local.createdBy ?? cloud.createdBy,
              // recentEmail is cloud-authoritative and changes between
              // syncs (the "New" pill decays after 10 min, the
              // hasAttachment flag updates as new mail with files
              // arrives). Always prefer cloud over local — local has
              // no business overriding live email-activity state.
              recentEmail: cloud.recentEmail ?? local.recentEmail,
            };
          });
          // Local-only contacts (e.g. demo-id contacts created during a
          // demo session before signing in as real) get filtered to
          // avoid leaking demo data into the real account.
          const localOnly = localContacts.filter((c) => !cloudIds.has(c.id) && /^[0-9a-f-]{36}$/i.test(c.id));
          useContactStore.setState({ contacts: [...localOnly, ...merged] });
        }
      } catch {
        // Swallow — empty grid is the correct fallback for a real user
        // with no cloud-backed contacts yet. They'll see the
        // Gmail-connect banner and the contacts-empty-state.
      }
      setLastUser(currentUser);
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email || '';
        signIn({
          name: data.user.user_metadata?.full_name || email || 'User',
          email,
        });
        dispatchDataForUser(email);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || '';
        signIn({
          name: session.user.user_metadata?.full_name || email || 'User',
          email,
        });
        dispatchDataForUser(email);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [signIn]);

  if (!hydrated) return <>{children}</>;
  if (isAuthenticated) return <>{children}</>;

  // ─── Validation ────────────────────────────────────────────────────────
  function validateField(field: string, value: string): string {
    if (field === 'name') {
      if (!value.trim()) return 'Name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      return '';
    }
    if (field === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
      return '';
    }
    if (field === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      return '';
    }
    return '';
  }

  function handleBlur(field: string, value: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  // ─── Submit handlers ───────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const emailErr = validateField('email', email);
    const passwordErr = validateField('password', password);
    setFieldErrors({ email: emailErr, password: passwordErr });
    if (emailErr || passwordErr) return;
    setError('');

    if (!SUPABASE_ENABLED) {
      // Fallback for local dev with no Supabase: just personalize the
      // topbar with whatever email they typed and let them in.
      signIn({ email: email.trim(), name: email.trim().split('@')[0] || 'User' });
      markVisited();
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      markVisited();
      // The onAuthStateChange listener above will hydrate the user store
      // and flip isAuthenticated, which dismisses this gate. Nothing more
      // to do here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setSubmitting(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const passwordErr = validateField('password', password);
    setFieldErrors({ name: nameErr, email: emailErr, password: passwordErr });
    if (nameErr || emailErr || passwordErr) return;

    // Concrete-rule check — runs only on the signup path. Login doesn't
    // re-evaluate because the user's existing password may have been
    // created under an older policy; we don't want to lock people out
    // for a rule we tightened later.
    if (!passwordMeetsRequirements(password)) {
      const missing = firstFailingRule(password);
      setFieldErrors((prev) => ({
        ...prev,
        password: missing ? `Missing: ${missing.toLowerCase()}` : 'Password does not meet all requirements.',
      }));
      return;
    }
    setError('');

    if (!SUPABASE_ENABLED) {
      // Fallback: local dev, no backend. Pretend to create an account by
      // hydrating the user store with the entered name/email.
      signIn({ name: name.trim(), email: email.trim() });
      markVisited();
      clearTransientDismissals();
      // Send fresh-signup users to the onboarding welcome screen so they
      // get prompted to connect Gmail as a separate, deliberate step
      // (the whole point of the redesign).
      router.push('/onboarding/welcome');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          // After the user clicks the verification email, Supabase routes
          // them through /auth/callback?code=... — we tag `next` so the
          // callback drops them on the onboarding welcome screen, which
          // is where the Gmail-connect step lives. This is the only path
          // that gets the post-signup wizard; plain logins go to /.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding/welcome')}`,
        },
      });
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }

      // ─── Detect "email already exists" silent failure ─────────────────
      // Supabase deliberately does NOT return an error when you sign up
      // with an email that already has an account — this is an
      // anti-enumeration measure (otherwise an attacker could probe the
      // signup endpoint to harvest a list of valid emails on the system).
      //
      // Instead it returns `data.user` with an EMPTY `identities` array
      // and never sends a verification email. Without this check the user
      // sees our "Check your email" screen and waits forever for an email
      // that will never come. (Bit me on 2026-04-27 — Paul had a Google
      // OAuth row for pwentzell64@gmail.com from earlier, then tried to
      // sign up with the Email provider for the same address. Silent
      // swallow, no email, no error.)
      //
      // Reference: https://github.com/supabase/auth-js/issues/296
      const identitiesEmpty =
        Array.isArray(data.user?.identities) && data.user!.identities!.length === 0;
      if (!data.session && identitiesEmpty) {
        setError(
          'An account with this email already exists. Try logging in instead — if you originally signed in with Google, use the "Forgot password" link to set a password for email login.',
        );
        setSubmitting(false);
        return;
      }

      setPendingEmail(email.trim());
      markVisited();
      clearTransientDismissals();

      // Two cases depending on Supabase project config:
      //  (a) Email confirmation ON  → no session yet, user must click link
      //  (b) Email confirmation OFF → session is live, route immediately
      if (data.session) {
        // Already signed in — straight to the onboarding welcome screen.
        router.push('/onboarding/welcome');
      } else {
        setMode('check-email');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const emailErr = validateField('email', email);
    setFieldErrors({ email: emailErr });
    if (emailErr) return;
    setError('');

    if (!SUPABASE_ENABLED) {
      setError('Password reset requires the Supabase backend, which is not configured in this environment.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
      });
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      setPendingEmail(email.trim());
      setMode('reset-sent');
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset link');
      setSubmitting(false);
    }
  }

  /**
   * One-click "Try the demo" — drops portfolio visitors straight into a
   * populated CRM without making them invent credentials, click verify
   * links, or wait for any backend roundtrip.
   *
   * **DELIBERATELY BACKEND-FREE.** Earlier iterations of this button went
   * through Supabase auth (signInWithPassword against a shared
   * `demo@roadrunner.app` user, then a service-role provisioner to
   * auto-create that user on first click). Both paths shipped — both
   * broke for hiring managers visiting the portfolio. Failure modes we
   * actually hit:
   *   • Supabase free-tier email rate limit (2/hr project-wide) tripped
   *     by unrelated signups, blocking demo provisioning for an hour.
   *   • Service-role key rotation in the dashboard without a redeploy
   *     ⇒ "Unregistered API key" 401 from Supabase, demo dead silently.
   *   • Supabase status incidents (regional outages happen ~quarterly).
   *   • Anyone running the Vercel preview without env vars set.
   *
   * The demo's value comes entirely from the seeded client-side dataset
   * (170 contacts, notes, tasks, relationships), NOT from a real
   * Supabase session. So the button now skips Supabase entirely and
   * hydrates the Zustand stores directly:
   *   1. Flip `useUserStore.isAuthenticated = true` with the demo
   *      identity → AuthGate dismisses itself.
   *   2. Call `useContactStore.seedDemoData()` → grid renders the 170
   *      contacts.
   *   3. Stamp `roadrunner_visited` so the next return defaults to the
   *      Log in tab.
   *
   * Why this is safe: there's no Next.js middleware gating routes, so
   * being unauthenticated at the cookie layer doesn't block anything.
   * The features a demo user would touch (browsing the grid, opening
   * contact panels, viewing notes) all read from Zustand, not from
   * `/api/*`. Server-backed features (Gmail sync, cloud contact CRUD)
   * are never exercised by `isDemoEmail()` paths anyway — those branches
   * already short-circuit to seed data in `dispatchDataForUser`.
   *
   * Industry parallel: Linear, Attio, Notion all have a "View sample
   * workspace" affordance that's pure client-side state — same pattern,
   * same reasoning.
   */
  function handleTryDemo() {
    if (demoLoading || submitting) return;
    setDemoLoading(true);
    setError('');

    // ─── Hydrate demo state SYNCHRONOUSLY ─────────────────────────────
    // Hard rule for this function: NEVER await a Supabase call here. The
    // entire reason this button exists in client-only form is that any
    // network dependency on Supabase (signOut, signIn, getUser) can hang
    // — and a hanging promise leaves the demo button stuck at "Loading
    // demo…" forever. That's exactly the bug Paul hit on 2026-04-27
    // after signing out of his real account: `supabase.auth.signOut()`
    // hung on the second invocation (no active session to revoke), and
    // because we awaited it, `signIn(...)` never ran.
    //
    // Do the Zustand state flip first, before any Supabase touch.
    signIn({ name: 'Demo User', email: DEMO_CREDENTIALS.email });
    // Seed every store the demo expects to populate. Skipping any of
    // these is what gave Paul a half-empty demo dashboard on 2026-04-27
    // (contacts populated, but Saved Lists / notification bell / deals
    // pipeline / Documents tab / Custom Reports were all empty).
    useContactStore.getState().seedDemoData();
    useSalesStore.getState().seedDemoData();
    useAlertStore.getState().seedDemoData();
    useListStore.getState().seedDemoData();
    useDocumentStore.getState().seedDemoData();
    useCustomReportStore.getState().seedDemoData();
    markVisited();

    // ─── Best-effort Supabase cleanup, fire-and-forget ────────────────
    // If a real user (e.g. pwentzell64) signed out of this browser
    // recently, there might still be a Supabase auth cookie hanging
    // around. Killing it prevents the onAuthStateChange listener from
    // later firing a stale TOKEN_REFRESHED with the old user and
    // clobbering our demo state. But we don't await — if it hangs or
    // errors we don't care, the demo is already running.
    if (SUPABASE_ENABLED) {
      try {
        createClient().auth.signOut().catch(() => {
          // Swallowed — see comment above. This is intentional.
        });
      } catch {
        // createClient() itself can throw if env vars are malformed.
        // Same logic: demo's already running, ignore.
      }
    }
    // No need to clear demoLoading — `isAuthenticated` just flipped to
    // true via signIn(), so AuthGate's render guard returns children
    // and this whole component's auth panel unmounts.
  }

  async function handleResendVerification() {
    if (resending || !pendingEmail) return;
    setResending(true);
    setResendStatus('idle');
    setResendError('');
    if (!SUPABASE_ENABLED) {
      // Local-dev fallback: pretend it worked so we can exercise the UI.
      setTimeout(() => {
        setResendStatus('sent');
        setResending(false);
      }, 400);
      return;
    }
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding/welcome')}`,
        },
      });
      if (resendErr) {
        setResendStatus('error');
        // Supabase rate-limit errors come back with status 429 and a
        // message like "For security purposes, you can only request this
        // after N seconds." Surface that text directly — it's already
        // user-friendly.
        setResendError(resendErr.message);
      } else {
        setResendStatus('sent');
      }
    } catch (e) {
      setResendStatus('error');
      setResendError(e instanceof Error ? e.message : 'Could not resend email');
    } finally {
      setResending(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setFieldErrors({});
    // Reset the resend-screen ephemerals so a future signup attempt
    // doesn't show a stale "Email resent" message.
    setResendStatus('idle');
    setResendError('');
    // Don't clear `email` / `password` — the user often types their email
    // in the Log in tab and then realizes they need to sign up; carrying
    // the value across saves a re-type.
  }

  // ─── Submit-button readiness ──────────────────────────────────────────
  // Compute whether each form's submit button should be active. We use
  // shape checks (non-empty + regex) rather than the full `validateField`
  // path so the button doesn't flicker disabled→enabled→disabled while
  // the user is mid-keystroke. A clicked-but-still-invalid form falls
  // back to the per-field error path on submit.
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const loginReady = emailLooksValid && password.length > 0;
  const signupReady =
    name.trim().length >= 2 &&
    emailLooksValid &&
    passwordMeetsRequirements(password);
  const forgotReady = emailLooksValid;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] bg-[var(--surface-bg)] flex overflow-auto">
      {/* ═══ LEFT — BRAND HERO ═══ */}
      <div
        className="hidden md:flex relative flex-1 min-h-screen flex-col justify-between px-12 py-20 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0A2540 0%, #1955A6 55%, #2E7BD6 100%)',
        }}
      >
        <div
          className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[620px] h-[620px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(46,123,214,0.35) 0%, rgba(46,123,214,0) 70%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* Brand strip — wordmark only. mt-12 adds 48px of negative
             space above the title to mirror the mb-12 the feature
             stack already has below "Smart duplicate detection",
             keeping the panel visually balanced top-to-bottom. */}
        <div className="relative z-10 mt-12">
          <span className="text-white text-[22px] font-extrabold tracking-tight">Roadrunner CRM</span>
        </div>

        <div className="relative z-10 flex flex-col gap-0 max-w-[520px]">
          {/* translate(-20px) shifts the bird's visual position up 20px
               WITHOUT changing its layout box — siblings below (the
               headline, paragraph, bullets) stay put. Margin would
               have dragged the entire stack up; transform doesn't. */}
          <div className="relative w-[200px] h-[200px]" style={{ transform: 'translateY(-20px)' }}>
            {/* Spotlight flash behind the bird — radial gradient anchored
                at the geometric center of the bird container. Animation
                stays hidden during the run-in, bursts when the bird
                lands, then sustains as a subtle halo. Inset glow uses
                white→yellow→transparent so it reads as "spotlight" not
                "drop shadow". */}
            <div
              className="absolute left-1/2 top-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
              style={{
                // Pure white spotlight — no warm tint. Center is the
                // brightest, fades to fully transparent at the edge.
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.35) 28%, rgba(255,255,255,0.18) 55%, rgba(255,255,255,0) 75%)',
                filter: 'blur(4px)',
                animation:
                  'roadrunner-spotlight 1.4s cubic-bezier(.2,.7,.3,1) both, roadrunner-spotlight-pulse 3.2s ease-in-out 1.6s infinite',
              }}
            />
            <div className="absolute left-[-20px] top-[45%] pointer-events-none flex flex-col gap-2">
              <span
                className="block h-[3px] rounded-full bg-white/75"
                style={{ width: '140px', animation: 'roadrunner-speed-line 1.4s cubic-bezier(.2,.7,.3,1) both' }}
              />
              <span
                className="block h-[2px] rounded-full bg-white/55"
                style={{ width: '100px', animation: 'roadrunner-speed-line 1.4s cubic-bezier(.2,.7,.3,1) 0.08s both' }}
              />
              <span
                className="block h-[2px] rounded-full bg-white/45"
                style={{ width: '120px', animation: 'roadrunner-speed-line 1.4s cubic-bezier(.2,.7,.3,1) 0.16s both' }}
              />
            </div>
            <img
              src="/roadrunner-logo-white.svg"
              alt=""
              className="relative w-[200px] h-[200px] drop-shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              style={{
                animation:
                  'roadrunner-run-in 1.4s cubic-bezier(.2,.7,.3,1) both, roadrunner-idle-bob 3.2s ease-in-out 1.6s infinite',
              }}
            />
          </div>

          {/* -mt-12 pulls the headline + paragraph up into the bottom
               whitespace of the bird's 200x200 container, eliminating the
               visual gap between the graphic and the copy without
               cropping the bird. */}
          <div className="flex flex-col gap-4 -mt-12">
            <h1 className="text-white text-[44px] font-black leading-[1.05] tracking-[-0.02em]">
              Contact creation,
              <br />
              reimagined with intelligent AI.
            </h1>
            <p className="text-white/70 text-[15px] leading-relaxed font-medium max-w-md">
              The modern CRM for teams that move fast. Auto-enriched profiles, smart duplicate detection, and a pipeline that thinks ahead.
            </p>
          </div>

          {/* mt-6 (24px) — half of the prior mt-12 — restores moderate
               breathing room between the paragraph and the bullets
               without overshooting. */}
          <div className="flex flex-col gap-3 max-w-md mt-6 mb-12">
            <FeatureLine icon={<Sparkle size={16} weight="fill" />} label="AI-assisted contact enrichment" />
            <FeatureLine icon={<Lightning size={16} weight="fill" />} label="Real-time pipeline insights" />
            <FeatureLine icon={<ShieldCheck size={16} weight="fill" />} label="Smart duplicate detection" />
          </div>
        </div>

        {/* Footer — extra top margin so the feature stack above doesn't
             collide with the copyright on shorter viewports. The
             `justify-between` parent was packing them flush. */}
        <div className="relative z-10 mt-8 flex items-center gap-4 text-white/50 text-[11px] font-semibold">
          <span>© Roadrunner {new Date().getFullYear()}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>AI-assisted contact intelligence</span>
        </div>
      </div>

      {/* ═══ RIGHT — AUTH PANEL ═══
           Padding scales up at md+ so the auth card breathes on desktop
           (was a uniform 40px; now 56px vertical / 40px horizontal).
           Inner gap also bumped from 24 → 28px on desktop. */}
      <div className="flex-1 min-h-screen flex items-center justify-center p-6 md:px-10 md:py-14 bg-[var(--surface-card)]">
        <div className="w-full max-w-[400px] flex flex-col gap-6 md:gap-7">
          {/* Mobile-only brand strip */}
          <div className="md:hidden flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)]">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1955A6 100%)' }}
            >
              <img src="/roadrunner-logo-white.svg" alt="" className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-[var(--text-primary)] leading-tight">Roadrunner CRM</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">AI-assisted contact intelligence</div>
            </div>
          </div>

          {/* ─── CHECK EMAIL: post-signup confirmation screen ─── */}
          {mode === 'check-email' && (
            <div className="flex flex-col gap-5">
              <div className="w-12 h-12 rounded-full bg-[var(--brand-bg)] flex items-center justify-center">
                <Envelope size={22} weight="duotone" className="text-[var(--brand-primary)]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                  Check your email.
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  We sent a verification link to <strong className="text-[var(--text-primary)]">{pendingEmail}</strong>.
                  Click it to finish setting up your account — we&rsquo;ll walk you through connecting Gmail right after.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                <p className="m-0">Can take 1–5 minutes. If it&rsquo;s not in your inbox, check <strong className="text-[var(--text-primary)] font-bold">Spam / Junk</strong> — verification mail from new senders often lands there first.</p>
              </div>

              {/* Resend + status feedback. Supabase rate-limits resends
                  to once every ~60s per email; if we hit that, the
                  error message from Supabase tells the user how long to
                  wait. */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending || resendStatus === 'sent'}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3 text-[12px] font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-bg)] hover:border-[var(--brand-primary)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <Envelope size={13} weight="bold" />
                  {resending
                    ? 'Resending…'
                    : resendStatus === 'sent'
                      ? 'Email resent'
                      : 'Resend verification email'}
                </button>
                {resendStatus === 'sent' && (
                  <p className="text-[11px] text-[var(--success)] font-semibold m-0 inline-flex items-center gap-1">
                    <CheckCircle size={11} weight="fill" /> Sent again — give it another minute.
                  </p>
                )}
                {resendStatus === 'error' && resendError && (
                  <p className="text-[11px] text-[var(--danger)] font-semibold m-0">
                    {resendError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline p-0 self-start"
              >
                <ArrowLeft size={12} weight="bold" /> Use a different email
              </button>
            </div>
          )}

          {/* ─── RESET SENT: forgot-password confirmation screen ─── */}
          {mode === 'reset-sent' && (
            <div className="flex flex-col gap-5">
              <div className="w-12 h-12 rounded-full bg-[var(--success-bg,#dcfce7)] flex items-center justify-center">
                <CheckCircle size={22} weight="duotone" className="text-[var(--success,#16a34a)]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                  Reset link sent.
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  We sent a password reset link to <strong className="text-[var(--text-primary)]">{pendingEmail}</strong>.
                  Click it to choose a new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline p-0 self-start"
              >
                <ArrowLeft size={12} weight="bold" /> Back to log in
              </button>
            </div>
          )}

          {/* ─── FORGOT PASSWORD ─── */}
          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)] p-0 self-start"
              >
                <ArrowLeft size={12} weight="bold" /> Back to log in
              </button>

              <div className="flex flex-col gap-1.5">
                <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                  Reset your password.
                </h2>
                <p className="text-[13px] text-[var(--text-tertiary)]">
                  Enter the email on your account and we&rsquo;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <FormField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: validateField('email', v) })); }}
                  onBlur={() => handleBlur('email', email)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  error={fieldErrors.email}
                  required
                />
                {error && <div className="text-[11px] font-semibold text-[var(--danger)]">{error}</div>}
                <PrimaryButton type="submit" loading={submitting} disabled={!forgotReady}>
                  Send reset link
                </PrimaryButton>
              </form>
            </>
          )}

          {/* ─── LOG IN / CREATE ACCOUNT (tabbed) ─── */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              {/* Button group — Log in / Create account share an inner
                  edge with a single visible divider, brand-fill on the
                  active half. Replaces the earlier segmented-control
                  (pills-in-padded-container) look per Paul's request.
                  Same pattern as Stripe's "Pay" / "Save card" toggle and
                  Linear's billing-period switch.
                  mb-2 carves out a touch more breathing room above the
                  "Take a look around" header below — the parent
                  flex-gap was running them flush. */}
              <div
                role="tablist"
                aria-label="Authentication"
                className="flex border border-[var(--border)] rounded-lg overflow-hidden mb-2"
              >
                <ButtonGroupTab
                  active={mode === 'login'}
                  onClick={() => switchMode('login')}
                  position="left"
                >
                  Log in
                </ButtonGroupTab>
                <ButtonGroupTab
                  active={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  position="right"
                >
                  Create account
                </ButtonGroupTab>
              </div>

              {/* ─── LOG IN ─── */}
              {mode === 'login' && (
                <>
                  {/* DEMO (top of stack) — most visitors come from
                      Paul's portfolio and want a one-click look at the
                      product, not a credentials prompt. Promoting the
                      demo above the password form matches what
                      Linear/Attio/Notion do on their try-it-now sites
                      whenever the primary audience is evaluators
                      rather than returning users. The button now uses
                      the brand-primary fill (vs. the previous outlined
                      tertiary look) since it's the headline action. */}
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                      Take a look around.
                    </h2>
                    <p className="text-[13px] text-[var(--text-tertiary)]">
                      Jump straight into the demo — no signup, no email.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTryDemo}
                    disabled={demoLoading || submitting}
                    className="h-11 text-[14px] font-bold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-95 disabled:opacity-60 disabled:cursor-wait cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm border-none"
                  >
                    <Sparkle size={15} weight="fill" />
                    {demoLoading ? 'Loading demo…' : 'Launch Demo'}
                  </button>
                  <p className="text-center text-[11px] text-[var(--text-tertiary)] -mt-2 leading-relaxed">
                    Pre-loaded with 170 contacts, AI insights, and sample pipelines.
                  </p>

                  {/* OR divider — separates the headline demo path from
                      the returning-user login below. */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">OR</span>
                    <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                  </div>

                  {/* RETURNING-USER LOG IN — kept its own header so the
                      switch in mental model from "evaluator" to
                      "owner" is explicit. */}
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[18px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                      Welcome back.
                    </h2>
                    <p className="text-[12.5px] text-[var(--text-tertiary)]">
                      Log in to pick up where you left off.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <FormField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: validateField('email', v) })); }}
                      onBlur={() => handleBlur('email', email)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      error={fieldErrors.email}
                      required
                    />
                    <FormField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: validateField('password', v) })); }}
                      onBlur={() => handleBlur('password', password)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      error={fieldErrors.password}
                      required
                      trailing={
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline p-0"
                        >
                          Forgot?
                        </button>
                      }
                    />
                    {error && <div className="text-[11px] font-semibold text-[var(--danger)]">{error}</div>}
                    {/* Personal-account login is the *secondary* CTA on
                        this layout, so it renders as an outlined
                        button (rather than the brand-primary fill the
                        Launch Demo button uses) to set the visual
                        priority correctly. */}
                    <button
                      type="submit"
                      disabled={!loginReady || submitting}
                      className="h-11 text-[13px] font-bold rounded-lg border-2 border-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2 mb-2"
                    >
                      <SignIn size={15} weight="bold" />
                      {submitting ? 'Logging in…' : 'Log in to your account'}
                    </button>
                  </form>
                </>
              )}

              {/* ─── CREATE ACCOUNT ─── */}
              {mode === 'signup' && (
                <>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                      Create your account.
                    </h2>
                    <p className="text-[13px] text-[var(--text-tertiary)]">
                      Takes about 30 seconds. We&rsquo;ll walk you through the rest after.
                    </p>
                  </div>

                  <form onSubmit={handleSignup} className="flex flex-col gap-4">
                    <FormField
                      label="Full name"
                      type="text"
                      value={name}
                      onChange={(v) => { setName(v); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: validateField('name', v) })); }}
                      onBlur={() => handleBlur('name', name)}
                      placeholder="Your name"
                      autoComplete="name"
                      error={fieldErrors.name}
                      required
                    />
                    <FormField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: validateField('email', v) })); }}
                      onBlur={() => handleBlur('email', email)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      error={fieldErrors.email}
                      required
                    />
                    {/* Custom password field — meter sits ABOVE the input
                        on purpose. Microsoft Edge's built-in password
                        manager anchors its "use suggested password" popup
                        BELOW the input, which would cover any meter we
                        rendered there (and Edge's popup can't be dismissed
                        from JS — it's browser chrome, not page UI). By
                        putting the meter above we guarantee it stays
                        visible regardless of what Edge / 1Password /
                        Bitwarden choose to overlay on the input itself.
                        Apple Keychain prompts use this same layout. */}
                    <PasswordSignupField
                      value={password}
                      onChange={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: validateField('password', v) })); }}
                      onBlur={() => handleBlur('password', password)}
                      error={fieldErrors.password}
                      userInputs={[name, email]}
                    />
                    {error && <div className="text-[11px] font-semibold text-[var(--danger)]">{error}</div>}
                    <PrimaryButton type="submit" loading={submitting} disabled={!signupReady}>
                      Create account
                    </PrimaryButton>
                  </form>

                  <div className="text-center text-[12px] text-[var(--text-tertiary)]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline p-0"
                    >
                      Log in
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Footer hint when Supabase isn't configured (local dev). The
              forms still work — they personalize the topbar with whatever
              email/name the user typed — but auth is fake. */}
          {!SUPABASE_ENABLED && (mode === 'login' || mode === 'signup') && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                Demo mode — backend not configured
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function FeatureLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-white/85 text-[13px] font-semibold">
      <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white flex-shrink-0 backdrop-blur-sm">
        {icon}
      </span>
      {label}
    </div>
  );
}

/**
 * One half of the Log in / Create account button group.
 *
 * Shared inner edge: `position="left"` adds a right border so the
 * divider between the two halves comes from the left button only —
 * `overflow-hidden` on the parent clips the outer corners cleanly.
 *
 * Active state uses the brand gradient (the same gradient as the
 * primary submit button) so the user gets a clear "you are here"
 * signal that matches the rest of the form's hierarchy.
 */
function ButtonGroupTab({
  active,
  onClick,
  position,
  children,
}: {
  active: boolean;
  onClick: () => void;
  position: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 h-10 text-[12px] font-bold border-none cursor-pointer transition-all ${
        position === 'left' ? 'border-r border-[var(--border)]' : ''
      } ${
        active
          ? 'text-white'
          : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-primary)]'
      }`}
      style={
        active
          ? { background: 'linear-gradient(135deg, #1955A6 0%, #2E7BD6 100%)' }
          : undefined
      }
    >
      {children}
    </button>
  );
}

interface FormFieldProps {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}

function FormField({ label, type, value, onChange, onBlur, placeholder, autoComplete, error, hint, required, trailing }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </span>
        {trailing}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`h-11 px-3.5 text-[14px] bg-[var(--surface-bg)] border rounded-lg text-[var(--text-primary)] outline-none transition-all ${
          error
            ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
            : 'border-[var(--border)] focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_var(--brand-bg)]'
        }`}
      />
      {error
        ? <span className="text-[10px] font-semibold text-[var(--danger)]">{error}</span>
        : hint && <span className="text-[10px] text-[var(--text-tertiary)]">{hint}</span>
      }
    </label>
  );
}

/**
 * Custom password field for the Create-account form. Meter rendered ABOVE
 * the input (Edge's auto-suggest popup anchors below the input and would
 * otherwise occlude the meter), with an eye toggle inside the input so
 * users can verify what they typed.
 */
function PasswordSignupField({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  /** Kept for API compatibility; no longer consumed since we dropped zxcvbn. */
  userInputs?: string[];
}) {
  const [visible, setVisible] = useState(false);

  // Browser-native password managers (Edge built-in, Chrome auto-suggest)
  // attach their "Use suggested strong password" / "Weak/Strong" popup
  // when they detect a `<input type="password">` field. The popup is
  // browser chrome that JavaScript cannot dismiss — even
  // `autocomplete="off"` is explicitly ignored on password fields by
  // every Chromium-based browser since 2014.
  //
  // The aggressive (but reliable) workaround: render the input as
  // `type="text"` and mask the characters with CSS
  // `-webkit-text-security: disc` — visually identical to a password
  // field, but the browser's password-manager heuristic doesn't fire,
  // so no popup appears and there's no second conflicting strength
  // verdict for the user to puzzle over.
  //
  // Trade-off: the browser's "Save this password?" prompt also won't
  // trigger after submit. For a fresh sign-up that's an acceptable
  // cost — the user just typed and remembers it. They can save it in
  // a real password manager (1Password, Bitwarden) which work
  // independently of the page-level type. Returning users on the
  // **Log in** tab still get a normal `type="password"` input so
  // autofill works for them.
  //
  // Feature-detect rather than user-agent-sniff: Firefox doesn't
  // support `-webkit-text-security`, so we fall back to `type="password"`
  // there (Firefox doesn't show the conflicting strength popup anyway).
  const supportsTextSecurity =
    typeof window !== 'undefined' &&
    typeof CSS !== 'undefined' &&
    !!CSS.supports?.('-webkit-text-security', 'disc');

  const useMask = supportsTextSecurity && !visible;
  const inputType = visible || supportsTextSecurity ? 'text' : 'password';

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        Password <span className="text-[var(--danger)]">*</span>
      </span>

      {/* Concrete-rule checklist ABOVE the input. The user always sees
          which specific rules are still pending. */}
      <PasswordRequirements password={value} />

      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Create a password"
          // `off` + a randomized field name discourages any remaining
          // browser autofill heuristics that look at field names. The
          // randomization is intentional — a stable name like
          // "password" gets fingerprinted by some managers regardless
          // of `autocomplete`.
          autoComplete="off"
          name={supportsTextSecurity ? 'rr-acct-secret' : 'new-password'}
          data-form-type="other"
          spellCheck={false}
          // Mask characters via CSS when we're using `type="text"` to
          // dodge the browser password manager. The `as never` cast is
          // because TS lib.dom doesn't list this CSS prop yet.
          style={useMask ? ({ WebkitTextSecurity: 'disc' } as Record<string, string>) : undefined}
          className={`h-11 w-full pl-3.5 pr-11 text-[14px] bg-[var(--surface-bg)] border rounded-lg text-[var(--text-primary)] outline-none transition-all ${
            error
              ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
              : 'border-[var(--border)] focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_var(--brand-bg)]'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          {visible ? <EyeSlashIcon /> : <EyeIcon />}
        </button>
      </div>

      {error && <span className="text-[10px] font-semibold text-[var(--danger)]">{error}</span>}
    </label>
  );
}

// Tiny inline eye icons — not pulling new Phosphor weights to keep bundle
// trim, since these only render twice on this one form.
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.43 10.43 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function PrimaryButton({ type, loading, disabled, children, onClick }: {
  type?: 'submit' | 'button';
  /** True while a submit is in flight — overrides label with "Just a moment…". */
  loading?: boolean;
  /** True when the form isn't ready (required field empty / invalid). Distinct
   *  from `loading` so we can style and label them differently. */
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const inert = loading || disabled;
  return (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      disabled={inert}
      className={`h-11 mt-1 text-[14px] font-bold text-white border-none rounded-lg flex items-center justify-center gap-2 transition-all ${
        inert
          ? `opacity-50 ${loading ? 'cursor-wait' : 'cursor-not-allowed'}`
          : 'cursor-pointer shadow-[0_4px_14px_rgba(25,85,166,0.35)] hover:shadow-[0_6px_20px_rgba(25,85,166,0.45)]'
      }`}
      style={{
        background: inert
          // Flat grey when disabled — the bright gradient looked clickable
          // even at 50% opacity, which led users (Paul) to click it before
          // filling the form. Industry convention (Stripe, Linear) is a
          // muted neutral fill for inert primary buttons.
          ? 'var(--surface-raised, #e5e7eb)'
          : 'linear-gradient(135deg, #1955A6 0%, #2E7BD6 100%)',
        color: inert ? 'var(--text-tertiary, #6b7280)' : '#ffffff',
      }}
    >
      {loading ? 'Just a moment…' : children}
    </button>
  );
}
