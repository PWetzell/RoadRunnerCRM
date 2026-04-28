'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Envelope, ArrowDownLeft, ArrowUpRight, PaperPlaneTilt, Eye, CursorClick,
  Archive, PushPin, PushPinSlash, MagnifyingGlass, X, Tag, Plus,
  ListChecks, CheckCircle, Check, Paperclip, FloppyDisk, DownloadSimple,
} from '@phosphor-icons/react';
import AttachmentPreviewModal, { type PreviewableAttachment } from '@/components/activity/AttachmentPreviewModal';
import { ContactWithEntries } from '@/types/contact';
import EmailComposer from '@/components/gmail/EmailComposer';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { useToastStore } from '@/stores/toast-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import { uid } from '@/lib/utils';
import { formatFileSize, getExtColor, getFileFamily } from '@/types/document';
import type { EmailAttachment } from '@/types/email-attachment';
import { getSeedEmailsForContact } from '@/lib/data/seed-emails';
import { useReadOverridesSet } from '@/hooks/use-unread-emails';
import { useRouter } from 'next/navigation';
import { buildSeedPlaceholderBlob } from '@/lib/seed-attachment-placeholders';

/**
 * Emails sub-tab for the Overview Activity card. Lists synced Gmail messages
 * linked to this contact (via email_contact_matches) with open / click badges
 * and hosts the inline Send email composer.
 *
 * Activity Log is the source of truth for chronological events; this panel is
 * the focused email-only view with the compose affordance.
 */

interface EmailRow {
  id: string;
  gmailMessageId: string;
  threadId: string;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: string;
  direction: 'from' | 'to' | 'cc' | 'bcc';
  /**
   * Unread state. `null` = unread (row renders bold + blue dot + "Unread"
   * pill). ISO string = the timestamp the user opened the thread. Only
   * incoming emails (direction 'from') show an unread state — sent mail
   * is always "read" by definition. Gmail and HubSpot use the same
   * convention.
   */
  readAt?: string | null;
  openCount?: number;
  lastOpenedAt?: string | null;
  clickCount?: number;
  lastClickedAt?: string | null;
  archivedAt?: string | null;
  pinnedAt?: string | null;
  tags?: string[];
  attachments?: EmailAttachment[];
}

