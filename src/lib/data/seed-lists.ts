import { SavedList, ListMembership } from '@/types/list';

/**
 * Seed lists for the demo. These pre-populate the sidebar and the
 * star-menu pickers so first-time visitors immediately see the feature
 * working instead of empty states.
 */

export const SEED_LISTS: SavedList[] = [
  {
    id: 'list-contacts-portsmouth',
    name: 'Portsmouth Branch',
    entityType: 'contact',
    visibility: 'public',
    color: '#1955A6',
    pinnedInSidebar: true,
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-03-15T09:00:00Z',
  },
  {
    id: 'list-contacts-favorites',
    name: 'Favorites',
    entityType: 'contact',
    visibility: 'private',
    color: '#D97706',
    createdAt: '2026-03-20T09:00:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'list-deals-priority',
    name: 'High Priority Q2',
    entityType: 'deal',
    visibility: 'public',
    color: '#DC2626',
    pinnedInSidebar: true,
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 'list-deals-favorites',
    name: 'Favorites',
    entityType: 'deal',
    visibility: 'private',
    color: '#D97706',
    createdAt: '2026-03-20T09:00:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'list-docs-contracts',
    name: 'Client Contracts',
    entityType: 'document',
    visibility: 'public',
    color: '#059669',
    pinnedInSidebar: true,
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'list-docs-favorites',
    name: 'Favorites',
    entityType: 'document',
    visibility: 'private',
    color: '#D97706',
    createdAt: '2026-03-20T09:00:00Z',
    updatedAt: '2026-03-20T09:00:00Z',
  },
];

/** The well-known "Favorites" list IDs per entity type. Used for auto-add-to-favorites behavior. */
export const FAVORITES_LIST_IDS: Record<string, string> = {
  contact: 'list-contacts-favorites',
  deal: 'list-deals-favorites',
  document: 'list-docs-favorites',
};

export const SEED_MEMBERSHIPS: ListMembership[] = [
  // Portsmouth Branch
  { listId: 'list-contacts-portsmouth', entityId: 'org-1', entityType: 'contact', addedAt: '2026-03-15T09:00:00Z' },
  { listId: 'list-contacts-portsmouth', entityId: 'org-4', entityType: 'contact', addedAt: '2026-03-15T09:00:00Z' },
  { listId: 'list-contacts-portsmouth', entityId: 'per-1', entityType: 'contact', addedAt: '2026-03-16T09:00:00Z' },

  // My Favorites
  { listId: 'list-contacts-favorites', entityId: 'per-2', entityType: 'contact', addedAt: '2026-03-20T09:00:00Z' },
  { listId: 'list-contacts-favorites', entityId: 'per-3', entityType: 'contact', addedAt: '2026-03-21T09:00:00Z' },

  // High Priority Q2 (deals)
  { listId: 'list-deals-priority', entityId: 'deal-1', entityType: 'deal', addedAt: '2026-04-01T09:00:00Z' },
  { listId: 'list-deals-priority', entityId: 'deal-2', entityType: 'deal', addedAt: '2026-04-01T09:00:00Z' },
  { listId: 'list-deals-priority', entityId: 'deal-6', entityType: 'deal', addedAt: '2026-04-01T09:00:00Z' },

  // Deal Favorites
  { listId: 'list-deals-favorites', entityId: 'deal-1', entityType: 'deal', addedAt: '2026-04-02T09:00:00Z' },

  // Client Contracts (documents)
  { listId: 'list-docs-contracts', entityId: 'doc-1', entityType: 'document', addedAt: '2026-02-10T09:00:00Z' },
  { listId: 'list-docs-contracts', entityId: 'doc-8', entityType: 'document', addedAt: '2026-02-10T09:00:00Z' },

  // Document Favorites
  { listId: 'list-docs-favorites', entityId: 'doc-3', entityType: 'document', addedAt: '2026-02-15T09:00:00Z' },
];
