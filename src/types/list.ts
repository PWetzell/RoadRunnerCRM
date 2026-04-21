/**
 * Saved Lists (aka favorites / static lists).
 *
 * A list is a user-created grouping of records of a single entity type.
 * Contacts, deals, and documents each have their own lists (you can't
 * mix contacts and deals in one list). Public lists appear in the
 * sidebar as nav shortcuts; private lists are only accessible via the
 * star menu on detail pages.
 */

export type ListEntityType = 'contact' | 'deal' | 'document';

export type ListVisibility = 'public' | 'private';

export interface SavedList {
  id: string;
  name: string;
  entityType: ListEntityType;
  visibility: ListVisibility;
  /** Optional user-chosen color for the sidebar badge / icon tint. */
  color?: string;
  /** If true, this list appears as a shortcut in the sidebar's "Saved Lists" section.
   *  Independent of visibility — a private list can still be pinned for personal
   *  quick-access; a public list can be un-pinned if the user doesn't use it. */
  pinnedInSidebar?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListMembership {
  listId: string;
  entityId: string;
  entityType: ListEntityType;
  addedAt: string;
}

/** Metadata for labeling / filtering across entity types. */
export const LIST_ENTITY_META: Record<ListEntityType, { label: string; pluralLabel: string; route: string }> = {
  contact:  { label: 'Contact',  pluralLabel: 'Contacts',  route: '/contacts' },
  deal:     { label: 'Deal',     pluralLabel: 'Deals',     route: '/sales' },
  document: { label: 'Document', pluralLabel: 'Documents', route: '/documents' },
};