export default function EmailsPanel({ contact }: { contact: ContactWithEntries }) {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  // Short-lived set of email IDs that were just converted into a task — used
  // to flash the "task created" confirmation state on the row button.
  const [justTasked, setJustTasked] = useState<Set<string>>(new Set());
  // Persisted set of email IDs the user has clicked open at least once.
  // Once an ID lands in this set the "New" pill is suppressed forever,
  // even if the user collapses the row, even after a page refresh.
  // Without this the pill would flicker back on every collapse/refresh
  // (within the 10-min window) — which is what Paul ran into on
  // 2026-04-27 ("how do I get the new tag to go away?").
  //
  // Keyed by gmail message id so it survives across contacts (the
  // same message can appear on multiple contacts' timelines via
  // email_contact_matches; viewing it once should clear "New"
  // everywhere).
  const VIEWED_KEY = 'roadrunner.emailsViewed';
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(VIEWED_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set<string>(arr) : new Set();
    } catch {
      return new Set();
    }
  });
  const markViewed = useCallback((emailId: string) => {
    setViewedIds((prev) => {
      if (prev.has(emailId)) return prev;
      const next = new Set(prev);
      next.add(emailId);
      try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // localStorage full / private mode — degrade gracefully, the
        // in-memory set still suppresses the pill for this session.
      }
      return next;
    });
  }, []);
  const addTask = useContactStore((s) => s.addTask);
  const existingTasks = useContactStore((s) => s.tasks);
  const markEmailReadInStore = useContactStore((s) => s.markEmailRead);
  // Subscribe to the persisted read-override set so reads survive
  // panel re-mount (leaving/returning to the contact) and page reload.
  const readOverrides = useReadOverridesSet();
  // Subscribe to the shared Gmail-sync timestamp. When the user clicks
  // "Sync now" in the banner, the sync route stamps a fresh
  // `last_sync_at` and the gmail-status-store's refresh() picks it up,
  // which re-renders every component reading this selector — including
  // us. We use it as a useEffect dep below so the panel refetches the
  // contact's email list right after a sync, without the user having
  // to navigate away and back. The bug Paul hit on 2026-04-27: he sent
  // a fresh email from Gmail, clicked Sync now (banner advanced to
  // "synced just now", message count bumped 944 → 948), but the
  // contact's activity timeline still showed the pre-sync entries
  // because EmailsPanel had never been told to refetch.
  const lastSyncAt = useGmailStatusStore((s) => s.status?.lastSyncAt);

  const contactEmail = useMemo(() => {
    const direct = contact.type === 'person' ? contact.email : undefined;
    if (direct) return direct;
    const entry = contact.entries?.emails?.find((e) => e.primary) ?? contact.entries?.emails?.[0];
    return entry?.value;
  }, [contact]);

  const fetchEmails = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (contactEmail) params.set('email', contactEmail);
    if (showArchived) params.set('includeArchived', '1');
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/contacts/${contact.id}/emails${qs}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        const live: EmailRow[] = Array.isArray(body.emails) ? body.emails : [];
        // Demo fallback: when the API has no emails for this contact (the
        // usual case for an unauthenticated demo or a seeded contact that
        // doesn't exist in Supabase), fold in the client-side seed so the
        // Emails tab has content to showcase. The seed includes realistic
        // HR-context threads with attachments and unread state per the
        // case-study brief. Real users with Gmail sync never hit this path.
        if (live.length === 0) {
          const seeded = getSeedEmailsForContact(contact.id, readOverrides) as EmailRow[];
          const filtered = showArchived ? seeded : seeded.filter((e) => !e.archivedAt);
          setEmails(filtered);
        } else {
          // Apply local "user has read this" overrides on top of the
          // live API response. The API's `readAt` reflects Gmail's
          // UNREAD label, which doesn't update when the user reads the
          // message inside Roadrunner — only when they read it inside
          // Gmail itself. Without this overlay, expanding an unread
          // email cleared the pill momentarily but it would snap back
          // on the next refetch (every sync, every mount), since the
          // API still saw UNREAD on the Gmail row. Once we send a
          // proper "remove UNREAD label" request to Gmail on read,
          // this overlay can go away — until then it's the source of
          // truth for "Paul has seen this in the CRM."
          const merged = live.map((e) =>
            e.readAt == null && readOverrides.has(e.id)
              ? { ...e, readAt: new Date().toISOString() }
              : e,
          );
          setEmails(merged);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network error path — still try the seed so the demo isn't a
        // blank panel on a flaky connection.
        const seeded = getSeedEmailsForContact(contact.id, readOverrides) as EmailRow[];
        const filtered = showArchived ? seeded : seeded.filter((e) => !e.archivedAt);
        setEmails(filtered);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [contact.id, contactEmail, showArchived, readOverrides]);

  const archiveEmail = useCallback(async (emailId: string, archive: boolean) => {
    // The archive button always removes the row from the current view — that's
    // the mental model ("get this out of my list"). Toggling "Show archived"
    // is how the user brings archived items back. If server-side PATCH fails,
    // resync to restore the row.
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: archive }),
      });
      if (!res.ok) fetchEmails();
    } catch {
      fetchEmails();
    }
  }, [fetchEmails]);

  const pinEmail = useCallback(async (emailId: string, pin: boolean) => {
    // Optimistic: update pinnedAt locally and re-sort (pinned first).
    setEmails((prev) => {
      const next = prev.map((e) =>
        e.id === emailId ? { ...e, pinnedAt: pin ? new Date().toISOString() : null } : e,
      );
      return [...next].sort((a, b) => {
        const aP = a.pinnedAt ? Date.parse(a.pinnedAt) : 0;
        const bP = b.pinnedAt ? Date.parse(b.pinnedAt) : 0;
        if (aP !== bP) return bP - aP;
        return a.receivedAt < b.receivedAt ? 1 : -1;
      });
    });
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: pin }),
      });
    } catch {
      fetchEmails();
    }
  }, [fetchEmails]);

  const updateTags = useCallback(async (emailId: string, nextTags: string[]) => {
    setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, tags: nextTags } : e)));
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextTags }),
      });
    } catch {
      fetchEmails();
    }
  }, [fetchEmails]);

  // Aggregate every tag the user has already used on this contact's emails.
  // Used both for the filter bar and to seed typeahead suggestions.
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of emails) for (const t of e.tags || []) set.add(t);
    return Array.from(set).sort();
  }, [emails]);

  // Typeahead suggestions for the Add-tag popover: user's prior tags first
  // (highest relevance), then common CRM email labels so the first-run
  // experience isn't an empty dropdown. HubSpot/Pipedrive seed similar
  // default taxonomies; we stay opt-in (user can type anything).
  const tagSuggestions = useMemo(() => {
    const defaults = [
      'introduction', 'follow-up', 'pricing', 'proposal', 'contract',
      'meeting', 'objection', 'decision', 'thanks', 'intro-warm',
    ];
    const seen = new Set(allTags);
    const extras = defaults.filter((d) => !seen.has(d));
    return [...allTags, ...extras];
  }, [allTags]);

  useEffect(() => {
    const cleanup = fetchEmails();
    return cleanup;
    // `lastSyncAt` is intentionally a dep — when the user clicks Sync
    // now and the gmail-status-store picks up a fresher timestamp,
    // this fires and re-runs `fetchEmails` so the new messages
    // surface without a navigate-away-and-back.
  }, [fetchEmails, lastSyncAt]);

  // Track which threads have been expanded to show their earlier messages.
  // Separate from `expandedId` (which controls whether a single email's
  // body is open for reading) — a user can show a thread's history AND
  // have one of those messages open at the same time.
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
  const toggleThread = useCallback((threadId: string) => {
    setExpandedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }, []);

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return emails.filter((e) => {
      // Tag filter (AND semantics: must match every selected tag)
      if (tagFilter.length > 0) {
        const et = e.tags || [];
        for (const t of tagFilter) if (!et.includes(t)) return false;
      }
      if (!q) return true;
      const hay = [
        e.subject, e.snippet, e.bodyText,
        e.fromEmail, e.fromName,
        ...(e.toEmails || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [emails, searchQuery, tagFilter]);

  /**
   * Group filtered emails by `threadId` so the timeline collapses reply
   * chains into single rows by default. The latest message in each
   * thread becomes the visible "head" — that's the one with the
   * relevant snippet, the most recent timestamp, and any unread/new
   * indicators. Earlier messages stay hidden behind a "Show N earlier
   * in thread" toggle until the user expands the chain.
   *
   * Industry pattern: HubSpot, Salesforce, Pipedrive, Gmail itself —
   * all collapse threads by default with the latest message
   * prominent. Without this, a long back-and-forth on Holly's record
   * looks like 15 separate timeline events instead of 1 conversation.
   *
   * Sort within a thread: chronological ascending (earliest first), so
   * when the user expands the thread the messages read top-to-bottom
   * naturally. Sort BETWEEN threads: pinned-first, then by the latest
   * message's timestamp descending — keeps the existing surface
   * priority of "what just happened" at the top.
   */
  type ThreadGroup = { threadId: string; messages: EmailRow[]; latest: EmailRow };
  const threadGroups = useMemo<ThreadGroup[]>(() => {
    const map = new Map<string, EmailRow[]>();
    for (const e of filteredEmails) {
      const arr = map.get(e.threadId) ?? [];
      arr.push(e);
      map.set(e.threadId, arr);
    }
    const groups: ThreadGroup[] = Array.from(map.entries()).map(([threadId, msgs]) => {
      const sorted = [...msgs].sort(
        (a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt),
      );
      return { threadId, messages: sorted, latest: sorted[sorted.length - 1] };
    });
    groups.sort((a, b) => {
      const aPinned = a.messages.some((m) => m.pinnedAt);
      const bPinned = b.messages.some((m) => m.pinnedAt);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      const aLatest = Date.parse(a.latest.pinnedAt || a.latest.receivedAt);
      const bLatest = Date.parse(b.latest.pinnedAt || b.latest.receivedAt);
      return bLatest - aLatest;
    });
    return groups;
  }, [filteredEmails]);

  const toggleTagFilter = useCallback((t: string) => {
    setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }, []);

  // Single-click creates a task with the email subject as the title. User
  // can refine (due date, edit title) in the Tasks tab. Prevents duplicate
  // task creation for the same email — if a task already references this
  // email, clicking just shows the "already a task" state.
  const createTaskFromEmail = useCallback((email: EmailRow) => {
    const already = existingTasks.some((t) => t.sourceEmailId === email.id);
    if (!already) {
      const title = (email.subject || email.snippet || '(email with no subject)').trim().slice(0, 140);
      addTask({
        id: uid('task'),
        contactId: contact.id,
        title,
        done: false,
        sourceEmailId: email.id,
        createdAt: new Date().toISOString(),
      });
    }
    setJustTasked((prev) => new Set(prev).add(email.id));
    setTimeout(() => {
      setJustTasked((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    }, 1800);
  }, [addTask, contact.id, existingTasks]);

  const taskedEmailIds = useMemo(
    () => new Set(existingTasks.filter((t) => t.sourceEmailId).map((t) => t.sourceEmailId as string)),
    [existingTasks],
  );

  const primaryEmail = useMemo(() => {
    const direct = contact.type === 'person' ? contact.email : undefined;
    if (direct) return direct;
    const entry = contact.entries?.emails?.find((e) => e.primary) ?? contact.entries?.emails?.[0];
    return entry?.value;
  }, [contact]);

  // Unread count for the header badge. Only incoming unread (direction
  // 'from' with readAt === null) counts — sent mail doesn't have an
  // "unread" concept from the sender's perspective.
  const unreadCount = useMemo(
    () => emails.filter((e) => e.direction === 'from' && e.readAt == null && !e.archivedAt).length,
    [emails],
  );

  // Mark an email as read the first time the user expands it. Matches
  // Gmail/Outlook/HubSpot behavior — unread state clears on open, and the
  // visual weight drops so the next genuinely-unread item stands out.
  //
  // Two writes: (1) local `setEmails` so the in-panel pill clears
  // instantly, (2) persisted `markEmailReadInStore` so the tab-trigger
  // badge, contacts-grid unread column, and the read state itself all
  // survive panel re-mount and page reload. Without (2) the demo would
  // "forget" every read the moment the user navigates away.
  const markRead = useCallback((emailId: string) => {
    setEmails((prev) => prev.map((e) =>
      e.id === emailId && e.readAt == null
        ? { ...e, readAt: new Date().toISOString() }
        : e,
    ));
    markEmailReadInStore(emailId);
  }, [markEmailReadInStore]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border)] gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {searchQuery
              ? `${filteredEmails.length} of ${emails.length}`
              : `${emails.length} ${emails.length === 1 ? 'email' : 'emails'}`}
          </div>
          {/* Unread count — Gmail/HubSpot pattern. A small pill with a
              leading dot, solid GREEN fill (Paul's color choice on
              2026-04-28: unread state across the app uses green
              instead of brand-blue). Hidden entirely at 0 (no
              zero-state noise). */}
          {unreadCount > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[10px] font-bold bg-[var(--success)] text-white"
              title={`${unreadCount} unread ${unreadCount === 1 ? 'email' : 'emails'}`}
              aria-label={`${unreadCount} unread`}
            >
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-white" />
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] justify-end">
          <div className="relative flex-1 max-w-[240px]">
            <MagnifyingGlass
              size={12}
              weight="bold"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails…"
              aria-label="Search emails"
              className="w-full pl-7 pr-7 py-1 rounded-md text-[11.5px] bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
              >
                <X size={10} weight="bold" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-transparent text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--surface-raised)] border border-[var(--border)]"
            title={showArchived ? 'Hide archived' : 'Show archived'}
          >
            <Archive size={11} weight={showArchived ? 'fill' : 'regular'} />
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-[var(--brand-primary)] text-white cursor-pointer hover:opacity-90 border-none"
          >
            <PaperPlaneTilt size={12} weight="fill" /> Send email
          </button>
        </div>
      </div>

      {tagSuggestions.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mr-1">
            Filter
          </span>
          {tagSuggestions.map((t) => {
            const active = tagFilter.includes(t);
            const inUse = allTags.includes(t);
            // Applied tags render solid; default (unused) tags render dimmed
            // so the user can tell which ones currently have any emails.
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTagFilter(t)}
                className={`inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-full text-[10px] font-bold cursor-pointer transition-colors border ${active
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                  : inUse
                    ? 'bg-transparent text-[var(--brand-primary)] border-[var(--brand-primary)] hover:bg-[var(--brand-bg)]'
                    : 'bg-transparent text-[var(--text-tertiary)] border-dashed border-[var(--border)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]'}`}
                aria-pressed={active}
                title={inUse ? `Filter by ${t}` : `${t} — no emails tagged yet`}
              >
                <Tag size={8} weight="fill" /> {t}
              </button>
            );
          })}
          {tagFilter.length > 0 && (
            <button
              type="button"
              onClick={() => setTagFilter([])}
              className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-full text-[10px] font-semibold text-[var(--text-tertiary)] bg-transparent border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] cursor-pointer"
              aria-label="Clear tag filters"
            >
              <X size={8} weight="bold" /> Clear
            </button>
          )}
        </div>
      )}

      {loading && <EmailsLoadingSkeleton />}

      {!loading && emails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mb-2">
            <Envelope size={18} weight="duotone" className="text-[var(--text-tertiary)]" />
          </div>
          <div className="text-[12.5px] font-bold text-[var(--text-primary)] mb-1">No emails yet</div>
          <div className="text-[11.5px] text-[var(--text-tertiary)] max-w-[280px]">
            Send an email or sync Gmail to start tracking correspondence with this contact.
          </div>
        </div>
      )}

      {!loading && emails.length > 0 && filteredEmails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mb-2">
            <MagnifyingGlass size={18} weight="duotone" className="text-[var(--text-tertiary)]" />
          </div>
          <div className="text-[12.5px] font-bold text-[var(--text-primary)] mb-1">No matches</div>
          <div className="text-[11.5px] text-[var(--text-tertiary)] max-w-[280px]">
            Nothing in {emails.length} {emails.length === 1 ? 'email' : 'emails'} matches &ldquo;{searchQuery}&rdquo;.
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 p-3">
        {threadGroups.map((group, groupIdx) => {
          const prevGroup = threadGroups[groupIdx - 1];
          const wasPinned = prevGroup ? prevGroup.messages.some((m) => !!m.pinnedAt) : false;
          const isPinned = group.messages.some((m) => !!m.pinnedAt);
          const showUnpinnedDivider = wasPinned && !isPinned;
          const showPinnedHeader = groupIdx === 0 && isPinned;

          const isThreadExpanded = expandedThreadIds.has(group.threadId);
          // When the thread is expanded we render the EARLIER messages
          // (everything except the head) in chronological order ABOVE
          // the head. Gmail's pattern: latest stays prominent at the
          // bottom of the chain so the user's eye lands on "what just
          // happened" while still being able to scroll up for context.
          const earlier = isThreadExpanded ? group.messages.slice(0, -1) : [];
          const moreCount = group.messages.length - 1;

          // Helper to render any message in the group with the same
          // wiring used to live inline before threading. Defined inline
          // so it closes over the contact + handler scope.
          const renderRow = (row: EmailRow) => (
            <EmailRowItem
              key={row.id}
              row={row}
              contactId={contact.id}
              contactName={contact.name}
              expanded={expandedId === row.id}
              viewed={viewedIds.has(row.id)}
              onToggle={() => {
                const willExpand = expandedId !== row.id;
                if (willExpand && row.direction === 'from' && row.readAt == null) {
                  markRead(row.id);
                }
                if (willExpand) markViewed(row.id);
                setExpandedId(expandedId === row.id ? null : row.id);
              }}
              onArchive={() => archiveEmail(row.id, !row.archivedAt)}
              onPin={() => pinEmail(row.id, !row.pinnedAt)}
              onUpdateTags={(next) => updateTags(row.id, next)}
              onCreateTask={() => createTaskFromEmail(row)}
              suggestions={tagSuggestions}
              hasTask={taskedEmailIds.has(row.id)}
              justTasked={justTasked.has(row.id)}
            />
          );

          return (
            <div key={group.threadId} className="flex flex-col gap-2">
              {showPinnedHeader && <SectionLabel icon={<PushPin size={10} weight="fill" />} label="Pinned" />}
              {showUnpinnedDivider && <SectionLabel label="Earlier" />}

              {/* Earlier-in-thread messages (only visible when expanded). */}
              {earlier.length > 0 && (
                <div className="flex flex-col gap-2 pl-3 border-l-2 border-[var(--border)]">
                  {earlier.map(renderRow)}
                </div>
              )}

              {/* The thread head — the latest message. Always visible. */}
              {renderRow(group.latest)}

              {/* Show / hide N earlier messages in this thread.
                  Only renders when the thread has more than one message.
                  Subtle button — sits under the head as a secondary
                  affordance, not a primary CTA. */}
              {moreCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleThread(group.threadId)}
                  className="self-start inline-flex items-center gap-1 px-2 py-0.5 -mt-1 ml-1 text-[10.5px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer transition-colors"
                  title={isThreadExpanded ? 'Collapse this thread' : 'Show earlier messages in this thread'}
                >
                  <span aria-hidden="true">{isThreadExpanded ? '▾' : '▸'}</span>
                  {isThreadExpanded
                    ? `Hide ${moreCount} earlier message${moreCount === 1 ? '' : 's'}`
                    : `Show ${moreCount} earlier message${moreCount === 1 ? '' : 's'} in thread`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <EmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={() => fetchEmails()}
        contactId={contact.id}
        recipientName={contact.name}
        initialTo={primaryEmail || ''}
      />
    </div>
  );
}

function EmailRowItem({ row, contactId, contactName, expanded, viewed, onToggle, onArchive, onPin, onUpdateTags, onCreateTask, suggestions, hasTask, justTasked }: {
  row: EmailRow;
  contactId: string;
  contactName: string;
  expanded: boolean;
  /** True if the user has clicked this email open at least once.
   *  Persisted across sessions in localStorage — once true, the
   *  "New" pill stays suppressed forever. */
  viewed: boolean;
  onToggle: () => void;
  onArchive: () => void;
  onPin: () => void;
  onUpdateTags: (next: string[]) => void;
  onCreateTask: () => void;
  suggestions: string[];
  hasTask: boolean;
  justTasked: boolean;
}) {
  // Direction is labeled from the LOGGED-IN USER's POV — matches
  // HubSpot/Salesforce/Pipedrive convention, the Activity Log
  // timeline in this same app, AND Gmail's own Sent / Inbox folders.
  // (Earlier flipped to contact-POV based on a misread; the result
  // was an email you sent showing as "Received" on the contact's
  // record, contradicting both Gmail and the Activity Log. Reverted
  // 2026-04-27.)
  //
  // Mapping (data → user-POV label):
  //   row.direction === 'from'   someone sent it TO me  → "Received"  ↙
  //   row.direction !== 'from'   I sent it              → "Sent"      ↗
  //
  // Unread concept also belongs to the user — sent mail is always
  // "read" by the sender; only received mail can be unread.
  const incoming = row.direction === 'from';
  const date = new Date(row.receivedAt);
  const when = formatWhen(date);
  const archived = !!row.archivedAt;
  const pinned = !!row.pinnedAt;
  const tags = row.tags || [];
  const attachments = row.attachments || [];
  const unread = incoming && row.readAt == null && !archived;
  // "New" indicator — orthogonal to unread. Fires for any email (sent
  // OR received) that arrived within the last 10 minutes and hasn't
  // been clicked open by the user yet. Mirrors Slack-style "new since
  // you last looked".
  //
  // The clear trigger is `viewed` (persisted in localStorage), NOT
  // `expanded` (transient UI state). Important difference: expanded
  // flips back to false when the user collapses the row, which would
  // otherwise re-show the New pill within the 10-min window — exactly
  // the "how do I get the new tag to go away?" bug Paul ran into on
  // 2026-04-27. Once `viewed` is true the pill stays gone for good,
  // even after a page refresh.
  const NEW_WINDOW_MS = 10 * 60 * 1000;
  const ageMs = Date.now() - date.getTime();
  const isNew = !viewed && !archived && ageMs >= 0 && ageMs < NEW_WINDOW_MS;
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  // `who` describes the OTHER party from the user's POV.
  //   incoming (received) → show sender    (e.g. "Holly Bajar")
  //   outgoing (sent)     → show recipient (e.g. "To paulcindywentzell@gmail.com")
  const who = incoming
    ? (row.fromName || row.fromEmail || 'Unknown')
    : `To ${row.toEmails[0] || 'unknown'}${row.toEmails.length > 1 ? ` +${row.toEmails.length - 1}` : ''}`;

  return (
    <div
      className={`group relative w-full text-left border rounded-lg cursor-pointer transition-colors ${
        pinned ? 'border-[var(--brand-primary)]' : unread ? 'border-[var(--success)]' : 'border-[var(--border)]'
      } ${unread ? 'bg-[var(--success-bg)]' : 'bg-[var(--surface-card)]'} hover:border-[var(--brand-primary)] ${
        archived ? 'opacity-60' : ''
      } ${tagEditorOpen ? 'z-40' : ''}`}
    >
      {/* Removed the brand-primary left-edge bar that used to render here
          for unread incoming emails. Paul (2026-04-27) flagged it as a
          "selected/active card" treatment and asked it gone — the
          remaining unread cues (bolder subject + the "Unread" pill) are
          enough signal without lighting up the whole row's left edge.
          Verified via grep that no other surface in the app uses the
          same `absolute left-0 ... bg-brand-primary` pattern, so this
          change is local to the email row. */}
    <button
      onClick={onToggle}
      className="w-full text-left bg-transparent border-none cursor-pointer px-3 py-2 rounded-lg"
    >
      <div className="flex items-center gap-2 mb-0.5">
        {incoming
          ? <ArrowDownLeft size={12} weight="bold" className="text-[var(--brand-primary)]" />
          : <ArrowUpRight size={12} weight="bold" className="text-[var(--text-secondary)]" />}
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          {incoming ? 'Received' : 'Sent'}
        </span>
        <span className="text-[10.5px] text-[var(--text-tertiary)]">· {when}</span>
        {isNew && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--success)] text-white"
            title="Synced in the last 10 minutes — clears when you open it"
            aria-label="New email"
          >
            <span aria-hidden="true" className="w-1 h-1 rounded-full bg-white" />
            New
          </span>
        )}
        {unread && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--success)] text-white"
            title="You haven't opened this email yet"
            aria-label="Unread email"
          >
            <span aria-hidden="true" className="w-1 h-1 rounded-full bg-white" />
            Unread
          </span>
        )}
        {pinned && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
            <PushPin size={8} weight="fill" /> Pinned
          </span>
        )}
        {archived && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--surface-raised)] text-[var(--text-tertiary)] border border-[var(--border)]">
            <Archive size={8} weight="fill" /> Archived
          </span>
        )}
      </div>
      {/* Subject — when unread, render with extra weight (800) so the
          visual hierarchy matches Gmail/Outlook. Read rows use the normal
          700 "bold" weight. Font-size stays constant so rows don't jump
          height when an unread one is opened. */}
      <div
        className={`text-[12.5px] text-[var(--text-primary)] mb-0.5 truncate ${
          unread ? 'font-extrabold' : 'font-bold'
        }`}
      >
        {row.subject || '(no subject)'}
      </div>
      <div className="text-[11.5px] text-[var(--text-secondary)] mb-1 flex items-center gap-1.5 flex-wrap">
        <span className="truncate">{who}</span>
        {attachments.length > 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]"
            title={`${attachments.length} ${attachments.length === 1 ? 'attachment' : 'attachments'}`}
          >
            <Paperclip size={8} weight="bold" /> {attachments.length}
          </span>
        )}
        {/* Open/click tracking pixels only fire on emails the user
            sent — i.e. outgoing, i.e. !incoming. */}
        {!incoming && (row.openCount ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--success-bg,#e7f5ec)] text-[var(--success,#1f7a3a)] border border-[var(--success,#1f7a3a)]">
            <Eye size={8} weight="fill" /> Opened {row.openCount! > 1 ? `${row.openCount}×` : ''}
          </span>
        )}
        {!incoming && (row.clickCount ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
            <CursorClick size={8} weight="fill" /> {row.clickCount}× click
          </span>
        )}
      </div>
      {!expanded && row.snippet && (
        <div className="text-[11.5px] text-[var(--text-tertiary)] line-clamp-2">{row.snippet}</div>
      )}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] text-[12px] text-[var(--text-primary)] whitespace-pre-wrap break-words leading-relaxed">
          {row.bodyText || row.snippet || '(no body)'}
        </div>
      )}
      </button>
      {/* Attachments render whenever they exist (collapsed OR expanded) so
          the user can preview/save/download without an extra click to expand
          the message body. Per Paul 2026-04-27: "very shitty ux" to gate
          chips behind the expand interaction. Mirrors Gmail's row-level
          attachment chip strip and HubSpot's email card layout. */}
      {attachments.length > 0 && (
        <AttachmentsList
          attachments={attachments}
          messageRowId={row.id}
          contactId={contactId}
          contactName={contactName}
          senderName={row.fromName || row.fromEmail || undefined}
          subject={row.subject}
        />
      )}
      <TagRow
        tags={tags}
        open={tagEditorOpen}
        onOpenChange={setTagEditorOpen}
        onUpdateTags={onUpdateTags}
        suggestions={suggestions}
      />
      <div className={`absolute top-2 right-2 flex items-center gap-1 ${(archived || pinned || hasTask) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} focus-within:opacity-100 transition-opacity`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCreateTask(); }}
          title={hasTask ? 'Already converted to a task — see Tasks tab' : 'Create task from this email'}
          aria-label="Create task from email"
          className={`w-6 h-6 rounded-md bg-[var(--surface-card)] border cursor-pointer flex items-center justify-center transition-colors ${
            justTasked
              ? 'border-[var(--success,#1f7a3a)] text-[var(--success,#1f7a3a)]'
              : hasTask
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]'
          }`}
        >
          {justTasked
            ? <CheckCircle size={11} weight="fill" />
            : <ListChecks size={11} weight={hasTask ? 'fill' : 'bold'} />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          title={pinned ? 'Unpin' : 'Pin — keep at the top of this contact\u2019s emails'}
          aria-label={pinned ? 'Unpin email' : 'Pin email'}
          className={`w-6 h-6 rounded-md bg-[var(--surface-card)] border ${pinned ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-[var(--border)] text-[var(--text-tertiary)]'} cursor-pointer flex items-center justify-center hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]`}
        >
          {pinned ? <PushPinSlash size={11} weight="bold" /> : <PushPin size={11} weight="bold" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          title={archived ? 'Remove from view (already archived)' : 'Archive — hide from this tab, keep in Activity Log'}
          aria-label="Archive email"
          className="w-6 h-6 rounded-md bg-[var(--surface-card)] border border-[var(--border)] cursor-pointer flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
        >
          <Archive size={11} weight="bold" />
        </button>
      </div>
    </div>
  );
}

