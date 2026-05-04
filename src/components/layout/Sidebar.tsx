'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Buildings, ChartBar, ClockCounterClockwise,
  ShieldCheck, Gear, House, CurrencyDollar, UsersFour,
  Files, ChartPieSlice, UserCircleGear, CaretLeft, List, Warning, Clock, Bookmark, ListNumbers, PaperPlaneTilt,
  EnvelopeSimple, CaretDown, CaretRight,
} from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useDocumentStore } from '@/stores/document-store';
import { useUserStore } from '@/stores/user-store';
import { useListStore, getSidebarPinnedLists, getListMemberCount } from '@/stores/list-store';
import { LIST_ENTITY_META } from '@/types/list';
import PinListsDropdown from '@/components/lists/PinListsDropdown';
import { LABELS } from '@/lib/vertical/hr-staffing';

/**
 * Top-level nav. The `Manage Emails` entry is a parent that expands to
 * show its two children (Bulk + Sequencing). Keeping bulk + sequences
 * grouped under one heading mirrors HubSpot's `Marketing > Email`
 * sub-routes and Outreach's `Sequences + Sends` cluster — both surface
 * outbound-email actions together so users learn one mental model.
 */
type NavChild = { href: string; icon: typeof House; label: string };
type NavItem =
  | { kind: 'link'; href: string; icon: typeof House; label: string; badgeKey?: 'contacts' | 'sales' | 'recruiting' | 'documents' }
  | { kind: 'group'; id: string; icon: typeof House; label: string; children: NavChild[] };

const NAV_ITEMS: NavItem[] = [
  { kind: 'link', href: '/dashboard', icon: House, label: 'Dashboard' },
  { kind: 'link', href: '/contacts', icon: Users, label: 'Contacts', badgeKey: 'contacts' },
  {
    kind: 'group',
    id: 'manage-emails',
    icon: EnvelopeSimple,
    label: 'Manage Emails',
    children: [
      { href: '/bulk', icon: PaperPlaneTilt, label: 'Bulk' },
      { href: '/sequences', icon: ListNumbers, label: 'Sequencing' },
    ],
  },
  // Sales nav entry hidden — pulled from the demo per Paul's request
  // until the sales-grid pill styling is reconciled with the contacts/
  // recruiting grids. Restore by uncommenting:
  //   { kind: 'link', href: '/sales', icon: CurrencyDollar, label: LABELS.navSales, badgeKey: 'sales' },
  { kind: 'link', href: '/recruiting', icon: UsersFour, label: 'Recruiting', badgeKey: 'recruiting' },
  { kind: 'link', href: '/documents', icon: Files, label: 'Documents', badgeKey: 'documents' },
  { kind: 'link', href: '/reporting', icon: ChartPieSlice, label: 'Reporting' },
  { kind: 'link', href: '/admin', icon: UserCircleGear, label: 'Admin' },
];

