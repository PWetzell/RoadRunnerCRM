'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContactWithEntries, ContactType } from '@/types/contact';
import { Note } from '@/types/note';
import { Relationship } from '@/types/relationship';
import { Task } from '@/types/task';
import { SEED_CONTACTS } from '@/lib/data/seed-contacts';
import { SEED_NOTES } from '@/lib/data/seed-notes';
import { SEED_RELATIONSHIPS } from '@/lib/data/seed-relationships';
import { SEED_TASKS } from '@/lib/data/seed-tasks';
import { uid } from '@/lib/utils';

type FilterType = 'all' | 'org' | 'person';
type SortDir = 'asc' | 'desc';
export type ContactsView = 'list' | 'card';

interface ContactStore {
  contacts: ContactWithEntries[];
  notes: Note[];
  relationships: Relationship[];
  tasks: Task[];
  /**
   * Email IDs the user has opened in the seed-email demo path. The seed
   * has a static `readAt: null` convention baked in at module load; without
   * this override, reading an email in EmailsPanel only touches local
   * React state — so the tab badge + contacts-grid chips never clear, and
   * reopening the contact re-surfaces every "read" email as unread again.
   * Persisted so reads survive navigation and page reloads, matching the
   * Gmail/Outlook expectation that "once read, stays read".
   */
  emailReadOverrides: string[];
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

  // Task Actions
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  getTasksForContact: (contactId: string) => Task[];

  // Email read-override actions — see `emailReadOverrides` docstring above.
  markEmailRead: (emailId: string) => void;
  markEmailUnread: (emailId: string) => void;

  /**
   * Hydrate the store with the full seed dataset (170 contacts + notes +
   * relationships + tasks). Called by AuthGate when a signed-in user
   * matches the demo whitelist. Replaces any existing data — demo mode
   * means demo data, full stop.
   */
  seedDemoData: () => void;
  /**
   * Wipe all user-facing collections back to empty. Called when a
   * non-demo user signs in (so they don't inherit demo data left in
   * localStorage from a prior session) and on sign-out (so the next
   * user's first paint is clean).
   *
   * `emailReadOverrides` is also cleared because those IDs are scoped to
   * the previous account's email IDs and would just be dead weight.
   */
  clearAll: () => void;
}

