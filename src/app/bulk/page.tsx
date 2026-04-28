'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import {
  PaperPlaneTilt, Users, Envelope, CheckCircle, Warning,
  X as XIcon, MagnifyingGlass, FileText, Eye, ArrowRight,
  CircleNotch, Plus, Sparkle, Trash, Paperclip, Image as ImageIcon, FilePdf, FileDoc, FileXls, FileZip, File as FileIcon, Download,
} from '@phosphor-icons/react';
import {
  useBulkBatchStore,
  summarizeBatch,
  type BulkBatch,
  type BulkRecipientRecord,
  type BatchAttachment,
} from '@/stores/bulk-batch-store';
import { useContactStore } from '@/stores/contact-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import BulkEmailComposer from '@/components/gmail/BulkEmailComposer';
import SearchInput from '@/components/ui/SearchInput';

/**
 * Bulk Email — history feed of every bulk send + a primary CTA to
 * compose a new one. Lives under the "Manage Emails" sidebar group
 * alongside `/sequences`.
 *
 * Industry parallel: HubSpot's `Marketing > Email > Sent` tab,
 * Outreach's `Sends` view, Apollo's `Emails > Bulk`. All share the
 * stats-row-on-top + chronological-feed-below + drill-down-detail
 * shape with a primary "Compose" button at top right.
 *
 * Sequence-step sends used to live here too — they moved to the
 * Sequences page's Performance dashboard so each surface owns its
 * own analytics. Sent legacy route /sent redirects here.
 */

/** Sort options on the feed. Matches the `Sort by` dropdowns HubSpot
 *  and Outreach offer on their email logs. */
type SortMode = 'newest' | 'oldest' | 'recipients' | 'delivery';

const SORT_LABEL: Record<SortMode, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  recipients: 'Most recipients',
  delivery: 'Delivery rate',
};

