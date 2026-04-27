'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Buildings, User, EyeSlash, Sparkle, Warning, CheckCircle,
  Tag, PencilSimple, Trash, Star, Flag, Bookmark,
  Briefcase, CurrencyDollar, ShieldCheck, Handshake, Target, CalendarBlank,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { ContactWithEntries, ContactTag } from '@/types/contact';
import { useContactStore } from '@/stores/contact-store';
import { useListStore } from '@/stores/list-store';
import { computeMissingFields } from '@/lib/contact-completeness';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';
import { initials, getAvatarColor, fmtDate } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SharedDataGrid, { ColumnDef } from '@/components/ui/SharedDataGrid';
import { toast } from '@/lib/toast';
import { getUnreadCountForContact, hasSeedAttachmentForContact, hasRecentSeedEmailForContact } from '@/lib/data/seed-emails';
import { useReadOverridesSet, useTotalUnreadCount } from '@/hooks/use-unread-emails';
import { Paperclip } from '@phosphor-icons/react';

// ─── Helpers ───
function IncompletePill() {
  return (
    <span title="Incomplete" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0">
      <Warning size={10} className="flex-shrink-0" /> <span className="truncate">Incomplete</span>
    </span>
  );
}

/**
 * Color map for user-applied contact tags. Mirrors `getContactTagColor`
 * in DetailHeader so the same tag renders the same color on the
 * detail page and the grid. Kept inline rather than exported because
 * the two surfaces have slightly different chip sizing — duplicating
 * a 5-line lookup is cheaper than an over-engineered shared module.
 */
function getTagChipStyle(tag: string): { bg: string; text: string; border: string } {
  if (tag === 'Contacts Tag' || tag === 'VIP' || tag === 'Follow Up')
    return { bg: 'var(--brand-bg)', text: 'var(--brand-primary)', border: 'var(--brand-primary)' };
  if (tag === 'Sales Tag' || tag === 'Prospect' || tag === 'Client')
    return { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)' };
  if (tag === 'Recruiting' || tag === 'Partner' || tag === 'Vendor')
    return { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)' };
  if (tag === 'Do Not Contact')
    return { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning)' };
  return { bg: 'var(--surface-raised)', text: 'var(--text-secondary)', border: 'var(--border)' };
}

/**
 * Tags cell for the /contacts grid. Renders ONLY the user-applied
 * contact tags (VIP, Sales Tag, Recruiting, etc.) plus the AI-added
 * pill when relevant. Type and Status live in their own dedicated
 * columns and are deliberately NOT duplicated here — Paul's call on
 * 2026-04-27 ("the type tags should stay in type not go in tags as
 * well"). Matches Pipedrive's "Labels" column and Folk's "Tags"
 * column scoping.
 *
 * When a contact has no tags AND no AI flag, we render a neutral em-
 * dash placeholder so the column doesn't visually collapse — same
 * empty-state convention as the rest of the grid.
 *
 * Overflow: above 3 visible chips render "+N" pill with the full list
 * in the tooltip. Three is the right cap because the column shrunk
 * from 240→200px once Type and Status moved out, and tag pills are
 * the chunkier kind (icon + label).
 */
