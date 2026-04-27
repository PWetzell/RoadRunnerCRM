'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Envelope, Sparkle, Lightning, ShieldCheck, ArrowRight } from '@phosphor-icons/react';
import { useUserStore } from '@/stores/user-store';
import { useToastStore } from '@/stores/toast-store';
import { createClient } from '@/lib/supabase/client';
import { isDemoEmail } from '@/lib/auth/demo-accounts';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

/**
 * Onboarding welcome screen.
 *
 * Runs ONLY after a fresh account creation (sign-up flow in AuthGate
 * routes here once the email is verified). This is where the Gmail
 * connection step lives — deliberately separate from the auth gate so
 * the welcome screen never has to compete between "log in" and "connect
 * your Gmail" as primary actions.
 *
 * Flow:
 *   1. Sign-up form captures name + email + password.  (AuthGate)
 *   2. Email verification.                              (Supabase)
 *   3. Land here.  ← you are here
 *      → "Connect Gmail" routes through Google OAuth with full Gmail
 *        scopes; the auth callback writes the refresh token into
 *        `gmail_connections` and redirects to `/onboarding/gmail-import`
 *        (the curated import wizard).
 *      → "Skip for now" routes straight to the dashboard. The user can
 *        connect later from Settings or the dashboard banner.
 *
 * Industry parallels: HubSpot / Pipedrive / Close all run a multi-step
 * post-signup wizard with email-integration as one of the steps; users
 * can skip and still land on a usable empty dashboard. Hiding Gmail
 * here (rather than on the sign-in screen) means the user sees it as
 * "set up your CRM" rather than "we need to read your inbox to log you
 * in" — which materially changes the perceived ask.
 */
export default function OnboardingWelcomePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const push = useToastStore((s) => s.push);
  const [connecting, setConnecting] = useState(false);

  const firstName = (user.name || '').split(' ')[0] || 'there';

  // Demo users should never see the Gmail-connect onboarding — connecting
  // would fail (no Supabase user record to attach tokens to) and the
  // welcome wizard's whole frame ("set up your CRM") makes no sense for
  // a pre-populated demo workspace. Bounce them to the dashboard if they
  // somehow land here (e.g. by typing the URL directly).
  useEffect(() => {
    if (isDemoEmail(user.email)) {
      router.replace('/dashboard');
    }
  }, [user.email, router]);

  async function handleConnectGmail() {
    if (connecting) return;
    setConnecting(true);
    try {
      const supabase = createClient();
      // After OAuth completes, the callback saves the refresh token into
      // gmail_connections and forwards us to the curated import wizard.
      // We pass the wizard URL via `next` so the callback knows where to
      // drop the user.
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding/gmail-import')}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback,
          scopes: GMAIL_SCOPES,
          // access_type=offline + prompt=consent are required so Google
          // returns a refresh token we can use for background sync. Without
          // these, the token expires in an hour and silent re-sync breaks.
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        push({
          severity: 'error',
          title: 'Could not start Google sign-in',
          description: error.message,
          duration: 4000,
        });
        setConnecting(false);
      }
      // On success: browser redirects to Google. No further work here.
    } catch (e) {
      push({
        severity: 'error',
        title: 'Could not start Google sign-in',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
      setConnecting(false);
    }
  }

  function handleSkip() {
    router.replace('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-[520px] flex flex-col gap-7">
        {/* Brand strip */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1955A6 100%)' }}
          >
            <img src="/roadrunner-logo-white.svg" alt="" className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[14px] font-extrabold text-[var(--text-primary)] leading-tight">Roadrunner CRM</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">Step 1 of 2 &middot; Connect your inbox</div>
          </div>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] md:text-[32px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
            Welcome, {firstName}.
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            Connect your Gmail and Roadrunner will pull in the people you email most,
            match every existing thread to its contact, and keep your inbox in sync from now on.
            You can always do this later from Settings.
          </p>
        </div>

        {/* Primary CTA — Connect Gmail */}
        <button
          type="button"
          onClick={handleConnectGmail}
          disabled={connecting}
          className="flex items-start gap-3 w-full px-4 py-3.5 rounded-xl bg-white border-2 border-[var(--border)] hover:border-[var(--brand-primary)] hover:shadow-[0_6px_20px_rgba(25,85,166,0.18)] cursor-pointer transition-all disabled:opacity-60 disabled:cursor-wait text-left"
        >
          <span className="mt-0.5 flex-shrink-0"><GmailLogo size={26} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-bold text-[#1f1f1f] leading-tight">
              {connecting ? 'Redirecting to Google…' : 'Connect Gmail'}
            </span>
            <span className="block text-[11px] text-[var(--text-tertiary)] mt-1 font-medium leading-snug">
              Imports the people you&rsquo;ve emailed in the last 90 days. Disconnect anytime in Settings.
            </span>
          </span>
          <ArrowRight size={16} weight="bold" className="text-[#1f1f1f] flex-shrink-0 mt-1" />
        </button>

        {/* What you get — light reassurance */}
        <div className="flex flex-col gap-2.5 px-4 py-3.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
          <Reassurance icon={<Envelope size={28} weight="fill" />}>
            Every existing email thread is matched to its contact automatically.
          </Reassurance>
          <Reassurance icon={<Sparkle size={28} weight="fill" />}>
            AI surfaces who you talk to most so you can pick which people to track.
          </Reassurance>
          <Reassurance icon={<ShieldCheck size={28} weight="fill" />}>
            Read-only at first. We never send mail without your explicit action.
          </Reassurance>
          <Reassurance icon={<Lightning size={28} weight="fill" />}>
            Background sync keeps everything fresh. No "Connect" prompt next login.
          </Reassurance>
        </div>

        {/* Skip — secondary action, intentionally less prominent */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-[12px] text-[var(--text-tertiary)]">
            Not now? You can connect from Settings later.
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)] p-0"
          >
            Skip for now <ArrowRight size={12} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Reassurance({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)]">
      <span className="text-[var(--brand-primary)] flex-shrink-0">{icon}</span>
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/**
 * Gmail brand logo — inline SVG using Google Workspace's official path
 * geometry and the four Google brand colors. Inline (rather than
 * `<img src="...">` or a Phosphor icon) so the colors render correctly
 * in dark mode and the asset has no extra network round-trip on this
 * critical first-screen render.
 *
 * Colors are Google's exact brand hexes:
 *   #4285F4 blue   — bottom-left side panel
 *   #34A853 green  — bottom-right side panel
 *   #FBBC04 yellow — top-right corner flap
 *   #EA4335 red    — front "M" flap (the iconic part)
 *   #C5221F dark red — top-left corner flap (slight shadow)
 *
 * viewBox matches the canonical Workspace asset (52 42 88 66) so the
 * proportions are pixel-identical to the logo on gmail.com.
 */
function GmailLogo({ size = 24 }: { size?: number }) {
  const height = (size * 66) / 88;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="52 42 88 66"
      width={size}
      height={height}
      aria-label="Gmail"
      role="img"
    >
      <path fill="#4285F4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill="#34A853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path fill="#FBBC04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="#EA4335" d="M72 74V48l24 18 24-18v26L96 92" />
      <path fill="#C5221F" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
    </svg>
  );
}
