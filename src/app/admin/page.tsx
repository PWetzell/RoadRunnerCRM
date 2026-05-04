'use client';

import { useMemo } from 'react';
import Topbar from '@/components/layout/Topbar';
import { Sparkle, ShieldCheck, ArrowClockwise, Gear, UsersThree, Database, ClockClockwise, CheckCircle, Warning, User, Handbag, File, ArrowsClockwise, Trash, Plus, Cloud } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useDocumentStore } from '@/stores/document-store';
import { useUserStore } from '@/stores/user-store';
import { useAdminDashboardStore } from '@/stores/admin-dashboard-store';
import { isDemoEmail } from '@/lib/auth/demo-accounts';
import { initials } from '@/lib/utils';
import GenericWidgetGrid from '@/components/dashboard/GenericWidgetGrid';
import ViewToolbar from '@/components/dashboard/ViewToolbar';
import { WidgetStoreProvider, WidgetStoreActions } from '@/components/dashboard/WidgetStoreContext';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import ConfigurableCard from '@/components/ui/ConfigurableCard';

/**
 * DEMO admin dataset — only rendered for the demo whitelist
 * (`isDemoEmail`). Real accounts get the live single-user view computed
 * below from their own profile. Without this gating Paul's brand-new
 * pwentzell64 account showed Sarah Chen / Marcus Webb / Diana Reyes
 * sitting in User Management before he'd ever invited anyone — the bug
 * he flagged on 2026-04-27.
 */
const DEMO_USERS = [
  { id: 'u-1', name: 'Paul Wentzell', email: 'paul@roadrunnercrm.com', role: 'Admin', status: 'Active', color: '#1955A6' },
  { id: 'u-2', name: 'Sarah Chen', email: 's.chen@roadrunnercrm.com', role: 'Manager', status: 'Active', color: '#047857' },
  { id: 'u-3', name: 'Marcus Webb', email: 'm.webb@roadrunnercrm.com', role: 'Sales Rep', status: 'Active', color: '#C2410C' },
  { id: 'u-4', name: 'Diana Reyes', email: 'd.reyes@roadrunnercrm.com', role: 'Recruiter', status: 'Active', color: '#6A0FB8' },
  { id: 'u-5', name: 'Tom Nakamura', email: 't.nakamura@roadrunnercrm.com', role: 'Sales Rep', status: 'Inactive', color: '#0B2F5C' },
];

const DEMO_AUDIT_LOG = [
  { id: 'a-1', action: 'Deal created', target: 'Inbound inquiry', user: 'Paul Wentzell', time: '2h ago', icon: <Handbag size={12} /> },
  { id: 'a-2', action: 'Contact updated', target: 'Sarah Chen', user: 'Paul Wentzell', time: '3h ago', icon: <User size={12} /> },
  { id: 'a-3', action: 'Document uploaded', target: 'Q2 Forecast', user: 'Paul Wentzell', time: '5h ago', icon: <File size={12} /> },
  { id: 'a-4', action: 'Deal stage changed', target: 'Vertex Sr. DS', user: 'Paul Wentzell', time: '1d ago', icon: <ArrowsClockwise size={12} /> },
  { id: 'a-5', action: 'Settings changed', target: 'Theme updated', user: 'Paul Wentzell', time: '3d ago', icon: <Gear size={12} /> },
];

const DEMO_ROLES = [
  { id: 'r-1', name: 'Admin', desc: 'Full access', users: 1, perms: ['All'] },
  { id: 'r-2', name: 'Manager', desc: 'View all, manage team', users: 1, perms: ['Contacts', 'Sales', 'Reporting'] },
  { id: 'r-3', name: 'Sales Rep', desc: 'Own contacts + deals', users: 2, perms: ['Contacts (own)', 'Sales (own)'] },
  { id: 'r-4', name: 'Recruiter', desc: 'Candidates + pipeline', users: 1, perms: ['Contacts', 'Recruiting'] },
];

