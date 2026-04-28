'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, ColumnDef, SortingState, ColumnOrderState, VisibilityState,
  ColumnFiltersState, ColumnPinningState, Header,
} from '@tanstack/react-table';
import {
  DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CaretUp, CaretDown, CaretRight,
  Funnel, X, DotsSixVertical, ArrowClockwise,
  Columns, FloppyDisk, Rows, PushPin, ArrowsHorizontal,
} from '@phosphor-icons/react';
import { useGridLayoutStore } from '@/stores/grid-layout-store';
import { useUserStore } from '@/stores/user-store';
import { densityStyle, DENSITY_LABELS, DENSITY_HINTS, GridDensity } from '@/lib/grid-density';
import SearchInput from '@/components/ui/SearchInput';

export type { ColumnDef, SortingState } from '@tanstack/react-table';

const EMPTY_WIDTHS: Record<string, number> = {};

// ─── Grid View Types ───
export interface GridView {
  id: string;
  name: string;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  columnVisibility: VisibilityState;
  sorting: SortingState;
}

// ─── SharedDataGrid Props ───
export interface SharedDataGridProps<T> {
  /** The pre-filtered data rows to display */
  data: T[];
  /** Column definitions -- tanstack ColumnDef<T>[] */
  columns: ColumnDef<T, any>[];
  /** Unique grid ID for persisting column widths in localStorage */
  gridId: string;
  /** Row click handler -- receives the row data */
  onRowClick?: (row: T) => void;
  /** Optional row className function for conditional styling (e.g., stalled row tint) */
  rowClassName?: (row: T) => string;
  /** Default sort state */
  defaultSorting?: SortingState;
  /** Item count label (e.g., "contacts", "deals", "candidates", "documents") */
  countLabel?: string;
  /** Optional actions column at the end -- receives row data, returns JSX */
  renderActions?: (row: T) => React.ReactNode;
  /** Optional: called when a group expand/collapse chevron is clicked (contacts only) */
  onToggleGroup?: (group: string) => void;
  /** Hide the built-in toolbar (View/Columns/Reset) when the parent provides its own */
  hideToolbar?: boolean;
}