function TagsCell({ contact: c }: { contact: ContactWithEntries }) {
  const userTags = c.tags || [];
  const showAI = c.aiStatus === 'new';

  if (!showAI && userTags.length === 0) {
    return <span className="text-[12px] text-[var(--text-tertiary)]">—</span>;
  }

  type Chip = { key: string; node: React.ReactNode; label: string };
  const chips: Chip[] = [];

  if (showAI) {
    chips.push({
      key: 'ai',
      label: 'AI',
      node: (
        <span
          key="ai"
          title="Added by AI"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]"
        >
          <Sparkle size={9} weight="duotone" /> AI
        </span>
      ),
    });
  }

  for (const tag of userTags) {
    const colors = getTagChipStyle(tag);
    chips.push({
      key: `tag-${tag}`,
      label: tag,
      node: (
        <span
          key={`tag-${tag}`}
          title={tag}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border"
          style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
        >
          <Tag size={9} weight="bold" /> {tag}
        </span>
      ),
    });
  }

  const VISIBLE = 3;
  const visible = chips.slice(0, VISIBLE);
  const overflow = chips.slice(VISIBLE);

  return (
    <div className="flex items-center gap-1 flex-nowrap min-w-0 overflow-hidden">
      {visible.map((c) => c.node)}
      {overflow.length > 0 && (
        <span
          title={overflow.map((c) => c.label).join(', ')}
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] flex-shrink-0"
        >
          +{overflow.length}
        </span>
      )}
    </div>
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
function buildColumns(
  expandedGroups: Set<string>,
  contacts: ContactWithEntries[],
  favIds: Set<string>,
  readOverrides: ReadonlySet<string>,
  totalUnread: number,
): ColumnDef<ContactWithEntries, any>[] {
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
      // Dedicated Unread column. Sortable is the key — without it the
      // user can't surface every contact with inbox pressure to the top
      // in a single click (same move as Gmail's "Unread first" and
      // HubSpot's activity-based sort). Accessor returns the numeric
      // count so table sort is natural (desc-first so the hottest rows
      // land at the top). Header carries a badge with the global unread
      // total — mirrors Gmail's left-rail "Inbox · 12".
      id: 'unread',
      accessorFn: (row) => getUnreadCountForContact(row.id, readOverrides),
      header: () => (
        <span
          title={`${totalUnread} unread email${totalUnread === 1 ? '' : 's'} across all contacts`}
          className="inline-flex items-center justify-center w-full gap-1"
        >
          <EnvelopeSimple size={13} weight="bold" />
          {totalUnread > 0 && (
            <span
              aria-label={`${totalUnread} total unread`}
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold leading-none"
            >
              {totalUnread}
            </span>
          )}
        </span>
      ),
      meta: { label: 'Unread' },
      // Bumped from 80 → 120 to fit up to three indicators side-by-side
      // (New pill + unread count + paperclip) without crushing them.
      size: 120,
      enableSorting: true,
      enableColumnFilter: false,
      sortDescFirst: true,
      cell: ({ row, getValue }) => {
        const c = row.original;
        const id = c.id;
        const unread = (getValue() as number) ?? 0;
        // Live signals from /api/contacts when present (Paul's real
        // Gmail-synced contacts), seed-based fallback when undefined
        // (demo contacts). The two sources never overlap — a contact
        // either has a `recentEmail` summary from the API or it's a
        // seed contact whose emails live client-side. OR'ing the two
        // gives us a single signal for the indicator regardless of
        // origin.
        const hasAttachment = c.recentEmail?.hasAttachment ?? hasSeedAttachmentForContact(id);
        const isNew = c.recentEmail?.hasNew ?? hasRecentSeedEmailForContact(id);

        if (unread === 0 && !hasAttachment && !isNew) {
          return <span className="text-[11px] text-[var(--text-tertiary)]">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-1">
            {isNew && (
              <span
                aria-label="New email synced recently"
                title="New email synced in the last 10 minutes"
                className="inline-flex items-center gap-0.5 px-1.5 h-[18px] rounded-full bg-[var(--success)] text-white text-[9.5px] font-bold leading-none"
              >
                <span aria-hidden="true" className="w-1 h-1 rounded-full bg-white" />
                New
              </span>
            )}
            {unread > 0 && (
              <span
                aria-label={`${unread} unread email${unread === 1 ? '' : 's'}`}
                title={`${unread} unread email${unread === 1 ? '' : 's'}`}
                className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold leading-none"
              >
                <EnvelopeSimple size={10} weight="fill" />
                {unread}
              </span>
            )}
            {hasAttachment && (
              <Paperclip
                size={12}
                weight="bold"
                className="text-[var(--text-secondary)] flex-shrink-0"
                aria-label="Has email with attachment"
              />
            )}
          </span>
        );
      },
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
              <span className="font-bold text-[var(--text-primary)] truncate max-w-[160px] block" style={{ fontSize: 'var(--grid-font, 13px)' }}>{c.name}</span>
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
      // Status column — Complete / Incomplete · N missing. Restored on
      // 2026-04-27 after Paul pointed out it should be its own column,
      // not folded into Tags. Now uses the shared `computeMissingFields`
      // so it agrees with the detail header pill (the original
      // implementation here was the `c.stale` mirror, which lied).
      // Industry pattern: HubSpot, Pipedrive, Salesforce, Folk all
      // surface record completeness as a dedicated column separate
      // from Type and Tags.
      id: 'status',
      accessorFn: (c: ContactWithEntries) => {
        const missing = computeMissingFields(c);
        // Prefix "0_" / "1_" so incomplete sorts after complete on
        // ascending; click-once gets the user a "what needs work" view.
        // Then by missing-field count so the most-broken records
        // bubble to the top within the incomplete group.
        return missing.length === 0 ? '0_complete' : `1_${String(missing.length).padStart(2, '0')}`;
      },
      header: 'Status',
      size: 150,
      cell: ({ row }) => {
        const c = row.original;
        const missing = computeMissingFields(c);
        if (missing.length === 0) {
          return (
            <span
              title="All required fields are filled in"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] truncate min-w-0"
            >
              <CheckCircle size={10} className="flex-shrink-0" />
              <span className="truncate">Complete</span>
            </span>
          );
        }
        return (
          <span
            title={`Missing: ${missing.join(', ')}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0"
          >
            <Warning size={10} className="flex-shrink-0" />
            <span className="truncate">Incomplete · {missing.length}</span>
          </span>
        );
      },
    },
    {
      // Tags column — JUST the user-applied tags + AI status. Type
      // and Status live in their own dedicated columns so we don't
      // duplicate them here (Paul's call: "the type tags should stay
      // in type not go in tags as well"). Mirrors Pipedrive's
      // "Labels" column, Folk's "Tags" column, Attio's tag attribute
      // columns — all of which scope this cell to the user-curated
      // labels only.
      id: 'tags',
      accessorFn: (c: ContactWithEntries) => {
        // Sort alphabetically by joined tag string so users can group
        // similarly-tagged records. AI-flagged records also get a
        // bumped sort key so they cluster together.
        const tagPart = (c.tags || []).slice().sort().join(',');
        const aiPart = c.aiStatus === 'new' ? '0_ai' : '1';
        return `${aiPart}_${tagPart}`;
      },
      header: 'Tags',
      size: 200,
      cell: ({ row }) => <TagsCell contact={row.original} />,
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
    // Note: a second `id: 'tags'` column lived here previously (used
    // tagColorClass / getTagIcon, rendered an IncompletePill on empty).
    // Removed 2026-04-27 — superseded by the Tags column up top that
    // sits next to Status / Type and uses the em-dash empty state and
    // shared chip styling. React was throwing duplicate-key warnings
    // because both columns existed with the same id.
    {
      id: 'lastUpdated',
      accessorKey: 'lastUpdated',
      header: 'Last Activity',
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
  const privateOnly = searchParams.get('private') === '1';
  const contacts = useContactStore((s) => s.contacts);
  const filter = useContactStore((s) => s.filter);
  const search = useContactStore((s) => s.search);
  const deleteContact = useContactStore((s) => s.deleteContact);
  const addContact = useContactStore((s) => s.addContact);
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
  // Reactive unread state — the override set clears a contact's badge the
  // moment the user expands its unread email in EmailsPanel, and the total
  // drives the column-header badge.
  const readOverrides = useReadOverridesSet();
  const totalUnread = useTotalUnreadCount();
  const columns = useMemo(
    () => buildColumns(expandedGroups, contacts, favIds, readOverrides, totalUnread),
    [expandedGroups, contacts, favIds, readOverrides, totalUnread],
  );

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
    if (privateOnly) {
      result = result.filter((c) => c.isPrivate);
    }
    return result;
  }, [contacts, filter, search, listId, favOnly, privateOnly, memberships]);

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
        onConfirm={async () => {
          if (!deleteTarget) return;
          const snapshot = deleteTarget;
          // Optimistic delete with rollback on failure — see ContactTable
          // for the same pattern. Until this route was wired up, "Delete"
          // only mutated the Zustand store, leaving the DB row alive
          // forever (which then suppressed the contact from the Gmail
          // import wizard's suggestions).
          deleteContact(snapshot.id);
          setDeleteTarget(null);
          try {
            const r = await fetch(`/api/contacts/${snapshot.id}`, { method: 'DELETE' });
            const body = await r.json().catch(() => ({} as { error?: string }));
            if (!r.ok) throw new Error(body.error || `delete failed (${r.status})`);
            toast.success('Contact deleted', {
              description: snapshot.name,
              action: { label: 'Undo', onClick: () => addContact(snapshot) },
            });
          } catch (e) {
            addContact(snapshot);
            const msg = e instanceof Error ? e.message : 'Delete failed';
            toast.error('Couldn\u2019t delete contact', { description: msg });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
