'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContactWithEntries, ContactType } from '@/types/contact';
import { Note } from '@/types/note';
import { Relationship } from '@/types/relationship';
import { SEED_CONTACTS } from '@/lib/data/seed-contacts';
import { SEED_NOTES } from '@/lib/data/seed-notes';
import { SEED_RELATIONSHIPS } from '@/lib/data/seed-relationships';
import { uid } from '@/lib/utils';

type FilterType = 'all' | 'org' | 'person';
type SortDir = 'asc' | 'desc';
export type ContactsView = 'list' | 'card';

interface ContactStore {
  contacts: ContactWithEntries[];
  notes: Note[];
  relationships: Relationship[];
  filter: FilterType;
  view: ContactsView;
  search: string;
  sortField: string | null;
  sortDir: SortDir;

  // Contact Actions
  setFilter: (filter: FilterType) => void;
  setView: (v: ContactsView) => void;
  setSearch: (search: string) => void;
  toggleSort: (field: string) => void;
  addContact: (contact: ContactWithEntries) => void;
  updateContact: (id: string, updates: Partial<ContactWithEntries>) => void;
  deleteContact: (id: string) => void;
  getContact: (id: string) => ContactWithEntries | undefined;
  getFilteredContacts: () => ContactWithEntries[];

  // Note Actions
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  getNotesForContact: (contactId: string, relatedIds?: string[]) => Note[];

  // Relationship Actions
  addRelationship: (rel: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  getRelationshipsForContact: (contactId: string) => Relationship[];
}

export const useContactStore = create<ContactStore>()(
  persist(
    (set, get) => ({
  contacts: SEED_CONTACTS,
  notes: SEED_NOTES,
  relationships: SEED_RELATIONSHIPS,
  filter: 'all',
  view: 'list',
  search: '',
  sortField: null,
  sortDir: 'asc',

  setFilter: (filter) => set({ filter }),
  setView: (v) => set({ view: v }),
  setSearch: (search) => set({ search }),
  toggleSort: (field) => set((state) => ({
    sortField: field,
    sortDir: state.sortField === field && state.sortDir === 'asc' ? 'desc' : 'asc',
  })),

  addContact: (contact) => set((state) => ({
    contacts: [contact, ...state.contacts],
  })),

  updateContact: (id, updates) => set((state) => ({
    contacts: state.contacts.map((c) =>
      c.id === id ? { ...c, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : c
    ),
  })),

  deleteContact: (id) => set((state) => ({
    contacts: state.contacts.filter((c) => c.id !== id),
  })),

  getContact: (id) => get().contacts.find((c) => c.id === id),

  getFilteredContacts: () => {
    const { contacts, filter, search, sortField, sortDir } = get();
    let list = [...contacts];

    if (filter !== 'all') {
      list = list.filter((c) => c.type === filter);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        ('industry' in c ? (c.industry || '').toLowerCase().includes(q) : false) ||
        ('title' in c ? (c.title || '').toLowerCase().includes(q) : false) ||
        ('orgName' in c ? (c.orgName || '').toLowerCase().includes(q) : false)
      );
    }

    if (sortField) {
      list.sort((a, b) => {
        const aVal = String((a as unknown as Record<string, unknown>)[sortField] || '');
        const bVal = String((b as unknown as Record<string, unknown>)[sortField] || '');
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  },

  // Note actions
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),

  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => n.id === id ? { ...n, ...updates } : n),
  })),

  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
  })),

  togglePinNote: (id) => set((state) => ({
    notes: state.notes.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n),
  })),

  getNotesForContact: (contactId, relatedIds = []) => {
    const allIds = [contactId, ...relatedIds];
    return get().notes.filter((n) => allIds.includes(n.contactId));
  },

  // Relationship actions
  addRelationship: (rel) => set((state) => ({ relationships: [rel, ...state.relationships] })),

  updateRelationship: (id, updates) => set((state) => ({
    relationships: state.relationships.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),

  deleteRelationship: (id) => set((state) => ({
    relationships: state.relationships.filter((r) => r.id !== id),
  })),

  getRelationshipsForContact: (contactId) => {
    return get().relationships.filter((r) => r.fromContactId === contactId || r.toContactId === contactId);
  },
    }),
    {
      name: 'roadrunner-contacts',
      partialize: (s) => ({
        contacts: s.contacts,
        notes: s.notes,
        relationships: s.relationships,
      }),
    }
  )
);