/**
 * Inline tag chips + add-tag popover. Gmail/Folk pattern: free-form labels
 * with typeahead against the user's existing tag set. No formal taxonomy.
 *
 * Click a chip's × to remove it. Click "+ tag" to open the popover; Enter
 * creates a new tag, clicking a suggestion adds an existing one.
 */
function TagRow({ tags, open, onOpenChange, onUpdateTags, suggestions }: {
  tags: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdateTags: (next: string[]) => void;
  suggestions: string[];
}) {
  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t || t.length > 40) return;
    if (tags.includes(t)) return;
    onUpdateTags([...tags, t].slice(0, 20));
  };
  const removeTag = (t: string) => onUpdateTags(tags.filter((x) => x !== t));
  const showEmptyHint = tags.length === 0;

  return (
    <div className="px-3 pb-2 flex items-center gap-1 flex-wrap">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-[1px] rounded-full text-[10px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]"
        >
          <Tag size={8} weight="fill" /> {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(t); }}
            aria-label={`Remove tag ${t}`}
            className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer bg-transparent border-none text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
          >
            <X size={7} weight="bold" />
          </button>
        </span>
      ))}
      <TagAddTrigger
        open={open}
        showEmptyHint={showEmptyHint}
        onOpenChange={onOpenChange}
        existing={tags}
        suggestions={suggestions}
        onAdd={addTag}
      />
    </div>
  );
}

