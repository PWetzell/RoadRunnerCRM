'use client';

import { useMemo } from 'react';
import Topbar from '@/components/layout/Topbar';
import { Sparkle, ShieldCheck, ArrowClockwise, Gear, UsersThree, Database, ClockClockwise, CheckCircle, Warning, User, Handbag, File, ArrowsClockwise, Trash, Plus, Cloud } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useDocumentStore } from '@/stores/document-store';
import { useAdminDashboardStore } from '@/stores/admin-dashboard-store';
import GenericWidgetGrid from '@/components/dashboard/GenericWidgetGrid';
import ViewToolbar from '@/components/dashboard/ViewToolbar';
import { WidgetStoreProvider, WidgetStoreActions } from '@/components/dashboard/WidgetStoreContext';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import ConfigurableCard from '@/components/ui/ConfigurableCard';

const DEMO_USERS = [
  { id: 'u-1', name: 'Paul Wentzell', email: 'paul@roadrunnercrm.com', role: 'Admin', status: 'Active', color: '#1955A6' },
  { id: 'u-2', name: 'Sarah Chen', email: 's.chen@roadrunnercrm.com', role: 'Manager', status: 'Active', color: '#047857' },
  { id: 'u-3', name: 'Marcus Webb', email: 'm.webb@roadrunnercrm.com', role: 'Sales Rep', status: 'Active', color: '#C2410C' },
  { id: 'u-4', name: 'Diana Reyes', email: 'd.reyes@roadrunnercrm.com', role: 'Recruiter', status: 'Active', color: '#6A0FB8' },
  { id: 'u-5', name: 'Tom Nakamura', email: 't.nakamura@roadrunnercrm.com', role: 'Sales Rep', status: 'Inactive', color: '#0B2F5C' },
];

const AUDIT_LOG = [
  { id: 'a-1', action: 'Deal created', target: 'Inbound inquiry', user: 'Paul Wentzell', time: '2h ago', icon: <Handbag size={12} /> },
  { id: 'a-2', action: 'Contact updated', target: 'Sarah Chen', user: 'Paul Wentzell', time: '3h ago', icon: <User size={12} /> },
  { id: 'a-3', action: 'Document uploaded', target: 'Q2 Forecast', user: 'Paul Wentzell', time: '5h ago', icon: <File size={12} /> },
  { id: 'a-4', action: 'Deal stage changed', target: 'Vertex Sr. DS', user: 'Paul Wentzell', time: '1d ago', icon: <ArrowsClockwise size={12} /> },
  { id: 'a-5', action: 'Settings changed', target: 'Theme updated', user: 'Paul Wentzell', time: '3d ago', icon: <Gear size={12} /> },
];

const ROLES = [
  { id: 'r-1', name: 'Admin', desc: 'Full access', users: 1, perms: ['All'] },
  { id: 'r-2', name: 'Manager', desc: 'View all, manage team', users: 1, perms: ['Contacts', 'Sales', 'Reporting'] },
  { id: 'r-3', name: 'Sales Rep', desc: 'Own contacts + deals', users: 2, perms: ['Contacts (own)', 'Sales (own)'] },
  { id: 'r-4', name: 'Recruiter', desc: 'Candidates + pipeline', users: 1, perms: ['Contacts', 'Recruiting'] },
];

