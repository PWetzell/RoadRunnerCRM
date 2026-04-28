'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkle, Buildings, Warning, CheckCircle, XCircle, MagnifyingGlass,
  Handshake, UserPlus, Funnel, Clock, ArrowRight, PencilSimple, Trash,
} from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { RECRUITING_STAGES, dealStageToRecruitingStage, CandidateCard, RecruitingStage } from '@/types/recruiting';
import { initials, getAvatarColor } from '@/lib/utils';
import SharedDataGrid, { ColumnDef } from '@/components/ui/SharedDataGrid';
import { useIsDark } from '@/hooks/useIsDark';
import { dc } from '@/lib/pill-colors';
import { Star } from '@phosphor-icons/react';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { useListStore } from '@/stores/list-store';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';
import { useSearchParams } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';

const STAGE_META_MAP = RECRUITING_STAGES.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {} as Record<RecruitingStage, typeof RECRUITING_STAGES[number]>);

const STAGE_ICONS: Record<RecruitingStage, typeof Warning> = {
  sourced: Funnel,
  screening: MagnifyingGlass,
  interview: Handshake,
  offer: ArrowRight,
  placed: CheckCircle,
  rejected: XCircle,
};

function computeStatus(c: CandidateCard): string {
  const daysSince = c.lastActivity ? (Date.now() - new Date(c.lastActivity).getTime()) / (1000 * 60 * 60 * 24) : 0;
  if (c.stage === 'placed') return 'Placed';
  if (c.stage === 'rejected') return 'Rejected';
  if (daysSince > 14) return 'Stalled';
  if ((c.stage === 'sourced' || c.stage === 'screening') && daysSince > 7) return 'Needs Action';
  return 'On Track';
}

// ─── Column Definitions ───
// Sizes match the Contacts grid: name=220, pills=80-85, text=120-150, dates=110
function buildColumns(isDark: boolean, favIds: Set<string>): ColumnDef<CandidateCard, any>[] {
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
        <FavoriteCell entityId={row.original.id} entityType="deal" />
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Candidate',
      size: 320,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center font-extrabold text-white flex-shrink-0 leading-none"
              style={{
                width: 'var(--grid-avatar, 32px)',
                height: 'var(--grid-avatar, 32px)',
                // Initials scale with the avatar (was hardcoded 11px,
                // which overflowed the 14px compact avatar). Mirrors
                // the /contacts grid avatar fix.
                fontSize: 'var(--grid-avatar-font, 11px)',
                background: getAvatarColor(c.id, c.avatarColor),
                borderRadius: '50%',
              }}
            >
              {initials(c.name)}
            </div>
            <div className="min-w-0">
              {/* Name is a <span> to match the /contacts grid pattern.
                  Compact-mode CSS in globals.css hides the secondary
                  title <div> below by selecting `span + div` — if name
                  were also a <div>, both would disappear. */}
              <span className="block font-bold text-[var(--text-primary)] truncate max-w-[160px]" style={{ fontSize: 'var(--grid-font, 13px)' }}>{c.name}</span>
              {c.title && (
                <div className="text-[var(--text-tertiary)] truncate max-w-[160px]" style={{ fontSize: 'calc(var(--grid-font, 13px) - 2px)' }}>{c.title}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'stage',
      accessorFn: (row) => RECRUITING_STAGES.find((s) => s.id === row.stage)?.label || row.stage,
      header: 'Stage',
      size: 200,
      cell: ({ row }) => {
        const c = row.original;
        const StageIcon = STAGE_ICONS[c.stage];
        return (
          <span
            title={RECRUITING_STAGES.find((s) => s.id === c.stage)?.label}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold truncate min-w-0"
            style={{ ...(() => { const cl = dc(STAGE_META_MAP[c.stage], isDark); return { background: cl.bg, color: cl.color, border: `1px solid ${cl.color}` }; })() }}
          >
            <span className="flex-shrink-0"><StageIcon size={10} weight="fill" /></span>
            <span className="truncate">{RECRUITING_STAGES.find((s) => s.id === c.stage)?.label}</span>
          </span>
        );
      },
    },
    {
      id: 'status',
      accessorFn: (row) => computeStatus(row),
      header: 'Status',
      size: 200,
      cell: ({ row }) => {
        const status = computeStatus(row.original);
        if (status === 'Placed')
          return <span title="Placed" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] truncate min-w-0"><span className="flex-shrink-0"><CheckCircle size={10} weight="fill" /></span> <span className="truncate">Placed</span></span>;
        if (status === 'Rejected')
          return <span title="Rejected" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)] truncate min-w-0"><span className="flex-shrink-0"><XCircle size={10} weight="fill" /></span> <span className="truncate">Rejected</span></span>;
        if (status === 'Stalled')
          return <span title="Stalled" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0"><span className="flex-shrink-0"><Clock size={10} weight="fill" /></span> <span className="truncate">Stalled</span></span>;
        if (status === 'Needs Action')
          return <span title="Needs Action" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] truncate min-w-0"><span className="flex-shrink-0"><Warning size={10} weight="fill" /></span> <span className="truncate">Needs Action</span></span>;
        return <span title="On Track" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:var(--grid-font)] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] truncate min-w-0"><span className="flex-shrink-0"><ArrowRight size={10} weight="bold" /></span> <span className="truncate">On Track</span></span>;
      },
    },
    {
      id: 'company',
      accessorKey: 'company',
      header: 'Company',
      size: 280,
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-[var(--text-secondary)] italic text-[length:var(--grid-font)] truncate block">Between roles</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate block">{v}</span>;
      },
    },
    {
      id: 'dealAmount',
      accessorKey: 'dealAmount',
      header: 'Amount',
      size: 200,
      cell: ({ getValue }) => <span className="text-[length:var(--grid-font)] font-bold text-[var(--text-primary)]">${(getValue() as number).toLocaleString()}</span>,
    },
    {
      id: 'matchScore',
      accessorKey: 'matchScore',
      header: 'AI Match',
      size: 250,
      cell: ({ getValue }) => {
        const score = (getValue() as number) || 0;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Sparkle size={12} weight="duotone" className="text-[var(--ai)] flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)' }} />
            </div>
            <span className="text-[length:var(--grid-font)] font-bold text-[var(--text-secondary)] flex-shrink-0">{score}%</span>
          </div>
        );
      },
    },
    {
      id: 'lastActivity',
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      size: 220,
      cell: ({ getValue }) => <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{getValue() as string || '\u2014'}</span>,
    },
    {
      id: 'source',
      accessorKey: 'source',
      header: 'Source',
      size: 150,
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{getValue() as string || '\u2014'}</span>,
    },
    {
      id: 'dealName',
      accessorKey: 'dealName',
      header: 'Deal Name',
      size: 220,
      cell: ({ getValue }) => <span className="text-[length:var(--grid-font)] text-[var(--text-primary)] truncate block">{getValue() as string || '\u2014'}</span>,
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      size: 180,
      cell: ({ getValue }) => <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] truncate block">{getValue() as string || '\u2014'}</span>,
    },
    {
      id: 'lastCommType',
      accessorKey: 'lastCommType',
      header: 'Last Comm',
      size: 150,
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">{'\u2014'}</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{v}</span>;
      },
    },
    {
      id: 'expectedCloseDate',
      accessorKey: 'expectedCloseDate',
      header: 'Expected Close',
      size: 190,
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">{'\u2014'}</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)]">{v}</span>;
      },
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: 'Priority',
      size: 140,
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-[length:var(--grid-font)] text-[var(--text-tertiary)]">{'\u2014'}</span>;
        return <span className="text-[length:var(--grid-font)] text-[var(--text-secondary)] capitalize">{v}</span>;
      },
    },
  ];
}

