'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { EyeSlash } from '@phosphor-icons/react';

/**
 * Small pill button that toggles the `?private=1` URL param to show only
 * contacts marked as private in the current page's grid.
 *
 * Mirrors the FavoritesToggle pattern so List and Card views stay in sync
 * via the URL.
 */
export default function PrivateToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get('private') === '1';

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (active) params.delete('private');
    else params.set('private', '1');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <button
      onClick={toggle}
      title={active ? 'Show all contacts' : 'Show private contacts only'}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer border transition-colors ${
        active
          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] hover:brightness-110'
          : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
      }`}
    >
      <EyeSlash size={10} weight={active ? 'fill' : 'regular'} />
      Private
    </button>
  );
}
