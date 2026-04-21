'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Bookmark, X } from '@phosphor-icons/react';
import { useListStore } from '@/stores/list-store';
import { useMemo } from 'react';

/**
 * Banner shown above a page grid when the page is filtered by a list
 * (via the `?list=<id>` search param). Clicking the X clears the filter.
 */
export default function ListFilterChip() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const lists = useListStore((s) => s.lists);

  const list = useMemo(() => lists.find((l) => l.id === listId), [lists, listId]);

  if (!list) return null;

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('list');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-[var(--radius-sm)] bg-[var(--brand-bg)] border border-[var(--brand-primary)]">
      <Bookmark size={12} weight="fill" className="text-[var(--brand-primary)] flex-shrink-0" />
      <span className="text-[11px] font-bold text-[var(--brand-primary)]">
        Filtered by list: <span className="font-extrabold">{list.name}</span>
      </span>
      <div className="flex-1" />
      <button
        onClick={clearFilter}
        title="Clear filter"
        aria-label="Clear list filter"
        className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 bg-transparent border-none cursor-pointer transition-colors"
      >
        <X size={10} weight="bold" />
      </button>
    </div>
  );
}
