'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Buildings, User, EyeSlash, Sparkle, Warning, CheckCircle,
  Tag, PencilSimple, Trash, Star, Flag, Bookmark,
  Briefcase, CurrencyDollar, ShieldCheck, Handshake, Target, CalendarBlank,
} from '@phosphor-icons/react';
import { ContactWithEntries, ContactTag } from '@/types/contact';
import { useContactStore } from '@/stores/contact-store';
import { useListStore } from '@/stores/list-store';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';
import { initials, getAvatarColor, fmtDate } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SharedDataGrid, { ColumnDef } from '@/components/ui/SharedDataGrid';

// ─── Helpers ───
function IncompletePill() {
  return (
    <span title="Incomplete" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0">
      <Warning size={10} className="flex-shrink-0" /> <span className="truncate">Incomplete</span>
    </span>
  );
}

function entryCell(val: string | undefined, isLink?: boolean) {
  if (!val) return <IncompletePill />;
  if (isLink && val.includes('@')) return <a href={`mailto:${val}`} className="text-[12px] text-[var(--brand-primary)] no-underline hover:underline truncate block">{val}</a>;
  if (isLink) return <span className="text-[12px] text-[var(--brand-primary)] truncate block">{val}</span>;
  return <span className="text-[12px] text-[var(--text-secondary)] truncate block">{val}</span>;
}

const TAG_PALETTE = [
  'bg-[#DBEAFE] text-[#1E40AF] border border-[#1E40AF]',   // blue
  'bg-[#D1FAE5] text-[#065F46] border border-[#065F46]',   // green
  'bg-[#FEE2E2] text-[#991B1B] border border-[#991B1B]',   // red
  'bg-[#EDE9FE] text-[#5B21B6] border border-[#5B21B6]',   // purple
  'bg-[#FFEDD5] text-[#9A3412] border border-[#9A3412]',   // orange
  'bg-[#CFFAFE] text-[#155E75] border border-[#155E75]',   // cyan
  'bg-[#FCE7F3] text-[#9D174D] border border-[#9D174D]',   // pink
  'bg-[#FEF3C7] text-[#92400E] border border-[#92400E]',   // amber
];

const TAG_ICON_MAP: Record<string, typeof Tag> = {
  'Sales Tag': CurrencyDollar, Prospect: Target, Client: Handshake, Customer: Buildings,
  'Contacts Tag': User, VIP: Star, Partner: Handshake, Lead: Target,
};
const TAG_ICON_FALLBACKS = [Tag, Star, Flag, Bookmark, Sparkle];

