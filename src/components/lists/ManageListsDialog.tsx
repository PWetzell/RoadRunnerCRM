'use client';

import { useState, useMemo } from 'react';
import {
  X, PencilSimple, Trash, Globe, Lock, Users, CurrencyDollar, File, ListBullets,
  ArrowLeft, FloppyDisk, Plus,
} from '@phosphor-icons/react';
import { useListStore, getListMemberCount } from '@/stores/list-store';
import { SavedList, ListVisibility, ListEntityType, LIST_ENTITY_META } from '@/types/list';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const TYPE_ICON: Record<ListEntityType, typeof Users> = {
  contact: Users,
  deal: CurrencyDollar,
  document: File,
};

/**
 * Centered modal that lets users see all their lists, grouped by entity
 * type, with inline edit (rename + visibility) and delete (with confirm).
 */
export default function ManageListsDialog() {
  const manageOpen = useListStore((s) => s.manageOpen);
  const closeManage = useListStore((s) => s.closeManage);
  const lists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const updateList = useListStore((s) => s.updateList);
  const deleteList = useListStore((s) => s.deleteList);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<ListEntityType, SavedList[]> = { contact: [], deal: [], document: [] };
    lists.forEach((l) => g[l.entityType].push(l));
    return g;
  }, [lists]);

  if (!manageOpen) return null;

  const editingList = editingId ? lists.find((l) => l.id === editingId) : null;
  const deletingList = deletingId ? lists.find((l) => l.id === deletingId) : null;

  const handleClose = () => {
    setEditingId(null);
    setDeletingId(null);
    closeManage();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        {/* Modal */}
        <div
          className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[540px] max-w-[95vw] max-h-[80vh] flex flex-col shadow-xl animate-[fadeUp_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            {editingList ? (
              <button
                onClick={() => setEditingId(null)}
                className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
              >
                <ArrowLeft size={14} weight="bold" />
              </button>
            ) : (
              <ListBullets size={16} weight="bold" className="text-[var(--brand-primary)]" />
            )}
            <h3 className="text-[14px] font-extrabold text-[var(--text-primary)] flex-1">
              {editingList ? 'Edit list' : 'Manage lists'}
            </h3>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          {editingList ? (
            <EditListForm
              list={editingList}
              onSave={(patch) => { updateList(editingList.id, patch); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <ListBullets size={32} weight="duotone" className="text-[var(--text-tertiary)]" />
                  <div className="text-[13px] font-bold text-[var(--text-secondary)]">No lists yet</div>
                  <div className="text-[11px] text-[var(--text-secondary)] text-center px-8">
                    Create your first list from the &ldquo;Save to list&rdquo; menu on any contact, deal, or document.
                  </div>
                </div>
              ) : (
                (['contact', 'deal', 'document'] as ListEntityType[]).map((type) => {
                  const typeList = grouped[type];
                  if (typeList.length === 0) return null;
                  const TypeIcon = TYPE_ICON[type];
                  return (
                    <div key={type} className="border-b border-[var(--border-subtle)] last:border-0">
                      <div className="flex items-center gap-1.5 px-5 pt-3 pb-2">
                        <TypeIcon size={12} weight="fill" className="text-[var(--text-secondary)]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          {LIST_ENTITY_META[type].pluralLabel}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">({typeList.length})</span>
                      </div>
                      {typeList.map((list) => {
                        const memberCount = getListMemberCount(memberships, list.id);
                        const VisibilityIcon = list.visibility === 'public' ? Globe : Lock;
                        return (
                          <div key={list.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--surface-raised)] group">
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{list.name}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                                <VisibilityIcon size={9} weight="fill" />
                                <span className="capitalize">{list.visibility}</span>
                                <span>·</span>
                                <span>{memberCount} {memberCount === 1 ? 'item' : 'items'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setEditingId(list.id)}
                              title="Edit"
                              className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border-none cursor-pointer opacity-60 group-hover:opacity-100 transition-opacity"
                            >
                              <PencilSimple size={12} weight="bold" />
                            </button>
                            <button
                              onClick={() => setDeletingId(list.id)}
                              title="Delete"
                              className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer opacity-60 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash size={12} weight="bold" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {!editingList && (
            <div className="flex-shrink-0 border-t border-[var(--border)] px-5 py-3 flex items-center justify-end">
              <button
                onClick={handleClose}
                className="h-[32px] px-4 text-[12px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingList}
        title="Delete list?"
        message={
          <>
            Are you sure you want to delete <strong>&ldquo;{deletingList?.name}&rdquo;</strong>?
            <br />
            <span className="text-[var(--text-secondary)] text-[12px]">
              This removes the list but keeps the {deletingList?.entityType}s themselves.
            </span>
          </>
        }
        confirmLabel="Delete list"
        confirmVariant="danger"
        onConfirm={() => {
          if (deletingId) deleteList(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}

/* -------------------------------------------------------------- */
/*  Edit form                                                      */
/* -------------------------------------------------------------- */

function EditListForm({
  list,
  onSave,
  onCancel,
}: {
  list: SavedList;
  onSave: (patch: { name: string; visibility: ListVisibility }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(list.name);
  const [visibility, setVisibility] = useState<ListVisibility>(list.visibility);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    onSave({ name: trimmed, visibility });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
            List name <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className={`w-full h-[36px] px-3 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${
              error ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
            }`}
          />
          {error && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{error}</div>}
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Visibility</label>
          <div className="flex gap-1">
            {(['private', 'public'] as const).map((v) => {
              const active = visibility === v;
              const Icon = v === 'public' ? Globe : Lock;
              return (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`flex-1 h-[34px] text-[12px] font-bold rounded-[var(--radius-sm)] border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                    active
                      ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  <Icon size={12} weight={active ? 'fill' : 'regular'} />
                  <span className="capitalize">{v}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1">
            {visibility === 'public' ? 'Public lists appear in the sidebar.' : 'Private lists are hidden from the sidebar.'}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-[var(--border)] px-5 py-3 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="h-[32px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="h-[32px] px-4 text-[12px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90 flex items-center gap-1.5"
        >
          <FloppyDisk size={12} weight="bold" />
          Save
        </button>
      </div>
    </>
  );
}
