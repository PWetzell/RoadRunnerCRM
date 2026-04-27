'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X, ArrowLeft, Plus, Globe, Lock, FloppyDisk, Bookmark, ListBullets, CaretRight,
  User, CurrencyDollar, File, Trash,
} from '@phosphor-icons/react';
import { useListStore, getListsByType, getListMemberCount } from '@/stores/list-store';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useDocumentStore } from '@/stores/document-store';
import { ListEntityType, ListVisibility, LIST_ENTITY_META, SavedList } from '@/types/list';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Props {
  entityId: string;
  entityType: ListEntityType;
  onClose: () => void;
  className?: string;
}

type PickerMode = 'list' | 'create' | 'detail';

const ENTITY_ROUTE: Record<ListEntityType, (id: string) => string> = {
  contact: (id) => `/contacts/${id}`,
  deal: (id) => `/sales/${id}`,
  document: () => `/documents`,
};

const ENTITY_ICON: Record<ListEntityType, typeof User> = {
  contact: User,
  deal: CurrencyDollar,
  document: File,
};

/**
 * The star-menu dropdown for adding/removing the current record from
 * saved lists. Has three modes:
 *   - list: checkboxes for each list, click row name drills into detail
 *   - create: form to create a new list
 *   - detail: browse members of a selected list
 */