/**
 * Trigger button + portalled popover. The popover renders into
 * `document.body` so it escapes every parent's stacking context, overflow
 * clip, and transform — the standard pattern for any overlay (dropdown,
 * tooltip, dialog). Position is computed from the trigger's bounding rect.
 */
function TagAddTrigger({ open, showEmptyHint, onOpenChange, existing, suggestions, onAdd }: {
  open: boolean;
  showEmptyHint: boolean;
  onOpenChange: (v: boolean) => void;
  existing: string[];
  suggestions: string[];
  onAdd: (t: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenChange(!open); }}
        className={`inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-full text-[10px] font-semibold bg-transparent cursor-pointer border border-dashed hover:border-[var(--brand-primary)] hover:text-[var(--text-primary)] ${open ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]' : 'text-[var(--text-tertiary)] border-[var(--border)]'} ${showEmptyHint ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity' : ''}`}
        aria-label="Add tag"
        aria-expanded={open}
      >
        {showEmptyHint ? <><Tag size={9} weight="bold" /> Add tag</> : <Plus size={8} weight="bold" />}
      </button>
      {open && (
        <TagEditorPopover
          anchor={triggerRef.current}
          existing={existing}
          suggestions={suggestions}
          onAdd={onAdd}
          onClose={() => onOpenChange(false)}
        />
      )}
    </>
  );
}

