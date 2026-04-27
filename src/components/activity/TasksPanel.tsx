'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle, Circle, Plus, Calendar, Trash, Envelope, ListChecks,
} from '@phosphor-icons/react';
import { ContactWithEntries } from '@/types/contact';
import { useContactStore } from '@/stores/contact-store';
import { uid } from '@/lib/utils';
import type { Task } from '@/types/task';

/**
 * Tasks sub-tab for the Overview Activity card. Follows the HubSpot /
 * Pipedrive / Close pattern: open tasks bucketed by due date (Overdue →
 * Today → Later → No date), then a Done section. Inline add via Enter,
 * checkbox to complete, trash to remove.
 *
 * Deliberately minimal — no assignees, priority, reminders, or task
 * types yet; add if users need them.
 */
export default function TasksPanel({ contact }: { contact: ContactWithEntries }) {
  const tasks = useContactStore((s) => s.tasks);
  const addTask = useContactStore((s) => s.addTask);
  const updateTask = useContactStore((s) => s.updateTask);
  const toggleTaskDone = useContactStore((s) => s.toggleTaskDone);
  const deleteTask = useContactStore((s) => s.deleteTask);

  const [draft, setDraft] = useState('');

  const mine = useMemo(
    () => tasks.filter((t) => t.contactId === contact.id),
    [tasks, contact.id],
  );

  const buckets = useMemo(() => groupTasks(mine), [mine]);

  const submitDraft = () => {
    const title = draft.trim();
    if (!title) return;
    const task: Task = {
      id: uid('task'),
      contactId: contact.id,
      title,
      done: false,
      createdAt: new Date().toISOString(),
    };
    addTask(task);
    setDraft('');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-3 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-tertiary)]">
            <Plus size={11} weight="bold" />
          </div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitDraft();
              }
            }}
            placeholder={`Add a task for ${contact.name}… (press Enter)`}
            className="flex-1 bg-transparent text-[12.5px] text-[var(--text-primary)] border-none focus:outline-none placeholder:text-[var(--text-tertiary)]"
            aria-label="New task title"
          />
          {draft.trim() && (
            <button
              type="button"
              onClick={submitDraft}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-[var(--brand-primary)] text-white cursor-pointer hover:opacity-90 border-none"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {mine.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mb-2">
            <ListChecks size={18} weight="duotone" className="text-[var(--text-tertiary)]" />
          </div>
          <div className="text-[12.5px] font-bold text-[var(--text-primary)] mb-1">No tasks yet</div>
          <div className="text-[11.5px] text-[var(--text-tertiary)] max-w-[280px]">
            Add a task above, or use the list icon on any email to convert it into a task.
          </div>
        </div>
      )}

      <div className="flex flex-col">
        {(['overdue', 'today', 'later', 'nodate'] as const).map((key) => {
          const items = buckets[key];
          if (items.length === 0) return null;
          return (
            <TaskBucket
              key={key}
              label={bucketLabel(key)}
              tone={key === 'overdue' ? 'warn' : 'default'}
              items={items}
              onToggle={toggleTaskDone}
              onDelete={deleteTask}
              onUpdateTitle={(id, title) => updateTask(id, { title })}
              onUpdateDue={(id, dueDate) => updateTask(id, { dueDate })}
            />
          );
        })}

        {buckets.done.length > 0 && (
          <TaskBucket
            label={`Done · ${buckets.done.length}`}
            tone="muted"
            items={buckets.done}
            onToggle={toggleTaskDone}
            onDelete={deleteTask}
            onUpdateTitle={(id, title) => updateTask(id, { title })}
            onUpdateDue={(id, dueDate) => updateTask(id, { dueDate })}
          />
        )}
      </div>
    </div>
  );
}

function TaskBucket({ label, tone, items, onToggle, onDelete, onUpdateTitle, onUpdateDue }: {
  label: string;
  tone: 'default' | 'warn' | 'muted';
  items: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDue: (id: string, dueDate: string | null) => void;
}) {
  const headerColor =
    tone === 'warn' ? 'text-[var(--danger,#b42318)]' :
    tone === 'muted' ? 'text-[var(--text-tertiary)]' :
    'text-[var(--text-secondary)]';

  return (
    <div className="border-b border-[var(--border)]">
      <div className={`px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider ${headerColor}`}>
        {label}
      </div>
      <div className="flex flex-col">
        {items.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onDelete={() => onDelete(task.id)}
            onUpdateTitle={(t) => onUpdateTitle(task.id, t)}
            onUpdateDue={(d) => onUpdateDue(task.id, d)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, onUpdateTitle, onUpdateDue }: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateTitle: (t: string) => void;
  onUpdateDue: (d: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== task.title) onUpdateTitle(next);
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <div className="group flex items-start gap-2 px-4 py-2 hover:bg-[var(--surface-raised)] transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? 'Mark as open' : 'Mark as done'}
        className="mt-0.5 w-4 h-4 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
      >
        {task.done
          ? <CheckCircle size={15} weight="fill" className="text-[var(--brand-primary)]" />
          : <Circle size={15} weight="regular" />}
      </button>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') { setDraft(task.title); setEditing(false); }
            }}
            className="w-full bg-transparent text-[12.5px] text-[var(--text-primary)] border-b border-[var(--brand-primary)] focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`text-left w-full bg-transparent border-none cursor-text text-[12.5px] ${task.done ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}
          >
            {task.title}
          </button>
        )}
        <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <Calendar size={10} weight="regular" />
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => onUpdateDue(e.target.value || null)}
              className="bg-transparent border-none text-[10.5px] text-[var(--text-tertiary)] cursor-pointer p-0 focus:outline-none"
              aria-label="Due date"
            />
          </label>
          {task.sourceEmailId && (
            <span className="inline-flex items-center gap-0.5 text-[var(--text-tertiary)]">
              <Envelope size={10} weight="regular" /> from email
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete task"
        className="w-6 h-6 rounded-md bg-transparent border-none cursor-pointer flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger,#b42318)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <Trash size={11} weight="bold" />
      </button>
    </div>
  );
}

// Bucket open tasks by due-date urgency; Done bucket is always last.
function groupTasks(tasks: Task[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const overdue: Task[] = [];
  const todayBucket: Task[] = [];
  const later: Task[] = [];
  const nodate: Task[] = [];
  const done: Task[] = [];
  for (const t of tasks) {
    if (t.done) { done.push(t); continue; }
    if (!t.dueDate) { nodate.push(t); continue; }
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    const ts = d.getTime();
    if (ts < todayTs) overdue.push(t);
    else if (ts === todayTs) todayBucket.push(t);
    else later.push(t);
  }
  const byCreated = (a: Task, b: Task) =>
    (a.createdAt < b.createdAt ? 1 : -1);
  const byDue = (a: Task, b: Task) =>
    (a.dueDate || '') < (b.dueDate || '') ? -1 : 1;
  return {
    overdue: overdue.sort(byDue),
    today: todayBucket.sort(byCreated),
    later: later.sort(byDue),
    nodate: nodate.sort(byCreated),
    done: done.sort((a, b) => (a.completedAt || '') > (b.completedAt || '') ? -1 : 1),
  };
}

function bucketLabel(k: 'overdue' | 'today' | 'later' | 'nodate') {
  if (k === 'overdue') return 'Overdue';
  if (k === 'today') return 'Today';
  if (k === 'later') return 'Upcoming';
  return 'No due date';
}
