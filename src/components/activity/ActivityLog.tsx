'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PencilSimple, Plus, Trash, Link as LinkIcon,
  Tag, Warning, Phone, EnvelopeSimple, MapPin, Globe,
  Briefcase, Buildings, UserCircle, Factory, NoteBlank, ShieldCheck,
  CalendarBlank
} from '@phosphor-icons/react';
import { ActivityLogEntry, ActivityLogCategory } from '@/types/activity-log';
import { SEED_ACTIVITY_LOG } from '@/lib/data/seed-activity-log';
import { getSeedEmailsForContact } from '@/lib/data/seed-emails';
import { useGmailStatusStore } from '@/stores/gmail-status-store';

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
  if (entry.category === 'email') return <EnvelopeSimple size={s} />;
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

interface EmailEventSource {
  id: string;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  receivedAt: string;
  direction: 'from' | 'to' | 'cc' | 'bcc';
  openCount?: number;
  lastOpenedAt?: string | null;
  clickCount?: number;
  lastClickedAt?: string | null;
  archivedAt?: string | null;
}

function emailsToLogEntries(emails: EmailEventSource[], contactId: string): ActivityLogEntry[] {
  const entries: ActivityLogEntry[] = [];
  for (const e of emails) {
    const incoming = e.direction === 'from';
    const author = incoming ? (e.fromName || e.fromEmail || 'Unknown') : 'You';
    const authorInitials = (author[0] || 'U').toUpperCase();
    const ts = new Date(e.receivedAt).getTime();
    entries.push({
      id: `email-${e.id}`,
      contactId,
      eventType: incoming ? 'email_received' : 'email_sent',
      category: 'email',
      field: 'Email',
      action: incoming ? 'received' : 'sent',
      newValue: e.subject || '(no subject)',
      snippet: e.snippet || undefined,
      author,
      authorInitials,
      authorColor: incoming ? 'var(--brand-primary)' : 'var(--text-secondary)',
      createdAt: new Date(e.receivedAt).toLocaleString(),
      timestamp: ts,
      archived: !!e.archivedAt,
    });
    if (!incoming && (e.openCount ?? 0) > 0 && e.lastOpenedAt) {
      entries.push({
        id: `email-open-${e.id}`,
        contactId,
        eventType: 'email_opened',
        category: 'email',
        field: 'Email',
        action: 'opened',
        newValue: `${e.subject || '(no subject)'} · ${e.openCount}×`,
        author: e.toEmails[0] || 'Recipient',
        authorInitials: (e.toEmails[0]?.[0] || 'R').toUpperCase(),
        authorColor: 'var(--success,#1f7a3a)',
        createdAt: new Date(e.lastOpenedAt).toLocaleString(),
        timestamp: new Date(e.lastOpenedAt).getTime(),
      });
    }
    if (!incoming && (e.clickCount ?? 0) > 0 && e.lastClickedAt) {
      entries.push({
        id: `email-click-${e.id}`,
        contactId,
        eventType: 'email_clicked',
        category: 'email',
        field: 'Email',
        action: 'clicked',
        newValue: `${e.subject || '(no subject)'} · ${e.clickCount}×`,
        author: e.toEmails[0] || 'Recipient',
        authorInitials: (e.toEmails[0]?.[0] || 'R').toUpperCase(),
        authorColor: 'var(--brand-primary)',
        createdAt: new Date(e.lastClickedAt).toLocaleString(),
        timestamp: new Date(e.lastClickedAt).getTime(),
      });
    }
  }
  return entries;
}

