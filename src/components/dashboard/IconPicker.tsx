'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { ICONS, searchIcons, getIcon } from '@/lib/phosphor-icons';
import { WIDGET_ICON_SUGGESTIONS } from '@/types/dashboard';
import { WidgetType } from '@/types/dashboard';

interface Props {
  /** Currently-selected icon name. */
  selectedName?: string;
  /** The widget's type — used to show a "Suggested for this widget" row. */
  widgetType?: WidgetType;
  /** Color applied to the icon preview. */
  color?: string;
  onPick: (name: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Icon picker with three zones:
 *   1. A "Suggested for this widget" row with 4–5 curated icons for the type
 *   2. A search input that filters the full curated catalog
 *   3. A grid of results (either filtered or the full catalog)
 *
 * Icons come from `@/lib/phosphor-icons` — a curated ~100-icon shortlist.
 * Expand that file to add more icons to the catalog.
 */
export default function IconPicker({ selectedName, widgetType, color, onPick, onClear, onClose }: Props) {
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => {
    const names = (widgetType && WIDGET_ICON_SUGGESTIONS[widgetType]) || [];
    return names
      .map((n) => ICONS.find((i) => i.name === n))
      .filter((x): x is (typeof ICONS)[number] => Boolean(x));
  }, [widgetType]);

  const results = useMemo(() => searchIcons(query, 120), [query]);

  return (
    <div className="w-[340px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-xl flex flex-col max-h-[480px]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0">
        <span className="text-[12px] font-extrabold text-[var(--text-primary)] flex-1">Choose icon</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pb-1.5">
            Suggested
          </div>
          <div className="grid grid-cols-6 gap-1">
            {suggestions.map((i) => {
              const isActive = selectedName === i.name;
              const Icon = i.Component;
              return (
                <button
                  key={i.name}
                  onClick={() => onPick(i.name)}
                  title={i.name}
                  aria-label={i.name}
                  className={`h-10 rounded-[var(--radius-sm)] flex items-center justify-center border cursor-pointer transition-all ${
                    isActive
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-bg)]'
                      : 'border-transparent hover:bg-[var(--surface-raised)] hover:border-[var(--border)]'
                  }`}
                >
                  <Icon size={20} weight="duotone" style={{ color: color || 'var(--text-secondary)' }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons (try 'chart', 'money', 'people')"
            className="w-full h-[32px] pl-8 pr-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-tertiary)]"
            autoFocus
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {results.length === 0 ? (
          <div className="text-[12px] italic text-[var(--text-tertiary)] py-4 text-center">
            No matches. Try a different search term.
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {results.map((i) => {
              const isActive = selectedName === i.name;
              const Icon = i.Component;
              return (
                <button
                  key={i.name}
                  onClick={() => onPick(i.name)}
                  title={i.name}
                  aria-label={i.name}
                  className={`h-9 rounded-[var(--radius-sm)] flex items-center justify-center border cursor-pointer transition-all ${
                    isActive
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-bg)]'
                      : 'border-transparent hover:bg-[var(--surface-raised)] hover:border-[var(--border)]'
                  }`}
                >
                  <Icon size={18} weight="regular" style={{ color: color || 'var(--text-secondary)' }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0">
        <div className="text-[10px] text-[var(--text-tertiary)]">
          {selectedName ? (
            <span>Current: <strong className="text-[var(--text-secondary)]">{selectedName}</strong></span>
          ) : (
            'Using default icon'
          )}
        </div>
        {selectedName && (
          <button
            onClick={onClear}
            className="text-[11px] font-bold text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

/** Re-export as a helper for callers that just want to render an icon by name. */
export { getIcon };