export default function AdminPage() {
  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const documents = useDocumentStore((s) => s.documents);

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
        <div className="max-w-[1400px] mx-auto px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
          {/* AI Insights bar — same pattern as all other pages */}
          <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
            <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={13} weight="duotone" className="text-white" />
            </div>
            <div className="text-[13px] text-[var(--text-secondary)]">
              <strong className="font-extrabold text-[var(--text-primary)]">System Admin</strong>
              <span> · {DEMO_USERS.length} users · {contacts.length} contacts · {deals.length} deals · {documents.length} documents</span>
            </div>
            {staleCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
                <Warning size={12} /> {staleCount} incomplete contacts
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <HealthItem label="API Status" ok detail="All endpoints responding" />
              <HealthItem label="Database" ok detail="PostgreSQL 16.2 — 156 MB" />
              <HealthItem label="AI Service" ok detail="Claude Sonnet — 142 calls" />
              <HealthItem label="Storage" detail="156 MB of 500 MB (31%)" />
            </div>
          </ConfigurableCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfigurableCard cardId="admin-user-mgmt" title="User Management" defaultIconName="UsersThree" headerExtra={<button className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"><Plus size={12} weight="bold" /> Invite</button>}>
              {DEMO_USERS.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0" style={{ background: u.color }}>{u.name.split(' ').map(n=>n[0]).join('')}</div>
                  <div className="flex-1 min-w-0"><div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{u.name}</div><div className="text-[10px] text-[var(--text-tertiary)] truncate">{u.email}</div></div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.role === 'Admin' ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]'}`}>{u.role}</span>
                  <span className={`text-[10px] font-bold ${u.status === 'Active' ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}`}>{u.status}</span>
                </div>
              ))}
            </ConfigurableCard>

            <ConfigurableCard cardId="admin-roles" title="Roles & Permissions" defaultIconName="ShieldCheck" headerExtra={<button className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"><Plus size={12} weight="bold" /> New Role</button>}>
              {ROLES.map((r) => (
                <div key={r.id} className="py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="flex items-center justify-between mb-1"><span className="text-[12px] font-bold text-[var(--text-primary)]">{r.name}</span><span className="text-[10px] text-[var(--text-tertiary)]">{r.users} user{r.users!==1?'s':''}</span></div>
                  <div className="text-[10px] text-[var(--text-secondary)] mb-1">{r.desc}</div>
                  <div className="flex gap-1 flex-wrap">{r.perms.map(p=><span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--surface-raised)] text-[var(--text-tertiary)]">{p}</span>)}</div>
                </div>
              ))}
            </ConfigurableCard>
          </div>

          <ConfigurableCard cardId="admin-audit-log" title="Recent Activity" defaultIconName="ClockClockwise">
            {AUDIT_LOG.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">{e.icon}</div>
                <div className="flex-1 min-w-0"><span className="text-[12px] text-[var(--text-primary)]"><span className="font-bold">{e.action}</span> — {e.target}</span></div>
                <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{e.user}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 w-[60px] text-right">{e.time}</span>
              </div>
            ))}
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
              <div className="grid grid-cols-2 gap-3 mb-3">
                <MetricBox label="Calls Today" value="142" />
                <MetricBox label="This Month" value="3,847" />
                <MetricBox label="Model" value="Sonnet" />
                <MetricBox label="Avg Response" value="1.2s" />
              </div>
            </ConfigurableCard>
          </div>
        </div>
      </div>
    </>
  );
}

function HealthItem({ label, ok, detail }: { label: string; ok?: boolean; detail: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: ok ? 'var(--success-bg)' : 'var(--warning-bg)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: ok ? 'var(--success)' : 'var(--warning)' }}>
        {ok ? <CheckCircle size={14} weight="fill" /> : <Warning size={14} weight="fill" />}
        <span className="text-[11px] font-bold">{label}</span>
      </div>
      <div className="text-[10px] text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-raised)] rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{label}</div>
      <AnimatedCounter value={value} className="text-[16px] font-extrabold text-[var(--text-primary)] leading-none" />
    </div>
  );
}

function ActionBtn({ icon, label, desc, danger }: { icon: React.ReactNode; label: string; desc: string; danger?: boolean }) {
  return (
    <button className={`flex items-start gap-3 p-3 rounded-lg text-left border cursor-pointer transition-all ${danger ? 'border-[var(--danger)] bg-[var(--danger-bg)]' : 'border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)]'}`}>
      <div className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 ${danger ? 'bg-[var(--danger)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'}`}>{icon}</div>
      <div><div className={`text-[12px] font-bold ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{label}</div><div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{desc}</div></div>
    </button>
  );
}