/**
 * Portalled popover. Positioned via fixed coords derived from `anchor`'s
 * bounding rect, so no parent overflow/stacking context can clip or hide
 * it. Typeahead filters the user's prior tag list; Enter commits whatever
 * is typed.
 */
function TagEditorPopover({ anchor, existing, suggestions, onAdd, onClose }: {
  anchor: HTMLElement | null;
  existing: string[];
  suggestions: string[];
  onAdd: (t: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const compute = () => {
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    };
    compute();
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [anchor]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)
          && anchor && !anchor.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, anchor]);

  const q = value.trim().toLowerCase();
  const filtered = suggestions
    .filter((s) => !existing.includes(s))
    .filter((s) => (q ? s.includes(q) : true))
    .slice(0, 6);

  const commit = (raw: string) => {
    onAdd(raw);
    setValue('');
  };

  if (typeof document === 'undefined' || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
      className="fixed min-w-[200px] bg-[var(--surface-card)] border border-[var(--border)] rounded-md shadow-lg p-1"
      role="dialog"
      aria-label="Add tag"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (q) commit(value);
          }
        }}
        placeholder="New tag…"
        className="w-full px-2 py-1 rounded-sm text-[11.5px] bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-tertiary)]"
      />
      {filtered.length > 0 && (
        <div className="mt-1 flex flex-col">
          <div className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Suggestions
          </div>
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11.5px] text-[var(--text-primary)] bg-transparent border-none cursor-pointer hover:bg-[var(--surface-raised)] text-left"
            >
              <Tag size={9} weight="fill" className="text-[var(--brand-primary)]" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * Skeleton loader for the email list. Renders three placeholder cards that
 * mirror the real EmailRowItem layout (icon+label, subject, sender, snippet)
 * so the page doesn't shift when data lands. A left-to-right shimmer sweeps
 * across the placeholders.
 *
 * WCAG: the animated highlight color is chosen so its contrast with the card
 * background meets the 3:1 minimum for non-text UI components (WCAG 2.1 SC
 * 1.4.11). Respects prefers-reduced-motion via the `motion-reduce` variant —
 * the shimmer gradient is disabled and only a static dimmed block remains.
 */
function EmailsLoadingSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 p-3"
      role="status"
      aria-live="polite"
      aria-label="Loading emails"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden bg-[var(--surface-card)] border border-[var(--border)] rounded-lg px-3 py-2"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <SkeletonBlock className="w-3 h-3 rounded-sm" />
            <SkeletonBlock className="w-16 h-2.5 rounded-sm" />
            <SkeletonBlock className="w-10 h-2.5 rounded-sm" />
          </div>
          <SkeletonBlock className="w-3/5 h-3 rounded-sm mb-1.5" />
          <SkeletonBlock className="w-2/5 h-2.5 rounded-sm mb-2" />
          <SkeletonBlock className="w-11/12 h-2 rounded-sm mb-1" />
          <SkeletonBlock className="w-9/12 h-2 rounded-sm" />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none motion-reduce:hidden"
            style={{
              // --skeleton-shimmer is theme-aware (bright white in light
              // mode, low-alpha white in dark mode) so the sweep is
              // visible against --skeleton-bg in both themes. The old
              // --surface-raised highlight was effectively the same
              // color as the placeholder, making the animation
              // invisible.
              background:
                'linear-gradient(90deg, transparent 0%, var(--skeleton-shimmer, rgba(255,255,255,0.85)) 50%, transparent 100%)',
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
      <span className="sr-only">Loading emails, please wait…</span>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
      {icon}
      <span>{label}</span>
      <span className="flex-1 h-px bg-[var(--border)]" aria-hidden="true" />
    </div>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--skeleton-bg)] ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Attachment list for an expanded email row. Each chip shows the file-family
 * accent color + filename + size, and exposes two actions:
 *
 *   Save to Documents — fetch the bytes and call document-store.addDocument,
 *     auto-tagged with this contact's id and 'correspondence' category.
 *     Matches HubSpot's "Save to library" pattern: attachments from emails
 *     become first-class CRM documents so the same file shows up on
 *     Documents tab + the timeline.
 *
 *   Download — same fetch, but pipes the Blob through a hidden <a download>.
 *     For when the user just wants the file on disk without adding it to
 *     Roadrunner's library.
 *
 * Outbound attachments have `documentId` (no fetch needed — the library
 * already has the source file); those chips show a "Saved" badge instead
 * of the save button and clicking opens the Documents tab (future).
 *
 * Inbound attachments use `gmailAttachmentId` to lazy-fetch bytes via the
 * /api/emails/:id/attachments/:attachmentId route. The fetch returns
 * standard base64 which we wrap into a Blob/File for both flows.
 */
function AttachmentsList({ attachments, messageRowId, contactId, contactName, senderName, subject }: {
  attachments: EmailAttachment[];
  messageRowId: string;
  contactId: string;
  contactName: string;
  senderName?: string;
  subject?: string | null;
}) {
  const router = useRouter();
  const addDocument = useDocumentStore((s) => s.addDocument);
  const allDocs = useDocumentStore((s) => s.documents);
  const pushToast = useToastStore((s) => s.push);
  // Track per-attachment in-flight state for the two actions so buttons can
  // show a spinner / success check without going through the toast noise.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set());
  // Preview modal state — holds the resolved blob for the currently-previewed
  // attachment. We resolve through the same pathway as save/download so seed
  // attachments and live Gmail bytes both work uniformly.
  const [previewing, setPreviewing] = useState<{
    att: EmailAttachment;
    key: string;
    payload: PreviewableAttachment;
  } | null>(null);

  const savedDocIds = useMemo(() => new Set(allDocs.map((d) => d.id)), [allDocs]);

  // Last-error capture — surfaces the actual server error in the toast
  // instead of generic "Couldn't fetch / Download failed" so we can see
  // what's wrong without diving into DevTools.
  const lastErrorRef = useRef<string | null>(null);

  const fetchBytes = async (att: EmailAttachment): Promise<{
    filename: string; mimeType: string; dataBase64: string; size: number;
  } | null> => {
    lastErrorRef.current = null;
    if (!att.gmailAttachmentId) {
      lastErrorRef.current = 'attachment has no gmailAttachmentId';
      return null;
    }
    if (!messageRowId) {
      lastErrorRef.current = 'no messageRowId';
      return null;
    }
    // Pass filename + mimeType as query params so the server doesn't have
    // to round-trip Gmail's `messages.get` just to fill the response shape.
    const qs = new URLSearchParams({
      filename: att.filename,
      mimeType: att.mimeType,
    });
    const url = `/api/emails/${messageRowId}/attachments/${encodeURIComponent(att.gmailAttachmentId)}?${qs.toString()}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      lastErrorRef.current = `network error: ${e instanceof Error ? e.message : String(e)}`;
      return null;
    }
    let data: { ok?: boolean; error?: string; detail?: string; filename?: string; mimeType?: string; dataBase64?: string; size?: number } = {};
    try {
      data = await res.json();
    } catch {
      lastErrorRef.current = `HTTP ${res.status} (response not JSON)`;
      return null;
    }
    if (!res.ok || !data.ok) {
      lastErrorRef.current = `HTTP ${res.status}: ${data.error || 'unknown'}${data.detail ? ` — ${data.detail}` : ''}`;
      return null;
    }
    return data as { filename: string; mimeType: string; dataBase64: string; size: number };
  };

  const base64ToBlob = (b64: string, mimeType: string): Blob => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });

  // Seed attachments are demo placeholders — their `gmailAttachmentId` has
  // the `seed-att-` prefix and doesn't exist in Gmail. Hitting the Gmail
  // proxy for them 502s with "gmail_fetch_failed", which is what surfaced
  // the "Couldn't fetch attachment" / "Download failed" toasts Paul saw.
  const isSeedAttachment = (att: EmailAttachment) =>
    !!att.gmailAttachmentId && att.gmailAttachmentId.startsWith('seed-att-');

  /**
   * Unified resolver — returns a Blob + metadata for either flow. For seed
   * attachments we synthesize a REAL valid file (PDF via jsPDF, DOCX/XLSX
   * via @zip.js OOXML assembly) so every download opens cleanly in the
   * user's viewer. For real Gmail attachments we pull bytes via the API.
   * Returning `null` means "failed, toast the user".
   */
  const resolveAttachment = async (att: EmailAttachment): Promise<{
    filename: string; mimeType: string; size: number; blob: Blob;
  } | null> => {
    if (isSeedAttachment(att)) {
      const blob = await buildSeedPlaceholderBlob(att, {
        contactName,
        senderName,
        subject,
      });
      return {
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size || blob.size,
        blob,
      };
    }
    const bytes = await fetchBytes(att);
    if (!bytes) return null;
    const blob = base64ToBlob(bytes.dataBase64, bytes.mimeType);
    return { filename: bytes.filename, mimeType: bytes.mimeType, size: bytes.size, blob };
  };

  const saveToDocuments = async (att: EmailAttachment, key: string) => {
    setBusyKey(key);
    try {
      const resolved = await resolveAttachment(att);
      if (!resolved) {
        pushToast({
          severity: 'error',
          title: 'Couldn\u2019t fetch attachment',
          description: lastErrorRef.current || 'Check Gmail connection and retry.',
        });
        return;
      }
      const { filename, mimeType, size, blob } = resolved;
      const fileFamily = getFileFamily(mimeType, filename);
      // Read the bytes as a data URL once so the saved doc survives reload —
      // object URLs expire, and the document-store's attachFile also does
      // this conversion in the background. We do it inline so the user's
      // immediate "open in Documents" shows the preview right away.
      const dataUrl = await blobToDataUrl(blob);
      addDocument({
        id: uid('doc'),
        name: filename.replace(/\.[^.]+$/, ''),
        fileName: filename,
        mimeType,
        size,
        fileFamily,
        category: 'correspondence',
        contactId,
        uploadedAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        uploadedBy: 'Current User',
        previewUrl: dataUrl,
        thumbnailUrl: mimeType.startsWith('image/') ? dataUrl : undefined,
      });
      setJustSaved((prev) => new Set(prev).add(key));
      // Action-linked success toast — Paul's feedback: "isn't save supposed
      // to ask I want to save to documents for this contact". HubSpot's
      // "View in record" toast affordance is the closest analog. One click
      // lands them on the Documents tab with the new file visible.
      pushToast({
        severity: 'success',
        title: 'Saved to Documents',
        description: filename,
        action: {
          label: 'View in Documents',
          onClick: () => router.push(`/contacts/${contactId}?tab=documents`),
        },
      });
    } catch (err) {
      console.error('[AttachmentsList] save failed', err);
      pushToast({ severity: 'error', title: 'Save failed' });
    } finally {
      setBusyKey((k) => (k === key ? null : k));
    }
  };

  /**
   * Office formats Microsoft's free Office Online embed viewer can render
   * with the actual Word/Excel/PowerPoint engine. Same set Outlook web
   * supports inline. We do **not** include CSV/RTF here — those parse
   * fine in-browser and don't need a round-trip to Microsoft.
   */
  const isOfficeViewerFormat = (att: EmailAttachment): boolean => {
    const m = (att.mimeType || '').toLowerCase();
    if (m === 'application/msword') return true;
    if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;
    if (m === 'application/vnd.ms-excel') return true;
    if (m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true;
    if (m === 'application/vnd.ms-powerpoint') return true;
    if (m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return true;
    const ext = (att.filename || '').toLowerCase().split('.').pop() || '';
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
  };

  /**
   * Mints a signed proxy URL for Microsoft's Office Online embed viewer
   * to fetch. Returns null on failure (caller falls back to in-browser
   * rendering of the bytes).
   */
  const fetchOfficeViewerUrl = async (
    att: EmailAttachment,
  ): Promise<string | null> => {
    if (!att.gmailAttachmentId || !messageRowId) return null;
    const qs = new URLSearchParams({
      filename: att.filename,
      mimeType: att.mimeType,
    });
    const url = `/api/emails/${messageRowId}/attachments/${encodeURIComponent(att.gmailAttachmentId)}/preview-url?${qs.toString()}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        lastErrorRef.current = `HTTP ${res.status}: ${data.error || 'unknown'}${data.detail ? ` — ${data.detail}` : ''}`;
        return null;
      }
      // Microsoft's viewer can't reach localhost; the route flags this
      // so we transparently fall back to in-browser rendering.
      if (data.isLocal) {
        console.warn('[EmailsPanel] preview-url is localhost; Microsoft viewer cannot reach it — using in-browser fallback');
        return null;
      }
      return data.officeViewerUrl as string;
    } catch (e) {
      lastErrorRef.current = `network error: ${e instanceof Error ? e.message : String(e)}`;
      return null;
    }
  };

  const previewFile = async (att: EmailAttachment, key: string) => {
    setBusyKey(key);
    try {
      // For DOC/DOCX/XLS/XLSX/PPT/PPTX: try the Office Online viewer first
      // (pixel-perfect — Word/Excel/PowerPoint's real renderer). Falls
      // back to in-browser parsing if the URL fetch fails or we're on
      // localhost (Microsoft can't reach localhost). Seed attachments
      // never use the Office viewer because they're synthesized client-
      // side and have no Gmail-side bytes for Microsoft to fetch.
      if (isOfficeViewerFormat(att) && !att.gmailAttachmentId?.startsWith('seed-att-')) {
        const viewerUrl = await fetchOfficeViewerUrl(att);
        if (viewerUrl) {
          setPreviewing({
            att,
            key,
            payload: {
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              viewerUrl,
            },
          });
          return;
        }
        // Fall through to blob-based fallback.
      }
      const resolved = await resolveAttachment(att);
      if (!resolved) {
        pushToast({
          severity: 'error',
          title: 'Couldn\u2019t load preview',
          description: lastErrorRef.current || undefined,
        });
        return;
      }
      setPreviewing({
        att,
        key,
        payload: {
          filename: resolved.filename,
          mimeType: resolved.mimeType,
          size: resolved.size,
          blob: resolved.blob,
        },
      });
    } catch (err) {
      console.error('[AttachmentsList] preview failed', err);
      pushToast({ severity: 'error', title: 'Preview failed' });
    } finally {
      setBusyKey((k) => (k === key ? null : k));
    }
  };

  const downloadFile = async (att: EmailAttachment, key: string) => {
    setBusyKey(key);
    try {
      const resolved = await resolveAttachment(att);
      if (!resolved) {
        pushToast({
          severity: 'error',
          title: 'Download failed',
          description: lastErrorRef.current || undefined,
        });
        return;
      }
      const { filename, blob } = resolved;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after a tick so Chrome has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('[AttachmentsList] download failed', err);
      pushToast({ severity: 'error', title: 'Download failed' });
    } finally {
      setBusyKey((k) => (k === key ? null : k));
    }
  };

  return (
    <div className="px-3 pb-2 pt-1 flex flex-col gap-1">
      {attachments.map((att, idx) => {
        // For outbound (documentId): the library already has it — show a
        // "In library" badge, no fetch/save buttons.
        // For inbound (gmailAttachmentId): two-action row (save + download).
        const key = att.gmailAttachmentId || att.documentId || `${att.filename}-${idx}`;
        const isOutbound = !!att.documentId;
        const stillInLibrary = isOutbound && savedDocIds.has(att.documentId!);
        const color = getExtColor(att.filename, getFileFamily(att.mimeType, att.filename));
        const busy = busyKey === key;
        const saved = justSaved.has(key);
        return (
          <div
            key={key}
            // Subtle file-family color tint as the row background — keeps
            // the visual hierarchy that the now-removed paperclip anchor
            // block used to provide, but spread across the whole row so
            // it reads as "this is a file row" without the redundant
            // icon. ~7% alpha (`12` hex) keeps it readable in both
            // light and dark themes; the matching color border lifts
            // it one step above the panel background.
            style={{ backgroundColor: `${color}12`, borderColor: `${color}40` }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md border"
          >
            {/* Per-attachment paperclip icon was removed on 2026-04-27
                per Paul: "remove the paperclip icon it has no value.
                the user knows it's an attachment" — the filename plus
                the "<ext> · <size>" subtitle already make the row's
                purpose unambiguous. The file-family `color` lives on
                as a subtle row-wide tint (above) instead. */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate" title={att.filename}>
                {att.filename}
              </div>
              <div className="text-[10.5px] text-[var(--text-tertiary)]">
                {att.mimeType.split('/')[1] || att.mimeType}
                {att.size > 0 && <> · {formatFileSize(att.size)}</>}
                {isOutbound && <> · From Documents</>}
              </div>
            </div>
            {isOutbound ? (
              stillInLibrary ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold text-[var(--brand-primary)] border border-[var(--brand-primary)] bg-[var(--brand-bg)]"
                  title="This file is in your Documents library"
                >
                  <Check size={10} weight="bold" /> In library
                </span>
              ) : (
                <span className="text-[10.5px] text-[var(--text-tertiary)]">Removed from library</span>
              )
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => previewFile(att, key)}
                  disabled={busy}
                  title="Preview"
                  aria-label={`Preview ${att.filename}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold border border-[var(--border)] text-[var(--text-secondary)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:cursor-default disabled:opacity-70"
                >
                  <Eye size={10} weight="bold" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => saveToDocuments(att, key)}
                  disabled={busy || saved}
                  title={saved ? 'Saved to Documents' : 'Save to Documents'}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold border cursor-pointer transition-colors ${
                    saved
                      ? 'border-[var(--success,#1f7a3a)] text-[var(--success,#1f7a3a)] bg-[var(--success-bg,#e7f5ec)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] bg-transparent hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                  } disabled:cursor-default disabled:opacity-70`}
                >
                  {saved
                    ? <><CheckCircle size={10} weight="fill" /> Saved</>
                    : <><FloppyDisk size={10} weight="bold" /> {busy ? 'Saving\u2026' : 'Save'}</>}
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile(att, key)}
                  disabled={busy}
                  title="Download to your computer"
                  aria-label={`Download ${att.filename}`}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[var(--border)] bg-transparent text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
                >
                  <DownloadSimple size={11} weight="bold" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      <AttachmentPreviewModal
        attachment={previewing?.payload ?? null}
        onClose={() => setPreviewing(null)}
        saveDisabled={previewing ? justSaved.has(previewing.key) : false}
        saveLabel={previewing && justSaved.has(previewing.key) ? 'Saved' : 'Save to Documents'}
        onSave={previewing ? () => saveToDocuments(previewing.att, previewing.key) : undefined}
        onDownload={previewing ? () => downloadFile(previewing.att, previewing.key) : undefined}
      />
    </div>
  );
}

function formatWhen(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: now.getFullYear() === date.getFullYear() ? undefined : 'numeric' });
}