export const useContactStore = create<ContactStore>()(
  persist(
    (set, get) => ({
  // Initial state is intentionally empty — see `seed-vs-empty` rationale
  // in `lib/auth/demo-accounts.ts`. Demo accounts get populated via
  // `seedDemoData()` from AuthGate; real accounts stay empty until they
  // import from Gmail or add contacts manually.
  contacts: [],
  notes: [],
  relationships: [],
  tasks: [],
  emailReadOverrides: [],
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

  /**
   * Updates Zustand state immediately (optimistic), then fires a PATCH to
   * /api/contacts/[id] for any DB-backed fields touched by `updates`.
   *
   * Why fire-and-forget rather than awaiting:
   * Most call sites (tag toggling, card pin/hide, avatar color, visibility)
   * touch UI-only fields that have no DB column. Awaiting an API call from
   * those sites would either (a) make every UI interaction wait on a
   * round-trip we don't actually need, or (b) require us to refactor 20+
   * call sites to know which fields persist. Instead we filter the update
   * to the persistable subset here and fire the network call without
   * blocking the UI. If it fails, we surface a non-blocking error toast
   * but don't roll back the local state — the local state IS the source of
   * truth for non-DB fields, and rolling back DB-backed fields after the
   * user has already seen them update would be more confusing than helpful.
   *
   * Persistable fields are the ones that match the columns in the
   * `contacts` table: name, email, phone, type, orgName (org_name), title.
   * Everything else (tags, isPrivate, visibleTo, overviewCards,
   * hiddenCards, overviewLeftOrder, avatarColor, entries, status, stale,
   * aiStatus) lives in Zustand/localStorage by design — adding columns
   * for them is a separate migration.
   */
  updateContact: (id, updates) => {
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : c
      ),
    }));

    // Skip the network call for seed/demo contacts — they're not in the
    // DB, so a PATCH would 404 with `not_found` and clutter the console.
    // Real contacts come from /api/contacts as UUIDs; demo seeds use
    // short ids like "per-90", "org-12".
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return;

    const persistable: Record<string, unknown> = {};
    if ('name' in updates) persistable.name = (updates as Record<string, unknown>).name;
    if ('type' in updates) persistable.type = (updates as Record<string, unknown>).type;
    if ('email' in updates) persistable.email = (updates as Record<string, unknown>).email;
    if ('phone' in updates) persistable.phone = (updates as Record<string, unknown>).phone;
    if ('orgName' in updates) persistable.orgName = (updates as Record<string, unknown>).orgName;
    if ('title' in updates) persistable.title = (updates as Record<string, unknown>).title;

    if (Object.keys(persistable).length === 0) return;

    fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persistable),
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({} as { error?: string }));
          throw new Error(body.error || `PATCH failed (${r.status})`);
        }
      })
      .catch((e) => {
        // Best-effort surface — we can't import the toast helper at the
        // module level (it lives outside the store), so we log + rely on
        // the network panel for now. Call sites that want loud failure
        // can wrap their own try/catch around the fetch directly.
        console.warn('[contact-store] PATCH /api/contacts/' + id + ' failed:', e);
      });
  },

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

  // Task actions
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),

  toggleTaskDone: (id) => set((state) => ({
    tasks: state.tasks.map((t) => {
      if (t.id !== id) return t;
      const done = !t.done;
      return {
        ...t,
        done,
        completedAt: done ? new Date().toISOString() : null,
      };
    }),
  })),

  getTasksForContact: (contactId) =>
    get().tasks.filter((t) => t.contactId === contactId),

  // Idempotent — dedupes so the array doesn't grow on repeat expansions.
  markEmailRead: (emailId) => set((state) => (
    state.emailReadOverrides.includes(emailId)
      ? state
      : { emailReadOverrides: [...state.emailReadOverrides, emailId] }
  )),

  markEmailUnread: (emailId) => set((state) => ({
    emailReadOverrides: state.emailReadOverrides.filter((id) => id !== emailId),
  })),

  /**
   * Hydrate the demo dataset WITHOUT clobbering user edits already in
   * localStorage.
   *
   * The bug this fixes: AuthGate calls `seedDemoData()` on every auth event
   * — including the initial `getUser()` fired on each page load. The old
   * implementation `set({ contacts: SEED_CONTACTS, ... })` replaced the
   * persisted contacts array wholesale, so any edit a demo user made
   * (e.g. typing a website on Holly's Details tab) survived the persist
   * round-trip into localStorage but was overwritten the next time the
   * page mounted. From the user's POV: "I added a website, refreshed,
   * and it disappeared."
   *
   * Fix v2: simple guard. If state.contacts has any data, bail. The
   * persist middleware has already rehydrated the user's working set
   * from localStorage by the time this runs (AuthGate calls it inside
   * a Promise.then off supabase.auth.getUser, well after the persist
   * hydration microtask). So "state has data" means "rehydrated, leave
   * alone." We only seed on a true cold start (empty store, post-clearAll
   * or first-ever sign-in).
   *
   * Earlier merge-by-id approach was correct in theory but had a subtle
   * race: if seedDemoData fires before persist hydration completes, the
   * merge sees state.contacts as [] and falls through to pure SEED_CONTACTS,
   * which the persist middleware then writes BACK to localStorage,
   * permanently wiping the user's edits. Skipping the merge entirely
   * when state has data avoids that failure mode.
   *
   * To start fresh from seeds, sign out — `clearAll()` empties everything,
   * then the next sign-in re-seeds cleanly.
   */
  seedDemoData: () => set((state) => {
    // Fast path: if the user already has any contacts in state, the
    // localStorage already contains their working dataset (seed contacts
    // with their edits + any user-added contacts). Don't touch ANYTHING.
    // Re-running the merge here is theoretically a no-op but in practice
    // any subtle bug in the merge logic — or any race with persist
    // hydration — would silently overwrite user data. The "I added a
    // website, refreshed, it disappeared" bug is exactly that scenario.
    // Belt-and-suspenders: just bail early.
    if (state.contacts.length > 0) return state;

    // Cold start (empty store) — paint the full seed dataset in. This
    // handles the very first sign-in and post-`clearAll` re-seeding.
    return {
      contacts: SEED_CONTACTS,
      notes: state.notes.length ? state.notes : SEED_NOTES,
      relationships: state.relationships.length ? state.relationships : SEED_RELATIONSHIPS,
      tasks: state.tasks.length ? state.tasks : SEED_TASKS,
      emailReadOverrides: state.emailReadOverrides,
    };
  }),

  clearAll: () => set({
    contacts: [],
    notes: [],
    relationships: [],
    tasks: [],
    emailReadOverrides: [],
  }),
    }),
    {
      // Bumped v6 → v7 with the demo-vs-real-account split. The previous
      // v6 cache held SEED_CONTACTS for every user (because the store's
      // initial state was the seed array); under v7 the initial state is
      // empty and seed data is hydrated on demand for demo accounts only.
      // Bumping the cache name is the simplest cache-bust — every browser
      // discards its v6 entry and starts fresh under v7. One-time UX cost
      // (anyone who had locally-modified demo data loses it) in exchange
      // for not having stale 170-contact lists leak into real accounts.
      name: 'roadrunner-contacts-v7',
      partialize: (s) => ({
        contacts: s.contacts,
        notes: s.notes,
        relationships: s.relationships,
        tasks: s.tasks,
        emailReadOverrides: s.emailReadOverrides,
      }),
    }
  )
);
