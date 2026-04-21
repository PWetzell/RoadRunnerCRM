'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bookmark, CaretDown } from '@phosphor-icons/react';
import { LIST_ENTITY_META, ListEntityType } from '@/types/list';

/**
 * Shared pill that displays a contact / deal / document's list memberships.
 * Rendered in the detail header's tag row so it reads like any other tag.
 *
 *  - 1 list  → shows the list name inline; clicking routes to that list filter
 *  - 2+ lists → shows count + caret; click opens a popover listing each list
 *    (clickable to route to the filtered list view)
 */
export default function ListMembershipPill({
  lists,
}: {
  lists: Array<{ id: string; name: string; entityType: ListEntityType }>;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (lists.length === 0) return null;

  // Single list: show the name inline, clickable directly to that filter
  if (lists.length === 1) {
    const only = lists[0];
    const href = `${LIST_ENTITY_META[only.entityType].route}?list=${only.id}`;
    return (
      <Link
        href={href}
        title={`Go to list: ${only.name}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-[var(--brand-primary)] bg-[var(--brand-bg)] border border-[var(--brand-primary)] no-underline hover:brightness-105 transition-all max-w-[200px]"
      >
        <Bookmark size={11} weight="fill" className="flex-shrink-0" />
        <span className="truncate">{only.name}</span>
      </Link>
    );
  }

  // Multiple lists: show count + caret, open popover on click
  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-[var(--brand-primary)] bg-[var(--brand-bg)] border border-[var(--brand-primary)] cursor-pointer hover:brightness-105 transition-all"
      >
        <Bookmark size={11} weight="fill" />
        In {lists.length} lists
        <CaretDown size={9} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Member of these lists"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] max-w-[280px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-xl animate-[fadeUp_0.12s_ease-out] overflow-hidden"
        >
          <div className="px-3 pt-2.5 pb-1.5 border-b border-[var(--border)]">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">Member of</div>
            <div className="text-[12px] font-extrabold text-[var(--text-primary)]">
              {lists.length} list{lists.length === 1 ? '' : 's'}
            </div>
          </div>
          <ul className="flex flex-col py-1 max-h-[240px] overflow-y-auto">
            {lists.map((l) => (
              <li key={l.id}>
                <Link
                  href={`${LIST_ENTITY_META[l.entityType].route}?list=${l.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)] no-underline"
                >
                  <Bookmark size={11} weight="fill" className="text-[var(--brand-primary)] flex-shrink-0" />
                  <span className="truncate flex-1">{l.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
