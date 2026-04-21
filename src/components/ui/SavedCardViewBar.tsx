'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { FloppyDisk, CaretDown, Check, PencilSimple, Trash, X } from '@phosphor-icons/react';
import { useCardViewStore, SavedCardView } from '@/stores/card-view-store';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  /** Scope key — e.g. 'contacts', 'documents', 'recruiting'. */
  scope: string;
  /** Current filter state to save. */
  currentFilters: Record<string, string | boolean>;
  /** Called when user loads a saved view — apply these filters. */
  onLoadView: (filters: Record<string, string | boolean>) => void;
}

/**
 * Inline saved-view bar for card views. Shows a "View:" dropdown with
 * saved filter configurations + a Save button. Same UX pattern as the
 * dashboard View picker but scoped to card views with filter state.
 */
export default function SavedCardViewBar({ scope, currentFilters, onLoadView }: Props) {
  const allSavedViews = useCardViewStore((s) => s.savedViews);
  const allActiveViewIds = useCardViewStore((s) => s.activeViewIds);
  const savedViews = useMemo(() => allSavedViews.filter((v) => v.scope === scope), [allSavedViews, scope]);
  const activeViewId = allActiveViewIds[scope] || null;
  const saveView = useCardViewStore((s) => s.saveView);
  const deleteView = useCardViewStore((s) => s.deleteView);
  const renameView = useCardViewStore((s) => s.renameView);
  const setActiveView = useCardViewStore((s) => s.setActiveView);

  const [menuOpen, setMenuOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const activeView = savedViews.find((v) => v.id === activeViewId);

  const handleSave = () => {
    if (!newName.trim()) return;
    const id = `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    saveView({ id, name: newName.trim(), scope, filters: { ...currentFilters } });
    setNewName('');
    setMenuOpen(false);
  };

  const handleLoad = (view: SavedCardView) => {
    setActiveView(scope, view.id);
    onLoadView(view.filters);
    setMenuOpen(false);
  };

  const handleClearView = () => {
    setActiveView(scope, null);
    setMenuOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
      >
        <FloppyDisk size={14} weight="bold" />
        View: {activeView?.name || 'Default'}
        <CaretDown size={10} weight="bold" />
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-10 z-[70] w-[260px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 animate-[fadeUp_0.15s_ease-out]">
          {/* Default view */}
          <button
            onClick={handleClearView}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-[12px] font-semibold text-left rounded-md bg-transparent border-none cursor-pointer ${!activeViewId ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]' : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'}`}
          >
            {!activeViewId && <Check size={12} weight="bold" />}
            <span className="flex-1">Default</span>
          </button>

          {/* Saved views */}
          {savedViews.map((v) => (
            <div key={v.id} className="flex items-center gap-1 group">
              {renameId === v.id ? (
                <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { renameView(v.id, renameVal.trim()); setRenameId(null); } if (e.key === 'Escape') setRenameId(null); }}
                  autoFocus className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--brand-primary)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
              ) : (
                <button
                  onClick={() => handleLoad(v)}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-[12px] font-semibold text-left rounded-md bg-transparent border-none cursor-pointer ${v.id === activeViewId ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]' : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'}`}
                >
                  {v.id === activeViewId && <Check size={12} weight="bold" />}
                  <span className="truncate flex-1">{v.name}</span>
                </button>
              )}
              {renameId !== v.id && (
                <>
                  <button onClick={() => { setRenameId(v.id); setRenameVal(v.name); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"><PencilSimple size={12} /></button>
                  <button onClick={() => setConfirmDeleteId(v.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"><Trash size={12} /></button>
                </>
              )}
            </div>
          ))}

          {/* Save current */}
          <div className="border-t border-[var(--border-subtle)] mt-2 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">Save current filters as</div>
            <div className="flex items-center gap-2 px-1.5">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="View name" className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]" />
              <button onClick={handleSave} className="h-7 px-2.5 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete saved view?"
        message={(() => {
          const v = savedViews.find((x) => x.id === confirmDeleteId);
          return v
            ? `This will permanently delete the "${v.name}" saved view. The underlying records are not affected.`
            : '';
        })()}
        confirmLabel="Delete view"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDeleteId) deleteView(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
