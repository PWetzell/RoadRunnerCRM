'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, CheckCircle, Users, ArrowRight, Envelope, ArrowsClockwise, PlugsConnected, CaretDown, MagnifyingGlass, Paperclip, CaretRight, FileText } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useToastStore } from '@/stores/toast-store';
import type { ContactWithEntries } from '@/types/contact';
import type { SenderSuggestion } from '@/lib/gmail/suggestions';

interface SuggestionsDiagnostics {
  totalMessages: number;
  totalContacts: number;
  hasConnection: boolean;
  lastSyncAt: string | null;
  /** distinct from_email values seen in the scanned message window */
  uniqueSenders?: number;
  /** how many were dropped because they're already a contact */
  filteredAsExisting?: number;
  /** how many were dropped by the noise heuristic (only meaningful when includeNoise=false) */
  filteredAsNoise?: number;
  reason:
    | 'ok'
    | 'no_connection'
    | 'no_messages'
    | 'all_imported'
    | 'all_filtered'
    | 'unauthenticated';
}

/**
 * Shape of one email returned by /api/gmail/messages-by-sender, used to
 * populate the per-row accordion preview. Mirrors the API response so the
 * client doesn't have to remap.
 */
interface PreviewMessage {
  id: string;
  subject: string | null;
  snippet: string | null;
  receivedAt: string;
  // fromEmail / fromName drive the per-row "You · Holly Bajar" label
  // in the accordion so both sides of a thread read naturally. The
  // route returns the lowercased from_email and the original from_name
  // exactly as Gmail had it — UI compares against the suggestion's
  // email to decide whether to render "You" or the contact's name.
  fromEmail: string | null;
  fromName: string | null;
  attachments: Array<{ filename: string; size?: number; mimeType?: string }>;
}

interface Props {
  /** When true, the modal renders over the app. Controlled by the parent. */
  open: boolean;
  /** Called when the user closes — either via Import, Skip, or Escape. */
  onClose: () => void;
}

/**
 * Curated Gmail import wizard.
 *
 * Shows the user's top Gmail senders that aren't already contacts, with
 * frequency-based smart defaults pre-selected. On submit we batch-create
 * contacts via `/api/contacts/batch` (which also retroactively links past
 * emails) and then rehydrate the Zustand store from Supabase so the grid
 * reflects the new reality.
 *
 * Based on Close's "Top Senders" pattern (frequency = signal) with the
 * Folk-style multi-select aesthetic.
 */
