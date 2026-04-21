'use client';

import { useMemo } from 'react';
import {
  PencilSimple, Plus, Trash, Link as LinkIcon,
  Tag, Warning, Phone, EnvelopeSimple, MapPin, Globe,
  Briefcase, Buildings, UserCircle, Factory, NoteBlank, ShieldCheck,
  CalendarBlank
} from '@phosphor-icons/react';
import { ActivityLogEntry, ActivityLogCategory } from '@/types/activity-log';
import { SEED_ACTIVITY_LOG } from '@/lib/data/seed-activity-log';

interface ActivityLogProps {
  contactId: string;
  relatedIds?: string[];
  search: string;
  categoryFilter: ActivityLogCategory[];
  fieldFilter: string[];
  authorFilter: string[];
  dateFrom: string;
  dateTo: string;
}

function getEventIcon(entry: ActivityLogEntry) {
  const s = 18;
  if (entry.field === 'Phone Number') return <Phone size={s} />;
  if (entry.field === 'Email') return <EnvelopeSimple size={s} />;
  if (entry.field === 'Address') return <MapPin size={s} />;
  if (entry.field === 'Website') return <Globe size={s} />;
  if (entry.field === 'Title' || entry.field === 'Department') return <Briefcase size={s} />;
  if (entry.field === 'Organization') return <LinkIcon size={s} />;
  if (entry.field === 'Industry') return <Factory size={s} />;
  if (entry.field === 'Tag') return <Tag size={s} />;
  if (entry.field === 'Status') return <Warning size={s} />;
  if (entry.field === 'Contact') return <UserCircle size={s} />;
  if (entry.field === 'Employees') return <Buildings size={s} />;
  if (entry.field === 'Note') return <NoteBlank size={s} />;
  if (entry.field === 'Identifier') return <ShieldCheck size={s} />;
  if (entry.action === 'added') return <Plus size={s} />;
  if (entry.action === 'removed') return <Trash size={s} />;
  return <PencilSimple size={s} />;
}

function getActionColor(action: string) {
  if (action === 'added' || action === 'created') return 'var(--success)';
  if (action === 'removed') return 'var(--danger)';
  return 'var(--brand-primary)';
}

function getDateGroup(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && now.getDate() === date.getDate()) return 'Today';
  if (diffDays <= 1 && now.getDate() - date.getDate() === 1) return 'Yesterday';

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  if (date >= startOfWeek) return 'This Week';

  if (diffDays <= 14) return 'Last Week';
  if (diffDays <= 30) return 'This Month';

  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Get all unique field types from log entries for a contact */
export function getLogFields(contactId: string, relatedIds: string[] = []) {
  const allIds = [contactId, ...relatedIds];
  const fields = new Set<string>();
  SEED_ACTIVITY_LOG
    .filter((l) => allIds.includes(l.contactId))
    .forEach((l) => fields.add(l.field));
  return Array.from(fields).sort();
}

/** Get all unique authors from log entries for a contact */
export function getLogAuthors(contactId: string, relatedIds: string[] = []) {
  const allIds = [contactId, ...relatedIds];
  const map = new Map<string, { name: string; initials: string; color: string }>();
  SEED_ACTIVITY_LOG
    .filter((l) => allIds.includes(l.contactId))
    .forEach((l) => {
      if (!map.has(l.author)) map.set(l.author, { name: l.author, initials: l.authorInitials, color: l.authorColor });
    });
  return Array.from(map.values());
}

export default function ActivityLog({ contactId, relatedIds = [], search, categoryFilter, fieldFilter, authorFilter, dateFrom, dateTo }: ActivityLogProps) {
  const allIds = [contactId, ...relatedIds];

  const logs = useMemo(() => {
    let result = SEED_ACTIVITY_LOG
      .filter((l) => allIds.includes(l.contactId))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (categoryFilter.length > 0) {
      result = result.filter((l) => categoryFilter.includes(l.category));
    }

    if (fieldFilter.length > 0) {
      result = result.filter((l) => fieldFilter.includes(l.field));
    }

    if (authorFilter.length > 0) {
      result = result.filter((l) => authorFilter.includes(l.author));
    }

    if (dateFrom || dateTo) {
      result = result.filter((l) => {
        const d = new Date(l.timestamp);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59);
          if (d > to) return false;
        }
        return true;
      });
    }

    if (search && search.length >= 2) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.field.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.oldValue || '').toLowerCase().includes(q) ||
        (l.newValue || '').toLowerCase().includes(q) ||
        l.author.toLowerCase().includes(q)
      );
    }

    return result;
  }, [contactId, relatedIds, categoryFilter, authorFilter, dateFrom, dateTo, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; entries: ActivityLogEntry[] }[] = [];
    const seen = new Map<string, ActivityLogEntry[]>();

    for (const entry of logs) {
      const label = getDateGroup(entry.timestamp);
      if (!seen.has(label)) {
        const arr: ActivityLogEntry[] = [];
        seen.set(label, arr);
        groups.push({ label, entries: arr });
      }
      seen.get(label)!.push(entry);
    }

    return groups;
  }, [logs]);

  const hasFilters = categoryFilter.length > 0 || fieldFilter.length > 0 || authorFilter.length > 0 || dateFrom || dateTo || search;

  return (
    <div>
      {grouped.map((group) => (
        <div key={group.label}>
          <div className="px-4 py-2 bg-[var(--surface-sunken)] border-y border-[var(--border-subtle)]">
            <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
              <CalendarBlank size={12} /> {group.label}
            </span>
          </div>
          {group.entries.map((entry) => (
            <LogRow key={entry.id} entry={entry} />
          ))}
        </div>
      ))}

      {logs.length === 0 && (
        <div className="p-10 text-center text-[var(--text-tertiary)]">
          <NoteBlank size={32} className="mx-auto mb-2" />
          <p className="font-semibold text-sm">{hasFilters ? 'No matching activity' : 'No activity logged'}</p>
        </div>
      )}
    </div>
  );
}

function LogRow({ entry }: { entry: ActivityLogEntry }) {
  const actionColor = getActionColor(entry.action);
  const icon = getEventIcon(entry);
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors flex items-start gap-3">
      <div className="w-6 flex items-center justify-center flex-shrink-0 mt-1" style={{ color: actionColor }}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-[var(--text-primary)]">
          <span className="font-bold">{entry.field}</span>{' '}
          <span className="font-semibold" style={{ color: actionColor }}>{entry.action}</span>
        </div>
        <div className="mt-0.5 text-[12px]">
          {entry.oldValue && entry.newValue && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[var(--text-primary)]">{entry.newValue}</span>
              <span className="text-[var(--text-tertiary)] line-through text-[11px]">{entry.oldValue}</span>
            </div>
          )}
          {!entry.oldValue && entry.newValue && (
            <span className="font-semibold text-[var(--text-primary)]">{entry.newValue}</span>
          )}
          {entry.oldValue && !entry.newValue && (
            <span className="text-[var(--text-tertiary)] line-through">{entry.oldValue}</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-[11px] text-[var(--text-tertiary)]">{timeStr}</div>
        <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">{entry.author}</div>
      </div>

    </div>
  );
}
