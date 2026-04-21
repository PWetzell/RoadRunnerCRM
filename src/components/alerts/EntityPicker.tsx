'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { User, CurrencyDollar, File, X, MagnifyingGlass } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useDocumentStore } from '@/stores/document-store';
import { EntityLink } from '@/types/alert';

interface EntityPickerProps {
  value?: EntityLink;
  onChange: (link: EntityLink | undefined) => void;
}

type EntityType = 'contact' | 'deal' | 'document';

const TYPE_META: { id: EntityType; label: string; icon: typeof User }[] = [
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'deal', label: 'Deal', icon: CurrencyDollar },
  { id: 'document', label: 'Document', icon: File },
];

export default function EntityPicker({ value, onChange }: EntityPickerProps) {
  const [entityType, setEntityType] = useState<EntityType | null>(value?.entityType ?? null);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const documents = useDocumentStore((s) => s.documents);

  // Click outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const results = useMemo(() => {
    if (!entityType || !query.trim()) return [];
    const q = query.toLowerCase();
    const max = 6;

    if (entityType === 'contact') {
      return contacts
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, max)
        .map((c) => ({
          entityType: 'contact' as const,
          entityId: c.id,
          entityName: c.name,
          href: `/contacts/${c.id}`,
          subtitle: c.type === 'person' ? 'Person' : 'Organization',
        }));
    }
    if (entityType === 'deal') {
      return deals
        .filter((d) => d.name.toLowerCase().includes(q))
        .slice(0, max)
        .map((d) => ({
          entityType: 'deal' as const,
          entityId: d.id,
          entityName: d.name,
          href: `/sales/${d.id}`,
          subtitle: `$${d.amount.toLocaleString()} · ${d.stage}`,
        }));
    }
    // document
    return documents
      .filter((d) => d.name.toLowerCase().includes(q))
      .slice(0, max)
      .map((d) => ({
        entityType: 'document' as const,
        entityId: d.id,
        entityName: d.name,
        href: '/documents',
        subtitle: d.category,
      }));
  }, [entityType, query, contacts, deals, documents]);

  const handleSelect = (r: typeof results[number]) => {
    onChange({ entityType: r.entityType, entityId: r.entityId, entityName: r.entityName, href: r.href });
    setQuery('');
    setDropdownOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setEntityType(null);
    setQuery('');
  };

  // If a value is selected, show it as a chip
  if (value) {
    const Icon = TYPE_META.find((t) => t.id === value.entityType)?.icon ?? File;
    return (
      <div className="flex items-center gap-2 h-[34px] px-2.5 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-raised)]">
        <Icon size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
        <span className="text-[12px] text-[var(--text-primary)] truncate flex-1">{value.entityName}</span>
        <button
          onClick={handleClear}
          className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer flex-shrink-0"
        >
          <X size={10} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Type selector */}
      <div className="flex gap-1 mb-1.5">
        {TYPE_META.map((t) => {
          const active = entityType === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setEntityType(t.id); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }}
              className={`flex-1 h-[28px] text-[10px] font-bold rounded-[var(--radius-sm)] border cursor-pointer flex items-center justify-center gap-1 transition-all ${
                active
                  ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
              }`}
            >
              <Icon size={11} weight={active ? 'fill' : 'regular'} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search input */}
      {entityType && (
        <div className="relative">
          <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
            onFocus={() => query.trim() && setDropdownOpen(true)}
            placeholder={`Search ${entityType}s...`}
            className="w-full h-[32px] pl-7 pr-2.5 border border-[var(--border)] rounded-[var(--radius-sm)] text-[12px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-primary)]"
          />

          {/* Dropdown results */}
          {dropdownOpen && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-lg z-10 max-h-[180px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.entityId}
                  onClick={() => handleSelect(r)}
                  className="w-full px-2.5 py-2 text-left flex flex-col border-none bg-transparent cursor-pointer hover:bg-[var(--surface-raised)]"
                >
                  <span className="text-[12px] text-[var(--text-primary)] truncate">{r.entityName}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{r.subtitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
