'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';

export default function SalesSearchBar() {
  const search = useSalesStore((s) => s.search);
  const setSearch = useSalesStore((s) => s.setSearch);

  return (
    <div className="flex-1 max-w-xs ml-5 relative">
      <MagnifyingGlass
        size={16}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
      />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search deals…"
        className="w-full h-[34px] pl-9 pr-3 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-raised)] outline-none transition-all focus:border-[var(--brand-primary)] focus:bg-[var(--surface-card)] focus:shadow-[0_0_0_3px_var(--brand-bg)] placeholder:text-[var(--text-tertiary)]"
      />
    </div>
  );
}
