'use client';

import { useEffect, useRef } from 'react';
import {
  X, Plus, Bookmark, Users, CurrencyDollar, File, ListBullets, Gear,
} from '@phosphor-icons/react';
import { useListStore } from '@/stores/list-store';
import { ListEntityType, LIST_ENTITY_META } from '@/types/list';

const TYPE_ICON: Record<ListEntityType, typeof Users> = {
  contact: Users,
  deal: CurrencyDollar,
  document: File,
};

/**
 * Compact dropdown opened from the sidebar's "Saved Lists" gear icon.
 *
 * Lets the user toggle which lists appear as sidebar shortcuts — totally
 * independent of the list's visibility (public/private). A private list
 * can still be pinned for quick access; a public list can be un-pinned.
 *
 * Footer links to the full "Manage all lists" modal for rename / delete /
 * color edits, and a "Create new list" call-to-action at the top.
 */
export default function PinListsDropdown({
  open,
  onClose,
  anchorRect,
}: {
  open: boolean;
  onClose: () => void;
  /** Optional anchor position so the dropdown lands next to the gear icon. */
  anchorRect?: DOMRect;
}) {
  const lists = useListStore((s) => s.lists);
  const toggleSidebarPin = useListStore((s) => s.toggleSidebarPin);
  const openManage = useListStore((s) => s.openManage);

  const ref = useRef<HTMLDivElement>(null);

  // Click-outside closes
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    // setTimeout to avoid closing immediately on the same click that opened it
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const grouped: Record<ListEntityType, typeof lists> = {
    contact: lists.filter((l) => l.entityType === 'contact'),
    deal: lists.filter((l) => l.entityType === 'deal'),
    document: lists.filter((l) => l.entityType === 'document'),
  };
  const pinnedCount = lists.filter((l) => l.pinnedInSidebar).length;

  // Anchor positioning — prefer below the gear icon; flip above when not enough room.
  // Always clamp to stay inside the viewport with a safe margin.
  const MARGIN = 12;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const spaceBelow = anchorRect ? vh - anchorRect.bottom - MARGIN : 400;
  const spaceAbove = anchorRect ? anchorRect.top - MARGIN : 200;
  const openAbove = anchorRect ? spaceBelow < 260 && spaceAbove > spaceBelow : false;
  const maxDropdownHeight = Math.max(220, Math.min(500, openAbove ? spaceAbove : spaceBelow));

  const style: React.CSSProperties = anchorRect
    ? openAbove
      ? {
          position: 'fixed',
          bottom: Math.max(8, vh - anchorRect.top + 4),
          left: Math.max(8, anchorRect.left),
          zIndex: 200,
          maxHeight: maxDropdownHeight,
        }
      : {
          position: 'fixed',
          top: Math.max(8, anchorRect.bottom + 4),
          left: Math.max(8, anchorRect.left),
          zIndex: 200,
          maxHeight: maxDropdownHeight,
        }
    : {
        position: 'fixed',
        top: 80,
        left: 230,
        zIndex: 200,
        maxHeight: maxDropdownHeight,
      };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pin lists to sidebar"
      className="w-[300px] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-2xl animate-[fadeUp_0.15s_ease-out] overflow-hidden flex flex-col"
      style={style}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <Bookmark size={14} weight="fill" className="text-[var(--brand-primary)]" />
        <div className="flex-1">
          <div className="text-[12px] font-extrabold text-[var(--text-primary)]">Show in sidebar</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            {pinnedCount} of {lists.length} pinned
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* Grouped list with toggles */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 gap-2">
            <ListBullets size={24} weight="duotone" className="text-[var(--text-tertiary)]" />
            <div className="text-[12px] font-bold text-[var(--text-secondary)]">No lists yet</div>
          </div>
        ) : (
          (['contact', 'deal', 'document'] as ListEntityType[]).map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const TypeIcon = TYPE_ICON[type];
            return (
              <div key={type} className="py-1">
                <div className="flex items-center gap-1.5 px-4 pt-1 pb-1">
                  <TypeIcon size={10} weight="fill" className="text-[var(--text-tertiary)]" />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {LIST_ENTITY_META[type].pluralLabel}
                  </span>
                </div>
                {items.map((list) => {
                  const isPinned = !!list.pinnedInSidebar;
                  return (
                    <label
                      key={list.id}
                      className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-[var(--surface-raised)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={() => toggleSidebarPin(list.id)}
                        className="w-4 h-4 rounded accent-[var(--brand-primary)] cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{list.name}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Footer — access to full manage dialog */}
      <div className="flex-shrink-0 border-t border-[var(--border)] px-3 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => { openManage(); onClose(); }}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
        >
          <Gear size={11} weight="bold" />
          Manage all lists…
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-7 px-3 rounded-[var(--radius-sm)] text-[11px] font-extrabold text-white bg-[var(--brand-primary)] border-none cursor-pointer hover:brightness-110"
        >
          Done
        </button>
      </div>
    </div>
  );
}
