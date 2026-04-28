'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useListStore } from '@/stores/list-store';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';
import { Star } from '@phosphor-icons/react';
import { useSalesStore, SalesSavedView } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useGridLayoutStore } from '@/stores/grid-layout-store';
import { fmtDate, getAvatarColor, initials, uid } from '@/lib/utils';
import {
  DotsThree, ArrowSquareOut, Trash, PencilSimple, Phone, EnvelopeSimple, ChatCircle,
  Users, FileText, Handshake, Warning, Columns, FloppyDisk, Check,
  ArrowClockwise, Tag,
} from '@phosphor-icons/react';
import { toast } from '@/lib/toast';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import StagePill from './StagePill';
import { PRIORITY_META, COMM_META, CommType, DealPriority } from '@/types/deal';
import { useIsDark } from '@/hooks/useIsDark';
import { dc } from '@/lib/pill-colors';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Deal } from '@/types/deal';
import { ContactWithEntries, ContactTag } from '@/types/contact';
import SharedDataGrid, { ColumnDef } from '@/components/ui/SharedDataGrid';
import { DotsSixVertical } from '@phosphor-icons/react';

/** Tags that qualify a PERSON contact as a prospect worth showing in Sales. */
const SALES_TAGS: ContactTag[] = ['Sales Tag', 'Prospect', 'Client'];

/** Virtual "tagged lead" -- a person tagged for sales who has no deal yet. */
interface TaggedLead {
  kind: 'tagged';
  id: string;
  person: ContactWithEntries;
  org?: ContactWithEntries;
  matchedTag: ContactTag;
}
type SalesRow = (Deal & { kind?: 'deal' }) | TaggedLead;
const isDeal = (r: SalesRow): r is Deal & { kind?: 'deal' } => !('kind' in r) || r.kind === 'deal';

const STALE_DAYS = 14;

const COMM_ICONS: Record<CommType, React.ComponentType<{ size?: number; weight?: 'fill' | 'bold' | 'duotone' | 'regular' }>> = {
  'Phone Call':   Phone,
  'Email':        EnvelopeSimple,
  'Left Message': ChatCircle,
  'Meeting':      Users,
  'Slate Sent':   FileText,
  'Intake':       Handshake,
};

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

