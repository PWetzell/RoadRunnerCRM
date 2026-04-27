'use client';

import OnboardingImportModal from './OnboardingImportModal';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * Global mount point for the curated Gmail import wizard. Mounted once in
 * the root layout so any surface (dashboard auto-trigger, Gmail banner
 * button, Suggestions callout on Contacts page) can open it via the store.
 */
export default function OnboardingImportMount() {
  const importOpen = useOnboardingStore((s) => s.importOpen);
  const closeImport = useOnboardingStore((s) => s.closeImport);
  return <OnboardingImportModal open={importOpen} onClose={closeImport} />;
}
