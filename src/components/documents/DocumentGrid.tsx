'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  File, FilePdf, FileDoc, FileText, FileZip, FileVideo, FileAudio, Image,
  Eye, Trash, Tag, Star, Flag, Bookmark, CalendarBlank, User, Briefcase,
  CheckCircle, Clock, CurrencyDollar, Buildings, Sparkle, ShieldCheck,
  PaperPlaneTilt, Handshake, MagnifyingGlass, Target,
  ReadCvLogo, Article, ClipboardText, Notepad,
} from '@phosphor-icons/react';
import { useDocumentStore } from '@/stores/document-store';
import { useListStore } from '@/stores/list-store';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { CrmDocument, formatFileSize, getFileExtension, FileFamily, getExtColor, getExtBgColor } from '@/types/document';
import { fmtDate } from '@/lib/utils';
import SharedDataGrid, { ColumnDef } from '@/components/ui/SharedDataGrid';
import { useIsDark } from '@/hooks/useIsDark';
import { PILL_COLORS, dc } from '@/lib/pill-colors';

const TAG_PALETTE_KEYS = ['blue', 'green', 'red', 'violet', 'orange', 'cyan', 'pink', 'amber'] as const;
const TAG_PALETTE_DATA = TAG_PALETTE_KEYS.map((k) => PILL_COLORS[k]);

const TAG_ICON_MAP: Record<string, typeof Tag> = {
  monthly: CalendarBlank, weekly: CalendarBlank, quarterly: CalendarBlank, Q2: CalendarBlank, Q1: CalendarBlank, Q3: CalendarBlank, Q4: CalendarBlank,
  report: Article, forecast: Notepad, template: ClipboardText,
  resume: ReadCvLogo, candidate: User,
  signed: CheckCircle, active: CheckCircle, verified: ShieldCheck,
  paid: CurrencyDollar, closed: CurrencyDollar, fees: CurrencyDollar,
  sent: PaperPlaneTilt, slate: Briefcase,
  NDA: ShieldCheck, legal: ShieldCheck,
  JD: ClipboardText, hire: Briefcase,
  client: Buildings, partner: Handshake,
  search: MagnifyingGlass,
  prospect: Target, lead: Target,
};
const TAG_ICON_FALLBACKS = [Tag, Star, Flag, Bookmark, Sparkle];

const TAG_COLOR_OVERRIDES: Record<string, number> = {
  resume: 0,      // blue
  candidate: 3,   // purple
  signed: 1,      // green
  active: 1,      // green
  paid: 4,        // orange
  closed: 2,      // red
  monthly: 5,     // cyan
  report: 7,      // amber
  slate: 6,       // pink
  sent: 5,        // cyan
};

function getTagPillData(tag: string) {
  const lower = tag.toLowerCase();
  if (TAG_COLOR_OVERRIDES[lower] !== undefined) return TAG_PALETTE_DATA[TAG_COLOR_OVERRIDES[lower]];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE_DATA[Math.abs(hash) % TAG_PALETTE_DATA.length];
}

function getTagIcon(tag: string) {
  const lower = tag.toLowerCase();
  if (TAG_ICON_MAP[tag]) return TAG_ICON_MAP[tag];
  if (TAG_ICON_MAP[lower]) return TAG_ICON_MAP[lower];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_ICON_FALLBACKS[Math.abs(hash) % TAG_ICON_FALLBACKS.length];
}

const FAMILY_ICON: Record<FileFamily, typeof File> = {
  pdf: FilePdf, office: FileDoc, text: FileText, archive: FileZip,
  video: FileVideo, audio: FileAudio, image: Image, other: File,
};

// ─── Column Definitions ───