/** Compute the display status for a deal */
function computeStatus(d: Deal): string {
  if (d.stage === 'closed-won') return 'Won';
  if (d.stage === 'closed-lost') return 'Lost';
  const daysSince = (Date.now() - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > STALE_DAYS ? 'Stalled' : 'On Track';
}

// ---- Column definitions ----

function buildSalesColumns(contactById: Map<string, ContactWithEntries>, favIds: Set<string>): ColumnDef<SalesRow, any>[] {
  return [
    {
      id: 'favorite',
      accessorFn: (row) => (isDeal(row) && favIds.has(row.id) ? 1 : 0),
      header: () => (
        <span title="Favorites" className="inline-flex items-center justify-center w-full">
          <Star size={14} weight="fill" className="text-[var(--warning)]" />
        </span>
      ),
      meta: { label: 'Favorites' },
      size: 70,
      enableSorting: true,
      enableColumnFilter: false,
      sortDescFirst: true,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return null;
        return <FavoriteCell entityId={r.id} entityType="deal" />;
      },
    },
    {
      id: 'name',
      accessorFn: (row) => isDeal(row) ? row.name : 'New lead from tag',
      header: 'Deal',
      size: 420,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) {
          const t = r as TaggedLead;
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate">New lead from tag</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] whitespace-nowrap">
                <Tag size={9} weight="fill" /> {t.matchedTag}
              </span>
            </div>
          );
        }
        return <div className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate">{r.name}</div>;
      },
    },
    {
      id: 'stage',
      accessorFn: (row) => isDeal(row) ? row.stage : 'tagged',
      header: 'Stage',
      size: 140,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) {
          return (
            // Theme-aware pill (was hardcoded slate-200/slate-900 which
            // looked off in dark mode). Surface-raised + text-secondary
            // is the same pattern the +N overflow tag chip uses, and
            // adapts to dark theme.
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold whitespace-nowrap bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
              <Tag size={10} weight="fill" /> Tagged
            </span>
          );
        }
        return <StagePill stage={r.stage} />;
      },
    },
    {
      id: 'status',
      accessorFn: (row) => isDeal(row) ? computeStatus(row) : '',
      header: 'Status',
      size: 130,
      filterFn: (row, columnId, filterValue) => {
        const val = row.getValue(columnId) as string;
        if (!filterValue) return true;
        return val.toLowerCase().includes((filterValue as string).toLowerCase());
      },
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        const status = computeStatus(r);
        if (status === 'Won') return <span title="Won" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] truncate min-w-0">Won</span>;
        if (status === 'Lost') return <span title="Lost" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)] truncate min-w-0">Lost</span>;
        if (status === 'Stalled') return <span title="Stalled" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0"><Warning size={10} weight="fill" className="flex-shrink-0" /> <span className="truncate">Stalled</span></span>;
        return <span title="On Track" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] truncate min-w-0"><span className="truncate">On Track</span></span>;
      },
    },
    {
      id: 'priority',
      accessorFn: (row) => isDeal(row) ? row.priority : '',
      header: 'Priority',
      size: 130,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <PriorityPill priority={r.priority} />;
      },
    },
    {
      id: 'person',
      accessorFn: (row) => {
        if (!isDeal(row)) return (row as TaggedLead).person.name;
        return row.personContactId ? (contactById.get(row.personContactId)?.name || '') : '';
      },
      header: 'Contact',
      size: 160,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        let person: ContactWithEntries | undefined;
        if (!isDeal(r)) {
          person = (r as TaggedLead).person;
        } else {
          person = r.personContactId ? contactById.get(r.personContactId) : undefined;
        }
        if (!person) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="rounded-full flex items-center justify-center font-extrabold text-white flex-shrink-0 leading-none"
              style={{
                width: 'var(--grid-avatar, 24px)',
                height: 'var(--grid-avatar, 24px)',
                fontSize: 'var(--grid-avatar-font, 9px)',
                background: getAvatarColor(person.id, person.avatarColor),
              }}
            >
              {initials(person.name)}
            </div>
            <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate min-w-0">{person.name}</span>
          </div>
        );
      },
    },
    {
      id: 'org',
      accessorFn: (row) => {
        if (!isDeal(row)) return (row as TaggedLead).org?.name || '';
        return row.orgContactId ? (contactById.get(row.orgContactId)?.name || '') : '';
      },
      header: 'Organization',
      size: 160,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        let org: ContactWithEntries | undefined;
        if (!isDeal(r)) {
          org = (r as TaggedLead).org;
        } else {
          org = r.orgContactId ? contactById.get(r.orgContactId) : undefined;
        }
        if (!org) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="rounded-[4px] flex items-center justify-center font-extrabold text-white flex-shrink-0 leading-none"
              style={{
                width: 'var(--grid-avatar, 24px)',
                height: 'var(--grid-avatar, 24px)',
                fontSize: 'var(--grid-avatar-font, 9px)',
                background: getAvatarColor(org.id, org.avatarColor),
              }}
            >
              {initials(org.name)}
            </div>
            <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate min-w-0">{org.name}</span>
          </div>
        );
      },
    },
    {
      id: 'amount',
      accessorFn: (row) => isDeal(row) ? row.amount : 0,
      header: 'Amount',
      size: 130,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{fmtMoney(r.amount)}</span>;
      },
    },
    {
      id: 'lastComm',
      accessorFn: (row) => isDeal(row) ? (row.lastCommunication?.type || '') : '',
      header: 'Last Communication',
      size: 210,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return r.lastCommunication ? <CommPill comm={r.lastCommunication} /> : <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
      },
    },
    {
      id: 'expectedCloseDate',
      accessorFn: (row) => isDeal(row) ? row.expectedCloseDate : '',
      header: 'Expected Close',
      size: 190,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{fmtDate(r.expectedCloseDate)}</span>;
      },
    },
    {
      id: 'source',
      accessorFn: (row) => isDeal(row) ? row.source : '',
      header: 'Source',
      size: 130,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{r.source}</span>;
      },
    },
    {
      id: 'owner',
      accessorFn: (row) => isDeal(row) ? row.owner : '',
      header: 'Owner',
      size: 130,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate">{r.owner}</span>;
      },
    },
    {
      id: 'createdAt',
      accessorFn: (row) => isDeal(row) ? row.createdAt : '',
      header: 'Created',
      size: 150,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{fmtDate(r.createdAt)}</span>;
      },
    },
    {
      id: 'lastUpdated',
      accessorFn: (row) => isDeal(row) ? row.lastUpdated : '',
      header: 'Updated',
      size: 150,
      cell: ({ row }) => {
        const r = row.original;
        if (!isDeal(r)) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">--</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{fmtDate(r.lastUpdated)}</span>;
      },
    },
  ];
}

