'use client';

type TabId = 'overview' | 'details' | 'orgchart' | 'documents';

interface DetailTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'orgchart', label: 'Org Chart' },
  { id: 'documents', label: 'Documents' },
];

export default function DetailTabs({ activeTab, onTabChange }: DetailTabsProps) {
  return (
    <div className="flex gap-6 px-6 bg-[var(--surface-card)] border-b border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`py-2.5 px-0.5 text-sm font-semibold border-b-2 transition-all duration-150 bg-transparent cursor-pointer ${
            activeTab === tab.id
              ? 'text-[var(--brand-primary)] border-[var(--brand-primary)] font-bold'
              : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
