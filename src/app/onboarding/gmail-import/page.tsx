'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Envelope, CheckCircle, Sparkle } from '@phosphor-icons/react';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * Post-OAuth landing page for "Connect Gmail."
 *
 * The user just granted Gmail scopes; the refresh token is now in
 * `gmail_connections`. We immediately open the curated import wizard
 * (top-sender review with smart defaults) so the connect flow ends with a
 * concrete, useful action — not just a banner that says "Synced 0 messages."
 *
 * The wizard itself is a globally-mounted modal (OnboardingImportMount),
 * so this page just opens the store flag and watches for close, then routes
 * the user back to the dashboard.
 */
export default function GmailImportLandingPage() {
  const router = useRouter();
  const importOpen = useOnboardingStore((s) => s.importOpen);
  const openImport = useOnboardingStore((s) => s.openImport);

  // Open the wizard on first mount.
  useEffect(() => {
    openImport();
  }, [openImport]);

  // When the user finishes (Import) or skips, the modal closes itself —
  // bounce them back to the dashboard.
  useEffect(() => {
    if (!importOpen) {
      // Tiny delay so the toast from the modal's import action gets a beat
      // to render before we navigate away from the page that hosts it.
      const t = setTimeout(() => router.replace('/dashboard'), 200);
      return () => clearTimeout(t);
    }
  }, [importOpen, router]);

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center p-8">
      <div className="max-w-[480px] flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--brand-bg)] flex items-center justify-center">
          <Envelope size={32} weight="duotone" className="text-[var(--brand-primary)]" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-extrabold text-[var(--text-primary)]">
            Gmail connected.
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            We&rsquo;re scanning your inbox for the people you email most. Pick the
            ones you want as contacts and we&rsquo;ll match every existing thread to
            their record.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full text-left">
          <Reassurance icon={<CheckCircle size={14} weight="fill" />} label="One-time setup. You won&rsquo;t see this screen again." />
          <Reassurance icon={<Sparkle size={14} weight="fill" />} label="Background sync runs from now on — no Connect screen on next login." />
        </div>
      </div>
    </div>
  );
}

function Reassurance({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px] text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
      <span className="text-[var(--brand-primary)] flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