export default function AdminPage() {
  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const documents = useDocumentStore((s) => s.documents);
  const currentUser = useUserStore((s) => s.user);

  // Demo whitelist gets the seeded fake-team / fake-audit dataset so
  // hiring managers see a populated workspace. Everyone else (real
  // accounts) gets ONLY their own profile in User Management — every
  // other section renders an empty state with a CTA. No fabricated
  // teammates, no fabricated audit log entries, no fabricated AI usage
  // numbers, no fabricated system-health detail strings. Paul flagged
  // explicitly on 2026-04-27: "I don't want any fake data for my
  // account!!!!" — so REAL_* fallback constants got deleted in favor
  // of `null` which the JSX renders as an empty-state card.
  const isDemo = isDemoEmail(currentUser.email);
  const users = isDemo
    ? DEMO_USERS
    : [
        {
          id: 'me',
          name: currentUser.name || currentUser.email || 'You',
          email: currentUser.email,
          role: 'Admin',
          status: 'Active',
          color: currentUser.avatarColor || '#1955A6',
        },
      ];
  const auditLog = isDemo ? DEMO_AUDIT_LOG : [];
  const roles = isDemo ? DEMO_ROLES : [];
  // Demo AI Usage shows fabricated traffic numbers; real accounts show
  // a single empty state — no zeros (which would imply "we measured 0",
  // we haven't), no fabricated model name.
  const aiUsage = isDemo
    ? { callsToday: '142', thisMonth: '3,847', model: 'Sonnet', avgResponse: '1.2s' }
    : null;
  // Demo System Health shows fabricated DB sizes / AI call counts /
  // storage usage; real accounts show a single empty state until we
  // wire actual telemetry endpoints.
  const health = isDemo
    ? {
        api: 'All endpoints responding',
        db: 'PostgreSQL 16.2 — 156 MB',
        ai: 'Claude Sonnet — 142 calls',
        storage: '156 MB of 500 MB (31%)',
      }
    : null;

  const views = useAdminDashboardStore((s) => s.views);
  const activeViewId = useAdminDashboardStore((s) => s.activeViewId);
  const setActiveViewId = useAdminDashboardStore((s) => s.setActiveViewId);
  const activeView = views.find((v) => v.id === activeViewId);
  const storeWidgets = activeView?.widgets || [];

  const reorderWidgets = useAdminDashboardStore((s) => s.reorderWidgets);
  const resizeWidget = useAdminDashboardStore((s) => s.resizeWidget);
  const removeWidget = useAdminDashboardStore((s) => s.removeWidget);
  const addWidget = useAdminDashboardStore((s) => s.addWidget);
  const setWidgetHeaderColor = useAdminDashboardStore((s) => s.setWidgetHeaderColor);
  const setWidgetStyle = useAdminDashboardStore((s) => s.setWidgetStyle);
  const updateWidgetConfig = useAdminDashboardStore((s) => s.updateWidgetConfig);
  const saveAsView = useAdminDashboardStore((s) => s.saveAsView);
  const renameView = useAdminDashboardStore((s) => s.renameView);
  const deleteView = useAdminDashboardStore((s) => s.deleteView);
  const resetLayout = useAdminDashboardStore((s) => s.resetLayout);

  const actions: WidgetStoreActions = useMemo(() => ({
    removeWidget, resizeWidget, setWidgetHeaderColor, setWidgetStyle, updateWidgetConfig,
  }), [removeWidget, resizeWidget, setWidgetHeaderColor, setWidgetStyle, updateWidgetConfig]);

  const staleCount = contacts.filter((c) => c.stale).length;

  return (
    <>
      <Topbar title="Admin" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-5 pt-3 pb-1 flex flex-col gap-1.5 items-start">
          {/* AI Insights bar — same pattern as all other pages */}
          <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-2.5 py-1.5 flex items-center gap-2 rounded-lg w-full h-[32px] overflow-hidden">
            <div className="w-[18px] h-[18px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
              <Sparkle size={11} weight="duotone" className="text-white" />
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              <strong className="font-extrabold text-[var(--text-primary)]">System Admin</strong>
              <span> · {users.length} user{users.length !== 1 ? 's' : ''} · {contacts.length} contacts · {deals.length} deals · {documents.length} documents</span>
            </div>
            {staleCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
                <Warning size={10} /> {staleCount} incomplete contacts
              </span>
            )}
          </div>

          {/* View toolbar — same as main Dashboard */}
          <ViewToolbar
            views={views}
            activeViewId={activeViewId}
            widgetCount={storeWidgets.length}
            onSwitchView={setActiveViewId}
            onSaveAs={saveAsView}
            onRename={renameView}
            onDelete={deleteView}
            onReset={resetLayout}
            onAddWidget={addWidget}
          />
        </div>

        <div className="max-w-[1400px] mx-auto px-5 pb-5 flex flex-col gap-5">
          {/* Draggable widget grid */}
          <WidgetStoreProvider actions={actions}>
            <GenericWidgetGrid widgets={storeWidgets} onReorder={reorderWidgets} />
          </WidgetStoreProvider>

          {/* Static admin sections below the widget grid */}
          <ConfigurableCard cardId="admin-system-health" title="System Health" defaultIconName="CheckCircle">
            {health ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <HealthItem label="API Status" ok detail={health.api} />
                <HealthItem label="Database" ok detail={health.db} />
                <HealthItem label="AI Service" ok detail={health.ai} />
                <HealthItem label="Storage" detail={health.storage} />
              </div>
            ) : (
              <EmptyState
                icon={<CheckCircle size={18} weight="duotone" />}
                title="System health telemetry not yet available"
                hint="Real-time API, database, and storage metrics will appear here once monitoring is configured."
              />
            )}
          </ConfigurableCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfigurableCard cardId="admin-user-mgmt" title="User Management" defaultIconName="UsersThree" headerExtra={<button className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"><Plus size={12} weight="bold" /> Invite</button>}>
              {users.map((u) => {
                // Admin tag uses brand colors by default; other roles use neutral.
                // Both override with the card's custom tag vars when set.
                const isAdmin = u.role === 'Admin';
                const tagBg = isAdmin ? 'var(--card-tag-bg, var(--brand-bg))' : 'var(--card-tag-bg, var(--surface-raised))';
                const tagText = isAdmin ? 'var(--card-tag-text, var(--brand-primary))' : 'var(--card-tag-text, var(--text-secondary))';
                const tagBorder = isAdmin ? 'var(--card-tag-border, var(--brand-primary))' : 'var(--card-tag-border, var(--border))';
                return (
                  <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0" style={{ background: u.color }}>{initials(u.name)}</div>
                    <div className="flex-1 min-w-0">
                      {/* Name reads the card's Value (content) color + size so the
                          existing "Value" typography tier controls it. */}
                      <div
                        className="font-bold truncate"
                        style={{
                          color: 'var(--widget-primary-text, var(--text-primary))',
                          fontSize: 'calc(12px * var(--content-scale, 1))',
                        }}
                      >
                        {u.name}
                      </div>
                      {/* Email reads the Subtitle tier. */}
                      <div
                        className="truncate"
                        style={{
                          color: 'var(--widget-tertiary-text, var(--text-tertiary))',
                          fontSize: 'calc(10px * var(--widget-subtitle-scale, 1))',
                        }}
                      >
                        {u.email}
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full font-bold border"
                      style={{
                        background: tagBg,
                        color: tagText,
                        borderColor: tagBorder,
                        fontSize: 'calc(10px * var(--widget-subtitle-scale, 1))',
                      }}
                    >
                      {u.role}
                    </span>
                    <span className={`text-[10px] font-bold ${u.status === 'Active' ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}`}>{u.status}</span>
                  </div>
                );
              })}
            </ConfigurableCard>

            <ConfigurableCard cardId="admin-roles" title="Roles & Permissions" defaultIconName="ShieldCheck" headerExtra={<button className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"><Plus size={12} weight="bold" /> New Role</button>}>
              {roles.length === 0 && (
                <EmptyState
                  icon={<ShieldCheck size={18} weight="duotone" />}
                  title="No roles configured yet"
                  hint="Click + New Role to define what teammates can see and edit."
                />
              )}
              {roles.map((r) => (
                <div key={r.id} className="py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    {/* Role name reads the Value color + size */}
                    <span
                      className="font-bold"
                      style={{
                        color: 'var(--widget-primary-text, var(--text-primary))',
                        fontSize: 'calc(12px * var(--content-scale, 1))',
                      }}
                    >
                      {r.name}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{r.users} user{r.users!==1?'s':''}</span>
                  </div>
                  {/* Description reads the Subtitle tier */}
                  <div
                    className="mb-1"
                    style={{
                      color: 'var(--widget-tertiary-text, var(--text-secondary))',
                      fontSize: 'calc(10px * var(--widget-subtitle-scale, 1))',
                    }}
                  >
                    {r.desc}
                  </div>
                  {/* Permission chips pick up the card's tag vars */}
                  <div className="flex gap-1 flex-wrap">
                    {r.perms.map((p) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 rounded font-bold border"
                        style={{
                          background: 'var(--card-tag-bg, var(--surface-raised))',
                          color: 'var(--card-tag-text, var(--text-tertiary))',
                          borderColor: 'var(--card-tag-border, transparent)',
                          fontSize: 'calc(9px * var(--widget-subtitle-scale, 1))',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </ConfigurableCard>
          </div>

          <ConfigurableCard cardId="admin-audit-log" title="Recent Activity" defaultIconName="ClockClockwise">
            {auditLog.length === 0 ? (
              <EmptyState
                icon={<ClockClockwise size={18} weight="duotone" />}
                title="No activity yet"
                hint="Workspace events (deals, contacts, document uploads, settings changes) will appear here as you work."
              />
            ) : (
              auditLog.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">{e.icon}</div>
                  <div className="flex-1 min-w-0"><span className="text-[12px] text-[var(--text-primary)]"><span className="font-bold">{e.action}</span> — {e.target}</span></div>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{e.user}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 w-[60px] text-right">{e.time}</span>
                </div>
              ))
            )}
          </ConfigurableCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfigurableCard cardId="admin-data-mgmt" title="Data Management" defaultIconName="Database">
              <div className="flex flex-col gap-3">
                <ActionBtn icon={<Cloud size={14} />} label="Export All Data" desc="Download as CSV/JSON." />
                <ActionBtn icon={<Cloud size={14} />} label="Import Data" desc="Bulk import from CSV or Excel." />
                <ActionBtn icon={<Trash size={14} />} label="Purge Inactive" desc="Remove inactive records." danger />
              </div>
            </ConfigurableCard>
            <ConfigurableCard cardId="admin-ai-usage" title="AI Usage" defaultIconName="Sparkle">
              {aiUsage ? (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <MetricBox label="Calls Today" value={aiUsage.callsToday} />
                  <MetricBox label="This Month" value={aiUsage.thisMonth} />
                  <MetricBox label="Model" value={aiUsage.model} />
                  <MetricBox label="Avg Response" value={aiUsage.avgResponse} />
                </div>
              ) : (
                <EmptyState
                  icon={<Sparkle size={18} weight="duotone" />}
                  title="No AI calls yet"
                  hint="Usage stats will appear here once you start using AI-assisted features like contact enrichment or email drafting."
                />
              )}
            </ConfigurableCard>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Empty-state used by every admin section when the signed-in user has
 * no real data yet. Single shared component so the cards stay visually
 * consistent (icon + title + hint copy in a centered column with a
 * neutral surface). Showing fabricated zeros / placeholder strings
 * here was Paul's complaint on 2026-04-27 ("I don't want any fake data
 * for my account!!!!"), so this is the only thing real accounts ever
 * see in the affected sections.
 */
function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-[var(--text-tertiary)]"
        style={{ background: 'var(--surface-raised)' }}
      >
        {icon}
      </div>
      <div className="text-[12px] font-bold text-[var(--text-primary)] mb-1">{title}</div>
      <div className="text-[11px] text-[var(--text-tertiary)] max-w-[320px] leading-relaxed">{hint}</div>
    </div>
  );
}

/**
 * Inner tile with ok/warn status coloring.
 *
 * When the parent ConfigurableCard sets a custom `innerTileBg`, it's exposed
 * as the CSS var `--card-inner-tile-bg` and used here — otherwise we fall
 * back to the status-appropriate success/warning tint.
 */
function HealthItem({ label, ok, detail }: { label: string; ok?: boolean; detail: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: `var(--card-inner-tile-bg, ${ok ? 'var(--success-bg)' : 'var(--warning-bg)'})` }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: ok ? 'var(--success)' : 'var(--warning)' }}>
        {ok ? <CheckCircle size={14} weight="fill" /> : <Warning size={14} weight="fill" />}
        <span className="text-[11px] font-bold">{label}</span>
      </div>
      <div className="text-[10px] text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}

/**
 * Inner KPI tile (Calls Today, This Month, Model, Avg Response on AI Usage).
 * Reads `--card-inner-tile-bg` so the parent ConfigurableCard's inner-tile-bg
 * setting cascades in without prop drilling.
 */
function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--card-inner-tile-bg, var(--surface-raised))' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{label}</div>
      <AnimatedCounter value={value} className="text-[16px] font-extrabold text-[var(--text-primary)] leading-none" />
    </div>
  );
}

/**
 * Data Management action button (Export, Import, Purge). Non-danger variants
 * read `--card-inner-tile-bg` so the parent ConfigurableCard's inner-tile-bg
 * cascades in. Danger variants keep their danger-tinted background for safety.
 */
function ActionBtn({ icon, label, desc, danger }: { icon: React.ReactNode; label: string; desc: string; danger?: boolean }) {
  return (
    <button
      className={`flex items-start gap-3 p-3 rounded-lg text-left border cursor-pointer transition-all ${danger ? 'border-[var(--danger)]' : 'border-[var(--border)] hover:border-[var(--brand-primary)]'}`}
      style={{ background: danger ? 'var(--danger-bg)' : 'var(--card-inner-tile-bg, var(--surface-card))' }}
    >
      <div
        className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 text-[var(--text-secondary)]"
        style={{ background: danger ? 'var(--danger)' : 'var(--card-inner-tile-bg, var(--surface-raised))', color: danger ? 'white' : undefined }}
      >
        {icon}
      </div>
      <div><div className={`text-[12px] font-bold ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{label}</div><div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{desc}</div></div>
    </button>
  );
}
