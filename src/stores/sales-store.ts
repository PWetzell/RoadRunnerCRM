'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Deal, DealStage } from '@/types/deal';
import { SEED_DEALS } from '@/lib/data/seed-deals';
import { useContactStore } from '@/stores/contact-store';
import { ContactTag } from '@/types/contact';

type StageFilter = 'all' | 'open' | 'won' | 'lost' | DealStage;
export type LeadTypeFilter = 'all' | 'person' | 'company';
type SortDir = 'asc' | 'desc';
export type SalesView = 'list' | 'status' | 'card';

export interface SalesSavedView {
  id: string;
  name: string;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  sortField: string | null;
  sortDir: SortDir;
}

interface SalesStore {
  deals: Deal[];
  view: SalesView;
  stageFilter: StageFilter;
  typeFilter: LeadTypeFilter;
  search: string;
  sortField: string | null;
  sortDir: SortDir;

  /** Per-stage custom header color (overrides STAGE_META.color for kanban). */
  stageColors: Partial<Record<DealStage, string>>;
  setStageColor: (stage: DealStage, color: string | undefined) => void;

  /** Saved view presets for the list grid. */
  savedViews: SalesSavedView[];
  activeSavedViewId: string | null;
  saveView: (v: SalesSavedView) => void;
  deleteView: (id: string) => void;
  setActiveSavedViewId: (id: string | null) => void;

  /** Column layout for the list grid. */
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  setColumnOrder: (order: string[]) => void;
  setColumnVisibility: (v: Record<string, boolean>) => void;
  setColumnWidths: (w: Record<string, number>) => void;

  setView: (v: SalesView) => void;

  setStageFilter: (f: StageFilter) => void;
  setTypeFilter: (f: LeadTypeFilter) => void;
  setSearch: (s: string) => void;
  toggleSort: (field: string) => void;

  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  getDeal: (id: string) => Deal | undefined;
  getFilteredDeals: () => Deal[];

  /** Convert a deal to closed-won AND tag the linked org as a Customer. */
  convertToCustomer: (dealId: string) => { ok: boolean; orgId?: string; orgName?: string };
}

const DEFAULT_COLUMN_ORDER = ['name', 'stage', 'priority', 'person', 'org', 'amount', 'lastComm', 'expectedCloseDate', 'source', 'owner', 'createdAt', 'lastUpdated', 'actions'];

export const useSalesStore = create<SalesStore>()(
  persist(
    (set, get) => ({
  deals: SEED_DEALS,
  view: 'list',
  stageFilter: 'all',
  typeFilter: 'all',
  search: '',
  sortField: null,
  sortDir: 'asc',

  stageColors: {},
  setStageColor: (stage, color) => set((s) => {
    const next = { ...s.stageColors };
    if (color === undefined) delete next[stage];
    else next[stage] = color;
    return { stageColors: next };
  }),

  savedViews: [],
  activeSavedViewId: null,
  saveView: (v) => set((s) => ({
    savedViews: s.savedViews.some((x) => x.id === v.id) ? s.savedViews.map((x) => x.id === v.id ? v : x) : [...s.savedViews, v],
    activeSavedViewId: v.id,
  })),
  deleteView: (id) => set((s) => ({
    savedViews: s.savedViews.filter((v) => v.id !== id),
    activeSavedViewId: s.activeSavedViewId === id ? null : s.activeSavedViewId,
  })),
  setActiveSavedViewId: (id) => set({ activeSavedViewId: id }),

  columnOrder: DEFAULT_COLUMN_ORDER,
  columnVisibility: { source: false, createdAt: false },
  columnWidths: {},
  setColumnOrder: (order) => set({ columnOrder: order }),
  setColumnVisibility: (v) => set({ columnVisibility: v }),
  setColumnWidths: (w) => set({ columnWidths: w }),

  setView: (v) => set({ view: v }),
  setStageFilter: (f) => set({ stageFilter: f }),
  setTypeFilter: (f) => set({ typeFilter: f }),
  setSearch: (s) => set({ search: s }),
  toggleSort: (field) => set((state) => ({
    sortField: field,
    sortDir: state.sortField === field && state.sortDir === 'asc' ? 'desc' : 'asc',
  })),

  addDeal: (deal) => set((s) => ({ deals: [deal, ...s.deals] })),

  updateDeal: (id, updates) => set((s) => ({
    deals: s.deals.map((d) => d.id === id ? { ...d, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : d),
  })),

  deleteDeal: (id) => set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),

  getDeal: (id) => get().deals.find((d) => d.id === id),

  getFilteredDeals: () => {
    const { deals, stageFilter, typeFilter, search, sortField, sortDir } = get();
    let list = [...deals];

    if (typeFilter !== 'all') {
      list = list.filter((d) => d.type === typeFilter);
    }

    if (stageFilter !== 'all') {
      if (stageFilter === 'open') list = list.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
      else if (stageFilter === 'won') list = list.filter((d) => d.stage === 'closed-won');
      else if (stageFilter === 'lost') list = list.filter((d) => d.stage === 'closed-lost');
      else list = list.filter((d) => d.stage === stageFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }

    if (sortField) {
      list.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortField];
        const bVal = (b as unknown as Record<string, unknown>)[sortField];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  },

  convertToCustomer: (dealId) => {
    const deal = get().deals.find((d) => d.id === dealId);
    if (!deal) return { ok: false };

    // Mark deal as Closed Won
    set((s) => ({
      deals: s.deals.map((d) => d.id === dealId
        ? { ...d, stage: 'closed-won' as DealStage, probability: 100, closedAt: new Date().toISOString().split('T')[0], lastUpdated: new Date().toISOString().split('T')[0] }
        : d
      ),
    }));

    // Tag the linked org as Customer (only for company leads with an org attached;
    // person-first leads between jobs have no org to tag).
    const contactStore = useContactStore.getState();
    const orgId = deal.orgContactId;
    const org = orgId ? contactStore.getContact(orgId) : undefined;
    if (orgId && org && org.type === 'org') {
      const tags = (org.tags || []) as ContactTag[];
      if (!tags.includes('Customer' as ContactTag)) {
        contactStore.updateContact(orgId, { tags: [...tags, 'Customer' as ContactTag] });
      }
    }

    return { ok: true, orgId: orgId, orgName: org?.name };
  },
    }),
    {
      name: 'roadrunner-sales',
      partialize: (s) => ({
        stageColors: s.stageColors,
        savedViews: s.savedViews,
        activeSavedViewId: s.activeSavedViewId,
        columnOrder: s.columnOrder,
        columnVisibility: s.columnVisibility,
        columnWidths: s.columnWidths,
      }),
    }
  )
);
