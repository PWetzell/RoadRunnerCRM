'use client';

import { useState, useRef, useEffect } from 'react';
import { CaretDown, Plus, FloppyDisk, Trash, ArrowClockwise, Check, PencilSimple } from '@phosphor-icons/react';
import { WIDGET_META, WidgetCategory, WidgetType, InsertPosition } from '@/types/dashboard';

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  status: 'Status / KPIs', reporting: 'Reporting', list: 'Lists', work: 'Work', custom: 'Custom',
};

interface ViewItem {
  id: string;
  name: string;
  preset?: boolean;
}

interface Props {
  /** All available views. */
  views: ViewItem[];
  /** Currently active view ID. */
  activeViewId: string;
  /** Widget count for display. */
  widgetCount: number;
  onSwitchView: (id: string) => void;
  onSaveAs: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onAddWidget: (type: WidgetType, position?: InsertPosition) => void;
  /** Extra buttons to show after Add widget (e.g. Export, Print). */
  extraButtons?: React.ReactNode;
}

/**
 * Reusable view management toolbar. Same visual + interaction as the
 * main Dashboard toolbar. Accepts callbacks so it works with any
 * backing store (dashboard, reporting, admin).
 *
 * Shows: View picker · + Add widget · Reset · [extra buttons] · widget count
 */
export default function ViewToolbar({
  views, activeViewId, widgetCount,
  onSwitchView, onSaveAs, onRename, onDelete, onReset, onAddWidget,
  extraButtons,
}: Props) {
  const active = views.find((v) => v.id === activeViewId);

  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const viewRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewMenuOpen && !addMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewMenuOpen(false);
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [viewMenuOpen, addMenuOpen]);

  const handleSave = () => {
    if (!newViewName.trim()) return;
    onSaveAs(newViewName.trim());
    setNewViewName('');
    setViewMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-h-[26px] w-full">
      {/* View picker */}
      <div className="relative" ref={viewRef}>
        <button
          onClick={() => setViewMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <FloppyDisk size={14} weight="bold" />
          View: {active?.name || 'Default'}
          <CaretDown size={10} weight="bold" />
        </button>

        {viewMenuOpen && (
          <div className="absolute left-0 top-8 z-50 w-[280px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 animate-[fadeUp_0.15s_ease-out]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">Switch view</div>
            <div className="max-h-[200px] overflow-y-auto">
              {views.map((v) => (
                <div key={v.id} className="flex items-center gap-1 group">
                  {renameId === v.id ? (
                    <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { onRename(v.id, renameVal.trim()); setRenameId(null); } if (e.key === 'Escape') setRenameId(null); }}
                      autoFocus className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--brand-primary)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
                  ) : (
                    <button
                      onClick={() => { onSwitchView(v.id); setViewMenuOpen(false); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-[12px] font-semibold text-left rounded-md bg-transparent border-none cursor-pointer ${v.id === activeViewId ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]' : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'}`}
                    >
                      {v.id === activeViewId && <Check size={12} weight="bold" />}
                      <span className="truncate flex-1">{v.name}</span>
                      {v.preset && <span className="text-[9px] font-bold uppercase text-[var(--text-tertiary)]">Preset</span>}
                    </button>
                  )}
                  {!v.preset && renameId !== v.id && (
                    <>
                      <button onClick={() => { setRenameId(v.id); setRenameVal(v.name); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"><PencilSimple size={12} /></button>
                      <button onClick={() => onDelete(v.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"><Trash size={12} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border-subtle)] mt-2 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">Save current as</div>
              <div className="flex items-center gap-2 px-1.5">
                <input value={newViewName} onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="View name" className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]" />
                <button onClick={handleSave} className="h-7 px-2.5 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add widget */}
      <div className="relative" ref={addRef}>
        <button onClick={() => setAddMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md border cursor-pointer transition-all text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)] hover:opacity-90">
          <Plus size={14} weight="bold" /> Add widget
        </button>
        {addMenuOpen && (
          <div className="absolute left-0 top-8 z-50 w-[300px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 max-h-[400px] overflow-y-auto animate-[fadeUp_0.15s_ease-out]">
            {(['status', 'reporting', 'list', 'work'] as WidgetCategory[]).map((cat) => {
              const items = WIDGET_META.filter((m) => m.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">{CATEGORY_LABELS[cat]}</div>
                  {items.map((m) => (
                    <button key={m.type} onClick={() => { onAddWidget(m.type as WidgetType); setAddMenuOpen(false); }}
                      className="w-full flex flex-col items-start gap-0.5 px-2 py-1.5 rounded-md hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left">
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">{m.label}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{m.description}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset */}
      <button onClick={onReset}
        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
        <ArrowClockwise size={14} weight="bold" /> Reset
      </button>

      {extraButtons}

      <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
        {widgetCount} {widgetCount === 1 ? 'widget' : 'widgets'}
      </span>
    </div>
  );
}
