'use client';

import { useEffect, useRef, useState } from 'react';
import { Rows } from '@phosphor-icons/react';
import { useUserStore } from '@/stores/user-store';
import { DENSITY_LABELS, DENSITY_HINTS, GridDensity } from '@/lib/grid-density';

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
  const gridDensity = useUserStore((s) => s.gridDensity);
  const setGridDensity = useUserStore((s) => s.setGridDensity);
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const densityMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showDensityMenu) return;
    const onClick = (e: MouseEvent) => {
      if (densityMenuRef.current && !densityMenuRef.current.contains(e.target as Node)) setShowDensityMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showDensityMenu]);

  return (
    <div className="flex items-center gap-4 px-6 bg-[var(--surface-card)] border-b border-[var(--border)]">
      <div className="flex gap-6">
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

      <div className="relative" ref={densityMenuRef}>
        <button
          onClick={() => setShowDensityMenu(!showDensityMenu)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          title="Detail density"
        >
          <Rows size={14} weight="bold" /> Density
        </button>
        {showDensityMenu && (
          <div className="absolute left-0 top-8 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[70] w-[240px] py-2 animate-[fadeUp_0.15s_ease-out]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 px-3">Detail density</div>
            {(['compact', 'comfortable', 'spacious'] as GridDensity[]).map((d) => {
              const active = gridDensity === d;
              return (
                <button
                  key={d}
                  onClick={() => { setGridDensity(d); setShowDensityMenu(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-left bg-transparent border-none cursor-pointer ${
                    active ? 'bg-[var(--brand-bg)]' : 'hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-[var(--brand-primary)]' : 'bg-transparent border border-[var(--border-strong)]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12px] font-bold ${active ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>{DENSITY_LABELS[d]}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">{DENSITY_HINTS[d]}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
