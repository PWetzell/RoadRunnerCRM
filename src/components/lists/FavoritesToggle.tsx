'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Star } from '@phosphor-icons/react';

/**
 * Small pill button that toggles the `?fav=1` URL param to show only
 * favorited records in the current page's grid.
 */
export default function FavoritesToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get('fav') === '1';

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (active) params.delete('fav');
    else params.set('fav', '1');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <button
      onClick={toggle}
      title={active ? 'Show all records' : 'Show favorites only'}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer border transition-colors ${
        active
          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] hover:brightness-110'
          : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
      }`}
    >
      <Star size={12} weight={active ? 'fill' : 'regular'} />
      Favorites
    </button>
  );
}
