'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Bell, Lifebuoy, X, Sun, Moon, UserCircle, Gear, SignOut, CaretDown } from '@phosphor-icons/react';
import { useTheme } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/user-store';
import { useAlertStore } from '@/stores/alert-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useListStore } from '@/stores/list-store';
import { useDocumentStore } from '@/stores/document-store';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
import AlertPanel from '@/components/alerts/AlertPanel';
import HelpPanel from '@/components/help/HelpPanel';
import ActiveTourOverlay from '@/components/help/ActiveTourOverlay';
import { useTourStore } from '@/stores/tour-store';

interface TopbarProps {
  title?: string;
  children?: React.ReactNode;
}

export default function Topbar({ title = 'Contacts', children }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const user = useUserStore((s) => s.user);
  const signOut = useUserStore((s) => s.signOut);
  const alertPanelOpen = useAlertStore((s) => s.panelOpen);
  const setAlertPanelOpen = useAlertStore((s) => s.setPanelOpen);
  // Derive unread count from raw state to avoid calling a method that returns
  // a fresh value every render (caused infinite loop previously).
  const alertsRaw = useAlertStore((s) => s.alerts);
  const alertSettings = useAlertStore((s) => s.settings);
  const unreadAlertCount = useMemo(() => {
    const order = { info: 0, success: 1, warning: 2, critical: 3 };
    return alertsRaw.filter((a) => {
      if (a.dismissed || a.read) return false;
      if (alertSettings.enabledTypes[a.type] === false) return false;
      if (order[a.severity] < order[alertSettings.minSeverity]) return false;
      return true;
    }).length;
  }, [alertsRaw, alertSettings]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Zustand's persist middleware hydrates from localStorage on the client
  // only. The badge count can differ between SSR (seed data) and client
  // (persisted state), so we gate rendering it until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [userMenuOpen]);

  const userInitials = initials(user.name);

  return (
    <header className="h-[var(--topbar-h)] bg-[var(--surface-card)] border-b border-[var(--border)] flex items-center px-6 gap-4 flex-shrink-0 transition-colors duration-300">
      <h1 className="text-base font-extrabold text-[var(--text-primary)] flex-shrink-0">
        {title}
      </h1>

      {children}

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications bell */}
        <div className="relative">
          <button
            data-tour="topbar-notifications"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => { setAlertPanelOpen(!alertPanelOpen); setHelpOpen(false); }}
            className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-all ${
              alertPanelOpen
                ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bell size={20} weight={alertPanelOpen ? 'fill' : 'regular'} />
            {mounted && unreadAlertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-extrabold flex items-center justify-center">
                {unreadAlertCount}
              </span>
            )}
          </button>
          <AlertPanel />
        </div>

        {/* Help */}
        <div className="relative">
          <HelpButton helpOpen={helpOpen} onToggle={() => { setHelpOpen(!helpOpen); setAlertPanelOpen(false); }} />
          {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
          <ActiveTourOverlay />
        </div>

        {/* Theme Toggle */}
        <button
          data-tour="topbar-theme"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all duration-200"
        >
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'light' ? 'Light' : 'Dark'}
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            data-tour="topbar-user-menu"
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 group"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-offset-[var(--surface-card)] transition-all"
              style={{ background: user.avatarColor, boxShadow: userMenuOpen ? `0 0 0 2px ${user.avatarColor}, 0 0 0 4px var(--surface-card)` : undefined }}
            >
              {userInitials}
            </div>
            <CaretDown
              size={12}
              weight="bold"
              className={`text-[var(--text-secondary)] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[60] py-1 animate-[fadeUp_0.15s_ease-out]">
              {/* Profile header */}
              <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
                  style={{ background: user.avatarColor }}
                >
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{user.name}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] truncate">{user.role}</div>
                </div>
              </div>

              {/* Menu items */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] no-underline"
              >
                <UserCircle size={14} /> My Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] no-underline"
              >
                <Gear size={14} /> Settings
              </Link>
              <div className="h-px bg-[var(--border-subtle)] my-1" />
              <button
                onClick={async () => {
                  setUserMenuOpen(false);
                  // Kill the Supabase session cookie *before* flipping the
                  // Zustand auth flag. Otherwise AuthGate's `getUser()` /
                  // `onAuthStateChange` listener still sees a valid session
                  // on its next tick and silently signs the user back in —
                  // which is exactly the "I signed out but I'm still
                  // logged in" bug Paul reported.
                  try {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                  } catch {
                    // Best-effort: even if the network call fails the local
                    // store flip below will still drop the user onto the
                    // sign-in screen.
                  }
                  // Reset Gmail status so the AuthGate's downstream surfaces
                  // (banner, settings card) don't render a stale
                  // "connected as <email>" pill the next time the user
                  // signs in as a different account.
                  useGmailStatusStore.getState().setOptimistic({ connected: false });
                  // Wipe EVERY seedable store so the next sign-in (demo
                  // or real) doesn't briefly flash the previous
                  // identity's data before AuthGate's
                  // dispatchDataForUser takes over. Especially
                  // important when switching FROM demo TO real —
                  // without this, real users would see demo contacts /
                  // deals / alerts / saved lists / documents / custom
                  // reports flashing for a tick on every login. (The
                  // 50-alerts-on-the-bell bug Paul hit on 2026-04-27
                  // was specifically alerts surviving sign-out.)
                  useContactStore.getState().clearAll();
                  useSalesStore.getState().clearAll();
                  useAlertStore.getState().clearAll();
                  useListStore.getState().clearAll();
                  useDocumentStore.getState().clearAll();
                  useCustomReportStore.getState().clearAll();
                  // Clear the AuthGate identity tracker so the next
                  // sign-in is treated as a fresh identity (forces a
                  // clean clearAll + re-seed). Without this, signing
                  // out then signing in as the same email skips the
                  // wipe and inherits whatever's still in localStorage
                  // from a partial state during sign-out.
                  try { localStorage.removeItem('roadrunner.lastDispatchedEmail'); } catch {}
                  signOut();
                  // Hard reload on sign-out so AuthGate mounts fresh.
                  // The auth panel's local React state (demoLoading,
                  // submitting, error) does NOT clear automatically
                  // when AuthGate's JSX swaps subtrees, which left the
                  // Launch Demo button stuck on "Loading demo…" after
                  // a sign-out round trip. Industry pattern (Linear,
                  // Notion, Slack): sign-out always full-reloads to
                  // guarantee a clean slate.
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer text-left"
              >
                <SignOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Reactive help button — shows X when help panel or tour is active */
function HelpButton({ helpOpen, onToggle }: { helpOpen: boolean; onToggle: () => void }) {
  const tourActive = useTourStore((s) => s.activeWalkthrough);
  const exitTour = useTourStore((s) => s.exitTour);
  const active = helpOpen || !!tourActive;

  return (
    <button
      data-tour="topbar-help"
      title={active ? 'Close help' : 'Help & Guidance'}
      aria-label={active ? 'Close help' : 'Help & Guidance'}
      onClick={() => {
        if (tourActive) { exitTour(); return; }
        onToggle();
      }}
      className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-all ${
        active
          ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
      }`}
    >
      {active ? <X size={18} weight="bold" /> : <Lifebuoy size={20} />}
    </button>
  );
}
