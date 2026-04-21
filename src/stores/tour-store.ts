'use client';

import { create } from 'zustand';

interface TourStore {
  activeWalkthrough: string | null;
  walkthroughStep: number;
  setActiveWalkthrough: (key: string | null) => void;
  setWalkthroughStep: (step: number) => void;
  startTour: (key: string) => void;
  exitTour: () => void;
}

export const useTourStore = create<TourStore>()((set) => ({
  activeWalkthrough: null,
  walkthroughStep: 0,
  setActiveWalkthrough: (key) => set({ activeWalkthrough: key }),
  setWalkthroughStep: (step) => set({ walkthroughStep: step }),
  startTour: (key) => set({ activeWalkthrough: key, walkthroughStep: 0 }),
  exitTour: () => set({ activeWalkthrough: null, walkthroughStep: 0 }),
}));
