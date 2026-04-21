'use client';

import { useState, KeyboardEvent } from 'react';
import { Plus, Trash, CheckCircle, Circle, CaretDown, DotsSixVertical } from '@phosphor-icons/react';
import { WidgetConfig, itemLimitForSize } from '@/types/dashboard';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useWidgetStoreActionsOptional } from '../WidgetStoreContext';
import Widget from '../Widget';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * Personal task list. Items live inside widget.config.items and are persisted
 * as part of the dashboard view. Supports add / toggle / remove / reorder via drag.
 */
export default function TodoWidget({ widget }: { widget: WidgetConfig }) {
  const ctxActions = useWidgetStoreActionsOptional();
  const _updateConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const updateConfig = ctxActions?.updateWidgetConfig ?? _updateConfig;
  const items: TodoItem[] = Array.isArray(widget.config?.items) ? (widget.config!.items as TodoItem[]) : [];

  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Respect the user's manual order when present; otherwise default to pending-first.
  const sorted = [...items];
  const limit = itemLimitForSize(widget.size);
  const visible = showAll ? sorted : sorted.slice(0, limit);
  const hiddenCount = sorted.length - visible.length;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...items];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    updateConfig(widget.id, { items: next });
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const next: TodoItem[] = [...items, { id: `todo-${Date.now()}`, text, done: false }];
    updateConfig(widget.id, { items: next });
    setDraft('');
  };

  const toggle = (id: string) => {
    updateConfig(widget.id, { items: items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });
  };

  const remove = (id: string) => {
    updateConfig(widget.id, { items: items.filter((i) => i.id !== id) });
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') add();
  };

  const pending = items.filter((i) => !i.done).length;

  return (
    <Widget
      widget={widget}
      title={widget.title || 'To-do list'}
      defaultIconName="CheckSquare"
    >
      <div className="flex flex-col h-full">
        <div className="text-[calc(10px*var(--widget-subtitle-scale,1))] @md:text-[calc(11px*var(--widget-subtitle-scale,1))] @xl:text-[calc(12px*var(--widget-subtitle-scale,1))] text-[var(--widget-tertiary-text)] font-semibold mb-1.5 @md:mb-2 @xl:mb-3">
          {items.length === 0 ? 'Nothing here yet — add a task below' : `${pending} open · ${items.length - pending} done`}
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-0.5 @md:gap-1 @xl:gap-1.5 flex-1 min-h-0">
              {visible.map((i) => (
                <SortableTodoItem
                  key={i.id}
                  item={i}
                  onToggle={toggle}
                  onRemove={remove}
                />
              ))}
              {hiddenCount > 0 && !showAll && (
                <li>
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:bg-[var(--brand-bg)] rounded-md"
                  >
                    <CaretDown size={10} weight="bold" /> +{hiddenCount} more
                  </button>
                </li>
              )}
              {showAll && items.length > limit && (
                <li>
                  <button
                    onClick={() => setShowAll(false)}
                    className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)]"
                  >
                    Show less
                  </button>
                </li>
              )}
            </ul>
          </SortableContext>
        </DndContext>
        <div className="flex items-center gap-1.5 @md:gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="Add a task…"
            className="flex-1 h-[28px] @md:h-[30px] @xl:h-[34px] px-2 text-[11px] @md:text-[12px] @xl:text-[13px] border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-card)] text-[var(--widget-primary-text)] outline-none focus:border-[var(--brand-primary)]"
          />
          <button
            onClick={add}
            aria-label="Add task"
            className="h-[28px] w-[28px] @md:h-[30px] @md:w-[30px] @xl:h-[34px] @xl:w-[34px] inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-primary)] text-white border-none cursor-pointer hover:opacity-90"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>
      </div>
    </Widget>
  );
}

function SortableTodoItem({ item, onToggle, onRemove }: { item: TodoItem; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1 @md:gap-1.5 @xl:gap-2 py-0.5 @md:py-1 @xl:py-1.5"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="text-[var(--widget-tertiary-text)] hover:text-[var(--text-primary)] bg-transparent border-none p-0 flex-shrink-0 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity"
      >
        <DotsSixVertical size={12} weight="bold" />
      </button>
      <button
        onClick={() => onToggle(item.id)}
        aria-label={item.done ? 'Mark as pending' : 'Mark as done'}
        className="text-[var(--widget-tertiary-text)] hover:text-[var(--brand-primary)] bg-transparent border-none p-0 flex-shrink-0 cursor-pointer"
      >
        {item.done ? (
          <CheckCircle size={16} weight="fill" className="text-[var(--success)] @md:size-[18px] @xl:size-[20px]" />
        ) : (
          <Circle size={16} weight="regular" className="@md:size-[18px] @xl:size-[20px]" />
        )}
      </button>
      <span
        className={`flex-1 text-[calc(12px*var(--content-scale,1))] @md:text-[calc(13px*var(--content-scale,1))] @xl:text-[calc(14px*var(--content-scale,1))] ${
          item.done ? 'line-through text-[var(--widget-tertiary-text)]' : 'text-[var(--widget-primary-text)]'
        }`}
      >
        {item.text}
      </span>
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remove"
        className="w-6 h-6 rounded-[var(--radius-sm)] items-center justify-center text-[var(--widget-tertiary-text)] hover:text-[var(--danger)] bg-transparent border-none p-0 cursor-pointer opacity-0 group-hover:opacity-100 flex"
      >
        <Trash size={12} />
      </button>
    </li>
  );
}