// ─── Main Component ───
export default function RecruitingList({ search }: { search: string }) {
  const router = useRouter();
  const deals = useSalesStore((s) => s.deals);
  const deleteDeal = useSalesStore((s) => s.deleteDeal);
  const addDeal = useSalesStore((s) => s.addDeal);
  const contacts = useContactStore((s) => s.contacts);
  const memberships = useListStore((s) => s.memberships);
  const searchParams = useSearchParams();
  const favOnly = searchParams.get('fav') === '1';
  const [deleteTarget, setDeleteTarget] = useState<CandidateCard | null>(null);

  const isDark = useIsDark();
  const favIds = useMemo(
    () => new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.deal).map((m) => m.entityId)),
    [memberships],
  );
  const columns = useMemo(() => buildColumns(isDark, favIds), [isDark, favIds]);

  const data = useMemo<CandidateCard[]>(() => {
    return deals
      .filter((d) => d.type === 'person' || d.personContactId)
      .map((d) => {
        const person = contacts.find((c) => c.id === d.personContactId);
        const org = contacts.find((c) => c.id === d.orgContactId);
        const base = d.probability || 50;
        const bonus = person && 'title' in person && person.title ? 15 : 0;
        const matchScore = Math.min(99, base + bonus + (d.amount > 50000 ? 10 : 0));
        return {
          id: d.id,
          name: person?.name || d.name,
          title: person && person.type === 'person' ? person.title : undefined,
          company: org?.name || (person && person.type === 'person' ? person.orgName : undefined),
          avatarColor: person?.avatarColor,
          stage: dealStageToRecruitingStage(d.stage),
          dealId: d.id,
          dealName: d.name,
          dealAmount: d.amount,
          lastActivity: d.lastUpdated,
          source: d.source,
          matchScore,
          lastCommType: d.lastCommunication?.type,
          expectedCloseDate: d.expectedCloseDate,
          priority: d.priority,
        };
      })
      .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => {
        if (!favOnly) return true;
        return memberships.some((m) => m.listId === FAVORITES_LIST_IDS.deal && m.entityId === c.id);
      });
  }, [deals, contacts, search, favOnly, memberships]);

  return (
    <>
      <SharedDataGrid<CandidateCard>
        data={data}
        columns={columns}
        gridId="recruiting"
        onRowClick={(c) => c.dealId && router.push(`/sales/${c.dealId}`)}
        defaultSorting={[{ id: 'matchScore', desc: true }]}
        countLabel="candidates"
        rowClassName={(c) => {
          const status = computeStatus(c);
          return status === 'Stalled' ? 'bg-[var(--warning-bg)]/40' : '';
        }}
        renderActions={(c) => (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); if (c.dealId) router.push(`/sales/${c.dealId}`); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
              title="Edit candidate"
            >
              <PencilSimple size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
              title="Delete candidate"
            >
              <Trash size={14} />
            </button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete candidate?"
        message={deleteTarget ? <>Remove <strong>{deleteTarget.name}</strong> from recruiting?</> : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTarget?.dealId) {
            const id = deleteTarget.dealId;
            const snapshot = deals.find((d) => d.id === id);
            deleteDeal(id);
            toast.success('Candidate deleted', {
              description: deleteTarget.name,
              action: snapshot ? { label: 'Undo', onClick: () => addDeal(snapshot) } : undefined,
            });
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
