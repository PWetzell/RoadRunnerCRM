'use client';

import { useContactStore } from '@/stores/contact-store';
import SearchInput from '@/components/ui/SearchInput';

export default function ContactSearchBar() {
  const search = useContactStore((s) => s.search);
  const setSearch = useContactStore((s) => s.setSearch);

  return (
    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Search contacts…"
      ariaLabel="Search contacts"
      size="md"
      className="flex-1 max-w-xs ml-5"
    />
  );
}
