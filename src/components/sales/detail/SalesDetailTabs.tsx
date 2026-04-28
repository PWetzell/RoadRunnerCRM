'use client';

export type SalesTabId = 'overview' | 'details' | 'qualify' | 'documents';

interface Props {
  activeTab: SalesTabId;
  onTabChange: (tab: SalesTabId) => void;
}

const TABS: { id: SalesTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'qualify', label: 'Qualify' },
  { id: 'documents', label: 'Documents' },
];

export default function SalesDetailTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex gap-4 px-6 bg-[var(--surface-card)] border-b border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`py-1.5 px-0.5 text-[10.5px] font-semibold border-b-2 transition-all duration-150 bg-transparent cursor-pointer ${
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
