'use client';

import { useState, KeyboardEvent, useMemo } from 'react';
import Topbar from '@/components/layout/Topbar';
import { useDashboardStore } from '@/stores/dashboard-store';
import { CheckCircle, Circle, Trash, Plus, CheckSquare, Funnel } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  widgetId: string;  // which TodoWidget this came from
  viewName: string;  // which dashboard view
}

/**
 * Aggregated To-do page. Combines all todo items across all TodoWidget
 * instances on the Dashboard, so users have one place to triage their
 * personal task list without hunting through dashboard views.
 */
export default function TodosPage() {
  const views = useDashboardStore((s) => s.views);
  const updateConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const activeViewId = useDashboardStore((s) => s.activeViewId);
  const setActiveViewId = useDashboardStore((s) => s.setActiveViewId);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<TodoItem | null>(null);

  // Aggregate all todo items from all TodoWidgets on all views
  const allTodos = useMemo<TodoItem[]>(() => {
    const items: TodoItem[] = [];
    views.forEach((v) => {
      v.widgets.forEach((w) => {
        if (w.type === 'todo' && Array.isArray(w.config?.items)) {
          (w.config!.items as { id: string; text: string; done: boolean }[]).forEach((i) => {
            items.push({ ...i, widgetId: w.id, viewName: v.name });
          });
        }
      });
    });
    return items;
  }, [views]);

  const filtered = allTodos.filter((t) => filter === 'all' || (filter === 'open' ? !t.done : t.done));
  const openCount = allTodos.filter((t) => !t.done).length;
  const doneCount = allTodos.length - openCount;

  // Find the first TodoWidget in the active view (to add new todos to)
  const activeView = views.find((v) => v.id === activeViewId) || views[0];
  const targetTodoWidget = activeView?.widgets.find((w) => w.type === 'todo');

  const toggleItem = (t: TodoItem) => {
    const view = views.find((v) => v.widgets.some((w) => w.id === t.widgetId));
    if (!view) return;
    if (view.id !== activeViewId) setActiveViewId(view.id);
    const widget = view.widgets.find((w) => w.id === t.widgetId);
    if (!widget || !Array.isArray(widget.config?.items)) return;
    const updated = (widget.config!.items as TodoItem[]).map((i) => i.id === t.id ? { ...i, done: !i.done } : i);
    updateConfig(t.widgetId, { items: updated });
  };

  const removeItem = (t: TodoItem) => {
    const view = views.find((v) => v.widgets.some((w) => w.id === t.widgetId));
    if (!view) return;
    if (view.id !== activeViewId) setActiveViewId(view.id);
    const widget = view.widgets.find((w) => w.id === t.widgetId);
    if (!widget || !Array.isArray(widget.config?.items)) return;
    const updated = (widget.config!.items as TodoItem[]).filter((i) => i.id !== t.id);
    updateConfig(t.widgetId, { items: updated });
  };

  const draftError =
    draft.length === 0 ? null
      : draft.trim().length < 2 ? 'Task must be at least 2 characters'
      : draft.length > 200 ? 'Task must be at most 200 characters'
      : null;

  const addNew = () => {
    if (!draft.trim() || !targetTodoWidget || draftError) return;
    const current = Array.isArray(targetTodoWidget.config?.items) ? targetTodoWidget.config!.items as TodoItem[] : [];
    updateConfig(targetTodoWidget.id, {
      items: [...current, { id: `todo-${Date.now()}`, text: draft.trim(), done: false }],
    });
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addNew();
  };

  return (
    <>
      <Topbar title="To-dos" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-5 py-5 flex flex-col gap-4">
          {/* Header summary */}
          <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
            <div className="w-[22px] h-[22px] bg-[var(--brand-primary)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
              <CheckSquare size={13} weight="duotone" className="text-white" />
            </div>
            <div className="text-[13px] text-[var(--text-secondary)]">
              <strong className="font-extrabold text-[var(--text-primary)]">Your Tasks</strong>
              <span> · {openCount} open · {doneCount} completed</span>
            </div>
            <div className="ml-auto flex gap-1.5">
              <FilterBtn active={filter === 'open'} onClick={() => setFilter('open')}>Open ({openCount})</FilterBtn>
              <FilterBtn active={filter === 'done'} onClick={() => setFilter('done')}>Done ({doneCount})</FilterBtn>
              <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>All ({allTodos.length})</FilterBtn>
            </div>
          </div>

          {/* Add new */}
          {targetTodoWidget && (
            <div>
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  maxLength={200}
                  placeholder="Add a new task…"
                  className={`flex-1 h-[40px] px-3 text-[13px] border rounded-[var(--radius-sm)] bg-[var(--surface-card)] text-[var(--text-primary)] outline-none ${
                    draftError ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'
                  }`}
                />
                <button
                  onClick={addNew}
                  disabled={!draft.trim() || !!draftError}
                  className={`h-[40px] px-4 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] text-[13px] font-bold text-white border-none ${
                    draft.trim() && !draftError ? 'bg-[var(--brand-primary)] cursor-pointer hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
                  }`}
                >
                  <Plus size={14} weight="bold" /> Add Task
                </button>
              </div>
              {draftError && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{draftError}</div>}
            </div>
          )}

          {/* Task list */}
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl">
            {filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <CheckCircle size={32} weight="duotone" className="text-[var(--success)]" />
                <div className="text-[13px] font-bold text-[var(--text-secondary)]">
                  {filter === 'open' ? 'All caught up!' : filter === 'done' ? 'No completed tasks yet' : 'No tasks yet'}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  {filter === 'open' ? 'Add a task above or switch filters.' : 'Tasks you add will appear here.'}
                </div>
              </div>
            ) : (
              <ul>
                {filtered.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-raised)]">
                    <button
                      onClick={() => toggleItem(t)}
                      aria-label={t.done ? 'Mark as pending' : 'Mark as done'}
                      className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none p-0 flex-shrink-0 cursor-pointer"
                    >
                      {t.done ? (
                        <CheckCircle size={22} weight="fill" className="text-[var(--success)]" />
                      ) : (
                        <Circle size={22} weight="regular" />
                      )}
                    </button>
                    <span className={`flex-1 text-[14px] ${t.done ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                      {t.text}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] opacity-60">{t.viewName}</span>
                    <button
                      onClick={() => setConfirmDelete(t)}
                      aria-label="Remove"
                      className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete task?"
        message={confirmDelete ? `This will permanently remove "${confirmDelete.text}" from your to-do list.` : ''}
        confirmLabel="Delete task"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDelete) removeItem(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition-colors ${
        active
          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
          : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
      }`}
    >
      {children}
    </button>
  );
}