function buildColumns(contactNames: Map<string, string>, dealNames: Map<string, string>, isDark: boolean, favIds: Set<string>): ColumnDef<CrmDocument, any>[] {
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
        <FavoriteCell entityId={row.original.id} entityType="document" />
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      size: 420,
      cell: ({ row }) => {
        const doc = row.original;
        const Icon = FAMILY_ICON[doc.fileFamily];
        const color = getExtColor(doc.fileName, doc.fileFamily, isDark);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
              style={{ background: isDark ? getExtBgColor(doc.fileName, doc.fileFamily) : `color-mix(in srgb, ${color} 12%, transparent)` }}
            >
              <Icon size={18} weight="duotone" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{doc.name}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] truncate">{doc.fileName}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'type',
      accessorFn: (row) => getFileExtension(row.fileName).toUpperCase(),
      header: 'Type',
      size: 110,
      enableSorting: false,
      cell: ({ row }) => {
        const doc = row.original;
        const ext = getFileExtension(doc.fileName).toUpperCase();
        const color = getExtColor(doc.fileName, doc.fileFamily, isDark);
        return (
          <span
            title={ext}
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold truncate min-w-0 inline-flex"
            style={{ background: isDark ? getExtBgColor(doc.fileName, doc.fileFamily) : `color-mix(in srgb, ${color} 12%, white)`, color, border: `1px solid ${color}` }}
          >
            {ext}
          </span>
        );
      },
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      size: 150,
      cell: ({ getValue }) => (
        <span className="text-[12px] text-[var(--text-secondary)] capitalize truncate block">
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'size',
      accessorKey: 'size',
      header: 'Size',
      size: 110,
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--text-secondary)] truncate block">
          {formatFileSize(row.original.size)}
        </span>
      ),
    },
    {
      id: 'uploadedAt',
      accessorKey: 'uploadedAt',
      header: 'Uploaded',
      size: 140,
      cell: ({ getValue }) => (
        <span className="text-[12px] text-[var(--text-secondary)] truncate block">
          {fmtDate(getValue() as string)}
        </span>
      ),
    },
    {
      id: 'uploadedBy',
      accessorKey: 'uploadedBy',
      header: 'Uploaded By',
      size: 170,
      cell: ({ getValue }) => (
        <span className="text-[12px] text-[var(--text-secondary)] truncate block">
          {(getValue() as string) || '\u2014'}
        </span>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      size: 250,
      cell: ({ getValue }) => (
        <span className="text-[12px] text-[var(--text-secondary)] truncate block">
          {(getValue() as string) || '\u2014'}
        </span>
      ),
    },
    {
      id: 'tags',
      accessorFn: (row) => (row.tags || []).join(', '),
      header: 'Tags',
      size: 180,
      enableSorting: false,
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        if (tags.length === 0) return <span className="text-[12px] text-[var(--text-tertiary)]">{'\u2014'}</span>;
        return (
          <div className="flex items-center gap-1 flex-nowrap min-w-0 overflow-hidden">
            {tags.slice(0, 2).map((t) => (
              <span key={t} title={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold min-w-0 truncate border" style={(() => { const p = dc(getTagPillData(t), isDark); return { background: p.bg, color: p.color, borderColor: p.color }; })()}>
                {(() => { const Icon = getTagIcon(t); return <Icon size={9} weight="fill" className="flex-shrink-0" />; })()}<span className="truncate">{t}</span>
              </span>
            ))}
            {tags.length > 2 && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">+{tags.length - 2}</span>}
          </div>
        );
      },
    },
    {
      id: 'location',
      accessorFn: (row) => row.contactId ? (contactNames.get(row.contactId) || '') : '',
      header: 'Location',
      size: 200,
      enableSorting: false,
      cell: ({ row: r }) => {
        const doc = r.original;
        const name = doc.contactId ? contactNames.get(doc.contactId) : undefined;
        if (!name) return <span className="text-[12px] text-[var(--text-tertiary)]">{'\u2014'}</span>;
        return (
          <a
            href={`/contacts/${doc.contactId}?tab=documents`}
            onClick={(e) => e.stopPropagation()}
            className="text-[12px] text-[var(--brand-primary)] no-underline hover:underline truncate block"
          >
            {name}
          </a>
        );
      },
    },
  ];
}

// ─── Main DocumentGrid Component ───

interface Props {
  documents?: CrmDocument[];
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function DocumentGrid({ documents: externalDocs, onPreview, onRemove }: Props) {
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const favOnly = searchParams.get('fav') === '1';
  const allDocuments = useDocumentStore((s) => s.documents);
  const search = useDocumentStore((s) => s.search);
  const categoryFilter = useDocumentStore((s) => s.categoryFilter);
  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const memberships = useListStore((s) => s.memberships);

  const contactNames = useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts]);
  const dealNames = useMemo(() => new Map(deals.map((d) => [d.id, d.name])), [deals]);

  const isDark = useIsDark();
  const favIds = useMemo(
    () => new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.document).map((m) => m.entityId)),
    [memberships],
  );
  const columns = useMemo(() => buildColumns(contactNames, dealNames, isDark, favIds), [contactNames, dealNames, isDark, favIds]);

  // Filter data: store-level (categoryFilter + search)
  const data = useMemo(() => {
    let list = externalDocs ?? allDocuments;
    if (categoryFilter !== 'all') list = list.filter((d) => d.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (listId) {
      const memberIds = new Set(memberships.filter((m) => m.listId === listId).map((m) => m.entityId));
      list = list.filter((d) => memberIds.has(d.id));
    }
    if (favOnly) {
      const favIds = new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.document).map((m) => m.entityId));
      list = list.filter((d) => favIds.has(d.id));
    }
    return list;
  }, [externalDocs, allDocuments, search, categoryFilter, listId, favOnly, memberships]);

  const previewId = useDocumentStore((s) => s.previewId);

  return (
    <SharedDataGrid<CrmDocument>
      data={data}
      columns={columns}
      gridId="documents"
      onRowClick={(doc) => onPreview(doc.id)}
      defaultSorting={[{ id: 'uploadedAt', desc: true }]}
      countLabel="documents"
      rowClassName={(doc) => (doc.id === previewId ? 'bg-[var(--brand-bg)] hover:bg-[var(--brand-bg)]' : '')}
      renderActions={(doc) => (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(doc.id); }}
            title="Preview"
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--brand-bg)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
          >
            <Eye size={14} weight="bold" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(doc.id); }}
            title="Remove"
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
          >
            <Trash size={14} weight="bold" />
          </button>
        </>
      )}
    />
  );
}