// ─── Pills ───

function PriorityPill({ priority }: { priority: DealPriority }) {
  const meta = PRIORITY_META[priority];
  const isDark = useIsDark();
  const c = dc(meta, isDark);
  return (
    <span
      title={meta.label}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold truncate min-w-0"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}` }}
    >
      <Warning size={10} weight="fill" className="flex-shrink-0" /> <span className="truncate">{meta.label}</span>
    </span>
  );
}

function CommPill({ comm }: { comm: { type: CommType; date: string } }) {
  const meta = COMM_META[comm.type];
  const Icon = COMM_ICONS[comm.type];
  const isDark = useIsDark();
  const c = dc(meta, isDark);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold truncate min-w-0"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}` }}
      title={`${comm.type} · ${fmtDate(comm.date)}`}
    >
      <span className="flex-shrink-0"><Icon size={10} weight="fill" /></span> <span className="truncate">{comm.type}</span>
    </span>
  );
}

// ---- All column IDs for toolbar use ----
const ALL_COLUMN_IDS = [
  'name', 'stage', 'status', 'priority', 'person', 'org', 'amount',
  'lastComm', 'expectedCloseDate', 'source', 'owner', 'createdAt', 'lastUpdated',
];

const COLUMN_LABELS: Record<string, string> = {
  name: 'Deal', stage: 'Stage', status: 'Status', priority: 'Priority',
  person: 'Contact', org: 'Organization', amount: 'Amount',
  lastComm: 'Last Communication', expectedCloseDate: 'Expected Close',
  source: 'Source', owner: 'Owner', createdAt: 'Created', lastUpdated: 'Updated',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SalesDataGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const favOnly = searchParams.get('fav') === '1';
  const allDeals = useSalesStore((s) => s.deals);
  const stageFilter = useSalesStore((s) => s.stageFilter);
  const typeFilter = useSalesStore((s) => s.typeFilter);
  const search = useSalesStore((s) => s.search);
  const sortField = useSalesStore((s) => s.sortField);
  const sortDir = useSalesStore((s) => s.sortDir);
  const deleteDeal = useSalesStore((s) => s.deleteDeal);
  const addDeal = useSalesStore((s) => s.addDeal);
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const memberships = useListStore((s) => s.memberships);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenuId]);

  const contactById = useMemo(() => {
    const m = new Map<string, ContactWithEntries>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const favIds = useMemo(
    () => new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.deal).map((m) => m.entityId)),
    [memberships],
  );
  const columns = useMemo(() => buildSalesColumns(contactById, favIds), [contactById, favIds]);

  // Tagged-but-no-deal leads
  const taggedLeads = useMemo<TaggedLead[]>(() => {
    const personIdsWithDeals = new Set(allDeals.map((d) => d.personContactId));
    return contacts
      .filter((c) => c.type === 'person' && !personIdsWithDeals.has(c.id))
      .map((p) => {
        const tags = (p.tags || []) as ContactTag[];
        const matchedTag = SALES_TAGS.find((t) => tags.includes(t));
        if (!matchedTag) return null;
        const orgId = ('orgId' in p && p.orgId) ? p.orgId : undefined;
        return { kind: 'tagged', id: `tagged-${p.id}`, person: p, org: orgId ? contactById.get(orgId) : undefined, matchedTag } as TaggedLead;
      })
      .filter((x): x is TaggedLead => x !== null);
  }, [allDeals, contacts, contactById]);

  // Pre-filtered + sorted data
  const data = useMemo<SalesRow[]>(() => {
    let list: SalesRow[] = [...allDeals];
    if (typeFilter !== 'all') {
      list = (list as Deal[]).filter((d) => d.type === typeFilter);
    }
    if (stageFilter !== 'all') {
      if (stageFilter === 'open') list = (list as Deal[]).filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
      else if (stageFilter === 'won') list = (list as Deal[]).filter((d) => d.stage === 'closed-won');
      else if (stageFilter === 'lost') list = (list as Deal[]).filter((d) => d.stage === 'closed-lost');
      else list = (list as Deal[]).filter((d) => d.stage === stageFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = (list as Deal[]).filter((d) => d.name.toLowerCase().includes(q));
    }
    if (sortField) {
      (list as Deal[]).sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortField];
        const bVal = (b as unknown as Record<string, unknown>)[sortField];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    const includeTagged =
      (stageFilter === 'all' || stageFilter === 'open' || stageFilter === 'lead') &&
      (typeFilter === 'all' || typeFilter === 'person');
    if (includeTagged) {
      let filteredTagged = taggedLeads;
      if (search) {
        const q = search.toLowerCase();
        filteredTagged = taggedLeads.filter((t) =>
          t.person.name.toLowerCase().includes(q) ||
          (t.org?.name || '').toLowerCase().includes(q)
        );
      }
      list = [...filteredTagged, ...list];
    }
    // List filter
    if (listId) {
      const memberIds = new Set(memberships.filter((m) => m.listId === listId).map((m) => m.entityId));
      list = (list as Deal[]).filter((d) => memberIds.has(d.id));
    }
    if (favOnly) {
      const favIds = new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.deal).map((m) => m.entityId));
      list = (list as Deal[]).filter((d) => favIds.has(d.id));
    }
    return list;
  }, [allDeals, taggedLeads, stageFilter, typeFilter, search, sortField, sortDir, listId, favOnly, memberships]);

  // Default sorting from store
  const defaultSorting = useMemo(() => {
    if (sortField) return [{ id: sortField, desc: sortDir === 'desc' }];
    return [];
  }, [sortField, sortDir]);

  return (
    <div className="h-full flex flex-col gap-2">
      <SharedDataGrid<SalesRow>
        data={data}
        columns={columns}
        gridId="sales"
        defaultSorting={defaultSorting}
        countLabel="deals"
        onRowClick={(r) => {
          if (!isDeal(r)) {
            const t = r as TaggedLead;
            router.push(`/sales/new?personId=${t.person.id}${t.org ? `&orgId=${t.org.id}` : ''}`);
          } else {
            router.push(`/sales/${(r as Deal).id}`);
          }
        }}
        rowClassName={(r) => {
          const isTagged = !isDeal(r);
          if (isTagged) return 'bg-[var(--warning-bg)]/30';
          if (isDeal(r) && r.stage !== 'closed-won' && r.stage !== 'closed-lost' && (Date.now() - new Date(r.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) > STALE_DAYS) return 'bg-[var(--warning-bg)]/40';
          return '';
        }}
        renderActions={(r) => {
          const isTagged = !isDeal(r);
          if (isTagged) {
            const t = r as TaggedLead;
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/sales/new?personId=${t.person.id}${t.org ? `&orgId=${t.org.id}` : ''}`);
                }}
                aria-label="Create lead from tagged contact"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[length:var(--grid-font)] font-bold text-white bg-[var(--brand-primary)] border-none cursor-pointer hover:opacity-90 whitespace-nowrap"
              >
                Create lead
              </button>
            );
          }
          const deal = r as Deal;
          return (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/sales/${deal.id}`); }}
                aria-label="Edit deal"
                title="Edit deal"
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
              >
                <PencilSimple size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(deal.id); }}
                aria-label="Delete deal"
                title="Delete deal"
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
              >
                <Trash size={14} />
              </button>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete deal?"
        message="This cannot be undone. The linked contacts will not be affected."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDelete) {
            const snapshot = deals.find((d) => d.id === confirmDelete);
            deleteDeal(confirmDelete);
            toast.success('Deal deleted', {
              description: snapshot?.name,
              action: snapshot ? { label: 'Undo', onClick: () => addDeal(snapshot) } : undefined,
            });
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar: Columns dropdown + Views dropdown (kept as separate export)
// ─────────────────────────────────────────────────────────────────────────────

export function SalesGridToolbar() {
  const columnOrder = useSalesStore((s) => s.columnOrder);
  const columnVisibility = useSalesStore((s) => s.columnVisibility);
  const setColumnVisibility = useSalesStore((s) => s.setColumnVisibility);
  const sortField = useSalesStore((s) => s.sortField);
  const sortDir = useSalesStore((s) => s.sortDir);
  const savedViews = useSalesStore((s) => s.savedViews);
  const activeSavedViewId = useSalesStore((s) => s.activeSavedViewId);
  const saveView = useSalesStore((s) => s.saveView);
  const deleteView = useSalesStore((s) => s.deleteView);
  const setActiveSavedViewId = useSalesStore((s) => s.setActiveSavedViewId);
  const setColumnOrder = useSalesStore((s) => s.setColumnOrder);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const orderedIds = useMemo(() => {
    const known = new Set(ALL_COLUMN_IDS);
    const inOrder = columnOrder.filter((id) => known.has(id));
    ALL_COLUMN_IDS.forEach((id) => { if (!inOrder.includes(id)) inOrder.push(id); });
    return inOrder;
  }, [columnOrder]);

  function handleDropdownDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedIds.indexOf(active.id as string);
    const newIdx = orderedIds.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...orderedIds];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    setColumnOrder([...next, 'actions']);
  }

  const [colOpen, setColOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [confirmDeleteViewId, setConfirmDeleteViewId] = useState<string | null>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const viewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colOpen && !viewsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (colOpen && colRef.current && !colRef.current.contains(e.target as Node)) setColOpen(false);
      if (viewsOpen && viewsRef.current && !viewsRef.current.contains(e.target as Node)) setViewsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [colOpen, viewsOpen]);

  function handleSaveView() {
    if (!newViewName.trim()) return;
    const v: SalesSavedView = {
      id: uid('view'),
      name: newViewName.trim(),
      columnOrder,
      columnVisibility,
      sortField,
      sortDir,
    };
    saveView(v);
    setNewViewName('');
  }

  function applyView(v: SalesSavedView) {
    setColumnOrder(v.columnOrder);
    setColumnVisibility(v.columnVisibility);
    useSalesStore.setState({ sortField: v.sortField, sortDir: v.sortDir });
    setActiveSavedViewId(v.id);
    setViewsOpen(false);
  }

  const activeView = savedViews.find((v) => v.id === activeSavedViewId);

  const totalDeals = useSalesStore((s) => s.deals.length);
  const contacts = useContactStore((s) => s.contacts);
  const taggedCount = useMemo(() => {
    const personIdsWithDeals = new Set(useSalesStore.getState().deals.map((d) => d.personContactId));
    return contacts.filter((c) => {
      if (c.type !== 'person' || personIdsWithDeals.has(c.id)) return false;
      const tags = (c.tags || []) as ContactTag[];
      return SALES_TAGS.some((t) => tags.includes(t));
    }).length;
  }, [contacts]);

  function handleReset() {
    setColumnOrder(['name', 'stage', 'priority', 'person', 'org', 'amount', 'lastComm', 'expectedCloseDate', 'source', 'owner', 'createdAt', 'lastUpdated', 'actions']);
    setColumnVisibility({ source: false, createdAt: false });
    useSalesStore.setState({ sortField: null, sortDir: 'asc' });
    setActiveSavedViewId(null);
    useGridLayoutStore.getState().setColumnWidths('sales', {});
  }

  return (
    <div className="flex items-center gap-2 flex-wrap min-h-[34px]">
      {/* Views -- FIRST */}
      <div className="relative" ref={viewsRef}>
        <button
          onClick={() => setViewsOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[length:var(--grid-font)] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <FloppyDisk size={14} weight="bold" /> View: {activeView?.name || 'Default'}
        </button>
        {viewsOpen && (
          <div className="absolute left-0 top-full mt-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 w-[240px] p-2">
            <div className="text-[length:var(--grid-font)] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 px-1">Saved views</div>
            <button
              onClick={() => {
                setActiveSavedViewId(null);
                setColumnVisibility({ source: false, createdAt: false });
                setColumnOrder(['name', 'stage', 'priority', 'person', 'org', 'amount', 'lastComm', 'expectedCloseDate', 'source', 'owner', 'createdAt', 'lastUpdated', 'actions']);
                setViewsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-[length:var(--grid-font)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded bg-transparent border-none cursor-pointer text-left"
            >
              {!activeSavedViewId && <Check size={12} weight="bold" className="text-[var(--brand-primary)]" />}
              <span className={!activeSavedViewId ? 'font-bold' : ''}>Default</span>
            </button>
            {savedViews.map((v) => (
              <div key={v.id} className="flex items-center gap-1">
                <button
                  onClick={() => applyView(v)}
                  className="flex items-center gap-2 flex-1 px-2 py-1.5 text-[length:var(--grid-font)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded bg-transparent border-none cursor-pointer text-left"
                >
                  {activeSavedViewId === v.id && <Check size={12} weight="bold" className="text-[var(--brand-primary)]" />}
                  <span className={activeSavedViewId === v.id ? 'font-bold' : ''}>{v.name}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteViewId(v.id); }}
                  aria-label="Delete view"
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer"
                >
                  <Trash size={11} />
                </button>
              </div>
            ))}
            <div className="border-t border-[var(--border-subtle)] mt-2 pt-2 flex items-center gap-1">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveView(); }}
                placeholder="Name this view..."
                className="flex-1 h-7 px-2 text-[length:var(--grid-font)] bg-[var(--surface-bg)] border border-[var(--border)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
              />
              <button
                onClick={handleSaveView}
                disabled={!newViewName.trim()}
                className="px-2 h-7 text-[length:var(--grid-font)] font-bold text-white bg-[var(--brand-primary)] border-none rounded cursor-pointer hover:opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="relative" ref={colRef}>
        <button
          onClick={() => setColOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[length:var(--grid-font)] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <Columns size={14} weight="bold" /> Columns
        </button>
        {colOpen && (
          <div className="absolute left-0 top-full mt-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 w-[260px] p-2">
            <div className="text-[length:var(--grid-font)] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 px-1">Show / hide -- drag to reorder</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDropdownDragEnd}>
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                {orderedIds.map((id) => {
                  if (id === 'actions') return null;
                  const visible = columnVisibility[id] !== false;
                  return (
                    <SalesColumnDropdownRow
                      key={id}
                      id={id}
                      label={COLUMN_LABELS[id] || id}
                      visible={visible}
                      onToggle={(v) => setColumnVisibility({ ...columnVisibility, [id]: v })}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[length:var(--grid-font)] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
      >
        <ArrowClockwise size={14} weight="bold" /> Reset
      </button>

      {/* Count (right) */}
      <span className="ml-auto text-[length:var(--grid-font)] font-semibold text-[var(--text-tertiary)]">
        {totalDeals} {totalDeals === 1 ? 'deal' : 'deals'}
        {taggedCount > 0 && <> · <span className="text-[var(--warning)]">{taggedCount} tagged</span></>}
      </span>

      <ConfirmDialog
        open={!!confirmDeleteViewId}
        title="Delete saved view?"
        message={(() => {
          const v = savedViews.find((x) => x.id === confirmDeleteViewId);
          return v
            ? `This will permanently delete the "${v.name}" saved view. The underlying deals are not affected.`
            : '';
        })()}
        confirmLabel="Delete view"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDeleteViewId) deleteView(confirmDeleteViewId);
          setConfirmDeleteViewId(null);
        }}
        onCancel={() => setConfirmDeleteViewId(null)}
      />
    </div>
  );
}

// ─── Column dropdown row (sortable) ───

function SalesColumnDropdownRow({ id, label, visible, onToggle }: { id: string; label: string; visible: boolean; onToggle: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: isDragging ? 'var(--surface-raised)' : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group flex items-center gap-1.5 px-1 py-1.5 rounded hover:bg-[var(--surface-raised)]"
    >
      <button
        {...listeners}
        aria-label={`Drag ${label}`}
        className="cursor-grab active:cursor-grabbing text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] bg-transparent border-none p-0 flex items-center"
      >
        <DotsSixVertical size={14} weight="bold" />
      </button>
      <label className="flex items-center gap-2 flex-1 text-[length:var(--grid-font)] text-[var(--text-primary)] cursor-pointer">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {label}
      </label>
    </div>
  );
}