/** 14 days in ms — deals idle longer than this are "stalled" */
const STALE_DAYS = 14;

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeListId = searchParams.get('list');
  const [collapsed, setCollapsed] = useState(false);

  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const documents = useDocumentStore((s) => s.documents);
  const sidebarBadges = useUserStore((s) => s.sidebarBadges);

  // Public lists (shown as sidebar shortcuts)
  const allLists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const publicLists = useMemo(() => getSidebarPinnedLists(allLists), [allLists]);

  // Pin-list dropdown — opened by the gear icon next to "Saved Lists"
  const [pinDropdownOpen, setPinDropdownOpen] = useState(false);
  const [pinAnchor, setPinAnchor] = useState<DOMRect | undefined>(undefined);

  // Compute badge counts
  const badgeCounts = useMemo(() => {
    const now = Date.now();
    const staleDealThreshold = now - STALE_DAYS * 24 * 60 * 60 * 1000;

    // Contacts: incomplete profiles
    const incompleteContacts = contacts.filter((c) => c.stale).length;

    // Sales: stalled deals (open deals not updated in 14+ days)
    const stalledDeals = deals.filter((d) => {
      if (d.stage === 'closed-won' || d.stage === 'closed-lost') return false;
      const updated = new Date(d.lastUpdated).getTime();
      return updated < staleDealThreshold;
    }).length;

    // Recruiting: candidates needing action (person deals in lead or qualified stage idle 7+ days)
    const recruitingAction = deals.filter((d) => {
      if (!d.personContactId) return false;
      if (d.stage === 'closed-won' || d.stage === 'closed-lost') return false;
      if (d.stage !== 'lead' && d.stage !== 'qualified') return false;
      const updated = new Date(d.lastUpdated).getTime();
      return updated < now - 7 * 24 * 60 * 60 * 1000;
    }).length;

    // Documents: uncategorized (category === 'other')
    const uncategorizedDocs = documents.filter((d) => d.category === 'other').length;

    return {
      contacts: incompleteContacts,
      sales: stalledDeals,
      recruiting: recruitingAction,
      documents: uncategorizedDocs,
    };
  }, [contacts, deals, documents]);

  const BADGE_COLORS: Record<string, { icon: string; text: string }> = {
    contacts: { icon: 'var(--warning)', text: 'white' },
    sales: { icon: 'var(--danger)', text: 'white' },
    recruiting: { icon: 'var(--ai)', text: 'white' },
    documents: { icon: 'var(--text-tertiary)', text: 'white' },
  };

  return (
    <aside
      className={`flex-shrink-0 bg-[var(--sidebar-bg)] flex flex-col h-screen overflow-hidden border-r border-[var(--sidebar-border)] transition-all duration-300 ${
        collapsed ? 'w-[60px]' : 'w-[var(--sidebar-w)]'
      }`}
    >
      {/* Logo */}
      {!collapsed && (
        <div className="p-3 pb-2 border-b border-[var(--sidebar-border)]">
          <Link href="/contacts" className="no-underline flex items-center gap-2">
            <img src="/roadrunner-logo-white.svg" alt="" className="w-[41px] h-[41px] flex-shrink-0" />
            <div className="text-[12px] font-extrabold text-[var(--sidebar-text-active)] leading-tight">Roadrunner CRM</div>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div data-tour="sidebar-nav" className={`flex flex-col gap-0.5 flex-1 overflow-y-auto ${collapsed ? 'px-1 py-2' : 'px-2 py-2'}`}>
        {NAV_ITEMS.map((item) => {
          if (item.kind === 'group') {
            return (
              <NavGroup
                key={item.id}
                item={item}
                collapsed={collapsed}
                pathname={pathname ?? ''}
              />
            );
          }
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          const badgeKey = item.badgeKey;
          const count = badgeKey ? badgeCounts[badgeKey] : 0;
          const showBadge = badgeKey && count > 0 && sidebarBadges?.[badgeKey];
          const colors = badgeKey ? BADGE_COLORS[badgeKey] : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] no-underline transition-all duration-150 relative ${
                collapsed
                  ? 'justify-center px-0 py-2 mx-0'
                  : 'px-2 py-2 mx-0'
              }`}
              style={isActive
                ? { background: '#1955A6', color: '#FFFFFF' }
                : { color: 'var(--sidebar-text)' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--sidebar-hover)';
                  e.currentTarget.style.color = '#FFFFFF';
                  const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
                  if (icon) icon.style.color = '#FFFFFF';
                  const span = e.currentTarget.querySelector('span:not(.ml-auto)');
                  if (span) (span as HTMLElement).style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.color = 'var(--sidebar-text)';
                  const icon = e.currentTarget.querySelector('svg') as unknown as HTMLElement;
                  if (icon) icon.style.color = '';
                  const span = e.currentTarget.querySelector('span:not(.ml-auto)');
                  if (span) (span as HTMLElement).style.color = '';
                }
              }}
            >
              <Icon size={20} weight={isActive ? 'fill' : 'regular'} className="flex-shrink-0" style={isActive ? { color: '#FFFFFF' } : {}} />
              {!collapsed && (
                <span className="text-[11px] font-semibold" style={isActive ? { color: '#FFFFFF' } : {}}>{item.label}</span>
              )}
              {showBadge && (
                collapsed ? (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: colors?.icon }} />
                ) : (
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-[9px] font-extrabold leading-none"
                    title={`${count} ${badgeKey === 'contacts' ? 'incomplete' : badgeKey === 'sales' ? 'stalled' : badgeKey === 'recruiting' ? 'need action' : 'uncategorized'}`}
                  >
                    <Warning size={14} weight="fill" style={{ color: colors?.icon }} />
                    <span style={{ color: colors?.text }}>{count}</span>
                  </span>
                )
              )}
            </Link>
          );
        })}

        {/* Saved Lists — user-pinned shortcuts. Always render section when NOT collapsed
             so the user can still access the pin dropdown via the gear even when nothing
             is currently pinned. */}
        {!collapsed && (
          <div className="mt-4 pt-3 border-t border-[var(--sidebar-border)]" data-tour="sidebar-pinned-lists">
            {/* Header row — padded to match list rows so the gear right-aligns
                 with the per-row count numbers. */}
            <div className="flex items-center gap-2 px-3 mb-1.5">
              <Bookmark size={11} weight="fill" className="flex-shrink-0 text-[var(--sidebar-text)]" />
              <span className="flex-1 text-[8px] font-bold uppercase tracking-wider text-[var(--sidebar-text)]">
                Saved Lists
              </span>
              <button
                data-tour="lists-pin-manager"
                onClick={(e) => {
                  setPinAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                  setPinDropdownOpen(true);
                }}
                title="Choose which lists appear here"
                aria-label="Manage sidebar lists"
                className="w-4 flex items-center justify-end text-[var(--sidebar-text)] hover:text-white bg-transparent border-none cursor-pointer"
              >
                <Gear size={11} weight="bold" />
              </button>
            </div>

            {publicLists.length === 0 && (
              <div className="px-3 py-2 text-[8px] italic text-[var(--sidebar-text)] opacity-70">
                No lists pinned. Click the gear to choose which lists appear here.
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {publicLists.map((list) => {
                const meta = LIST_ENTITY_META[list.entityType];
                const count = getListMemberCount(memberships, list.id);
                const href = `${meta.route}?list=${list.id}`;
                const isActive = pathname === meta.route && activeListId === list.id;
                return (
                  <Link
                    key={list.id}
                    href={href}
                    title={`${list.name} (${meta.pluralLabel})`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] no-underline transition-all duration-150"
                    style={isActive
                      ? { background: '#1955A6', color: '#FFFFFF' }
                      : { color: 'var(--sidebar-text)' }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--sidebar-hover)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '';
                        e.currentTarget.style.color = 'var(--sidebar-text)';
                      }
                    }}
                  >
                    <span className="text-[10px] font-semibold truncate flex-1">{list.name}</span>
                    <span className="text-[8px] font-bold opacity-60">{count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="mt-auto border-t border-[var(--sidebar-border)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-2 w-full text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white transition-all duration-150 bg-transparent cursor-pointer font-inherit ${
            collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'
          }`}
          style={{ border: 'none' }}
        >
          {collapsed ? (
            <List size={18} />
          ) : (
            <>
              <CaretLeft size={16} />
              <span className="text-[11px] font-semibold">Collapse Menu</span>
            </>
          )}
        </button>
      </div>

      {/* Pin-lists dropdown — opened by the gear next to "Saved Lists" */}
      <PinListsDropdown
        open={pinDropdownOpen}
        onClose={() => setPinDropdownOpen(false)}
        anchorRect={pinAnchor}
      />
    </aside>
  );
}

/**
 * Expandable nav group. Renders the parent row + indented children when
 * open. Auto-opens when the user is on any child route so the active
 * page is always visible. Mirrors HubSpot's left-nav expand pattern.
 *
 * Collapsed sidebar: parent shows just the icon, clicking it routes to
 * the first child (so users on a 60px sidebar can still reach pages).
 */

function NavGroup({
  item,
  collapsed,
  pathname,
}: {
  item: Extract<NavItem, { kind: 'group' }>;
  collapsed: boolean;
  pathname: string;
}) {
  const childActive = item.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState<boolean>(childActive);

  // Re-open the group when navigation lands on one of its children —
  // covers both first-paint and runtime route changes (e.g. user clicks
  // an in-page link that takes them to /sequences from /bulk).
  // Doesn't auto-COLLAPSE on leave so the user's manual toggle sticks.
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const Icon = item.icon;

  if (collapsed) {
    // Collapsed sidebar — render just the parent icon, link it to the
    // first child so the section is still reachable. Active dot when
    // any child is current.
    const firstChild = item.children[0];
    return (
      <Link
        href={firstChild.href}
        title={item.label}
        className="flex items-center justify-center px-0 py-2.5 rounded-[var(--radius-md)] no-underline transition-all duration-150 relative"
        style={childActive
          ? { background: '#1955A6', color: '#FFFFFF' }
          : { color: 'var(--sidebar-text)' }
        }
        onMouseEnter={(e) => {
          if (!childActive) {
            e.currentTarget.style.background = 'var(--sidebar-hover)';
            e.currentTarget.style.color = '#FFFFFF';
          }
        }}
        onMouseLeave={(e) => {
          if (!childActive) {
            e.currentTarget.style.background = '';
            e.currentTarget.style.color = 'var(--sidebar-text)';
          }
        }}
      >
        <Icon size={20} weight={childActive ? 'fill' : 'regular'} style={childActive ? { color: '#FFFFFF' } : {}} />
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-[var(--radius-md)] transition-all duration-150 bg-transparent border-none cursor-pointer"
        style={childActive && !open
          ? { color: '#FFFFFF' }
          : { color: 'var(--sidebar-text)' }
        }
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--sidebar-hover)';
          e.currentTarget.style.color = '#FFFFFF';
          const ic = e.currentTarget.querySelector('svg.group-icon') as unknown as HTMLElement;
          if (ic) ic.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '';
          e.currentTarget.style.color = childActive && !open ? '#FFFFFF' : 'var(--sidebar-text)';
          const ic = e.currentTarget.querySelector('svg.group-icon') as unknown as HTMLElement;
          if (ic) ic.style.color = '';
        }}
      >
        <Icon size={20} weight={childActive ? 'fill' : 'regular'} className="group-icon flex-shrink-0" />
        <span className="text-[11px] font-semibold flex-1 text-left">{item.label}</span>
        {open
          ? <CaretDown size={12} weight="bold" />
          : <CaretRight size={12} weight="bold" />
        }
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 pl-3 mt-0.5">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const childIsActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-md)] no-underline transition-all duration-150"
                style={childIsActive
                  ? { background: '#1955A6', color: '#FFFFFF' }
                  : { color: 'var(--sidebar-text)' }
                }
                onMouseEnter={(e) => {
                  if (!childIsActive) {
                    e.currentTarget.style.background = 'var(--sidebar-hover)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!childIsActive) {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <ChildIcon size={13} weight={childIsActive ? 'fill' : 'regular'} className="flex-shrink-0" />
                <span className="text-[10px] font-semibold">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