export default function BulkEmailPage() {
  const batches = useBulkBatchStore((s) => s.batches);
  const seedBulkDemo = useBulkBatchStore((s) => s.seedDemoIfEmpty);
  const removeBulkDemo = useBulkBatchStore((s) => s.removeDemoData);
  const deleteBatch = useBulkBatchStore((s) => s.deleteBatch);
  const contacts = useContactStore((s) => s.contacts);
  const gmailStatus = useGmailStatusStore((s) => s.status);
  const refreshGmailStatus = useGmailStatusStore((s) => s.refresh);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedBatch, setSelectedBatch] = useState<BulkBatch | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  // Seed demo batches every visit (idempotent on the seed version).
  // We previously gated this on Gmail-not-connected so personal accounts
  // wouldn't get fake history, but on the dev box Paul stays signed in
  // for testing — the gate hid the demos there too. Compromise: always
  // seed, and rely on the per-row trash button so users can delete any
  // batch they don't want. The seed is also versioned, so bumping
  // SEED_VERSION re-seeds the latest data automatically.
  useEffect(() => {
    const seeds = contacts.slice(0, 4).map((c) => ({
      id: c.id,
      name: c.name,
      email:
        c.entries?.emails?.find((e) => e.primary)?.value
        ?? c.entries?.emails?.[0]?.value
        ?? ('email' in c ? (c.email ?? '') : '')
        ?? '',
    })).filter((c) => c.email);
    seedBulkDemo(seeds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Suppress unused-warnings on the gating refs we kept around in case
  // we want to re-introduce a more sophisticated demo toggle later.
  void gmailStatus; void refreshGmailStatus; void removeBulkDemo;

  // Aggregate stats — drives the metric cards row at top.
  const stats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let recipients = 0;
    for (const b of batches) {
      const sum = summarizeBatch(b);
      sent += sum.sent;
      failed += sum.failed;
      recipients += sum.total;
    }
    const successRate = recipients === 0 ? 1 : sent / recipients;
    return {
      totalSent: sent,
      totalBatches: batches.length,
      totalRecipients: recipients,
      totalFailed: failed,
      successRate,
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    // Apply search filter first, then sort the filtered list. Cheaper
    // than sorting then filtering when the search trims a lot of rows.
    const q = search.trim().toLowerCase();
    const matched = !q
      ? batches
      : batches.filter((b) => {
        const recipients = b.recipients.map((r) => r.email).join(' ');
        return b.subject.toLowerCase().includes(q)
          || b.bodyPreview.toLowerCase().includes(q)
          || recipients.toLowerCase().includes(q)
          || (b.templateName ?? '').toLowerCase().includes(q);
      });

    const list = [...matched];
    switch (sortMode) {
      case 'newest':
        return list.sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
      case 'oldest':
        return list.sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
      case 'recipients':
        return list.sort((a, b) => b.recipients.length - a.recipients.length);
      case 'delivery':
        return list.sort((a, b) => summarizeBatch(b).successRate - summarizeBatch(a).successRate);
    }
  }, [batches, search, sortMode]);

  return (
    <>
      <Topbar title="Bulk Email" />
      {/* Two-region layout — title/stats/search-and-sort stay pinned at
          the top, the historical feed below scrolls independently.
          Mirrors Gmail's Sent view + HubSpot's Email log: filters never
          scroll out of reach as the user explores deeper history. */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-[var(--border)] bg-[var(--bg-app,var(--surface-card))]">
          {/* Header: title + primary CTA */}
          <div data-tour="bulk-header" className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[20px] font-extrabold text-[var(--text-primary)] mb-0.5">
                Bulk Email
              </h1>
              <p className="text-[12.5px] text-[var(--text-secondary)]">
                Send to many at once. Track delivery for every recipient.
              </p>
            </div>
            <button
              data-tour="bulk-new-send"
              onClick={() => setComposerOpen(true)}
              className="cta-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer shadow-sm"
            >
              <Plus size={13} weight="bold" />
              New bulk send
            </button>
          </div>

          {/* Stats row — each card fades up + scales on mount, staggered
              ~80ms apart. Numeric values use a count-up wrapper so they
              tick from 0 to the final on first paint. */}
          <div data-tour="bulk-stats" className="grid grid-cols-4 gap-3 mb-5">
            <StatCard
              label="Total sent"
              value={stats.totalSent}
              numeric
              icon={<PaperPlaneTilt size={14} weight="fill" />}
              tone="brand"
              hint={`across ${stats.totalRecipients} recipient${stats.totalRecipients === 1 ? '' : 's'}`}
              delayMs={0}
            />
            <StatCard
              label="Bulk batches"
              value={stats.totalBatches}
              numeric
              icon={<Users size={14} weight="fill" />}
              tone="info"
              delayMs={80}
            />
            <StatCard
              // Delivery rate is the health/performance metric in the
              // row — always either success (>=80%) or danger. The %
              // ticks up using the same count-up hook so the rise
              // mirrors the bar-fill animation in the detail panel.
              label="Delivery rate"
              value={Math.round(stats.successRate * 100)}
              suffix="%"
              numeric
              icon={<CheckCircle size={14} weight="fill" />}
              tone={stats.successRate >= 0.8 ? 'success' : 'danger'}
              hint={stats.totalFailed > 0 ? `${stats.totalFailed} failed` : 'No failures'}
              delayMs={160}
            />
            <StatCard
              label="Recipients"
              value={stats.totalRecipients}
              numeric
              icon={<Envelope size={14} weight="fill" />}
              tone="warm"
              delayMs={240}
            />
          </div>

          {/* Search + sort row.
              The input previously blended into the page background — we
              now use --surface-raised for a higher-contrast fill and a
              bolder `--text-secondary` border so the field is visible
              at a glance (WCAG 2.1 1.4.11 non-text contrast). The
              focused state ramps to brand-primary so keyboard users
              get a clear active-element cue. */}
          <div data-tour="bulk-search-sort" className="flex items-center gap-2 mb-4 flex-wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by subject, recipient, or template..."
              ariaLabel="Search bulk sends"
              size="md"
              className="flex-1 min-w-[260px] max-w-md"
            />
            <label className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Sort
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sort bulk sends"
                className="h-9 px-2 text-[12.5px] font-semibold bg-[var(--surface-raised)] border-2 border-[var(--text-tertiary)] rounded-md text-[var(--text-primary)] outline-none cursor-pointer focus:border-[var(--brand-primary)]"
              >
                {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
                  <option key={m} value={m}>{SORT_LABEL[m]}</option>
                ))}
              </select>
            </label>
            <ResultCount count={filteredBatches.length} total={batches.length} />
          </div>
        </div>

        {/* Scrolling feed region — only this section scrolls; the
             header above stays pinned. Padded so cards don't kiss the
             border + leave headroom for the last-card hover lift. */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredBatches.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg py-16 px-6 text-center">
              <PaperPlaneTilt size={36} weight="duotone" className="mx-auto text-[var(--text-tertiary)] mb-3 animate-gentle-float" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">
                {search ? 'No matching sends' : 'No bulk sends yet'}
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
                {search
                  ? 'Try a different search term.'
                  : 'Click "New bulk send" to compose your first message. Track delivery for every recipient and rerun any campaign with one click.'}
              </p>
              {!search && (
                <button
                  onClick={() => setComposerOpen(true)}
                  className="cta-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer"
                >
                  <Plus size={12} weight="bold" />
                  New bulk send
                </button>
              )}
            </div>
          ) : (
            <div data-tour="bulk-feed" className="flex flex-col gap-2">
              {filteredBatches.map((batch, idx) => (
                <BulkBatchCard
                  key={batch.id}
                  batch={batch}
                  // Cap stagger at 8 cards' worth (~360ms) so a long
                  // feed doesn't take seconds to fully render in.
                  delayMs={Math.min(idx, 8) * 45}
                  onOpen={() => setSelectedBatch(batch)}
                  onDelete={() => {
                    if (confirm(`Delete this batch?\n\n"${batch.subject || '(no subject)'}"\n\nThe send history will be removed from this view but the actual emails (if any were sent) stay in your Gmail Sent folder.`)) {
                      deleteBatch(batch.id);
                      if (selectedBatch?.id === batch.id) setSelectedBatch(null);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right-side detail panel */}
      {selectedBatch && (
        <BatchDetailPanel
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {/* Composer modal */}
      <BulkEmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </>
  );
}

type StatTone = 'brand' | 'success' | 'info' | 'neutral' | 'warm' | 'danger';

/**
 * Tiny count-up hook — animates from 0 to `target` over `duration` ms
 * using requestAnimationFrame. Keeps a ref to abort the in-flight loop
 * if the target changes mid-animation. Honors `prefers-reduced-motion`
 * by skipping the animation entirely.
 *
 * Industry parallel: Stripe Dashboard, Linear's metric tiles, HubSpot's
 * reporting cards all do this — small detail, large delight payoff.
 */
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = 0; // always animate from zero — emphasizes "freshness"
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic — fast start, gentle land
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);
  return value;
}

function StatCard({
  label,
  value,
  icon,
  tone,
  hint,
  numeric = false,
  suffix = '',
  delayMs = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: StatTone;
  hint?: string;
  /** When true, treat `value` as a number and animate the count-up. */
  numeric?: boolean;
  /** Appended after the count (e.g. "%" for delivery rate). */
  suffix?: string;
  /** Stagger delay for the entrance animation. */
  delayMs?: number;
}) {
  // Count-up runs only when numeric — otherwise the raw value renders.
  const targetNum = typeof value === 'number' ? value : 0;
  const counted = useCountUp(numeric ? targetNum : 0);
  const displayValue = numeric ? `${counted}${suffix}` : `${value}${suffix}`;
  const styles: Record<StatTone, { bg: string; text: string; iconColor: string }> = {
    brand: { bg: 'var(--brand-bg)', text: 'var(--brand-primary)', iconColor: 'var(--brand-primary)' },
    success: { bg: 'var(--success-bg)', text: 'var(--success)', iconColor: 'var(--success)' },
    info: { bg: 'var(--info-bg)', text: 'var(--info)', iconColor: 'var(--info)' },
    neutral: { bg: 'var(--surface-card)', text: 'var(--text-primary)', iconColor: 'var(--text-tertiary)' },
    // Soft lavender for raw-count metrics. Uses --lavender-* CSS vars
    // (defined in globals.css) so the card adapts to dark mode along
    // with the other tones. Light: indigo-50 bg + indigo-800 text.
    // Dark: deep indigo bg + indigo-200 text. Contrast meets WCAG AA
    // in both themes.
    warm: { bg: 'var(--lavender-bg)', text: 'var(--lavender-fg)', iconColor: 'var(--lavender)' },
    danger: { bg: 'var(--danger-bg, #FEE2E2)', text: 'var(--danger, #B91C1C)', iconColor: 'var(--danger, #B91C1C)' },
  };
  const s = styles[tone];
  return (
    <div
      className="animate-stat-card border border-[var(--border)] rounded-lg p-3"
      style={
        {
          background: s.bg,
          // Per-card stagger delay consumed by the @keyframes via CSS var.
          ['--stat-delay' as string]: `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: s.iconColor }}>
        {icon}
        <span className="text-[10.5px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div
        className="text-[22px] font-extrabold leading-tight tabular-nums"
        style={{ color: s.text }}
      >
        {displayValue}
      </div>
      {hint && (
        <div className="text-[10.5px] font-semibold mt-0.5" style={{ color: s.iconColor, opacity: 0.85 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function BulkBatchCard({
  batch,
  onOpen,
  onDelete,
  delayMs = 0,
}: {
  batch: BulkBatch;
  onOpen: () => void;
  onDelete: () => void;
  delayMs?: number;
}) {
  const sum = summarizeBatch(batch);
  const sentAt = new Date(batch.sentAt);
  const dateLabel = formatRelative(sentAt);
  return (
    // Outer wrapper is a div not a button — lets us nest the delete
    // button as an interactive child without invalid HTML. Click on
    // the wrapper still opens the detail panel via onClick + role.
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
      }}
      className="group bulk-card-hover animate-batch-card relative text-left bg-[var(--surface-card)] border border-[var(--border)] rounded-lg p-3.5 cursor-pointer hover:border-[var(--brand-primary)]"
      style={{ ['--card-delay' as string]: `${delayMs}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Users size={13} weight="fill" className="text-[var(--brand-primary)] flex-shrink-0" />
            <h3 className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">
              {batch.subject || '(no subject)'}
            </h3>
            {batch.templateName && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)] flex-shrink-0">
                <FileText size={9} weight="fill" />
                {batch.templateName}
              </span>
            )}
            {batch.attachments && batch.attachments.length > 0 && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] flex-shrink-0"
                title={`${batch.attachments.length} attachment${batch.attachments.length === 1 ? '' : 's'}`}
              >
                <Paperclip size={9} weight="bold" />
                {batch.attachments.length}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-[var(--text-tertiary)] truncate mb-1.5">
            {batch.bodyPreview}
          </p>
          {/* Compact summary line — replaces the noisy progress bar.
              Shows just the counts so the feed stays scannable. */}
          <div className="flex items-center gap-3 text-[10.5px] font-semibold">
            <span className="text-[var(--success)]">
              <CheckCircle size={10} weight="fill" className="inline -mt-0.5 mr-0.5" />
              {sum.sent} sent
            </span>
            {sum.failed > 0 && (
              <span className="text-[var(--danger)]">
                <Warning size={10} weight="fill" className="inline -mt-0.5 mr-0.5" />
                {sum.failed} failed
              </span>
            )}
            {sum.pending > 0 && (
              <span className="text-[var(--text-tertiary)]">
                <CircleNotch size={10} className="inline -mt-0.5 mr-0.5 animate-spin" />
                {sum.pending} pending
              </span>
            )}
            <span className="text-[var(--text-tertiary)]">
              · {sum.total} recipient{sum.total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10.5px] font-bold text-[var(--text-tertiary)]">{dateLabel}</span>
          <div className="flex items-center gap-1">
            {/* Hover-revealed delete button. Stops propagation so the
                row's onClick (open detail) doesn't also fire. */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete this batch from history"
              aria-label="Delete batch"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer transition-opacity"
            >
              <Trash size={12} weight="bold" />
            </button>
            <Eye size={11} className="text-[var(--text-tertiary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryProgress({ sum }: { sum: ReturnType<typeof summarizeBatch> }) {
  const sentPct = sum.total === 0 ? 0 : (sum.sent / sum.total) * 100;
  const failedPct = sum.total === 0 ? 0 : (sum.failed / sum.total) * 100;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 text-[10.5px] font-semibold">
        <span className="text-[var(--success)]">
          <CheckCircle size={10} weight="fill" className="inline -mt-0.5 mr-0.5" />
          {sum.sent} sent
        </span>
        {sum.failed > 0 && (
          <span className="text-[var(--danger)]">
            <Warning size={10} weight="fill" className="inline -mt-0.5 mr-0.5" />
            {sum.failed} failed
          </span>
        )}
        {sum.pending > 0 && (
          <span className="text-[var(--text-tertiary)]">
            <CircleNotch size={10} className="inline -mt-0.5 mr-0.5 animate-spin" />
            {sum.pending} pending
          </span>
        )}
        <span className="ml-auto text-[var(--text-tertiary)]">
          {sum.total} recipient{sum.total === 1 ? '' : 's'}
        </span>
      </div>
      {/* Bars animate width from 0 to their target percentage. The
          target is exposed via a CSS variable so the same keyframe
          can drive any batch's numbers. */}
      <div className="h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden flex">
        <div
          className="h-full bg-[var(--success)] animate-delivery-sent"
          style={{ ['--bar-sent' as string]: `${sentPct}%` } as React.CSSProperties}
        />
        <div
          className="h-full bg-[var(--danger)] animate-delivery-failed"
          style={{ ['--bar-failed' as string]: `${failedPct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function BatchDetailPanel({
  batch,
  onClose,
}: {
  batch: BulkBatch;
  onClose: () => void;
}) {
  const sum = summarizeBatch(batch);
  // Close on Escape — keyboard users get a fast exit and the focus
  // returns to the underlying card. Standard a11y pattern for slide-in
  // panels (Linear, HubSpot, Notion all do this).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/30 animate-backdrop-fade"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Batch detail"
        className="animate-panel-slide fixed top-0 right-0 bottom-0 w-[420px] bg-[var(--surface-card)] border-l border-[var(--border)] z-[91] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={14} weight="fill" className="text-[var(--brand-primary)] flex-shrink-0" />
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] truncate">Batch detail</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <XIcon size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Subject</div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] break-words">
              {batch.subject || '(no subject)'}
            </div>
            {batch.templateName && (
              <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
                <FileText size={9} weight="fill" />
                Sent via "{batch.templateName}" template
              </div>
            )}
            <div className="mt-2 text-[11.5px] text-[var(--text-tertiary)]">
              Sent {new Date(batch.sentAt).toLocaleString()}
            </div>
          </div>
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Delivery</div>
            <DeliveryProgress sum={sum} />
          </div>
          {batch.attachments && batch.attachments.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 flex items-center gap-1">
                <Paperclip size={10} weight="bold" />
                Attachments ({batch.attachments.length})
              </div>
              <div className="flex flex-col gap-2">
                {batch.attachments.map((a) => (
                  <AttachmentPreview key={a.id} attachment={a} />
                ))}
              </div>
            </div>
          )}
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Recipients ({batch.recipients.length})
            </div>
            <div className="flex flex-col gap-1">
              {batch.recipients.map((r, idx) => (
                <RecipientRow
                  key={r.email}
                  r={r}
                  // Stagger the slide-in but cap at 14 rows so a long
                  // recipient list doesn't take 1+ second to land.
                  delayMs={Math.min(idx, 14) * 35 + 200}
                />
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Body preview</div>
            <p className="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {batch.bodyPreview}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function RecipientRow({ r, delayMs = 0 }: { r: BulkRecipientRecord; delayMs?: number }) {
  const isSent = r.status === 'sent';
  const isFailed = r.status === 'failed';
  const inner = (
    <div
      className="animate-recipient-row flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--brand-bg)] transition-colors"
      style={{ ['--row-delay' as string]: `${delayMs}ms` } as React.CSSProperties}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">
          {r.contactName || r.email}
        </div>
        <div className="text-[10.5px] text-[var(--text-tertiary)] truncate">{r.email}</div>
        {isFailed && r.error && (
          <div className="text-[10.5px] text-[var(--danger)] truncate mt-0.5">{r.error}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isSent && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--success-bg)] text-[var(--success)]">
            <CheckCircle size={9} weight="fill" />
            Sent
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--danger-bg)] text-[var(--danger)]">
            <Warning size={9} weight="fill" />
            Failed
          </span>
        )}
        {r.status === 'pending' && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-card)] text-[var(--text-tertiary)] border border-[var(--border)]">
            <CircleNotch size={9} className="animate-spin" />
            Pending
          </span>
        )}
        {r.contactId && (
          <ArrowRight size={11} className="text-[var(--text-tertiary)]" />
        )}
      </div>
    </div>
  );
  if (r.contactId) {
    return (
      <Link
        href={`/contacts/${r.contactId}`}
        className="no-underline"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

/**
 * Attachment preview row — shown in the batch detail panel. Renders an
 * inline thumbnail when the attachment has a `previewUrl`, falls back to
 * a typed icon (PDF / Doc / Sheet / Zip / generic) for everything else.
 *
 * The same layout HubSpot, Outlook, and Gmail Sent use: thumb on left,
 * filename + meta on right, hover reveals a download/open icon.
 */
function AttachmentPreview({ attachment }: { attachment: BatchAttachment }) {
  const isImage = attachment.mimeType.startsWith('image/');
  const isPreviewable = !!attachment.previewUrl;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <div className="flex items-center gap-3 p-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--brand-primary)] transition-colors">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isPreviewable) setLightboxOpen(true);
        }}
        title={isPreviewable ? 'Click to enlarge' : attachment.name}
        aria-label={isPreviewable ? `Enlarge ${attachment.name}` : attachment.name}
        className="attachment-thumb relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center cursor-pointer p-0"
      >
        {isPreviewable ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <AttachmentTypeIcon mimeType={attachment.mimeType} size={28} />
        )}
        {/* Type chip on the corner — even when there's a thumb, the
            chip helps users distinguish PDF from PNG at a glance. */}
        {!isImage && (
          <span className="absolute bottom-0 left-0 right-0 text-[8.5px] font-extrabold uppercase tracking-wider text-white bg-black/60 px-1 py-0.5 text-center pointer-events-none">
            {extToken(attachment.name, attachment.mimeType)}
          </span>
        )}
      </button>
      {/* Click-to-enlarge lightbox — fullscreen view of the preview.
          Closes on backdrop click or Escape. */}
      {lightboxOpen && (
        <AttachmentLightbox
          attachment={attachment}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold text-[var(--text-primary)] truncate" title={attachment.name}>
          {attachment.name}
        </div>
        <div className="text-[10.5px] font-semibold text-[var(--text-tertiary)] mt-0.5">
          {formatBytes(attachment.size)} · {prettyMime(attachment.mimeType)}
        </div>
      </div>
      <button
        title="Download"
        aria-label={`Download ${attachment.name}`}
        className="flex-shrink-0 p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border-none cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          // Demo build: no real bytes to fetch — surface a subtle hint
          // so the click isn't a dead-end for testers.
          if (typeof window !== 'undefined') {
            window.alert('In demo mode, attachments are previews only. Real sends include the actual file bytes.');
          }
        }}
      >
        <Download size={13} weight="bold" />
      </button>
    </div>
  );
}

/**
 * Fullscreen lightbox for an attachment preview. Backdrop fades in,
 * the image zooms from a small scale, Escape or backdrop click closes.
 * Same UX as Gmail's attachment preview overlay and Slack's image
 * zoom — keeps users in-context rather than opening a new tab.
 */
function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: BatchAttachment;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="animate-backdrop-fade fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${attachment.name}`}
    >
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 border-none cursor-pointer flex items-center justify-center"
      >
        <XIcon size={18} weight="bold" />
      </button>
      <div
        className="relative max-w-[90vw] max-h-[88vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {attachment.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="animate-lightbox-image max-w-full max-h-[80vh] rounded-lg shadow-2xl"
          />
        ) : (
          <div className="animate-lightbox-image w-[420px] h-[280px] rounded-lg bg-[var(--surface-card)] flex items-center justify-center">
            <AttachmentTypeIcon mimeType={attachment.mimeType} size={64} />
          </div>
        )}
        <div className="mt-3 text-center text-white">
          <div className="text-[14px] font-bold">{attachment.name}</div>
          <div className="text-[11.5px] opacity-80 mt-0.5">
            {formatBytes(attachment.size)} · {prettyMime(attachment.mimeType)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentTypeIcon({ mimeType, size }: { mimeType: string; size: number }) {
  const props = { size, weight: 'fill' as const };
  if (mimeType.startsWith('image/')) return <ImageIcon {...props} className="text-[var(--info)]" />;
  if (mimeType === 'application/pdf') return <FilePdf {...props} className="text-[var(--danger)]" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileDoc {...props} className="text-[var(--brand-primary)]" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileXls {...props} className="text-[var(--success)]" />;
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileZip {...props} className="text-[var(--warning,#B45309)]" />;
  return <FileIcon {...props} className="text-[var(--text-tertiary)]" />;
}

function extToken(name: string, mime: string): string {
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1).toUpperCase();
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() ?? 'IMG';
  return 'FILE';
}

function prettyMime(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return `Image (${mime.split('/')[1] ?? 'img'})`;
  if (mime.includes('word') || mime.includes('document')) return 'Word document';
  if (mime.includes('sheet') || mime.includes('excel')) return 'Spreadsheet';
  if (mime.includes('csv')) return 'CSV';
  if (mime.includes('zip')) return 'ZIP archive';
  return mime || 'File';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Result-count chip that pulses briefly each time the filtered count
 * changes. Reinforces "your search/sort just took effect" without
 * needing a toast. Same micro-interaction Linear uses on its issue
 * count when filters change.
 */
function ResultCount({ count, total }: { count: number; total: number }) {
  const [pulseKey, setPulseKey] = useState(0);
  const prevRef = useRef<number>(count);
  useEffect(() => {
    if (prevRef.current !== count) {
      prevRef.current = count;
      setPulseKey((k) => k + 1);
    }
  }, [count]);
  return (
    <span
      key={pulseKey}
      className="text-[11.5px] font-semibold text-[var(--text-tertiary)] ml-auto animate-result-pulse"
    >
      {count} of {total}
    </span>
  );
}

/** Minimal relative-time formatter — keeps the feed scannable. */
function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