// ─── Sortable Column Header ───
function SortableHeader({ header, columnWidths, onResize, onToggleGroup, pinStyle }: {
  header: Header<any, unknown>;
  columnWidths: Record<string, number>;
  onResize: (colId: string, width: number) => void;
  onToggleGroup?: (group: string) => void;
  pinStyle?: React.CSSProperties;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: header.id });
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    width: columnWidths[header.id] || header.getSize(),
    minWidth: 80,
    opacity: isDragging ? 0.5 : 1,
    position: pinStyle?.position ?? 'relative',
    paddingTop: 'var(--grid-header-py, 10px)',
    paddingBottom: 'var(--grid-header-py, 10px)',
    fontSize: 'var(--grid-header-font, 11px)',
    ...pinStyle,
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[header.id] || header.getSize();

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (ev.clientX - startX));
      onResize(header.id, newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const canSort = header.column.getCanSort();

  const isGroupedCol = !!(header.column.columnDef.meta as any)?.group;
  const expandableGroup = (header.column.columnDef.meta as any)?.expandable as string | undefined;

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        paddingLeft: 'var(--grid-row-px, 12px)',
        paddingRight: 'var(--grid-row-px, 12px)',
      }}
      className={`group/th text-left font-bold uppercase tracking-wider select-none border-b border-[var(--grid-header-border)] ${
        isGroupedCol
          ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-l border-l-[var(--brand-primary)]/20'
          : 'bg-[var(--grid-header-bg)] text-[var(--text-tertiary)]'
      }`}
    >
      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
        <span
          {...attributes}
          {...listeners}
          className={`flex items-center gap-1 cursor-grab min-w-0 ${canSort ? 'hover:text-[var(--text-primary)]' : ''}`}
          // If the column provides a custom `onSortClick` in its
          // metadata, use that instead of TanStack's default
          // toggleSorting handler. Lets the column manage its own
          // multi-state sort cycle (e.g. the contacts grid 📎 column
          // which has 3 modes — greens-first / grays-first /
          // em-dashes-first — that don't fit asc/desc). The custom
          // handler receives the column object so it can call
          // column.toggleSorting(true) itself to keep the down-arrow
          // indicator rendering.
          onClick={
            canSort
              ? (e) => {
                  const meta = header.column.columnDef.meta as { onSortClick?: (column: typeof header.column) => void } | undefined;
                  if (meta?.onSortClick) {
                    meta.onSortClick(header.column);
                  } else {
                    header.column.getToggleSortingHandler()?.(e);
                  }
                }
              : undefined
          }
        >
          <DotsSixVertical
            size={12}
            weight="bold"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex-shrink-0"
          />
          <span className="truncate min-w-0" title={String(header.column.columnDef.header ?? '')}>{flexRender(header.column.columnDef.header, header.getContext())}</span>
          {header.column.getIsSorted() === 'asc' && <CaretUp size={12} className="text-[var(--brand-primary)] flex-shrink-0" />}
          {header.column.getIsSorted() === 'desc' && <CaretDown size={12} className="text-[var(--brand-primary)] flex-shrink-0" />}
          {canSort && !header.column.getIsSorted() && (
            <CaretUp
              size={12}
              className="text-[var(--text-tertiary)] flex-shrink-0 opacity-0 group-hover/th:opacity-60 transition-opacity"
            />
          )}
        </span>

        {/* Column filter toggle (hidden when column has enableColumnFilter: false) */}
        {header.column.getCanFilter() && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setIsFiltering(!isFiltering); }}
            className={`ml-auto p-0.5 bg-transparent border-none cursor-pointer transition-colors ${
              header.column.getFilterValue() ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            <Funnel size={10} />
          </button>
        )}

        {/* Expand chevron -- collapsed group header */}
        {expandableGroup && onToggleGroup && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleGroup(expandableGroup); }}
            className="p-0.5 bg-transparent border-none cursor-pointer text-[var(--brand-primary)] hover:text-[var(--text-primary)] flex items-center"
            title={`Expand ${expandableGroup} by type`}
          >
            <CaretRight size={14} weight="bold" />
          </button>
        )}

        {/* Collapse chevron -- ONLY on last sub-column in group */}
        {isGroupedCol && (header.column.columnDef.meta as any)?.isLastInGroup && onToggleGroup && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleGroup((header.column.columnDef.meta as any).group); }}
            className="p-0.5 bg-transparent border-none cursor-pointer text-[var(--brand-primary)] hover:text-[var(--text-primary)] flex items-center"
            title="Collapse group"
          >
            <CaretRight size={14} weight="bold" className="rotate-180" />
          </button>
        )}
      </div>

      {/* Inline column filter — uses the shared SearchInput so filtering
           a column has the same clear-X affordance as page-level search. */}
      {isFiltering && (
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          <SearchInput
            value={(header.column.getFilterValue() as string) || ''}
            onChange={(next) => header.column.setFilterValue(next || undefined)}
            placeholder="Filter..."
            ariaLabel={`Filter ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : 'column'}`}
            size="xs"
            autoFocus
            stopKeyPropagation
          />
        </div>
      )}

      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleResizeStart}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--brand-primary)] transition-colors"
      />
    </th>
  );
}

// ─── Column Dropdown Row (drag + checkbox + pin + auto-size) ───
function ColumnDropdownRow({ id, label, visible, onToggle, pinned, onPin, onAutoSize }: {
  id: string; label: string; visible: boolean; onToggle: (e: unknown) => void;
  pinned: false | 'left' | 'right';
  onPin: (side: 'left' | 'right' | false) => void;
  onAutoSize: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: isDragging ? 'var(--surface-raised)' : undefined,
  };
  const pinBtn = (side: 'left' | 'right', title: string) => {
    const active = pinned === side;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onPin(active ? false : side); }}
        title={active ? `Unpin from ${side}` : `Pin ${side}`}
        aria-label={title}
        className={`w-5 h-5 inline-flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors ${
          active
            ? 'text-[var(--brand-primary)]'
            : 'text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)]'
        }`}
      >
        <PushPin size={11} weight={active ? 'fill' : 'regular'} className={side === 'right' ? 'scale-x-[-1]' : ''} />
      </button>
    );
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group flex items-center gap-1 px-1 py-1.5 rounded hover:bg-[var(--surface-raised)]"
    >
      <button
        {...listeners}
        aria-label={`Drag ${label}`}
        className="cursor-grab active:cursor-grabbing text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] bg-transparent border-none p-0 flex items-center"
      >
        <DotsSixVertical size={14} weight="bold" />
      </button>
      <label className="flex items-center gap-2 flex-1 text-[12px] text-[var(--text-primary)] cursor-pointer min-w-0">
        <input
          type="checkbox"
          checked={visible}
          onChange={onToggle as (e: React.ChangeEvent<HTMLInputElement>) => void}
          className="w-3.5 h-3.5 accent-[var(--brand-primary)]"
        />
        <span className="truncate">{label}</span>
      </label>
      {pinBtn('left', `Pin ${label} left`)}
      {pinBtn('right', `Pin ${label} right`)}
      <button
        onClick={(e) => { e.stopPropagation(); onAutoSize(); }}
        title="Auto-size (reset width)"
        className="opacity-0 group-hover:opacity-100 w-5 h-5 inline-flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
      >
        <ArrowsHorizontal size={11} weight="bold" />
      </button>
    </div>
  );
}

// ─── View Manager ───
function ViewMenu({ views, activeViewId, onLoad, onSave, onReset, onClose, onDelete }: {
  views: GridView[]; activeViewId: string | null;
  onLoad: (v: GridView) => void; onSave: (name: string) => void; onReset: () => void; onClose: () => void; onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-8 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[70] w-[220px] animate-[fadeUp_0.15s_ease-out]">
      <div className="p-2.5 border-b border-[var(--border)]">
        <div className="flex gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="View name..."
            className="flex-1 h-7 px-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <button
            onClick={() => { if (newName.trim()) { onSave(newName.trim()); setNewName(''); } }}
            disabled={!newName.trim()}
            className="px-2 py-1 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {views.length === 0 && (
          <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)]">No saved views</div>
        )}
        {views.map((v) => (
          <div key={v.id} className={`flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-raised)] cursor-pointer ${
            v.id === activeViewId ? 'bg-[var(--brand-bg)]' : ''
          }`}>
            <span onClick={() => onLoad(v)} className="text-[12px] text-[var(--text-primary)] flex-1">{v.name}</span>
            <button onClick={() => onDelete(v.id)} className="text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer p-0.5">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] p-2">
        <button onClick={onReset} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--brand-primary)]">
          Reset to default
        </button>
      </div>
    </div>
  );
}

// ─── Main SharedDataGrid Component ───
export default function SharedDataGrid<T>({
  data,
  columns,
  gridId,
  onRowClick,
  rowClassName,
  defaultSorting,
  countLabel,
  renderActions,
  onToggleGroup,
}: SharedDataGridProps<T>) {
  // Prevent SSR hydration mismatch from dnd-kit aria attributes
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentColumnIds = useMemo(() => columns.map((c) => c.id!), [columns]);

  const [sorting, setSorting] = useState<SortingState>(defaultSorting ?? []);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(currentColumnIds);

  // Sync column order when columns change (e.g. group expand/collapse)
  useEffect(() => {
    setColumnOrder((prev) => {
      const newIds = new Set(currentColumnIds);
      const result: string[] = [];
      const placed = new Set<string>();

      for (const id of prev) {
        if (newIds.has(id)) {
          result.push(id);
          placed.add(id);
        }
      }

      // Any remaining new columns not yet placed (safety net)
      for (const id of currentColumnIds) {
        if (!placed.has(id)) result.push(id);
      }

      return result;
    });
  }, [currentColumnIds]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const gridLayoutRaw = useGridLayoutStore((s) => s.grids[gridId]);
  const columnWidths = gridLayoutRaw?.columnWidths ?? EMPTY_WIDTHS;

  // Column pinning — hydrated from the persisted store so pins survive refreshes.
  const persistedPinning = gridLayoutRaw?.columnPinning ?? { left: [], right: [] };
  const setStoreColumnPinning = useGridLayoutStore((s) => s.setColumnPinning);
  const columnPinning: ColumnPinningState = persistedPinning;
  const setColumnPinning = useCallback((updater: ColumnPinningState | ((prev: ColumnPinningState) => ColumnPinningState)) => {
    // Read the latest value from the store (not the closure) so batched updates don't stomp each other.
    const current = useGridLayoutStore.getState().grids[gridId]?.columnPinning ?? { left: [], right: [] };
    const next = typeof updater === 'function' ? (updater as (p: ColumnPinningState) => ColumnPinningState)(current) : updater;
    setStoreColumnPinning(gridId, { left: next.left ?? [], right: next.right ?? [] });
  }, [setStoreColumnPinning, gridId]);

  // Density + zebra (global, per-user)
  const gridDensity = useUserStore((s) => s.gridDensity);
  const gridZebra = useUserStore((s) => s.gridZebra);
  const setGridDensity = useUserStore((s) => s.setGridDensity);
  const setGridZebra = useUserStore((s) => s.setGridZebra);

  // Saved views
  const [views, setViews] = useState<GridView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const densityMenuRef = useRef<HTMLDivElement>(null);

  // Close column menu on outside click
  useEffect(() => {
    if (!showColumnMenu) return;
    const handler = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColumnMenu]);

  // Close density menu on outside click
  useEffect(() => {
    if (!showDensityMenu) return;
    const handler = (e: MouseEvent) => {
      if (densityMenuRef.current && !densityMenuRef.current.contains(e.target as Node)) {
        setShowDensityMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDensityMenu]);

  const table = useReactTable({
    data,
    columns,
    defaultColumn: { minSize: 0 },
    state: { sorting, columnOrder, columnVisibility, columnFilters, columnPinning },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onColumnPinningChange: setColumnPinning,
    // Disable the 3rd-click "no sort" state across every grid using
    // this shared component. Without this, TanStack's default sort-
    // toggle cycle is desc → asc → no-sort, and on the 3rd click the
    // column falls back to the data array's natural (often mixed)
    // order — which Paul hit on 2026-04-28 and read as "sort broken
    // on the third click." With removal disabled, click cycles
    // cleanly between desc and asc forever.
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Compute total table width from visible column widths so the table doesn't stretch to fill container
  const tableWidth = useMemo(() => {
    const headers = table.getHeaderGroups()[0]?.headers || [];
    const total = headers.reduce((sum, h) => sum + (columnWidths[h.id] || h.getSize()), 0);
    return total + (renderActions ? 72 : 0);
  }, [table, columnWidths, renderActions]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const oldIdx = prev.indexOf(active.id as string);
        const newIdx = prev.indexOf(over.id as string);
        const updated = [...prev];
        updated.splice(oldIdx, 1);
        updated.splice(newIdx, 0, active.id as string);
        return updated;
      });
    }
  };

  const updateGridColWidth = useGridLayoutStore((s) => s.updateColumnWidth);
  const handleResize = useCallback((colId: string, width: number) => {
    updateGridColWidth(gridId, colId, width);
  }, [updateGridColWidth, gridId]);

  // Save view
  const saveView = (name: string) => {
    const view: GridView = {
      id: `view-${Date.now()}`,
      name,
      columnOrder,
      columnWidths,
      columnVisibility,
      sorting,
    };
    setViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
    setShowViewMenu(false);
  };

  const loadView = (view: GridView) => {
    setColumnOrder(view.columnOrder);
    useGridLayoutStore.getState().setColumnWidths(gridId, view.columnWidths);
    setColumnVisibility(view.columnVisibility);
    setSorting(view.sorting);
    setActiveViewId(view.id);
    setShowViewMenu(false);
  };

  const resetView = () => {
    setColumnOrder(currentColumnIds);
    useGridLayoutStore.getState().setColumnWidths(gridId, {});
    useGridLayoutStore.getState().setColumnPinning(gridId, { left: [], right: [] });
    setColumnVisibility({});
    setSorting(defaultSorting ?? []);
    setColumnFilters([]);
    setActiveViewId(null);
  };

  // "Auto-size" = drop width overrides so each column falls back to its configured getSize().
  // This is the TanStack-native analog of most grid libraries' "Fit to content" — without a
  // hidden measurement pass, the best neutral result is to reset to the column's declared width.
  const autoSizeAll = () => {
    useGridLayoutStore.getState().setColumnWidths(gridId, {});
  };
  const autoSizeOne = (colId: string) => {
    const next = { ...columnWidths };
    delete next[colId];
    useGridLayoutStore.getState().setColumnWidths(gridId, next);
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Grid Toolbar -- View first, then Columns, then Reset */}
      <div data-tour="grid-toolbar" className="flex items-center gap-2 flex-wrap min-h-[34px]">
        {/* Views -- FIRST */}
        <div className="relative" data-tour="grid-view-menu">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            <FloppyDisk size={14} weight="bold" /> View: {activeViewId ? views.find((v) => v.id === activeViewId)?.name : 'Default'}
          </button>
          {showViewMenu && (
            <ViewMenu
              views={views}
              activeViewId={activeViewId}
              onLoad={loadView}
              onSave={saveView}
              onReset={resetView}
              onClose={() => setShowViewMenu(false)}
              onDelete={(id) => { setViews((p) => p.filter((v) => v.id !== id)); if (activeViewId === id) setActiveViewId(null); }}
            />
          )}
        </div>

        {/* Column visibility toggle */}
        <div className="relative" ref={columnMenuRef} data-tour="grid-columns-menu">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            <Columns size={14} weight="bold" /> Columns
          </button>
          {showColumnMenu && (
            <div className="absolute right-0 top-8 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[70] w-[240px] max-h-[360px] overflow-y-auto py-2 px-2 animate-[fadeUp_0.15s_ease-out]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 px-1">Show / hide · drag to reorder</div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(ev) => {
                  const { active, over } = ev;
                  if (!over || active.id === over.id) return;
                  const ids = table.getAllLeafColumns().map((c) => c.id);
                  const oldIdx = ids.indexOf(active.id as string);
                  const newIdx = ids.indexOf(over.id as string);
                  if (oldIdx < 0 || newIdx < 0) return;
                  const next = [...ids];
                  const [moved] = next.splice(oldIdx, 1);
                  next.splice(newIdx, 0, moved);
                  table.setColumnOrder(next);
                }}
              >
                <SortableContext items={table.getAllLeafColumns().map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {table.getAllLeafColumns().map((column) => (
                    <ColumnDropdownRow
                      key={column.id}
                      id={column.id}
                      label={
                        (column.columnDef.meta as any)?.label
                          ?? (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id)
                      }
                      visible={column.getIsVisible()}
                      onToggle={column.getToggleVisibilityHandler()}
                      pinned={column.getIsPinned() as false | 'left' | 'right'}
                      onPin={(side) => column.pin(side)}
                      onAutoSize={() => autoSizeOne(column.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="mt-1 pt-1 border-t border-[var(--border-subtle)]">
                <button
                  onClick={autoSizeAll}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)] rounded bg-transparent border-none cursor-pointer"
                >
                  <ArrowsHorizontal size={12} weight="bold" /> Auto-size all columns
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Density + zebra */}
        <div className="relative" ref={densityMenuRef} data-tour="grid-density-menu">
          <button
            onClick={() => setShowDensityMenu(!showDensityMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            title="Row density"
          >
            <Rows size={14} weight="bold" /> Density
          </button>
          {showDensityMenu && (
            <div className="absolute right-0 top-8 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[70] w-[240px] py-2 animate-[fadeUp_0.15s_ease-out]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 px-3">Row density</div>
              {(['compact', 'comfortable', 'spacious'] as GridDensity[]).map((d) => {
                const active = gridDensity === d;
                return (
                  <button
                    key={d}
                    onClick={() => { setGridDensity(d); }}
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
              <div className="mt-1 pt-1 border-t border-[var(--border-subtle)] px-3">
                <label className="flex items-center justify-between py-1.5 text-[12px] text-[var(--text-primary)] cursor-pointer">
                  <span>Zebra striping</span>
                  <input
                    type="checkbox"
                    checked={gridZebra}
                    onChange={(e) => setGridZebra(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[var(--brand-primary)]"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={resetView}
          data-tour="grid-reset"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <ArrowClockwise size={14} weight="bold" /> Reset
        </button>

        {/* Count (right) */}
        {countLabel && (
          <span data-tour="grid-count" className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
            {data.length} {data.length === 1 ? countLabel.replace(/s$/, '') : countLabel}
          </span>
        )}
      </div>

      {/* Scrollable Table */}
      <div
        className="flex-1 overflow-auto bg-[var(--surface-card)] border border-[var(--border)] rounded-xl"
        style={densityStyle(gridDensity)}
        data-density={gridDensity}
        data-zebra={gridZebra ? 'on' : 'off'}
      >
        {mounted ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="border-collapse" style={{ tableLayout: 'fixed', width: tableWidth, minWidth: '100%' }}>
            <thead className="sticky top-0 z-10">
              <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                <tr data-tour="grid-header-row">
                  {table.getHeaderGroups()[0]?.headers.map((header) => {
                    const pinned = header.column.getIsPinned();
                    const pinStyle: React.CSSProperties = pinned === 'left'
                      ? { position: 'sticky', left: header.column.getStart('left'), zIndex: 11, background: 'var(--grid-header-bg)' }
                      : pinned === 'right'
                        ? { position: 'sticky', right: header.column.getAfter('right'), zIndex: 11, background: 'var(--grid-header-bg)' }
                        : {};
                    return (
                      <SortableHeader
                        key={header.id}
                        header={header}
                        columnWidths={columnWidths}
                        onResize={handleResize}
                        onToggleGroup={onToggleGroup}
                        pinStyle={pinStyle}
                      />
                    );
                  })}
                  {renderActions && (
                    <th
                      data-tour="grid-actions-col"
                      className="w-[72px] bg-[var(--grid-header-bg)] border-b border-[var(--grid-header-border)] border-l border-l-[var(--border-subtle)] text-left font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-3"
                      style={{
                        position: 'sticky',
                        right: 0,
                        zIndex: 12,
                        paddingTop: 'var(--grid-header-py, 10px)',
                        paddingBottom: 'var(--grid-header-py, 10px)',
                        fontSize: 'var(--grid-header-font, 11px)',
                        boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.08)',
                      }}
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </SortableContext>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, rowIdx) => {
                const isZebraRow = gridZebra && rowIdx % 2 === 1;
                const rowBg = isZebraRow ? 'var(--zebra-row)' : 'var(--surface-card)';
                return (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-[var(--surface-raised)] transition-colors group/row border-b border-[var(--border-subtle)] ${
                    isZebraRow ? 'bg-[var(--zebra-row)]' : ''
                  } ${rowClassName ? rowClassName(row.original) : ''}`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const raw = cell.getValue();
                    const titleText = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : undefined;
                    const pinned = cell.column.getIsPinned();
                    // Pinned cells need an opaque background so scrolling content doesn't bleed through.
                    // Match the row bg so zebra still works on pinned columns.
                    const pinStyle: React.CSSProperties = pinned === 'left'
                      ? { position: 'sticky', left: cell.column.getStart('left'), zIndex: 1, background: rowBg }
                      : pinned === 'right'
                        ? { position: 'sticky', right: cell.column.getAfter('right'), zIndex: 1, background: rowBg }
                        : {};
                    return (
                    <td
                      key={cell.id}
                      className="align-middle overflow-hidden whitespace-nowrap text-ellipsis"
                      style={{
                        width: columnWidths[cell.column.id] || cell.column.getSize(),
                        minWidth: 0,
                        // All four paddings are density-driven so compact
                        // can squeeze cells tight (~6px) while spacious
                        // keeps generous breathing room.
                        paddingTop: 'var(--grid-row-py, 6px)',
                        paddingBottom: 'var(--grid-row-py, 6px)',
                        paddingLeft: 'var(--grid-row-px, 12px)',
                        paddingRight: 'var(--grid-row-px, 12px)',
                        fontSize: 'var(--grid-font, 12px)',
                        ...pinStyle,
                      }}
                      title={titleText}
                    >
                      <div className="overflow-hidden min-w-0 whitespace-nowrap text-ellipsis">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                    );
                  })}
                  {renderActions && (
                    <td
                      className="px-2 w-[72px] border-l border-l-[var(--border-subtle)]"
                      style={{
                        position: 'sticky',
                        right: 0,
                        zIndex: 2,
                        background: rowBg,
                        paddingTop: 'var(--grid-row-py, 10px)',
                        paddingBottom: 'var(--grid-row-py, 10px)',
                        boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        {renderActions(row.original)}
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </DndContext> : null}

        {table.getRowModel().rows.length === 0 && (
          <div className="p-10 text-center text-[var(--text-tertiary)]">
            <p className="font-semibold">No {countLabel || 'items'} found</p>
          </div>
        )}
      </div>
    </div>
  );
}
