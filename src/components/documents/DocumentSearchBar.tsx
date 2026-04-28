'use client';

import { useDocumentStore } from '@/stores/document-store';
import SearchInput from '@/components/ui/SearchInput';

export default function DocumentSearchBar() {
  const search = useDocumentStore((s) => s.search);
  const setSearch = useDocumentStore((s) => s.setSearch);

  return (
    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Search documents…"
      ariaLabel="Search documents"
      size="md"
      className="flex-1 max-w-xs ml-5"
    />
  );
}
