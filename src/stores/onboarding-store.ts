'use client';

import { create } from 'zustand';

/**
 * Controls the curated Gmail import wizard. Simple toggle — the modal is
 * mounted once globally (in the dashboard) and any surface that wants to
 * trigger the import calls `openImport()`.
 */
interface OnboardingStore {
  importOpen: boolean;
  openImport: () => void;
  closeImport: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  importOpen: false,
  openImport: () => set({ importOpen: true }),
  closeImport: () => set({ importOpen: false }),
}));