function tagColorClass(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

function getTagIcon(tag: string) {
  if (TAG_ICON_MAP[tag]) return TAG_ICON_MAP[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_ICON_FALLBACKS[Math.abs(hash) % TAG_ICON_FALLBACKS.length];
}

function textOrIncomplete(val: unknown) {
  const s = typeof val === 'string' ? val : '';
  if (!s) return <IncompletePill />;
  return <span className="text-[12px] text-[var(--text-secondary)] truncate block">{s}</span>;
}

/** Derive unique entry types from contacts data */
function getUniqueEntryTypes(contacts: ContactWithEntries[], field: 'emails' | 'phones' | 'addresses' | 'websites') {
  const types = new Set<string>();
  contacts.forEach((c) => c.entries?.[field]?.forEach((e: any) => { if (e.type) types.add(e.type); }));
  return Array.from(types).sort();
}

// ─── Column Definitions ───
function buildColumns(expandedGroups: Set<string>, contacts: ContactWithEntries[], favIds: Set<string>): ColumnDef<ContactWithEntries, any>[] {
  return [
    {
      id: 'favorite',
      accessorFn: (row) => (favIds.has(row.id) ? 1 : 0),
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
      cell: ({ row }) => (
        <FavoriteCell entityId={row.original.id} entityType="contact" />
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      size: 220,
      cell: ({ row }) => {
        const c = row.original;
        const isOrg = c.type === 'org';
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
              style={{
                width: 'var(--grid-avatar, 32px)',
                height: 'var(--grid-avatar, 32px)',
                background: getAvatarColor(c.id, c.avatarColor),
                borderRadius: isOrg ? '6px' : '50%',
              }}
            >
              {initials(c.name)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[var(--text-primary)] truncate max-w-[160px]" style={{ fontSize: 'var(--grid-font, 13px)' }}>{c.name}</div>
              {!isOrg && 'orgName' in c && c.orgName && (
                <div className="text-[var(--text-tertiary)] truncate max-w-[160px]" style={{ fontSize: 'calc(var(--grid-font, 13px) - 2px)' }}>{c.orgName}</div>
              )}
            </div>
            {c.isPrivate && <EyeSlash size={14} className="text-[var(--danger)] flex-shrink-0" />}
          </div>
        );
      },
    },
    {
      id: 'type',
      accessorFn: (row) => row.type,
      header: 'Type',
      size: 110,
      cell: ({ getValue }) => {
        const t = getValue() as string;
        return (
          <span title={t === 'org' ? 'Organization' : 'Person'} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border truncate min-w-0 ${
            t === 'org' ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]' : 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
          }`}>
            {t === 'org' ? <Buildings size={10} className="flex-shrink-0" /> : <User size={10} className="flex-shrink-0" />}
            <span className="truncate">{t === 'org' ? 'Org' : 'Person'}</span>
          </span>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 130,
      cell: ({ row }) => {
        const c = row.original;
        return c.stale ? (
          <span title="Incomplete" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0">
            <Warning size={10} className="flex-shrink-0" /> <span className="truncate">Incomplete</span>
          </span>
        ) : (
          <span title="Complete" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] truncate min-w-0">
            <CheckCircle size={10} className="flex-shrink-0" /> <span className="truncate">Complete</span>
          </span>
        );
      },
    },
    {
      id: 'aiStatus',
      accessorKey: 'aiStatus',
      header: 'AI',
      size: 95,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        if (v === 'new') return <span title="AI Suggestion" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-dark)] truncate min-w-0"><Sparkle size={10} className="flex-shrink-0" /> AI</span>;
        if (v === 'stale') return <span className="text-[11px] text-[var(--text-tertiary)]">—</span>;
        return <span className="text-[11px] text-[var(--success)]">Verified</span>;
      },
    },
    {
      id: 'industry',
      accessorFn: (row) => 'industry' in row ? row.industry : '',
      header: 'Industry',
      size: 150,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    {
      id: 'title',
      accessorFn: (row) => 'title' in row ? row.title : '',
      header: 'Title',
      size: 150,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    {
      id: 'department',
      accessorFn: (row) => 'department' in row ? row.department : '',
      header: 'Department',
      size: 160,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    {
      id: 'orgName',
      accessorFn: (row) => 'orgName' in row ? row.orgName : '',
      header: 'Organization',
      size: 180,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    // ── Emails Group ──
    ...(expandedGroups.has('emails') ? (() => { const types = getUniqueEntryTypes(contacts, 'emails'); return types.map((etype, i) => ({
      id: `email_${etype}`,
      accessorFn: (row: ContactWithEntries) => row.entries?.emails?.find((e) => e.type === etype)?.value || '',
      header: etype,
      size: 180,
      meta: { group: 'emails', isLastInGroup: i === types.length - 1 },
      cell: ({ getValue }: any) => entryCell(getValue() as string, true),
    })); })() : [{
      id: 'email',
      accessorFn: (row: ContactWithEntries) => row.entries?.emails?.find((e) => e.primary)?.value || ('email' in row ? row.email : '') || '',
      header: 'Emails',
      size: 200,
      meta: { expandable: 'emails' },
      cell: ({ getValue }: any) => entryCell(getValue() as string, true),
    }]),
    // ── Phones Group ──
    ...(expandedGroups.has('phones') ? (() => { const types = getUniqueEntryTypes(contacts, 'phones'); return types.map((ptype, i) => ({
      id: `phone_${ptype}`,
      accessorFn: (row: ContactWithEntries) => row.entries?.phones?.find((p) => p.type === ptype)?.value || '',
      header: ptype,
      size: 140,
      meta: { group: 'phones', isLastInGroup: i === types.length - 1 },
      cell: ({ getValue }: any) => entryCell(getValue() as string),
    })); })() : [{
      id: 'phone',
      accessorFn: (row: ContactWithEntries) => row.entries?.phones?.find((p) => p.primary)?.value || ('phone' in row ? row.phone : '') || '',
      header: 'Phones',
      size: 180,
      meta: { expandable: 'phones' },
      cell: ({ getValue }: any) => entryCell(getValue() as string),
    }]),
    {
      id: 'employees',
      accessorFn: (row) => 'employees' in row ? row.employees : '',
      header: 'Employees',
      size: 150,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    {
      id: 'hq',
      accessorFn: (row) => 'hq' in row ? row.hq : '',
      header: 'HQ',
      size: 120,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    // ── Websites Group ──
    ...(expandedGroups.has('websites') ? (() => { const types = getUniqueEntryTypes(contacts, 'websites'); return types.map((wtype, i) => ({
      id: `website_${wtype}`,
      accessorFn: (row: ContactWithEntries) => row.entries?.websites?.find((w) => w.type === wtype)?.value || '',
      header: wtype,
      size: 150,
      meta: { group: 'websites', isLastInGroup: i === types.length - 1 },
      cell: ({ getValue }: any) => entryCell(getValue() as string, true),
    })); })() : [{
      id: 'website',
      accessorFn: (row: ContactWithEntries) => row.entries?.websites?.find((w) => w.primary)?.value || ('website' in row ? row.website : '') || '',
      header: 'Websites',
      size: 180,
      meta: { expandable: 'websites' },
      cell: ({ getValue }: any) => entryCell(getValue() as string, true),
    }]),
    {
      id: 'assignedTo',
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      size: 160,
      cell: ({ getValue }) => textOrIncomplete(getValue()),
    },
    {
      id: 'tags',
      accessorFn: (row) => (row.tags || []).join(', '),
      header: 'Tags',
      size: 160,
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        if (tags.length === 0) return <IncompletePill />;
        return (
          <div className="flex items-center gap-1 flex-nowrap min-w-0 overflow-hidden">
            {tags.slice(0, 2).map((t) => (
              <span key={t} title={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold min-w-0 truncate ${tagColorClass(t)}`}>{(() => { const Icon = getTagIcon(t); return <Icon size={9} weight="fill" className="flex-shrink-0" />; })()}<span className="truncate">{t}</span></span>
            ))}
            {tags.length > 2 && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">+{tags.length - 2}</span>}
          </div>
        );
      },
    },
    {
      id: 'lastUpdated',
      accessorKey: 'lastUpdated',
      header: 'Updated',
      size: 150,
      cell: ({ getValue }) => <span className="text-[12px] text-[var(--text-secondary)]">{fmtDate(getValue() as string)}</span>,
    },
    {
      id: 'createdBy',
      accessorKey: 'createdBy',
      header: 'Created By',
      size: 150,
      cell: ({ getValue }) => <span className="text-[12px] text-[var(--text-secondary)]">{getValue() as string || '—'}</span>,
    },
    // ── Addresses Group ──
    ...(expandedGroups.has('addresses') ? (() => { const types = getUniqueEntryTypes(contacts, 'addresses'); return types.map((atype, i) => ({
      id: `address_${atype}`,
      accessorFn: (row: ContactWithEntries) => {
        const addr = row.entries?.addresses?.find((a) => a.type === atype);
        return addr ? `${addr.value}, ${addr.city}, ${addr.state}` : '';
      },
      header: atype,
      size: 200,
      meta: { group: 'addresses', isLastInGroup: i === types.length - 1 },
      cell: ({ getValue }: any) => entryCell(getValue() as string),
    })); })() : [{
      id: 'address',
      accessorFn: (row: ContactWithEntries) => {
        const addr = row.entries?.addresses?.find((a) => a.primary);
        return addr ? `${addr.city}, ${addr.state}` : '';
      },
      header: 'Addresses',
      size: 190,
      meta: { expandable: 'addresses' },
      cell: ({ getValue }: any) => entryCell(getValue() as string),
    }]),
  ];
}