export default function SaveToListPicker({ entityId, entityType, onClose, className }: Props) {
  const lists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const createList = useListStore((s) => s.createList);
  const toggleMembership = useListStore((s) => s.toggleMembership);
  const removeFromList = useListStore((s) => s.removeFromList);

  // All entity stores (for rendering member names in detail mode)
  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const documents = useDocumentStore((s) => s.documents);

  const [mode, setMode] = useState<PickerMode>('list');
  const [detailListId, setDetailListId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newVisibility, setNewVisibility] = useState<ListVisibility>('private');
  const [nameError, setNameError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ memberId: string; memberName: string; listName: string } | null>(null);

  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const entityLists = useMemo(() => getListsByType(lists, entityType), [lists, entityType]);

  const currentMemberships = useMemo(() => {
    const set = new Set<string>();
    memberships.forEach((m) => {
      if (m.entityId === entityId && m.entityType === entityType) set.add(m.listId);
    });
    return set;
  }, [memberships, entityId, entityType]);

  // Sort: Favorites list first (if present), then others by creation date
  const sortedLists = useMemo(() => {
    const favs = entityLists.filter((l) => l.name.toLowerCase() === 'favorites');
    const rest = entityLists.filter((l) => l.name.toLowerCase() !== 'favorites');
    return [...favs, ...rest];
  }, [entityLists]);

  const detailList = detailListId ? lists.find((l) => l.id === detailListId) : null;

  // Resolve member records for the detail view
  const detailMembers = useMemo(() => {
    if (!detailList) return [];
    const memberIds = memberships
      .filter((m) => m.listId === detailList.id)
      .map((m) => m.entityId);
    if (detailList.entityType === 'contact') {
      return memberIds
        .map((id) => contacts.find((c) => c.id === id))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((c) => ({ id: c.id, name: c.name, subtitle: c.type === 'person' ? 'Person' : 'Organization' }));
    }
    if (detailList.entityType === 'deal') {
      return memberIds
        .map((id) => deals.find((d) => d.id === id))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((d) => ({ id: d.id, name: d.name, subtitle: `$${d.amount.toLocaleString()} · ${d.stage}` }));
    }
    return memberIds
      .map((id) => documents.find((doc) => doc.id === id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((doc) => ({ id: doc.id, name: doc.name, subtitle: doc.category }));
  }, [detailList, memberships, contacts, deals, documents]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('Name is required'); return; }
    if (trimmed.length < 2) { setNameError('Name must be at least 2 characters'); return; }
    const created = createList({ name: trimmed, entityType, visibility: newVisibility });
    toggleMembership(created.id, entityId, entityType);
    setNewName('');
    setNameError('');
    setNewVisibility('private');
    setMode('list');
  };

  const entityLabel = LIST_ENTITY_META[entityType].label;

  return (
    <div
      ref={ref}
      className={`absolute right-0 top-full mt-2 w-[380px] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl z-[60] flex flex-col max-h-[560px] animate-[fadeUp_0.15s_ease-out] ${className ?? ''}`}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        {mode === 'create' ? (
          <button
            onClick={() => { setMode('list'); setNameError(''); setDetailListId(null); }}
            title="Back"
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft size={14} weight="bold" />
          </button>
        ) : (
          <Bookmark size={16} weight="fill" className="text-[var(--brand-primary)]" />
        )}
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1 truncate">
          {mode === 'create' ? 'Create new list'
            : mode === 'detail' ? (detailList?.name ?? 'List')
            : 'Save to list'}
        </span>
        <button
          onClick={onClose}
          title="Close"
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {mode === 'list' && (
        <>
          {/* Create new list button */}
          <div className="flex-shrink-0 border-b border-[var(--border-subtle)]">
            <button
              data-tour="save-to-list-create"
              onClick={() => setMode('create')}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border-none cursor-pointer text-left"
            >
              <Plus size={13} weight="bold" />
              Create new list
            </button>
          </div>

          {/* Lists */}
          <div className="flex-1 overflow-y-auto">
            {sortedLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                <ListBullets size={28} weight="duotone" className="text-[var(--text-tertiary)]" />
                <div className="text-[12px] font-bold text-[var(--text-secondary)]">No {entityLabel.toLowerCase()} lists yet</div>
                <div className="text-[11px] text-[var(--text-secondary)] text-center">
                  Create your first list to organize {entityLabel.toLowerCase()}s.
                </div>
              </div>
            ) : (
              sortedLists.map((list) => {
                const checked = currentMemberships.has(list.id);
                const memberCount = getListMemberCount(memberships, list.id);
                const VisibilityIcon = list.visibility === 'public' ? Globe : Lock;
                return (
                  <div
                    key={list.id}
                    className="flex items-center gap-2.5 pr-3 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-raised)]"
                  >
                    {/* Checkbox (standalone clickable area) */}
                    <label className="pl-4 py-2.5 cursor-pointer flex items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMembership(list.id, entityId, entityType)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-[var(--brand-primary)] cursor-pointer flex-shrink-0"
                      />
                    </label>
                    {/* Row name/body - clicking drills into detail view. */}
                    <button
                      onClick={() => { setDetailListId(list.id); setMode('detail'); }}
                      className="flex-1 flex items-center gap-2.5 py-2.5 bg-transparent border-none cursor-pointer text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{list.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                          <VisibilityIcon size={9} weight="fill" />
                          <span className="capitalize">{list.visibility}</span>
                          <span>·</span>
                          <span>{memberCount} {memberCount === 1 ? 'item' : 'items'}</span>
                        </div>
                      </div>
                      <CaretRight size={12} weight="bold" className="text-[var(--text-secondary)] flex-shrink-0" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2.5 flex items-center justify-end">
            <button
              onClick={onClose}
              className="h-[28px] px-3 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
            >
              Done
            </button>
          </div>
        </>
      )}

      {mode === 'detail' && detailList && (
        <>
          {/* List metadata bar — visibility + item count. */}
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2 bg-[var(--surface-raised)]">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
              {detailList.visibility === 'public' ? <Globe size={9} weight="fill" /> : <Lock size={9} weight="fill" />}
              <span className="capitalize">{detailList.visibility}</span>
              <span>·</span>
              <span>{detailMembers.length} {detailMembers.length === 1 ? 'item' : 'items'}</span>
            </div>
          </div>

          {/* Members */}
          <div className="flex-1 overflow-y-auto">
            {detailMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                <ListBullets size={24} weight="duotone" className="text-[var(--text-tertiary)]" />
                <div className="text-[12px] font-bold text-[var(--text-secondary)]">This list is empty</div>
                <div className="text-[11px] text-[var(--text-secondary)] text-center">
                  Check the box next to this list to add the current {entityLabel.toLowerCase()}.
                </div>
              </div>
            ) : (
              detailMembers.map((m) => {
                const EntityIcon = ENTITY_ICON[detailList.entityType];
                const href = ENTITY_ROUTE[detailList.entityType](m.id);
                return (
                  <div key={m.id} className="flex items-center gap-2.5 pr-2 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-raised)] group">
                    <Link
                      href={href}
                      onClick={onClose}
                      className="flex-1 flex items-center gap-2.5 pl-4 py-2.5 no-underline"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
                        <EntityIcon size={12} weight="fill" className="text-[var(--text-secondary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{m.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] truncate">{m.subtitle}</div>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove({ memberId: m.id, memberName: m.name, listName: detailList.name }); }}
                      title="Remove from list"
                      className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash size={11} weight="bold" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={() => { setMode('list'); setDetailListId(null); }}
              className="text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={11} weight="bold" />
              Back to lists
            </button>
            <button
              onClick={onClose}
              className="h-[28px] px-3 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
            >
              Done
            </button>
          </div>
        </>
      )}

      {mode === 'create' && (
        <>
          <div className="p-4 flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                List name <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => { setNewName(e.target.value); if (nameError) setNameError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                placeholder={`e.g., Top ${LIST_ENTITY_META[entityType].pluralLabel}`}
                className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${
                  nameError ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
                }`}
              />
              {nameError && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{nameError}</div>}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Visibility</label>
              <div className="flex gap-1">
                {(['private', 'public'] as const).map((v) => {
                  const active = newVisibility === v;
                  const Icon = v === 'public' ? Globe : Lock;
                  return (
                    <button
                      key={v}
                      onClick={() => setNewVisibility(v)}
                      className={`flex-1 h-[32px] text-[11px] font-bold rounded-[var(--radius-sm)] border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                        active
                          ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                          : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
                      }`}
                    >
                      <Icon size={11} weight={active ? 'fill' : 'regular'} />
                      <span className="capitalize">{v}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                {newVisibility === 'public' ? 'Public lists appear in the sidebar as shortcuts.' : 'Private lists are only visible here.'}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-3 flex items-center justify-end gap-2">
            <button
              onClick={() => { setMode('list'); setNameError(''); setNewName(''); }}
              className="h-[30px] px-3 text-[11px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className={`h-[30px] px-4 text-[11px] font-bold text-white rounded-[var(--radius-sm)] border-none cursor-pointer flex items-center gap-1.5 ${
                newName.trim() ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
              }`}
            >
              <FloppyDisk size={12} weight="bold" />
              Create
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove from list?"
        message={confirmRemove ? `Remove "${confirmRemove.memberName}" from "${confirmRemove.listName}"? The record itself will not be deleted — just the membership.` : ''}
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmRemove && detailList) removeFromList(detailList.id, confirmRemove.memberId);
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