export default function OnboardingImportModal({ open, onClose }: Props) {
  const pushToast = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [suggestions, setSuggestions] = useState<SenderSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [diagnostics, setDiagnostics] = useState<SuggestionsDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Sort / filter / search controls ─────────────────────────────────
  // Earlier versions hardcoded "by email count desc" and offered no
  // way to find a specific sender. Paul's feedback on 2026-04-27:
  // count is one valid signal but users should be able to (a) sort by
  // alternative criteria, (b) narrow the list to a date range, (c)
  // narrow to senders who attached files, and (d) jump straight to a
  // person by name. All four needs are exposed below.
  //
  // Industry parallels:
  //   • Sort         — HubSpot defaults alphabetical, Folk by last-contacted,
  //                    Close by frequency. We expose all three; default = count.
  //   • Date range   — Gmail's "Date" chip pattern (Anytime / Last week / etc.)
  //   • Attachments  — HubSpot's "Has attachments" filter on the email index
  //   • Search       — Substring match on name OR email, debounce-free
  //                    (lists are ≤200 items so rendering is cheap).
  type SortKey = 'count' | 'name' | 'date';
  type DateRange = 'all' | '7d' | '30d' | '90d';
  const [sortBy, setSortBy] = useState<SortKey>('count');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(false);
  const [search, setSearch] = useState('');
  // ─── Noise filter override ────────────────────────────────────────────
  // Default OFF so the wizard suggests real correspondents first. The
  // EmptyState for `all_filtered` flips this on with one click so a
  // user whose inbox is entirely LinkedIn / Indeed / newsletters
  // (Paul's real account, 2026-04-27) can still see and triage every
  // sender. When ON we re-fetch with `?includeNoise=true` so the
  // server returns the unfiltered top-N.
  const [includeNoise, setIncludeNoise] = useState(false);

  // ─── Per-row email preview accordion ──────────────────────────────────
  // Paul's framing on 2026-04-27: "a new user wanting to use Roadrunner
  // having 100's of emails to figure out and decide which ones to add"
  // — the user can't make a confident import decision from sender +
  // count alone. They need to peek at actual subjects + attachments,
  // the same way Gmail's contact card shows recent emails inline.
  //
  // We lazy-fetch on first expand (no preload — keeps the wizard open
  // fast when there are 50 suggestions) and cache per email so
  // re-collapsing/expanding doesn't re-hit the API. State per email:
  //   undefined   = never expanded
  //   { loading } = fetch in-flight
  //   { messages }= loaded successfully
  //   { error }   = fetch failed (still allow retry on next expand)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previewByEmail, setPreviewByEmail] = useState<
    Record<
      string,
      { loading: boolean; error?: string | null; messages?: PreviewMessage[] }
    >
  >({});

  async function ensurePreview(email: string) {
    // Already loaded or in-flight → no-op. Errors are sticky until the
    // user collapses + re-expands, which clears via the toggle path.
    const cached = previewByEmail[email];
    if (cached && (cached.loading || cached.messages)) return;
    setPreviewByEmail((p) => ({ ...p, [email]: { loading: true } }));
    try {
      // limit=25 because the route now expands by thread (both sides of
      // the correspondence). 10 was fine when we filtered to from_email
      // only; with thread expansion 10 truncates active threads. 25
      // covers ~5 threads with 5 messages each — realistic upper bound
      // for a single-person preview.
      const r = await fetch(`/api/gmail/messages-by-sender?email=${encodeURIComponent(email)}&limit=25`);
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `Preview failed (${r.status})`);
      const messages: PreviewMessage[] = Array.isArray(body.messages) ? body.messages : [];
      setPreviewByEmail((p) => ({ ...p, [email]: { loading: false, messages } }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load preview';
      setPreviewByEmail((p) => ({ ...p, [email]: { loading: false, error: msg } }));
    }
  }

  function toggleExpand(email: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
        // Drop any error so a later re-expand retries cleanly. Don't
        // drop loaded messages — re-expanding the same row should be
        // instant.
        setPreviewByEmail((p) => {
          const cur = p[email];
          if (cur?.error) {
            const { [email]: _gone, ...rest } = p;
            void _gone;
            return rest;
          }
          return p;
        });
      } else {
        next.add(email);
        void ensurePreview(email);
      }
      return next;
    });
  }

  // Pulled out so we can call it after a manual "Sync now" click without
  // tearing down/re-opening the dialog. `noiseOverride` lets the
  // EmptyState's "Show automated senders" button trigger a re-fetch
  // synchronously without waiting for the includeNoise state update
  // to schedule a re-render — Paul's frustration with empty walls
  // earned the button instant feedback.
  async function loadSuggestions(noiseOverride?: boolean) {
    setLoading(true);
    setError(null);
    try {
      const noise = noiseOverride ?? includeNoise;
      const url = `/api/gmail/suggestions?limit=50${noise ? '&includeNoise=true' : ''}`;
      const r = await fetch(url);
      const body = await r.json();
      const items: SenderSuggestion[] = body.suggestions || [];
      setSuggestions(items);
      setDiagnostics(body.diagnostics ?? null);
      // No pre-selection. Earlier versions auto-checked anyone with
      // 2+ emails on the theory that frequency = signal — but that
      // conflated "I corresponded with this address" with "this should
      // be a CRM contact." Newsletters, support@, no-reply, ZipRecruiter
      // job alerts all hit 2+ trivially and used to land in the
      // import. Now the user sees the full list with nothing checked
      // and picks deliberately. (Paul's call on 2026-04-27.)
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      // Auto deep-sync on modal open. The user explicitly opened the
      // import wizard, which is a strong signal they want their CRM
      // populated from email — so we pull a year of mail before
      // showing suggestions. This bypasses the
      // "I-already-synced-30-days-of-recent-mail-and-Holly-only-
      //  appears-once" trap Paul hit on 2026-04-27.
      //
      // Cost: ~3-8s on first open. Worth it to avoid the user
      // staring at a partial list. We do NOT block on errors — if
      // the sync fails (rate limit, OAuth expired) we still load
      // whatever's already in email_messages and surface the error.
      //
      // We re-trigger on every open intentionally. If the user
      // closed the modal because the list looked thin, opening
      // again should give them fresh data, not the same list.
      if (!cancelled) {
        try {
          await handleSyncNowSilent();
        } catch {
          /* fall through to whatever's already synced */
        }
      }
      if (!cancelled) await loadSuggestions();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Silent variant of handleSyncNow used by the open-effect: same
  // request, no toast (the loading state is already visible), and
  // doesn't call loadSuggestions itself (the open-effect orchestrates
  // both calls in order).
  async function handleSyncNowSilent() {
    setSyncing(true);
    try {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      // No `pageSize` — server now defaults to its paginated 2,000-message
      // hard ceiling for unspecified callers. Passing 500 here used to
      // mean "single page of 500" under the old single-call sync; under
      // the new paginated route it means "stop after one page" which is
      // exactly the regression we're trying to avoid for onboarding.
      const r = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ since: yearAgo }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `sync failed (${r.status})`);
      }
    } finally {
      setSyncing(false);
    }
  }

  // Re-fetch when the noise toggle flips. Separate effect (not folded
  // into the open-effect above) because it runs only AFTER the dialog
  // is already open and the user has interacted with the toggle.
  useEffect(() => {
    if (!open) return;
    void loadSuggestions(includeNoise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeNoise]);

  /**
   * "Sync now" — calls /api/gmail/sync to actually pull messages from
   * Google, then re-fetches suggestions. In the import wizard context
   * the user is explicitly asking "populate my CRM with my email
   * history," so we force a **365-day deep pull** by passing an
   * explicit `since` even when the user already has a `last_sync_at`
   * on file (which would otherwise drop the route into incremental
   * 30-day mode). Topbar banner's separate Sync now button stays
   * incremental — that one's for ongoing refresh, not onboarding.
   *
   * 500 messages cap matches Gmail API's per-call ceiling. Paul's
   * 2026-04-27 case: a sync with 30-day window pulled 1 of Holly
   * Bajar's 4 threads. With 365 days he'll see all of them.
   */
  async function handleSyncNow() {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      // No `pageSize` — server now defaults to its paginated 2,000-message
      // hard ceiling for unspecified callers. Passing 500 here used to
      // mean "single page of 500" under the old single-call sync; under
      // the new paginated route it means "stop after one page" which is
      // exactly the regression we're trying to avoid for onboarding.
      const r = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ since: yearAgo }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `sync failed (${r.status})`);
      pushToast({
        severity: 'success',
        title: `Synced ${body.synced ?? 0} message${body.synced === 1 ? '' : 's'}`,
        description: 'Pulled the last year of mail. Now scanning for senders…',
        duration: 2500,
      });
      await loadSuggestions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      setError(msg);
      pushToast({ severity: 'error', title: 'Sync failed', description: msg, duration: 4000 });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  // Pipeline: filter (date range + attachments + search) → then sort.
  // Order matters — filtering first means the sort comparator runs on
  // a smaller set, but more importantly the user's mental model is
  // "narrow then arrange," which matches the toolbar layout (filters
  // sit left of sort visually).
  const orderedSuggestions = useMemo(() => {
    let arr = suggestions;

    // ─── Date range filter ─────────────────────────────────────────────
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 3600 * 1000;
      arr = arr.filter((s) => {
        const t = s.lastReceivedAt ? new Date(s.lastReceivedAt).getTime() : 0;
        return t >= cutoff;
      });
    }

    // ─── Has-attachments filter ────────────────────────────────────────
    if (hasAttachmentsOnly) {
      arr = arr.filter((s) => (s.attachmentCount ?? 0) > 0);
    }

    // ─── Search filter (name OR email substring, case-insensitive) ────
    // Trim + lowercase up front so each row check is one cheap
    // `.includes`. Empty/whitespace search = no filter applied.
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const email = s.email.toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    // ─── Sort ──────────────────────────────────────────────────────────
    const sorted = [...arr];
    switch (sortBy) {
      case 'name':
        // A→Z by display name, falling back to the local-part of the
        // email when name is missing so newsletters/no-reply rows still
        // sort sensibly. Locale-aware compare so "Á" sorts near "A".
        return sorted.sort((a, b) => {
          const an = (a.name || a.email.split('@')[0]).toLowerCase();
          const bn = (b.name || b.email.split('@')[0]).toLowerCase();
          return an.localeCompare(bn);
        });
      case 'date':
        // Most recent first. Missing dates (shouldn't happen but be
        // defensive) sort to the end so the top of the list is always
        // genuinely the freshest signal.
        return sorted.sort((a, b) => {
          const at = a.lastReceivedAt ? new Date(a.lastReceivedAt).getTime() : 0;
          const bt = b.lastReceivedAt ? new Date(b.lastReceivedAt).getTime() : 0;
          return bt - at;
        });
      case 'count':
      default:
        return sorted.sort((a, b) => b.count - a.count);
    }
  }, [suggestions, sortBy, dateRange, hasAttachmentsOnly, search]);

  // Close the sort/date menus on outside-click — same pattern as
  // Topbar's user menu. Without this, opening a menu then clicking a
  // row leaves the dropdown lingering over the list.
  useEffect(() => {
    if (!sortMenuOpen && !dateMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (sortMenuOpen && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setSortMenuOpen(false);
      }
      if (dateMenuOpen && dateMenuRef.current && !dateMenuRef.current.contains(target)) {
        setDateMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sortMenuOpen, dateMenuOpen]);

  const sortLabel: Record<SortKey, string> = {
    count: 'Most emails',
    name: 'Name (A–Z)',
    date: 'Most recent',
  };
  const dateLabel: Record<DateRange, string> = {
    all: 'All time',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };

  // True when any filter is narrowing the view (search OR date OR
  // attachments). Used to switch the count summary from "X suggested"
  // to "X of Y matching" so the user can see when filters are eating
  // results.
  const filtersActive =
    search.trim().length > 0 || dateRange !== 'all' || hasAttachmentsOnly;

  // Real <input type="checkbox"> needs the indeterminate state set as a DOM
  // property (not an attribute), so we sync it via a ref any time the
  // partial-selection state changes.
  const selectAllRef = useRef<HTMLInputElement>(null);
  const isAllSelected = suggestions.length > 0 && selected.size === suggestions.length;
  const isPartial = selected.size > 0 && !isAllSelected;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isPartial;
  }, [isPartial]);

  if (!open) return null;

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(suggestions.map((s) => s.email)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  async function handleImport() {
    if (submitting || selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const picks = suggestions.filter((s) => selected.has(s.email));
      const res = await fetch('/api/contacts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: picks.map((p) => ({
            email: p.email,
            name: p.name,
            type: 'person',
          })),
        }),
      });
      // Defensive parse — a 500 with non-JSON body would otherwise throw
      // here and we'd lose the actual error message.
      const body = await res.json().catch(() => ({} as { error?: string; inserted?: number; matchesLinked?: number }));
      if (!res.ok) throw new Error(body.error || `Import failed (${res.status})`);

      await refreshContactsInStore();

      pushToast({
        severity: 'success',
        title: `Imported ${body.inserted ?? picks.length} contact${(body.inserted ?? picks.length) === 1 ? '' : 's'}`,
        description:
          (body.matchesLinked ?? 0) > 0
            ? `Linked ${body.matchesLinked} past email${body.matchesLinked === 1 ? '' : 's'} to their timelines.`
            : 'They\'re ready in your Contacts grid.',
        duration: 3000,
      });

      localStorage.setItem('roadrunner-onboarding-v1-done', new Date().toISOString());
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      setError(msg);
      // Loud feedback — the inline error in the body is easy to miss while
      // the user is looking at the suggestion list. A toast guarantees the
      // failure registers.
      pushToast({
        severity: 'error',
        title: 'Import failed',
        description: msg,
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    localStorage.setItem('roadrunner-onboarding-v1-done', new Date().toISOString());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] w-full max-w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-7 py-5 flex items-start justify-between gap-4 border-b border-[var(--border-subtle)]"
          style={{
            background: 'linear-gradient(135deg, rgba(25,85,166,0.06) 0%, rgba(46,123,214,0.03) 100%)',
          }}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Gmail brand mark in a white card. We deliberately use the
                official multi-color logo (not a generic AI/sparkle icon)
                because this dialog is the explicit "import from Gmail"
                surface — the brand should be unmistakable. White card +
                subtle border lets the logo's red/blue/green/yellow read
                cleanly against the gradient header background. */}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <GmailIcon size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[19px] font-black text-[var(--text-primary)] tracking-tight leading-tight">
                Add your Gmail contacts to Roadrunner
              </h2>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                We scanned your recent email and found the people you correspond with most.
                Pick who to pull into your CRM — we&apos;ll auto-link past emails to their timeline.
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Close"
            disabled={submitting}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/*
          Toolbar — two rows.

          Row 1: prominent search box. Paul's literal question on
          2026-04-27 was "where do I type holly" — the answer needed to
          be visually unmissable, not a tiny corner icon. Full-width
          input with leading magnifier icon and a clear-button when
          there's a query. Same pattern as Linear's command bar input
          and HubSpot's contact filter.

          Row 2: select-all + count summary on the left, filter chips
          (Date / Has attachments) and Sort + Sync on the right. The
          tri-state select-all checkbox folds the old "Select all" +
          "Clear" buttons into one control:
            empty         — nothing selected. Click → select all.
            indeterminate — some selected. Click → clear.
            checked       — all selected. Click → clear.
        */}
        <div className="px-7 pt-3 pb-2 border-b border-[var(--border-subtle)] bg-[var(--surface-bg)] flex flex-col gap-2">
          {/* ─── Search row ───────────────────────────────────────────── */}
          <div className="relative">
            <MagnifyingGlass
              size={14}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…  (e.g. jane smith)"
              disabled={loading || submitting}
              aria-label="Search suggestions"
              className="w-full h-9 pl-9 pr-9 text-[12.5px] rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:opacity-50"
            />
            {search.length > 0 && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>

          {/* ─── Controls row ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={() => (selected.size > 0 ? selectNone() : selectAll())}
                  disabled={loading || submitting || suggestions.length === 0}
                  className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--brand-primary)' }}
                  aria-label={selected.size > 0 ? 'Clear selection' : 'Select all'}
                />
                <span className="text-[12px] font-bold text-[var(--text-secondary)]">
                  Select all
                </span>
              </label>

              <span className="text-[12px] text-[var(--text-tertiary)]">·</span>
              <Users size={14} weight="fill" className="text-[var(--brand-primary)]" />
              <span className="text-[12px] font-bold text-[var(--text-primary)]">
                {loading
                  ? 'Loading suggestions…'
                  : filtersActive
                    ? `${orderedSuggestions.length} of ${suggestions.length} matching`
                    : `${suggestions.length} suggested`}
              </span>
              <span className="text-[12px] text-[var(--text-tertiary)]">·</span>
              <span className="text-[12px] font-bold text-[var(--brand-primary)]">
                {selected.size} selected
              </span>
            </div>

            {/* Right side: filter chips + Sort + Sync */}
            <div className="flex items-center gap-1 flex-wrap">
              {/* Date range dropdown — same caret pattern as Sort. */}
              <div className="relative" ref={dateMenuRef}>
                <button
                  onClick={() => { setDateMenuOpen((v) => !v); setSortMenuOpen(false); }}
                  disabled={loading || submitting || suggestions.length === 0}
                  className={`h-7 px-2.5 text-[11px] font-bold bg-transparent border-none cursor-pointer rounded disabled:opacity-50 inline-flex items-center gap-1 ${
                    dateRange !== 'all'
                      ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)]'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={dateMenuOpen}
                  title="Filter by date received"
                >
                  <span className="text-[var(--text-tertiary)]">Date:</span>
                  <span>{dateLabel[dateRange]}</span>
                  <CaretDown size={10} weight="bold" className={`transition-transform ${dateMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {dateMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[230] py-1 animate-[fadeUp_0.12s_ease-out]"
                  >
                    {(['all', '7d', '30d', '90d'] as DateRange[]).map((key) => {
                      const active = dateRange === key;
                      return (
                        <button
                          key={key}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => { setDateRange(key); setDateMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left bg-transparent border-none cursor-pointer ${
                            active
                              ? 'text-[var(--brand-primary)] font-bold'
                              : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-[var(--brand-primary)]' : 'bg-transparent'}`}
                          />
                          {dateLabel[key]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Has-attachments toggle — single-shot filter, no menu.
                  Active style mirrors the Date chip's "engaged" look so
                  filter state is scannable across the toolbar. */}
              <button
                onClick={() => setHasAttachmentsOnly((v) => !v)}
                disabled={loading || submitting || suggestions.length === 0}
                aria-pressed={hasAttachmentsOnly}
                className={`h-7 px-2.5 text-[11px] font-bold bg-transparent border-none cursor-pointer rounded disabled:opacity-50 inline-flex items-center gap-1 ${
                  hasAttachmentsOnly
                    ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)]'
                }`}
                title="Only show senders whose emails include attachments"
              >
                <Paperclip size={11} weight="bold" />
                Has attachments
              </button>

              {/* Show automated senders toggle. By default we hide
                  newsletters, no-reply, marketing — but for a brand-new
                  user with an inbox of mostly LinkedIn/Indeed/etc, that
                  default leaves them with zero suggestions. This chip
                  flips on includeNoise and re-fetches the list. */}
              <button
                onClick={() => setIncludeNoise((v) => !v)}
                disabled={loading || submitting}
                aria-pressed={includeNoise}
                className={`h-7 px-2.5 text-[11px] font-bold bg-transparent border-none cursor-pointer rounded disabled:opacity-50 inline-flex items-center gap-1 ${
                  includeNoise
                    ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)]'
                }`}
                title="Include newsletters, no-reply, and marketing senders"
              >
                {includeNoise ? 'All senders' : 'Show automated'}
              </button>

              <div className="relative" ref={sortMenuRef}>
                <button
                  onClick={() => { setSortMenuOpen((v) => !v); setDateMenuOpen(false); }}
                  disabled={loading || submitting || suggestions.length === 0}
                  className="h-7 px-2.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer rounded disabled:opacity-50 inline-flex items-center gap-1"
                  aria-haspopup="menu"
                  aria-expanded={sortMenuOpen}
                  title="Sort suggestions"
                >
                  <span className="text-[var(--text-tertiary)]">Sort:</span>
                  <span>{sortLabel[sortBy]}</span>
                  <CaretDown size={10} weight="bold" className={`transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[230] py-1 animate-[fadeUp_0.12s_ease-out]"
                  >
                    {(['count', 'name', 'date'] as SortKey[]).map((key) => {
                      const active = sortBy === key;
                      return (
                        <button
                          key={key}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => { setSortBy(key); setSortMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left bg-transparent border-none cursor-pointer ${
                            active
                              ? 'text-[var(--brand-primary)] font-bold'
                              : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-[var(--brand-primary)]' : 'bg-transparent'}`}
                          />
                          {sortLabel[key]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={handleSyncNow}
                disabled={loading || submitting || syncing}
                className="h-7 px-2.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer rounded disabled:opacity-50 inline-flex items-center gap-1"
                title="Re-pull recent Gmail and refresh suggestions"
              >
                <ArrowsClockwise size={11} weight="bold" className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          </div>
        </div>

        {/* Error banner — pinned above the list so it's impossible to miss
            when an import / sync call fails. Previously the error rendered
            inside the scrollable list area, which the user often missed. */}
        {error && (
          <div
            role="alert"
            className="px-7 py-3 border-b border-[var(--danger,#dc2626)] bg-[var(--danger-bg,#fef2f2)] text-[12px] font-semibold text-[var(--danger,#dc2626)] flex items-start gap-2"
          >
            <span className="flex-1 leading-snug">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[var(--danger,#dc2626)] hover:underline bg-transparent border-none cursor-pointer text-[11px] font-bold p-0 flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading && (
            <div className="px-4 py-10 text-center text-[12.5px] text-[var(--text-tertiary)]">
              Scanning your inbox…
            </div>
          )}
          {!loading && !error && suggestions.length === 0 && (
            // Diagnostics-driven empty state. The previous version was a
            // generic "could be anything" paragraph that left the user
            // staring at zero. Now we tell them exactly what's wrong AND
            // give them a one-click action to fix it inline.
            <EmptyState
              diagnostics={diagnostics}
              syncing={syncing}
              onSyncNow={handleSyncNow}
              onShowAutomated={() => setIncludeNoise(true)}
            />
          )}
          {/* Filtered-empty-state — distinct from the diagnostics
              empty-state above. We have suggestions in the raw list,
              but the user's search/date/attachment filters narrowed
              them to zero. Show a clear "nothing matches, here's why"
              with one-click clear. */}
          {!loading && !error && suggestions.length > 0 && orderedSuggestions.length === 0 && (
            <div className="px-4 py-10 text-center">
              <MagnifyingGlass size={28} weight="duotone" className="text-[var(--text-tertiary)] mx-auto mb-3" />
              <div className="text-[13px] font-bold text-[var(--text-primary)]">
                No senders match your filters.
              </div>
              <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1">
                {suggestions.length.toLocaleString()} sender{suggestions.length === 1 ? '' : 's'} hidden by{' '}
                {[
                  search.trim() ? `search "${search.trim()}"` : null,
                  dateRange !== 'all' ? dateLabel[dateRange].toLowerCase() : null,
                  hasAttachmentsOnly ? 'has attachments' : null,
                ].filter(Boolean).join(' + ')}.
              </div>
              <button
                onClick={() => { setSearch(''); setDateRange('all'); setHasAttachmentsOnly(false); }}
                className="mt-3 h-8 px-3 text-[11.5px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border border-[var(--brand-primary)] rounded-lg cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

          {!loading && orderedSuggestions.map((s) => {
            const isSelected = selected.has(s.email);
            const isExpanded = expanded.has(s.email);
            const previewState = previewByEmail[s.email];
            const initials = getInitials(s.name || s.email);
            const sampleTitle = s.attachmentSample.length > 0
              ? `Attachments: ${s.attachmentSample.join(', ')}${s.attachmentCount > s.attachmentSample.length ? ` +${s.attachmentCount - s.attachmentSample.length} more` : ''}`
              : '';
            return (
              <div
                key={s.email}
                className={`mb-1 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-[var(--brand-bg)] border-[var(--brand-primary)]'
                    : 'bg-[var(--surface-card)] border-transparent hover:border-[var(--border)]'
                }`}
              >
                {/* Row header — TWO clickable zones:
                    (a) the chevron toggles the accordion (preview emails)
                    (b) the body toggles selection (add/remove from import)
                    Splitting them avoids the "I clicked to peek but it
                    selected" footgun. The chevron stops propagation so
                    the body's click handler never sees its event. */}
                <div className="flex items-stretch">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(s.email); }}
                    aria-label={isExpanded ? 'Hide email preview' : 'Show email preview'}
                    aria-expanded={isExpanded}
                    title={isExpanded ? 'Hide emails' : 'Show emails from this sender'}
                    className="px-2 flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] rounded-l-lg"
                  >
                    <CaretRight
                      size={14}
                      weight="bold"
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <button
                    onClick={() => toggle(s.email)}
                    aria-pressed={isSelected}
                    className={`flex-1 flex items-center gap-3 px-2 py-2.5 cursor-pointer transition-all bg-transparent border-none text-left rounded-r-lg ${
                      isSelected ? '' : 'hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                      className="w-4 h-4 flex-shrink-0 pointer-events-none"
                      style={{ accentColor: 'var(--brand-primary)' }}
                    />
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
                      style={{ background: colorForEmail(s.email) }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-tight">
                        {s.name || s.email.split('@')[0]}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] truncate">{s.email}</div>
                    </div>
                    {/* Inline paperclip indicator — only when this sender
                        has any attachments anywhere in their messages.
                        Tooltip shows up to 3 sample filenames so the
                        user can decide if those attachments matter
                        before expanding the accordion. */}
                    {s.attachmentCount > 0 && (
                      <span
                        title={sampleTitle}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-raised)] border border-[var(--border)] px-1.5 py-0.5 rounded flex-shrink-0"
                      >
                        <Paperclip size={10} weight="bold" />
                        {s.attachmentCount}
                      </span>
                    )}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-primary)] bg-[var(--brand-bg)] px-2 py-0.5 rounded-full">
                        {s.count} email{s.count === 1 ? '' : 's'}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {relativeDate(s.lastReceivedAt)}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Accordion body — preview of recent emails from this
                    sender so the user can peek at subjects + attachments
                    before deciding to import. Lazy-loaded on first
                    expand, cached in state. */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3 py-2 rounded-b-lg">
                    {previewState?.loading && (
                      <div className="text-[11.5px] text-[var(--text-tertiary)] py-2 px-1">
                        Loading recent emails…
                      </div>
                    )}
                    {previewState?.error && (
                      <div className="text-[11.5px] text-[var(--danger,#dc2626)] py-2 px-1 flex items-center justify-between gap-2">
                        <span>Could not load preview: {previewState.error}</span>
                        <button
                          onClick={() => ensurePreview(s.email)}
                          className="text-[11px] font-bold text-[var(--danger,#dc2626)] hover:underline bg-transparent border-none cursor-pointer p-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {previewState?.messages && previewState.messages.length === 0 && (
                      <div className="text-[11.5px] text-[var(--text-tertiary)] py-2 px-1 italic">
                        No messages found for this sender in your synced inbox.
                      </div>
                    )}
                    {previewState?.messages && previewState.messages.length > 0 && (
                      <ul className="flex flex-col gap-1 list-none p-0 m-0">
                        {previewState.messages.map((msg) => {
                          // Sender label: anything from this contact shows
                          // their display name; anything else (almost always
                          // a reply you sent) shows "You". For 3-party
                          // threads where a third person replies, we fall
                          // back to the actual from_name so the UI doesn't
                          // mislabel them as the user. Industry parallel:
                          // Gmail's contact-card peek and HubSpot's contact
                          // timeline both label messages this way.
                          const isFromContact =
                            !!msg.fromEmail && msg.fromEmail.toLowerCase() === s.email.toLowerCase();
                          const senderLabel = isFromContact
                            ? (msg.fromName || s.name || s.email.split('@')[0])
                            : (msg.fromName ? `You (${msg.fromName})` : 'You');
                          return (
                            <li
                              key={msg.id}
                              className={`border rounded px-2.5 py-2 flex flex-col gap-1 ${
                                isFromContact
                                  ? 'bg-[var(--surface-card)] border-[var(--border-subtle)]'
                                  // Outbound replies get a subtle brand-tinted
                                  // background so a thread reads visually as a
                                  // back-and-forth, not a flat list. Same trick
                                  // Gmail uses for sent-folder rows.
                                  : 'bg-[var(--brand-bg)]/40 border-[var(--brand-primary)]/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                    isFromContact ? 'text-[var(--text-tertiary)]' : 'text-[var(--brand-primary)]'
                                  }`}
                                >
                                  {senderLabel}
                                </span>
                                <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                                  {relativeDate(msg.receivedAt)}
                                </span>
                              </div>
                              <div className="text-[12px] font-bold text-[var(--text-primary)] truncate leading-tight">
                                {msg.subject || <em className="text-[var(--text-tertiary)] font-normal">(no subject)</em>}
                              </div>
                              {msg.snippet && (
                                <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-snug">
                                  {msg.snippet}
                                </div>
                              )}
                              {msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {msg.attachments.map((att, i) => (
                                    <span
                                      key={i}
                                      title={att.filename + (att.size ? ` (${formatBytes(att.size)})` : '')}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded max-w-[200px]"
                                    >
                                      <FileText size={10} weight="bold" className="flex-shrink-0" />
                                      <span className="truncate">{att.filename}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-bg)]">
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="h-9 px-3 text-[12.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer rounded disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0 || submitting || loading}
            className="h-9 px-4 text-[13px] font-bold text-white border-none rounded-lg cursor-pointer flex items-center gap-1.5 shadow-[0_4px_14px_rgba(25,85,166,0.28)] hover:shadow-[0_6px_20px_rgba(25,85,166,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            style={{ background: 'linear-gradient(135deg, #1955A6 0%, #2E7BD6 100%)' }}
          >
            {submitting ? 'Importing…' : `Import ${selected.size} contact${selected.size === 1 ? '' : 's'}`}
            {!submitting && <ArrowRight size={13} weight="bold" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty-state for the import wizard. Branches on the `reason` from the
 * suggestions endpoint's diagnostics block so each case shows the right
 * message AND the right action:
 *
 *   no_connection  → Gmail OAuth never completed. Send to Settings.
 *   no_messages    → Connection exists but sync hasn't pulled anything.
 *                    Show big "Sync now" CTA.
 *   all_imported   → We have messages but every top sender is already a
 *                    contact. Friendly "you're caught up" state.
 *   ok / unknown   → Fallback generic copy.
 *
 * This replaces the earlier generic "could be one of three things" copy
 * that made the user guess.
 */
function EmptyState({
  diagnostics,
  syncing,
  onSyncNow,
  onShowAutomated,
}: {
  diagnostics: SuggestionsDiagnostics | null;
  syncing: boolean;
  onSyncNow: () => void;
  onShowAutomated: () => void;
}) {
  const reason = diagnostics?.reason ?? 'ok';

  if (reason === 'no_connection') {
    return (
      <div className="px-4 py-10 text-center">
        <PlugsConnected size={32} weight="duotone" className="text-[var(--text-tertiary)] mx-auto mb-3" />
        <div className="text-[13.5px] font-bold text-[var(--text-primary)]">
          Gmail isn&rsquo;t connected yet.
        </div>
        <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1 max-w-[420px] mx-auto">
          Head to <strong className="text-[var(--text-secondary)]">Settings &rarr; Gmail</strong> and click <strong className="text-[var(--text-secondary)]">Connect Gmail</strong> to authorize Roadrunner. Then come back here.
        </div>
      </div>
    );
  }

  if (reason === 'no_messages') {
    return (
      <div className="px-4 py-10 text-center">
        <Envelope size={32} weight="duotone" className="text-[var(--brand-primary)] mx-auto mb-3" />
        <div className="text-[13.5px] font-bold text-[var(--text-primary)]">
          You&rsquo;re connected, but no messages have synced yet.
        </div>
        <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1 max-w-[420px] mx-auto">
          Hit the button below to pull the last 30 days from Gmail. We&rsquo;ll then surface the people you correspond with most.
        </div>
        <button
          onClick={onSyncNow}
          disabled={syncing}
          className="mt-4 h-9 px-4 text-[12.5px] font-bold text-white border-none rounded-lg cursor-pointer inline-flex items-center gap-1.5 shadow-[0_4px_14px_rgba(25,85,166,0.28)] hover:shadow-[0_6px_20px_rgba(25,85,166,0.4)] transition-all disabled:opacity-60 disabled:cursor-wait"
          style={{ background: 'linear-gradient(135deg, #1955A6 0%, #2E7BD6 100%)' }}
        >
          <ArrowsClockwise size={13} weight="bold" className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Gmail now'}
        </button>
      </div>
    );
  }

  // NEW: senders exist but the noise heuristic ate them all. This is
  // the bug Paul caught on 2026-04-27 — 152 messages, 1 real contact,
  // 0 suggestions because every sender was a LinkedIn/Indeed/no-reply
  // kind of address. We now tell the truth and give a one-click
  // "show them anyway" button.
  if (reason === 'all_filtered') {
    const noiseCount = diagnostics?.filteredAsNoise ?? 0;
    return (
      <div className="px-4 py-10 text-center">
        <Envelope size={32} weight="duotone" className="text-[var(--brand-primary)] mx-auto mb-3" />
        <div className="text-[13.5px] font-bold text-[var(--text-primary)]">
          We hid {noiseCount.toLocaleString()} automated sender{noiseCount === 1 ? '' : 's'}.
        </div>
        <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1 max-w-[440px] mx-auto leading-relaxed">
          Every top sender in your synced inbox looked like a newsletter, no-reply,
          or marketing address — so we filtered them out by default. If a real
          person is hiding in there (some LinkedIn / Indeed / job-board
          notifications carry actual names), show them all and pick.
        </div>
        <button
          onClick={onShowAutomated}
          className="mt-4 h-9 px-4 text-[12.5px] font-bold text-white border-none rounded-lg cursor-pointer inline-flex items-center gap-1.5 shadow-[0_4px_14px_rgba(25,85,166,0.28)] hover:shadow-[0_6px_20px_rgba(25,85,166,0.4)] transition-all"
          style={{ background: 'linear-gradient(135deg, #1955A6 0%, #2E7BD6 100%)' }}
        >
          Show automated senders
          <ArrowRight size={12} weight="bold" />
        </button>
      </div>
    );
  }

  if (reason === 'all_imported') {
    // Honest version: only claim "everyone is already a contact" when
    // the diagnostics actually back that up — i.e. we saw senders and
    // every one of them was already in `contacts`. The earlier copy
    // ran for any zero-suggestion case, which lied to users with
    // 1 contact and 152 noise-heavy messages.
    const existing = diagnostics?.filteredAsExisting ?? 0;
    return (
      <div className="px-4 py-10 text-center">
        <CheckCircle size={32} weight="duotone" className="text-[var(--success)] mx-auto mb-3" />
        <div className="text-[13.5px] font-bold text-[var(--text-primary)]">
          You&rsquo;re all caught up.
        </div>
        <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1 max-w-[440px] mx-auto">
          {existing > 0
            ? <>The <strong className="text-[var(--text-secondary)]">{existing.toLocaleString()}</strong> top sender{existing === 1 ? '' : 's'} from your synced inbox {existing === 1 ? 'is' : 'are'} already in Roadrunner.</>
            : <>No new senders to suggest right now. We synced{' '}
                <strong className="text-[var(--text-secondary)]">{diagnostics?.totalMessages.toLocaleString()}</strong>{' '}
                message{diagnostics?.totalMessages === 1 ? '' : 's'}.</>}
        </div>
        <div className="mt-4 inline-flex gap-2">
          <button
            onClick={onShowAutomated}
            className="h-8 px-3 text-[11.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg cursor-pointer inline-flex items-center gap-1.5"
          >
            Show automated senders
          </button>
          <button
            onClick={onSyncNow}
            disabled={syncing}
            className="h-8 px-3 text-[11.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
          >
            <ArrowsClockwise size={11} weight="bold" className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Pull again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 text-center">
      <Envelope size={32} weight="duotone" className="text-[var(--text-tertiary)] mx-auto mb-3" />
      <div className="text-[13.5px] font-bold text-[var(--text-primary)]">No new senders to suggest.</div>
      <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1">
        Try syncing again or come back later.
      </div>
      <button
        onClick={onSyncNow}
        disabled={syncing}
        className="mt-4 h-8 px-3 text-[11.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
      >
        <ArrowsClockwise size={11} weight="bold" className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  );
}

async function refreshContactsInStore() {
  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) return;
    const body = (await res.json()) as { contacts?: ContactWithEntries[] };
    if (Array.isArray(body.contacts)) {
      useContactStore.setState({ contacts: body.contacts });
    }
  } catch {
    // best-effort
  }
}

function getInitials(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s,@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function colorForEmail(email: string): string {
  const palette = ['#1955A6', '#2E7BD6', '#0A2540', '#3B7AD0', '#5B8BD4', '#6A5ACD', '#0F766E', '#A16207'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

/**
 * Official Gmail brand mark (envelope-with-M).
 *
 * Inlined as an SVG rather than imported because (a) we don't ship a Gmail
 * asset in /public and (b) keeping the colors in code lets a future dark-
 * mode pass tweak them without round-tripping a designer. Aspect ratio is
 * the canonical 256:193 from Google's brand guidelines — the height is
 * derived from `size` so callers only have to think in one dimension.
 */
function GmailIcon({ size = 22 }: { size?: number }) {
  const h = Math.round((size * 193) / 256);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={h}
      viewBox="0 0 256 193"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.826 17.455 17.455 17.455z"
      />
      <path
        fill="#34A853"
        d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455v-125.09l-31.156 17.836-27.026 25.798z"
      />
      <path
        fill="#FBBC04"
        d="M58.182 93.14l-4.174-38.65 4.174-36.989H17.455C7.795 17.5 0 25.326 0 34.985v14.519z"
      />
      <path
        fill="#EA4335"
        d="M197.818 93.14V17.5h40.728c9.658 0 17.454 7.826 17.454 17.485v14.519l-30.395 16.585z"
      />
      <path
        fill="#C5221F"
        d="M58.182 93.14L128 145.515l69.818-52.376V17.5L128 69.876 58.182 17.5z"
      />
    </svg>
  );
}

function relativeDate(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / (24 * 3600 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Compact byte formatter for the attachment-chip tooltip in the
 * accordion. Stops at MB because email attachments above a gig are
 * vanishingly rare and we don't need to be precise — the user is
 * eyeballing whether "this is the resume.pdf I sent" not auditing
 * the exact size.
 */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