export default function ActivityLog({ contactId, relatedIds = [], search, categoryFilter, fieldFilter, authorFilter, dateFrom, dateTo }: ActivityLogProps) {
  const allIds = [contactId, ...relatedIds];

  const [emailEntries, setEmailEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // Refetch when Gmail sync completes (matches the EmailsPanel pattern):
  // banner-driven `Sync now` advances `last_sync_at`, the store picks it
  // up, every subscribed component re-renders, and we add it as a dep
  // below so this effect fires and pulls the freshly-matched messages
  // into the timeline without the user having to leave and come back.
  const lastSyncAt = useGmailStatusStore((s) => s.status?.lastSyncAt);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Demo fallback mirror of EmailsPanel: when the API returns no rows
    // for this contact (unauthenticated demo / no Gmail sync / seeded
    // contact id), substitute the client-side seed so the activity log
    // still surfaces email events. Converted through the same
    // emailsToLogEntries path so the icon + author + open/click synth
    // matches production behavior exactly.
    const seededSources: EmailEventSource[] = getSeedEmailsForContact(contactId).map((e) => ({
      id: e.id,
      subject: e.subject,
      snippet: e.snippet,
      fromEmail: e.fromEmail,
      fromName: e.fromName,
      toEmails: e.toEmails,
      receivedAt: e.receivedAt,
      direction: e.direction,
      openCount: e.openCount,
      lastOpenedAt: e.lastOpenedAt,
      clickCount: e.clickCount,
      lastClickedAt: e.lastClickedAt,
      archivedAt: e.archivedAt,
    }));
    fetch(`/api/contacts/${contactId}/emails?includeArchived=1`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        const live: EmailEventSource[] = Array.isArray(body.emails) ? body.emails : [];
        const source = live.length > 0 ? live : seededSources;
        setEmailEntries(emailsToLogEntries(source, contactId));
      })
      .catch(() => {
        if (cancelled) return;
        setEmailEntries(emailsToLogEntries(seededSources, contactId));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [contactId, lastSyncAt]);

  const logs = useMemo(() => {
    const merged: ActivityLogEntry[] = [
      ...SEED_ACTIVITY_LOG.filter((l) => allIds.includes(l.contactId)),
      ...emailEntries,
    ];
    let result = merged.sort((a, b) => b.timestamp - a.timestamp);

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
  }, [allIds, emailEntries, categoryFilter, fieldFilter, authorFilter, dateFrom, dateTo, search]);

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
      {loading && logs.length === 0 && <ActivityLogSkeleton />}

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

      {!loading && logs.length === 0 && (
        <div className="p-10 text-center text-[var(--text-tertiary)]">
          <NoteBlank size={32} className="mx-auto mb-2" />
          <p className="font-semibold text-sm">{hasFilters ? 'No matching activity' : 'No activity logged'}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for the activity log. Mirrors the real LogRow layout
 * (icon, title line, snippet line, timestamp + author) so the layout
 * doesn't shift when the emails fetch resolves.
 *
 * WCAG 2.1 SC 1.4.11: animated highlight uses --surface-raised on
 * --surface-card which is tuned to 3:1. Respects prefers-reduced-motion
 * via motion-reduce:hidden on the shimmer layer.
 */
function ActivityLogSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading activity">
      <div className="px-4 py-2 bg-[var(--surface-sunken)] border-y border-[var(--border-subtle)]">
        <SkeletonBlock className="w-20 h-2.5 rounded-sm" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden px-4 py-3 border-b border-[var(--border-subtle)] flex items-start gap-3"
        >
          <SkeletonBlock className="w-[18px] h-[18px] rounded-sm flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <SkeletonBlock className="w-14 h-2.5 rounded-sm" />
              <SkeletonBlock className="w-10 h-2.5 rounded-sm" />
            </div>
            <SkeletonBlock className="w-3/5 h-3 rounded-sm mb-1.5" />
            <SkeletonBlock className="w-4/5 h-2 rounded-sm" />
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <SkeletonBlock className="w-10 h-2 rounded-sm" />
            <SkeletonBlock className="w-14 h-2 rounded-sm" />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none motion-reduce:hidden"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, var(--surface-raised, rgba(0,0,0,0.06)) 50%, transparent 100%)',
              backgroundSize: '220% 100%',
              animation: `roadrunner-shimmer 1.4s linear ${i * 0.15}s infinite`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes roadrunner-shimmer {
          0% { background-position: 220% 0; }
          100% { background-position: -20% 0; }
        }
      `}</style>
      <span className="sr-only">Loading activity, please wait…</span>
    </div>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--surface-raised)] ${className}`} aria-hidden="true" />;
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
        <div className="text-[13px] text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
          <span className="font-bold">{entry.field}</span>
          <span className="font-semibold" style={{ color: actionColor }}>{entry.action}</span>
          {entry.archived && (
            <span className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--surface-raised)] text-[var(--text-tertiary)] border border-[var(--border)]">
              Archived
            </span>
          )}
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
        {entry.snippet && (
          <div className="mt-0.5 text-[11.5px] text-[var(--text-tertiary)] line-clamp-2">
            {entry.snippet}
          </div>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-[11px] text-[var(--text-tertiary)]">{timeStr}</div>
        <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">{entry.author}</div>
      </div>

    </div>
  );
}
