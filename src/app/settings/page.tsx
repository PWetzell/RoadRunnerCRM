'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { useUserStore } from '@/stores/user-store';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Bell, Warning, Sparkle, X as XIcon, Users, CurrencyDollar, UsersFour, Files, Lock, PencilSimple, House, ChartPieSlice, Rows, ChartBar, ArrowRight } from '@phosphor-icons/react';
import { isEmail } from '@/lib/validation';
import { DENSITY_LABELS, DENSITY_HINTS, GridDensity } from '@/lib/grid-density';
import { toast } from '@/lib/toast';
import GmailIntegrationSection from '@/components/gmail/GmailIntegrationSection';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const notifications = useUserStore((s) => s.notifications);
  const updateNotifications = useUserStore((s) => s.updateNotifications);
  const sidebarBadges = useUserStore((s) => s.sidebarBadges);
  const updateSidebarBadges = useUserStore((s) => s.updateSidebarBadges);
  const insightsBars = useUserStore((s) => s.insightsBars);
  const updateInsightsBars = useUserStore((s) => s.updateInsightsBars);
  const defaultView = useUserStore((s) => s.defaultView);
  const setDefaultView = useUserStore((s) => s.setDefaultView);

  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const setAiEnabled = useUserStore((s) => s.setAiEnabled);
  const gridDensity = useUserStore((s) => s.gridDensity);
  const setGridDensity = useUserStore((s) => s.setGridDensity);
  const gridZebra = useUserStore((s) => s.gridZebra);
  const setGridZebra = useUserStore((s) => s.setGridZebra);

  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameVal, setNameVal] = useState(user.name);
  const [emailVal, setEmailVal] = useState(user.email);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  // Live validation
  const nameError =
    nameVal.trim().length === 0 ? 'Name is required'
      : nameVal.trim().length < 2 ? 'Name must be at least 2 characters'
      : nameVal.length > 80 ? 'Name must be at most 80 characters'
      : null;
  const emailError = emailVal.trim().length === 0 ? 'Email is required' : isEmail()(emailVal);
  const newPwError =
    newPw.length === 0 ? null
      : newPw.length < 8 ? 'New password must be at least 8 characters'
      : newPw.length > 128 ? 'New password must be at most 128 characters'
      : null;
  const confirmPwError =
    confirmPw.length === 0 ? null
      : newPw !== confirmPw ? 'Passwords do not match'
      : null;

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/contacts');
  }

  function saveName() {
    if (nameError) return;
    updateUser({ name: nameVal.trim() });
    setEditingName(false);
    toast.success('Name updated');
  }

  function saveEmail() {
    if (emailError) return;
    updateUser({ email: emailVal.trim() });
    setEditingEmail(false);
    toast.success('Email updated');
  }

  function savePassword() {
    if (!currentPw || !newPw || newPw !== confirmPw || newPwError || confirmPwError) return;
    setPwSaved(true);
    setChangingPassword(false);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwSaved(false), 3000);
    toast.success('Password changed');
  }

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-6 py-6 flex flex-col gap-4">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-[var(--surface-bg)] -mx-6 px-6 py-3 border-b border-[var(--border)] flex items-center justify-between -mt-6 mb-1">
            <span className="text-[15px] font-extrabold text-[var(--text-primary)]">Settings</span>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
            >
              <XIcon size={16} weight="bold" />
            </button>
          </div>

          {/* AI Insights — master toggle */}
          <Section tourId="settings-ai" title="AI Insights" description="Turn AI-powered features on or off across the entire app.">
            <div className="flex items-center justify-between py-3 gap-4">
              <div className="min-w-0 flex items-start gap-2">
                <Sparkle size={14} weight="duotone" className={aiEnabled ? 'text-[var(--ai)] mt-0.5' : 'text-[var(--text-tertiary)] mt-0.5'} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">Enable AI features</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">
                    Controls AI suggestions, duplicate detection, enrichment, record health, and the AI insights bars. When off, all AI-branded panels are hidden.
                  </div>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={aiEnabled}
                onClick={() => {
                  const next = !aiEnabled;
                  setAiEnabled(next);
                  toast.info(next ? 'AI features enabled' : 'AI features disabled', {
                    description: next
                      ? 'Duplicate detection, enrichment, and insights are now active.'
                      : 'All AI-branded panels hidden app-wide.',
                  });
                }}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer border-none ${aiEnabled ? 'bg-[var(--ai)]' : 'bg-[var(--border-strong)]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${aiEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          </Section>

          {/* Account */}
          <Section tourId="settings-account" title="Account" description="Your profile and login credentials.">
            <Row
              label="Name"
              hint={user.name}
              control={
                editingName ? (
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex gap-1.5">
                      <input value={nameVal} maxLength={80} onChange={(e) => setNameVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveName()}
                        autoFocus className={`h-8 px-2 text-[12px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none w-[180px] ${nameError ? 'border-[var(--danger)]' : 'border-[var(--brand-primary)]'}`} />
                      <button onClick={saveName} disabled={!!nameError} className="h-8 px-3 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
                    </div>
                    {nameError && <div className="text-[10px] font-semibold text-[var(--danger)]">{nameError}</div>}
                  </div>
                ) : (
                  <button onClick={() => { setNameVal(user.name); setEditingName(true); }}
                    className="flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline">
                    <PencilSimple size={12} /> Edit
                  </button>
                )
              }
            />
            <Row
              label="Email"
              hint={user.email}
              control={
                editingEmail ? (
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex gap-1.5">
                      <input type="email" autoComplete="email" inputMode="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEmail()}
                        autoFocus className={`h-8 px-2 text-[12px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none w-[220px] ${emailError ? 'border-[var(--danger)]' : 'border-[var(--brand-primary)]'}`} />
                      <button onClick={saveEmail} disabled={!!emailError} className="h-8 px-3 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
                    </div>
                    {emailError && <div className="text-[10px] font-semibold text-[var(--danger)]">{emailError}</div>}
                  </div>
                ) : (
                  <button onClick={() => { setEmailVal(user.email); setEditingEmail(true); }}
                    className="flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline">
                    <PencilSimple size={12} /> Edit
                  </button>
                )
              }
            />
            <Row
              label="Password"
              hint={pwSaved ? 'Password updated successfully.' : 'Change your login password.'}
              control={
                changingPassword ? (
                  <div className="flex flex-col gap-1.5 items-end">
                    <input type="password" autoComplete="current-password" placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                      className="h-8 px-2 text-[12px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none w-[200px] focus:border-[var(--brand-primary)]" />
                    <input type="password" autoComplete="new-password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      className={`h-8 px-2 text-[12px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none w-[200px] ${newPwError ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`} />
                    {newPwError && <div className="text-[10px] font-semibold text-[var(--danger)]">{newPwError}</div>}
                    <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                      className={`h-8 px-2 text-[12px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none w-[200px] ${confirmPwError ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`} />
                    {confirmPwError && <div className="text-[10px] font-semibold text-[var(--danger)]">{confirmPwError}</div>}
                    <div className="flex gap-1.5">
                      <button onClick={() => setChangingPassword(false)}
                        className="h-8 px-3 text-[11px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-md bg-transparent cursor-pointer">Cancel</button>
                      <button onClick={savePassword} disabled={!currentPw || !newPw || newPw !== confirmPw || !!newPwError || !!confirmPwError}
                        className="h-8 px-3 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer disabled:opacity-50">Save</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setChangingPassword(true)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline">
                    <Lock size={12} /> Change
                  </button>
                )
              }
            />
          </Section>

          {/* Integrations — Gmail (own card so it can show live connection state
              without forcing the surrounding <Section> shell to be data-aware). */}
          <GmailIntegrationSection />

          {/* Appearance */}
          <Section tourId="settings-appearance" title="Appearance" description="How the CRM looks on your screen.">
            <Row
              label="Theme"
              hint="Switch between light and dark mode."
              control={
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all"
                >
                  {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === 'light' ? 'Light' : 'Dark'}
                </button>
              }
            />
          </Section>

          {/* Grid Density */}
          <Section tourId="settings-grid-density" title="Grid Density" description="Row height and striping for all data grids (Contacts, Sales, Recruiting, Documents).">
            <div className="py-3">
              <div className="flex items-start gap-2 mb-3">
                <Rows size={14} className="text-[var(--text-secondary)] mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">Row density</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">Applies to every list view across the app.</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'comfortable', 'spacious'] as GridDensity[]).map((d) => {
                  const active = gridDensity === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setGridDensity(d)}
                      className={`flex flex-col items-start gap-0.5 p-3 rounded-[var(--radius-md)] border-2 cursor-pointer text-left transition-all ${
                        active
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-bg)]'
                          : 'border-[var(--border-strong)] bg-transparent hover:border-[var(--brand-primary)]'
                      }`}
                    >
                      <span className={`text-[12px] font-extrabold ${active ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>{DENSITY_LABELS[d]}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{DENSITY_HINTS[d]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Toggle
              icon={<Rows size={14} />}
              label="Zebra striping"
              hint="Alternate row background colors to improve scannability in wide grids."
              checked={gridZebra}
              onChange={setGridZebra}
            />
          </Section>

          {/* Contacts */}
          <Section tourId="settings-contacts" title="Contacts" description="Defaults for the Contacts workspace.">
            <Row
              label="Default view"
              hint="Which filter is selected when you open Contacts."
              control={
                <select
                  value={defaultView}
                  onChange={(e) => setDefaultView(e.target.value as 'all' | 'org' | 'person')}
                  className="h-8 px-2 text-[12px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                >
                  <option value="all">All</option>
                  <option value="org">Organizations</option>
                  <option value="person">People</option>
                </select>
              }
            />
          </Section>

          {/* Sidebar Badges */}
          <Section tourId="settings-sidebar-badges" title="Sidebar Badges" description="Control which alert badges show in the navigation sidebar.">
            <Toggle
              icon={<Users size={14} />}
              label="Contacts — Incomplete profiles"
              hint="Show count of contacts flagged as incomplete."
              checked={sidebarBadges?.contacts ?? true}
              onChange={(v) => updateSidebarBadges({ contacts: v })}
            />
            <Toggle
              icon={<CurrencyDollar size={14} />}
              label="Sales — Stalled deals"
              hint="Show count of open deals with no activity for 14+ days."
              checked={sidebarBadges?.sales ?? true}
              onChange={(v) => updateSidebarBadges({ sales: v })}
            />
            <Toggle
              icon={<UsersFour size={14} />}
              label="Recruiting — Needs action"
              hint="Show count of candidates in early stages needing follow-up."
              checked={sidebarBadges?.recruiting ?? true}
              onChange={(v) => updateSidebarBadges({ recruiting: v })}
            />
            <Toggle
              icon={<Files size={14} />}
              label="Documents — Uncategorized"
              hint="Show count of documents with no category assigned."
              checked={sidebarBadges?.documents ?? false}
              onChange={(v) => updateSidebarBadges({ documents: v })}
            />
          </Section>

          {/* Page Insights Bars */}
          <Section tourId="settings-insights-bars" title="Page Insights Bars" description={aiEnabled ? 'Toggle the AI insights bar at the top of each page.' : 'Disabled — turn on AI features above to use.'}>
            <Toggle
              icon={<House size={14} />}
              label="Dashboard"
              hint="Overview stats — open deals, contacts, incomplete count."
              checked={aiEnabled && (insightsBars?.dashboard ?? true)}
              disabled={!aiEnabled}
              onChange={(v) => updateInsightsBars({ dashboard: v })}
            />
            <Toggle
              icon={<Users size={14} />}
              label="Contacts"
              hint="AI Insights — incomplete contacts, stale profiles."
              checked={aiEnabled && (insightsBars?.contacts ?? true)}
              disabled={!aiEnabled}
              onChange={(v) => updateInsightsBars({ contacts: v })}
            />
            <Toggle
              icon={<CurrencyDollar size={14} />}
              label="Sales"
              hint="AI Pipeline Forecast — weighted forecast, total open."
              checked={aiEnabled && (insightsBars?.sales ?? true)}
              disabled={!aiEnabled}
              onChange={(v) => updateInsightsBars({ sales: v })}
            />
            <Toggle
              icon={<UsersFour size={14} />}
              label="Recruiting"
              hint="Recruiting Pipeline — active candidates, placed, stalled."
              checked={aiEnabled && (insightsBars?.recruiting ?? true)}
              disabled={!aiEnabled}
              onChange={(v) => updateInsightsBars({ recruiting: v })}
            />
            <Toggle
              icon={<Files size={14} />}
              label="Documents"
              hint="Document stats — file count, PDFs, images."
              checked={aiEnabled && (insightsBars?.documents ?? true)}
              disabled={!aiEnabled}
              onChange={(v) => updateInsightsBars({ documents: v })}
            />
            <Toggle
              icon={<ChartPieSlice size={14} />}
              label="Reporting"
              hint="AI Report Summary — win rate, forecast."
              checked={aiEnabled && (insightsBars?.reporting ?? true)}
              disabled={!aiEnabled}
              onChange={(v) => updateInsightsBars({ reporting: v })}
            />
          </Section>

          {/* Quality Score — discoverability path to the rules editor.
              The editor lives as a draggable widget on /admin. Settings
              surfaces a link so users who never click a badge can still
              find it; "Manage scoring rules →" lands them on the admin
              page where the widget hosts the KPIs + chart + table. */}
          <Section tourId="settings-scoring" title="Quality Score" description="The 0–100 score on every contact is rule-driven. Manage the rules in Admin.">
            <Row
              label="Scoring rules"
              hint="Toggle, edit, add, or reset the rules that compute every contact's quality score."
              control={
                <button
                  onClick={() => router.push('/admin')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all cursor-pointer"
                >
                  <ChartBar size={14} weight="bold" />
                  Manage scoring rules
                  <ArrowRight size={12} weight="bold" />
                </button>
              }
            />
          </Section>

          {/* Notifications */}
          <Section tourId="settings-notifications" title="Notifications" description="What the CRM alerts you about.">
            <Toggle
              icon={<Bell size={14} />}
              label="Email updates"
              hint="Weekly summary of contact activity."
              checked={notifications.emailUpdates}
              onChange={(v) => updateNotifications({ emailUpdates: v })}
            />
            <Toggle
              icon={<Warning size={14} />}
              label="Incomplete contact alerts"
              hint={aiEnabled ? 'Notify when AI flags a contact as incomplete.' : 'Disabled — turn on AI features above to use.'}
              checked={aiEnabled && notifications.staleAlerts}
              disabled={!aiEnabled}
              onChange={(v) => updateNotifications({ staleAlerts: v })}
            />
            <Toggle
              icon={<Sparkle size={14} weight="duotone" />}
              label="AI suggestions"
              hint={aiEnabled ? 'Duplicate detection, hierarchy hints, enrichment.' : 'Disabled — turn on AI features above to use.'}
              checked={aiEnabled && notifications.aiSuggestions}
              disabled={!aiEnabled}
              onChange={(v) => updateNotifications({ aiSuggestions: v })}
            />
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, description, children, tourId }: { title: string; description?: string; children: React.ReactNode; tourId?: string }) {
  return (
    <div data-tour={tourId} className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="text-[14px] font-extrabold text-[var(--text-primary)]">{title}</div>
        {description && <div className="text-[12px] text-[var(--text-tertiary)]">{description}</div>}
      </div>
      <div className="px-5 py-3 flex flex-col divide-y divide-[var(--border-subtle)]">{children}</div>
    </div>
  );
}

function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</div>
        {hint && <div className="text-[11px] text-[var(--text-tertiary)]">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function Toggle({ icon, label, hint, checked, onChange, disabled }: { icon?: React.ReactNode; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex items-start gap-2">
        {icon && <span className="text-[var(--text-secondary)] mt-0.5">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</div>
          {hint && <div className="text-[11px] text-[var(--text-tertiary)]">{hint}</div>}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 border-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-strong)]'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