// ─── Main DataGrid Component ───
export default function DataGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const favOnly = searchParams.get('fav') === '1';
  const contacts = useContactStore((s) => s.contacts);
  const filter = useContactStore((s) => s.filter);
  const search = useContactStore((s) => s.search);
  const deleteContact = useContactStore((s) => s.deleteContact);
  const memberships = useListStore((s) => s.memberships);

  const [deleteTarget, setDeleteTarget] = useState<ContactWithEntries | null>(null);

  // Column group expansion
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const favIds = useMemo(
    () => new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.contact).map((m) => m.entityId)),
    [memberships],
  );
  const columns = useMemo(() => buildColumns(expandedGroups, contacts, favIds), [expandedGroups, contacts, favIds]);

  // Filter data
  const data = useMemo(() => {
    let result = contacts;
    if (filter !== 'all') result = result.filter((c) => c.type === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        ('industry' in c && c.industry?.toLowerCase().includes(q)) ||
        ('title' in c && c.title?.toLowerCase().includes(q)) ||
        ('orgName' in c && c.orgName?.toLowerCase().includes(q)) ||
        ('email' in c && c.email?.toLowerCase().includes(q))
      );
    }
    if (listId) {
      const memberIds = new Set(memberships.filter((m) => m.listId === listId).map((m) => m.entityId));
      result = result.filter((c) => memberIds.has(c.id));
    }
    if (favOnly) {
      const favIds = new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.contact).map((m) => m.entityId));
      result = result.filter((c) => favIds.has(c.id));
    }
    return result;
  }, [contacts, filter, search, listId, favOnly, memberships]);

  return (
    <>
      <SharedDataGrid<ContactWithEntries>
        data={data}
        columns={columns}
        gridId="contacts"
        onRowClick={(c) => router.push(`/contacts/${c.id}`)}
        defaultSorting={[{ id: 'name', desc: false }]}
        countLabel="contacts"
        onToggleGroup={toggleGroup}
        renderActions={(c) => (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/contacts/${c.id}`); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
            >
              <PencilSimple size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
            >
              <Trash size={14} />
            </button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Contact"
        message={deleteTarget ? <>Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</> : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => { if (deleteTarget) { deleteContact(deleteTarget.id); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
