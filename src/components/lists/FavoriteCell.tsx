'use client';

import { useMemo } from 'react';
import { Star } from '@phosphor-icons/react';
import { useListStore } from '@/stores/list-store';
import { ListEntityType } from '@/types/list';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';

interface Props {
  entityId: string;
  entityType: ListEntityType;
  size?: number;
}

/**
 * Clickable star cell for data grids. Click toggles Favorites membership
 * silently (no dialog). Stops propagation to prevent row click handlers.
 */
export default function FavoriteCell({ entityId, entityType, size = 14 }: Props) {
  const memberships = useListStore((s) => s.memberships);
  const toggleFavorite = useListStore((s) => s.toggleFavorite);
  const favId = FAVORITES_LIST_IDS[entityType];
  const isFav = useMemo(
    () => memberships.some((m) => m.listId === favId && m.entityId === entityId),
    [memberships, favId, entityId],
  );

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(entityId, entityType);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
      aria-label={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
      aria-pressed={isFav}
      data-icon-keep-size="14"
      className="w-7 h-7 inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-transparent border-none cursor-pointer hover:bg-[var(--warning-bg)] transition-colors"
    >
      <Star
        size={size}
        weight={isFav ? 'fill' : 'regular'}
        className={isFav ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)] hover:text-[var(--warning)] transition-colors'}
      />
    </button>
  );
}
