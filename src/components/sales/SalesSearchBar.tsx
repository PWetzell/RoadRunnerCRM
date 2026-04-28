'use client';

import { useSalesStore } from '@/stores/sales-store';
import SearchInput from '@/components/ui/SearchInput';

export default function SalesSearchBar() {
  const search = useSalesStore((s) => s.search);
  const setSearch = useSalesStore((s) => s.setSearch);

  return (
    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Search deals…"
      ariaLabel="Search deals"
      size="md"
      className="flex-1 max-w-xs ml-5"
    />
  );
}
