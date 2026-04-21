'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SavedList, ListMembership, ListEntityType, ListVisibility } from '@/types/list';
import { SEED_LISTS, SEED_MEMBERSHIPS, FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';

interface ListStore {
  lists: SavedList[];
  memberships: ListMembership[];

  // UI state
  pickerOpen: boolean;
  pickerEntityId: string | null;
  pickerEntityType: ListEntityType | null;
  manageOpen: boolean;

  // Picker / Manage dialog actions
  openPicker: (entityId: string, entityType: ListEntityType) => void;
  closePicker: () => void;
  openManage: () => void;
  closeManage: () => void;

  // List CRUD
  createList: (input: { name: string; entityType: ListEntityType; visibility: ListVisibility; color?: string }) => SavedList;
  updateList: (id: string, patch: Partial<Pick<SavedList, 'name' | 'visibility' | 'color' | 'pinnedInSidebar'>>) => void;
  deleteList: (id: string) => void;
  /** Toggle whether a list is pinned as a sidebar shortcut. */
  toggleSidebarPin: (id: string) => void;

  // Membership CRUD
  addToList: (listId: string, entityId: string, entityType: ListEntityType) => void;
  removeFromList: (listId: string, entityId: string) => void;
  toggleMembership: (listId: string, entityId: string, entityType: ListEntityType) => void;

  /**
   * Star action: toggles membership in the Favorites list (creating the list
   * if missing). Does NOT open the picker — just a silent quick-favorite.
   * Use openPicker separately for full list management.
   */
  toggleFavorite: (entityId: string, entityType: ListEntityType) => void;

  /** True if the entity is in its entity-type's Favorites list. */
  isFavorite: (entityId: string, entityType: ListEntityType) => boolean;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useListStore = create<ListStore>()(
  persist(
    (set, get) => ({
      lists: SEED_LISTS,
      memberships: SEED_MEMBERSHIPS,

      pickerOpen: false,
      pickerEntityId: null,
      pickerEntityType: null,
      manageOpen: false,

      openPicker: (entityId, entityType) => set({
        pickerOpen: true,
        pickerEntityId: entityId,
        pickerEntityType: entityType,
        manageOpen: false,
      }),
      closePicker: () => set({ pickerOpen: false, pickerEntityId: null, pickerEntityType: null }),
      openManage: () => set({ manageOpen: true, pickerOpen: false }),
      closeManage: () => set({ manageOpen: false }),

      createList: ({ name, entityType, visibility, color }) => {
        const now = new Date().toISOString();
        const newList: SavedList = {
          id: uid('list'),
          name: name.trim(),
          entityType,
          visibility,
          color,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ lists: [newList, ...s.lists] }));
        return newList;
      },

      updateList: (id, patch) => set((s) => ({
        lists: s.lists.map((l) => l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l),
      })),

      toggleSidebarPin: (id) => set((s) => ({
        lists: s.lists.map((l) => l.id === id ? { ...l, pinnedInSidebar: !l.pinnedInSidebar, updatedAt: new Date().toISOString() } : l),
      })),

      deleteList: (id) => set((s) => ({
        lists: s.lists.filter((l) => l.id !== id),
        memberships: s.memberships.filter((m) => m.listId !== id),
      })),

      addToList: (listId, entityId, entityType) => set((s) => {
        // No-op if already a member
        if (s.memberships.some((m) => m.listId === listId && m.entityId === entityId)) return s;
        return {
          memberships: [
            ...s.memberships,
            { listId, entityId, entityType, addedAt: new Date().toISOString() },
          ],
        };
      }),

      removeFromList: (listId, entityId) => set((s) => ({
        memberships: s.memberships.filter((m) => !(m.listId === listId && m.entityId === entityId)),
      })),

      toggleMembership: (listId, entityId, entityType) => {
        const { memberships, addToList, removeFromList } = get();
        const exists = memberships.some((m) => m.listId === listId && m.entityId === entityId);
        if (exists) removeFromList(listId, entityId);
        else addToList(listId, entityId, entityType);
      },

      toggleFavorite: (entityId, entityType) => {
        const state = get();
        const favId = FAVORITES_LIST_IDS[entityType];

        // Ensure the Favorites list exists (recreate if the user deleted it)
        const favExists = state.lists.some((l) => l.id === favId);
        if (!favExists) {
          const now = new Date().toISOString();
          const fav: SavedList = {
            id: favId,
            name: 'Favorites',
            entityType,
            visibility: 'private',
            color: '#D97706',
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ lists: [fav, ...s.lists] }));
        }

        // Toggle membership in Favorites (silently — no picker)
        state.toggleMembership(favId, entityId, entityType);
      },

      isFavorite: (entityId, entityType) => {
        const favId = FAVORITES_LIST_IDS[entityType];
        return get().memberships.some(
          (m) => m.listId === favId && m.entityId === entityId && m.entityType === entityType,
        );
      },
    }),
    {
      name: 'roadrunner-lists',
      partialize: (s) => ({
        lists: s.lists,
        memberships: s.memberships,
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<ListStore> | undefined;
        return {
          ...current,
          ...p,
          lists: p?.lists ?? SEED_LISTS,
          memberships: p?.memberships ?? SEED_MEMBERSHIPS,
        };
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/*  Selector helpers (use inside useMemo in components)                */
/* ------------------------------------------------------------------ */

export function getListsForEntity(
  lists: SavedList[],
  memberships: ListMembership[],
  entityId: string,
  entityType: ListEntityType,
): SavedList[] {
  const listIds = new Set(
    memberships
      .filter((m) => m.entityId === entityId && m.entityType === entityType)
      .map((m) => m.listId),
  );
  return lists.filter((l) => listIds.has(l.id));
}

export function getListsByType(lists: SavedList[], entityType: ListEntityType): SavedList[] {
  return lists.filter((l) => l.entityType === entityType);
}

export function getEntityIdsInList(memberships: ListMembership[], listId: string): string[] {
  return memberships.filter((m) => m.listId === listId).map((m) => m.entityId);
}

export function getPublicLists(lists: SavedList[]): SavedList[] {
  return lists.filter((l) => l.visibility === 'public');
}

/** Lists the user has pinned as sidebar shortcuts. */
export function getSidebarPinnedLists(lists: SavedList[]): SavedList[] {
  return lists.filter((l) => l.pinnedInSidebar);
}

export function getListMemberCount(memberships: ListMembership[], listId: string): number {
  return memberships.filter((m) => m.listId === listId).length;
}
