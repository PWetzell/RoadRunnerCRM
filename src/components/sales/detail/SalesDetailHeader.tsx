'use client';

import { useState, useMemo } from 'react';
import { Buildings, User, Warning, CheckCircle, Trash, Sparkle, Star, Bookmark } from '@phosphor-icons/react';
import ListMembershipPill from '@/components/lists/ListMembershipPill';
import { Deal } from '@/types/deal';
import { Contact } from '@/types/contact';
import { initials, getAvatarColor, fmtDate } from '@/lib/utils';
import { LeadCompleteness } from '@/lib/leadCompleteness';
import StagePill from '@/components/sales/StagePill';
import { useListStore, getListsForEntity } from '@/stores/list-store';
import SaveToListPicker from '@/components/lists/SaveToListPicker';

interface Props {
  deal: Deal;
  person?: Contact;
  org?: Contact;
  completeness: LeadCompleteness;
  onBack: () => void;
  onDelete?: () => void;
}

/**
 * Persistent header shown above the tabs on a deal detail page.
 * - Person leads lead with the person's avatar + name; the company shows as subtitle.
 * - Company leads lead with the company's tile + name; the initiative shows as subtitle.
 * - Completeness progress bar fills as required fields get populated.
 */
export default function SalesDetailHeader({ deal, person, org, completeness, onBack, onDelete }: Props) {
  const [showMissing, setShowMissing] = useState(false);

  // Lists
  const lists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const pickerOpen = useListStore((s) => s.pickerOpen);
  const pickerEntityId = useListStore((s) => s.pickerEntityId);
  const openPicker = useListStore((s) => s.openPicker);
  const closePicker = useListStore((s) => s.closePicker);
  const openManage = useListStore((s) => s.openManage);
  const toggleFavorite = useListStore((s) => s.toggleFavorite);
  const entityLists = useMemo(() => getListsForEntity(lists, memberships, deal.id, 'deal'), [lists, memberships, deal.id]);
  const isInAnyList = entityLists.length > 0;
  const isFav = useMemo(
    () => memberships.some((m) => m.listId === 'list-deals-favorites' && m.entityId === deal.id),
    [memberships, deal.id],
  );
  const showPicker = pickerOpen && pickerEntityId === deal.id;

  const isPerson = deal.type === 'person';

  // Choose the "subject" contact to feature in the header
  const subject = isPerson ? person : org;
  const subjectName =
    (subject?.name) ||
    (isPerson ? deal.name : deal.name);

  // Subtitle varies by type
  const subtitle = isPerson
    ? (org?.name || 'No company attached')
    : (deal.initiative || 'No initiative defined');

  const avatarShape = isPerson ? 'var(--radius-full)' : 'var(--radius-lg)';
  const avatarColor = subject
    ? getAvatarColor(subject.id, subject.avatarColor)
    : 'var(--text-tertiary)';

  const pct = completeness.pct;
  const isComplete = pct === 100;

  return (
    <div className="bg-[var(--surface-card)] border-b border-[var(--border)] px-6 pt-4 pb-3">
      {/* Breadcrumb */}
      <div className="text-[13px] text-[var(--text-tertiary)] mb-3">
        <button
          onClick={onBack}
          className="text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer font-inherit p-0"
        >
          Sales
        </button>
        <span> › {deal.name}</span>
      </div>

      {/* Hero */}
      <div className="flex items-start gap-4">
        <div
          className="w-[52px] h-[52px] flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0"
          style={{ background: avatarColor, borderRadius: avatarShape }}
        >
          {initials(subjectName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[22px] font-extrabold text-[var(--text-primary)] leading-tight truncate">
              {subjectName}
            </h2>
            <StagePill stage={deal.stage} size="md" />
          </div>

          {/* Subtitle */}
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 truncate">
            {subtitle}
          </div>

          {/* Meta row */}
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1 flex-wrap">
            <span>Owner</span>
            <span className="font-bold text-[var(--text-secondary)]">{deal.owner}</span>
            <span className="mx-1">·</span>
            <span>Updated</span>
            <span className="font-bold text-[var(--text-secondary)]">{fmtDate(deal.lastUpdated)}</span>
            <span className="mx-1">·</span>
            <span>Expected close</span>
            <span className="font-bold text-[var(--text-secondary)]">{fmtDate(deal.expectedCloseDate)}</span>
            <span className="mx-1">·</span>
            <span>Source</span>
            <span className="font-bold text-[var(--text-secondary)]">{deal.source}</span>
          </div>

          {/* Type + Completeness */}
          <div className="flex gap-1.5 items-center mt-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                isPerson
                  ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]'
              }`}
            >
              {isPerson ? <User size={12} weight="bold" /> : <Buildings size={12} weight="bold" />}
              {isPerson ? 'Person lead' : 'Company lead'}
            </span>

            {isComplete ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
                <CheckCircle size={12} weight="fill" /> Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
                <Warning size={12} weight="bold" /> Incomplete
              </span>
            )}

            {/* List memberships — shows which list(s) this deal is in */}
            {isInAnyList && <ListMembershipPill lists={entityLists} />}
          </div>

          {/* Completeness bar */}
          <div className="mt-3 max-w-[520px]">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={() => setShowMissing((v) => !v)}
                className="text-[11px] font-bold text-[var(--text-secondary)] bg-transparent border-none p-0 cursor-pointer hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                aria-expanded={showMissing}
              >
                <Sparkle size={12} weight="duotone" className="text-[var(--ai)]" />
                Profile {pct}% complete
                <span className="text-[var(--text-tertiary)] font-semibold">
                  · {completeness.filled} of {completeness.total} fields
                </span>
              </button>
              {completeness.missing.length > 0 && (
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  {showMissing ? 'hide' : 'show'} missing
                </span>
              )}
            </div>
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`,
                  background: isComplete ? 'var(--success)' : 'var(--ai)',
                }}
              />
            </div>
            {showMissing && completeness.missing.length > 0 && (
              <ul className="mt-2 text-[11px] text-[var(--text-secondary)] flex flex-wrap gap-x-3 gap-y-0.5">
                {completeness.missing.map((m) => (
                  <li key={m} className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]" /> {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Favorite — standalone star */}
          <button
            onClick={() => toggleFavorite(deal.id, 'deal')}
            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-label={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-pressed={isFav}
            className="bg-transparent border-none p-1.5 cursor-pointer flex items-center justify-center hover:bg-[var(--warning-bg)] rounded-[var(--radius-sm)]"
          >
            <Star
              size={18}
              weight={isFav ? 'fill' : 'regular'}
              className={isFav ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)] hover:text-[var(--warning)] transition-colors'}
            />
          </button>
          {/* Save to list — standalone bookmark */}
          <div className="relative inline-flex items-center">
            <button
              onClick={() => showPicker ? closePicker() : openPicker(deal.id, 'deal')}
              title={isInAnyList ? `Save to list (in ${entityLists.length} list${entityLists.length === 1 ? '' : 's'})` : 'Save to list'}
              aria-label="Save to list"
              aria-expanded={showPicker}
              className="bg-transparent border-none p-1.5 cursor-pointer flex items-center justify-center hover:bg-[var(--surface-raised)] rounded-[var(--radius-sm)]"
            >
              <Bookmark
                size={18}
                weight={isInAnyList ? 'fill' : 'regular'}
                className={isInAnyList ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors'}
              />
            </button>
            {showPicker && (
              <SaveToListPicker entityId={deal.id} entityType="deal" onClose={closePicker} />
            )}
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete deal"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
