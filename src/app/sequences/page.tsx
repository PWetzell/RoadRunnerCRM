'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import {
  Plus, Trash, X as XIcon, FloppyDisk, ListNumbers,
  PlayCircle, PauseCircle, EnvelopeSimple, Check, MagnifyingGlass, UserPlus,
  ChatCircleDots, PaperPlaneTilt, Pulse, CheckCircle, CaretUp, CaretDown,
} from '@phosphor-icons/react';
import {
  useSequenceStore,
  makeStep,
  getSequenceStats,
  markEnrollmentReplied,
  type EmailSequence,
  type SequenceStep,
  type SequenceEnrollment,
  type SequenceStats,
} from '@/stores/sequence-store';
import { useContactStore } from '@/stores/contact-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import SearchInput from '@/components/ui/SearchInput';
import type { ContactWithEntries } from '@/types/contact';

/**
 * Sequences page — full CRUD on email sequences plus a sidebar list
 * of enrollments per sequence with a "Send next step" action.
 *
 * MVP: manual step-send. Click "Send next step" on a due enrollment
 * to fire the email via /api/gmail/send. No background automation
 * yet — that's Phase 2.
 *
 * Layout: split-pane. Left = list of sequences. Right = editor for the
 * selected sequence (name, description, steps) + enrollments table.
 */

/** Sort options for the sequences list. Mirrors /bulk's sort palette
 *  so the two surfaces feel like the same system. */
type SeqSortMode = 'newest' | 'oldest' | 'enrolled' | 'replied';

/** Cumulative number of days from enrollment to a given step. Adds up
 *  every previous step's delay PLUS this step's delay. Used to show
 *  "Day 0 / Day 3 / Day 7" labels per step + the timeline strip. */
function cumulativeDayOffset(steps: Array<{ delayDays: number }>, idx: number): number {
  let sum = 0;
  for (let i = 0; i <= idx; i += 1) sum += steps[i]?.delayDays ?? 0;
  return sum;
}

/** Total cadence length — sum of every step's delay. Equals the
 *  number of days from enrollment to the last step's send. */
function totalCadenceDays(steps: Array<{ delayDays: number }>): number {
  return steps.reduce((sum, s) => sum + (s.delayDays ?? 0), 0);
}

/** Add `days` to an ISO timestamp; return a new ISO. */
function isoPlusDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Short, human-friendly date — "Apr 15", "Today", "Yesterday", or
 *  "5 days ago" for recent. Falls back to a localized short date for
 *  older entries. */
function formatSeqDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  // For older + future dates, render a short locale-aware date.
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SEQ_SORT_LABEL: Record<SeqSortMode, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  enrolled: 'Most enrolled',
  replied: 'Most replied',
};

export default function SequencesPage() {
  const sequences = useSequenceStore((s) => s.sequences);
  const enrollments = useSequenceStore((s) => s.enrollments);
  const createSequence = useSequenceStore((s) => s.createSequence);
  const deleteSequence = useSequenceStore((s) => s.deleteSequence);
  const seedSequenceDemo = useSequenceStore((s) => s.seedDemoIfEmpty);
  const removeSequenceDemo = useSequenceStore((s) => s.removeDemoData);
  const contacts = useContactStore((s) => s.contacts);
  const gmailStatus = useGmailStatusStore((s) => s.status);
  const refreshGmailStatus = useGmailStatusStore((s) => s.refresh);

  // Always seed — see /bulk page for the rationale. User can manually
  // delete any sequence they don't want via the per-row trash button.
  useEffect(() => {
    const seeds = contacts.slice(0, 8).map((c) => ({
      id: c.id,
      name: c.name,
      email:
        c.entries?.emails?.find((e) => e.primary)?.value
        ?? c.entries?.emails?.[0]?.value
        ?? ('email' in c ? (c.email ?? '') : '')
        ?? '',
    })).filter((c) => c.email);
    seedSequenceDemo(seeds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void gmailStatus; void refreshGmailStatus; void removeSequenceDemo;

  const [selectedId, setSelectedId] = useState<string | null>(sequences[0]?.id ?? null);
  const selected = sequences.find((s) => s.id === selectedId) ?? null;

  // List filter + sort. Default sort matches /bulk: newest first by
  // creation date so users see what they (or their team) just built.
  const [seqSearch, setSeqSearch] = useState('');
  const [seqSort, setSeqSort] = useState<SeqSortMode>('newest');

  const visibleSequences = useMemo(() => {
    const q = seqSearch.trim().toLowerCase();
    const matched = !q
      ? sequences
      : sequences.filter((seq) =>
        seq.name.toLowerCase().includes(q)
        || (seq.description ?? '').toLowerCase().includes(q)
        // Search step subjects too — matches HubSpot's "search inside
        // sequence content" behavior.
        || seq.steps.some((st) => st.subject.toLowerCase().includes(q)),
      );
    const list = [...matched];
    switch (seqSort) {
      case 'newest':
        return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      case 'oldest':
        return list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      case 'enrolled':
        return list.sort((a, b) => {
          const ea = enrollments.filter((e) => e.sequenceId === a.id && (e.status === 'active' || e.status === 'paused')).length;
          const eb = enrollments.filter((e) => e.sequenceId === b.id && (e.status === 'active' || e.status === 'paused')).length;
          return eb - ea;
        });
      case 'replied':
        return list.sort((a, b) => {
          const ra = enrollments.filter((e) => e.sequenceId === a.id && e.status === 'replied').length;
          const rb = enrollments.filter((e) => e.sequenceId === b.id && e.status === 'replied').length;
          return rb - ra;
        });
    }
  }, [sequences, enrollments, seqSearch, seqSort]);

  // When the seed populates after first paint (the `useEffect` above runs
  // post-render), `selectedId` is still null. Auto-pick the first sequence
  // so the editor + analytics dashboard render immediately.
  useEffect(() => {
    if (!selectedId && sequences.length > 0) {
      setSelectedId(sequences[0].id);
    }
  }, [sequences, selectedId]);

  const handleCreate = () => {
    const seq = createSequence({
      name: 'New Sequence',
      steps: [makeStep({ subject: 'Quick intro', body: 'Hi {{firstName}},\n\n', delayDays: 0 })],
    });
    setSelectedId(seq.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this sequence and all its enrollments?')) return;
    deleteSequence(id);
    if (selectedId === id) {
      setSelectedId(sequences.find((s) => s.id !== id)?.id ?? null);
    }
  };

  return (
    <>
      <Topbar title="Sequences" />
      <div className="flex-1 overflow-hidden flex">
        {/* Left: sequence list — header + search + sort pinned at top,
             list scrolls below. Same shape as /bulk's fixed-header
             pattern so the two pages feel consistent. */}
        <div data-tour="seq-list-panel" className="w-[280px] flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface-card)] flex flex-col">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Sequences
            </span>
            <button
              onClick={handleCreate}
              title="Create a new sequence"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer hover:opacity-90"
            >
              <Plus size={11} weight="bold" />
              New
            </button>
          </div>
          <div className="px-2 py-2 border-b border-[var(--border)] flex flex-col gap-1.5">
            <SearchInput
              value={seqSearch}
              onChange={setSeqSearch}
              placeholder="Search sequences…"
              ariaLabel="Search sequences"
              size="sm"
            />
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
              Sort
              <select
                value={seqSort}
                onChange={(e) => setSeqSort(e.target.value as SeqSortMode)}
                aria-label="Sort sequences"
                className="flex-1 h-7 px-1.5 text-[11px] font-semibold bg-[var(--surface-raised)] border border-[var(--text-tertiary)] rounded text-[var(--text-primary)] outline-none cursor-pointer focus:border-[var(--brand-primary)]"
              >
                {(Object.keys(SEQ_SORT_LABEL) as SeqSortMode[]).map((m) => (
                  <option key={m} value={m}>{SEQ_SORT_LABEL[m]}</option>
                ))}
              </select>
            </label>
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] px-0.5">
              {visibleSequences.length} of {sequences.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sequences.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <ListNumbers size={28} weight="duotone" className="mx-auto text-[var(--text-tertiary)] mb-2" />
                <p className="text-[12px] text-[var(--text-tertiary)]">
                  No sequences yet. Click <strong>+ New</strong> to create one.
                </p>
              </div>
            ) : visibleSequences.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[12px] text-[var(--text-tertiary)] italic">
                  No sequences match your search.
                </p>
              </div>
            ) : (
              visibleSequences.map((seq) => {
                const active = selectedId === seq.id;
                const activeEnrollments = enrollments.filter(
                  (e) => e.sequenceId === seq.id && (e.status === 'active' || e.status === 'paused'),
                ).length;
                return (
                  <button
                    key={seq.id}
                    onClick={() => setSelectedId(seq.id)}
                    title={`Created ${new Date(seq.createdAt).toLocaleString()}`}
                    className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
                      active ? 'bg-[var(--brand-bg)]' : 'bg-transparent hover:bg-[var(--surface-raised)]'
                    } border-l-2 ${active ? 'border-l-[var(--brand-primary)]' : 'border-l-transparent'}`}
                  >
                    <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                      {seq.name}
                    </div>
                    <div className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
                      {seq.steps.length} step{seq.steps.length === 1 ? '' : 's'}
                      {activeEnrollments > 0 && (
                        <> · {activeEnrollments} enrolled</>
                      )}
                    </div>
                    {/* Creation date — rendered on the row so sorting by
                         "Newest first" actually has visible scaffolding.
                         Formatted as a short date; the full timestamp is
                         on the title attribute for hover detail. */}
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 opacity-80">
                      Created {formatSeqDate(seq.createdAt)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selected ? (
            <SequenceEditor
              key={selected.id}
              sequence={selected}
              enrollments={enrollments.filter((e) => e.sequenceId === selected.id)}
              onDelete={() => handleDelete(selected.id)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="max-w-md text-center">
                <ListNumbers size={48} weight="duotone" className="mx-auto text-[var(--text-tertiary)] mb-4" />
                <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">
                  Build a sequence
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                  A sequence is a multi-step email cadence — intro, follow-up, second
                  follow-up, etc. — with delays between each step. Enroll contacts and
                  fire each step manually for now (full automation comes next).
                </p>
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer hover:opacity-90"
                >
                  <Plus size={12} weight="bold" />
                  Create your first sequence
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SequenceEditor({
  sequence,
  enrollments,
  onDelete,
}: {
  sequence: EmailSequence;
  enrollments: SequenceEnrollment[];
  onDelete: () => void;
}) {
  const updateSequence = useSequenceStore((s) => s.updateSequence);
  const allContacts = useContactStore((s) => s.contacts);
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description ?? '');
  const [steps, setSteps] = useState<SequenceStep[]>(sequence.steps);
  const [savedFlash, setSavedFlash] = useState(false);

  // Live analytics — computed on every render off the latest enrollments.
  // Cheap because we only iterate `own` enrollments + the step list.
  const stats = useMemo(
    () => getSequenceStats(sequence, enrollments),
    [sequence, enrollments],
  );

  // Reply-detection effect. For each active/paused enrollment, scan the
  // contact's email cache for any inbound message received AFTER the
  // most recent step send. If we find one, flip the enrollment to
  // 'replied' (matching the user's stopOnReply intent on each step).
  //
  // Industry pattern: HubSpot/Outreach/Apollo all do this server-side via
  // the Gmail thread reply webhook. For Roadrunner's MVP we approximate
  // it client-side by inspecting the same email cache the contact detail
  // pages already populate. Good enough for demo + small teams; graduates
  // to a server cron when we wire automation.
  useEffect(() => {
    const candidates = enrollments.filter(
      (e) => (e.status === 'active' || e.status === 'paused')
        && Object.keys(e.sendLog).length > 0,
    );
    if (candidates.length === 0) return;
    for (const e of candidates) {
      const contact = allContacts.find((c) => c.id === e.contactId);
      if (!contact) continue;
      const cachedEmails = (contact as unknown as { emails?: { from?: string; receivedAt?: string; date?: string; direction?: string }[] }).emails;
      if (!Array.isArray(cachedEmails) || cachedEmails.length === 0) continue;
      const lastSentAt = Math.max(
        ...Object.values(e.sendLog).map((iso) => new Date(iso).getTime()),
      );
      const replied = cachedEmails.some((msg) => {
        const ts = new Date(msg.receivedAt ?? msg.date ?? 0).getTime();
        if (!ts || ts <= lastSentAt) return false;
        // Inbound-only — direction === 'inbound' OR from address matches contact's email.
        if (msg.direction === 'inbound') return true;
        const fromAddr = (msg.from ?? '').toLowerCase();
        return fromAddr.includes(e.contactEmail.toLowerCase());
      });
      if (replied) markEnrollmentReplied(e.id);
    }
    // Run on enrollment list change OR when contact email caches refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, allContacts]);

  const dirty =
    name !== sequence.name
    || description !== (sequence.description ?? '')
    || JSON.stringify(steps) !== JSON.stringify(sequence.steps);

  const save = () => {
    updateSequence(sequence.id, { name, description: description || undefined, steps });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const updateStep = (idx: number, patch: Partial<SequenceStep>) => {
    setSteps((prev) => prev.map((st, i) => (i === idx ? { ...st, ...patch } : st)));
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      makeStep({
        subject: prev.length > 0 ? `Re: ${prev[0].subject}` : '',
        body: '',
        delayDays: prev.length === 0 ? 0 : 3,
      }),
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sequence name"
          className="flex-1 text-[18px] font-extrabold text-[var(--text-primary)] bg-transparent border-none outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={!dirty}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-bold border-none ${
              dirty
                ? 'bg-[var(--brand-primary)] text-white cursor-pointer hover:opacity-90'
                : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] cursor-not-allowed'
            }`}
          >
            {savedFlash ? <Check size={12} weight="bold" /> : <FloppyDisk size={12} weight="bold" />}
            {savedFlash ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={onDelete}
            title="Delete sequence"
            className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>

      {/* Timeline strip — shows the sequence's place in time:
            • Created — the moment "+ New" was clicked
            • Cadence length — sum of step delays in days
            • Earliest finish — for the most-recently-enrolled active
              contact, when the last step is due
          Industry parallel: HubSpot Sequence header shows "Created on
          {date} · {N} steps · {duration} day cadence"; this strip is
          the same row of metadata, plus a forward-looking finish
          estimate so users see "this is supposed to wrap by X". */}
      <div data-tour="seq-timeline">
        <SequenceTimeline sequence={sequence} enrollments={enrollments} steps={steps} />
      </div>

      <div className="px-6 py-4 border-b border-[var(--border)]">
        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Internal note: what's this sequence for?"
          className="w-full text-[13px] text-[var(--text-primary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-md px-2.5 py-1.5 outline-none placeholder:text-[var(--text-tertiary)] resize-none"
        />
      </div>

      {/* Analytics dashboard — live stats computed from enrollments.
          Mirrors the "Performance" panel HubSpot/Outreach/Apollo show
          at the top of every sequence. */}
      <div data-tour="seq-analytics">
        <SequenceAnalytics stats={stats} sequence={sequence} />
      </div>

      <div data-tour="seq-steps" className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Steps</h3>
          <button
            onClick={addStep}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold border border-[var(--brand-primary)] text-[var(--brand-primary)] bg-transparent hover:bg-[var(--brand-bg)] cursor-pointer"
          >
            <Plus size={11} weight="bold" />
            Add step
          </button>
        </div>
        {steps.length === 0 ? (
          <p className="text-[12px] text-[var(--text-tertiary)] italic py-4 text-center">
            No steps yet. Add one to start building the sequence.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {steps.map((step, idx) => (
              <StepEditor
                key={step.id}
                step={step}
                idx={idx}
                allSteps={steps}
                stepStats={stats.steps.find((s) => s.stepId === step.id)}
                onChange={(patch) => updateStep(idx, patch)}
                onRemove={() => removeStep(idx)}
              />
            ))}
          </div>
        )}
        <p className="text-[10.5px] text-[var(--text-tertiary)] italic mt-3">
          Use merge fields like <code className="font-mono">{'{{firstName}}'}</code>,
          <code className="font-mono"> {'{{company}}'}</code>,
          <code className="font-mono"> {'{{senderName}}'}</code> — they auto-fill per recipient at send time.
        </p>
      </div>

      <div data-tour="seq-enrollments" className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
            Enrolled contacts ({enrollments.length})
          </h3>
          <EnrollContactButton sequence={sequence} />
        </div>
        {enrollments.length === 0 ? (
          <p className="text-[12px] text-[var(--text-tertiary)] italic py-4 text-center">
            No one enrolled yet. Click <strong>+ Enroll contact</strong> to add someone.
          </p>
        ) : (
          <EnrollmentsTable enrollments={enrollments} sequence={sequence} />
        )}
      </div>
    </div>
  );
}

function EnrollContactButton({ sequence }: { sequence: EmailSequence }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={sequence.steps.length === 0}
        title={
          sequence.steps.length === 0
            ? 'Add at least one step before enrolling contacts'
            : 'Enroll a contact in this sequence'
        }
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold border border-[var(--brand-primary)] text-[var(--brand-primary)] bg-transparent hover:bg-[var(--brand-bg)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus size={11} weight="bold" />
        Enroll contact
      </button>
      {open && <EnrollContactPicker sequence={sequence} onClose={() => setOpen(false)} />}
    </>
  );
}

function EnrollContactPicker({
  sequence,
  onClose,
}: {
  sequence: EmailSequence;
  onClose: () => void;
}) {
  const contacts = useContactStore((s) => s.contacts);
  const enrollments = useSequenceStore((s) => s.enrollments);
  const enrollContact = useSequenceStore((s) => s.enrollContact);
  const [search, setSearch] = useState('');

  const primaryEmail = (c: ContactWithEntries): string =>
    c.entries?.emails?.find((e) => e.primary)?.value
    ?? c.entries?.emails?.[0]?.value
    ?? ('email' in c ? c.email : undefined)
    ?? '';

  const eligible = useMemo(() => {
    const alreadyEnrolledIds = new Set(
      enrollments
        .filter((e) => e.sequenceId === sequence.id && (e.status === 'active' || e.status === 'paused'))
        .map((e) => e.contactId),
    );
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => !alreadyEnrolledIds.has(c.id))
      .filter((c) => !!primaryEmail(c))
      .filter((c) => {
        if (!q) return true;
        const hay = [c.name, primaryEmail(c)].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [contacts, enrollments, sequence.id, search]);

  const handleEnroll = (c: ContactWithEntries) => {
    enrollContact({
      sequenceId: sequence.id,
      contactId: c.id,
      contactName: c.name,
      contactEmail: primaryEmail(c),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)]">
            Enroll a contact in &ldquo;{sequence.name}&rdquo;
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <XIcon size={14} />
          </button>
        </div>
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search contacts…"
            ariaLabel="Search contacts to enroll"
            size="sm"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {eligible.length === 0 ? (
            <p className="text-[12px] text-[var(--text-tertiary)] italic py-6 text-center">
              {search ? 'No matching contacts' : 'No eligible contacts (all enrolled or no email)'}
            </p>
          ) : (
            eligible.map((c) => (
              <button
                key={c.id}
                onClick={() => handleEnroll(c)}
                className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--brand-bg)] cursor-pointer bg-transparent border-none"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[12.5px] font-bold text-[var(--text-primary)] truncate">{c.name}</span>
                  <span className="text-[10.5px] text-[var(--text-tertiary)] truncate">{primaryEmail(c)}</span>
                </div>
                <Plus size={12} weight="bold" className="text-[var(--brand-primary)] flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StepEditor({
  step,
  idx,
  allSteps,
  stepStats,
  onChange,
  onRemove,
}: {
  step: SequenceStep;
  idx: number;
  allSteps: SequenceStep[];
  stepStats?: { sent: number; pendingNext: number; replied: number };
  onChange: (patch: Partial<SequenceStep>) => void;
  onRemove: () => void;
}) {
  // Cumulative offset from enrollment to this step's send. Shown as a
  // "Day N" badge in the accordion header so users see the timeline
  // shape without expanding every step. "Day 0" = same-day send.
  const dayOffset = cumulativeDayOffset(allSteps, idx);
  // Accordion state — default open on the first step so users see a
  // worked example without clicking. Later steps collapse to a one-row
  // summary, click to expand. Industry parallel: HubSpot's sequence
  // editor and Apollo's cadence builder both ship with the first step
  // open and the rest collapsed.
  const [expanded, setExpanded] = useState<boolean>(idx === 0);

  // Auto-resize the body textarea so the full message is always
  // visible — no nested scroll inside a fixed card. Runs whenever the
  // body text or expanded state changes (height needs recalc on
  // re-mount post-expand).
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(96, el.scrollHeight)}px`;
  }, [step.body, expanded]);

  const Stats = stepStats && stepStats.sent > 0 ? (
    <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-[var(--text-tertiary)]">
      <span className="inline-flex items-center gap-1">
        <PaperPlaneTilt size={10} weight="fill" className="text-[var(--brand-primary)]" />
        {stepStats.sent} sent
      </span>
      {stepStats.replied > 0 && (
        <span className="inline-flex items-center gap-1">
          <ChatCircleDots size={10} weight="fill" className="text-[var(--info)]" />
          {stepStats.replied} replied
        </span>
      )}
      {stepStats.pendingNext > 0 && (
        <span className="inline-flex items-center gap-1">
          <Pulse size={10} weight="fill" className="text-[var(--warning)]" />
          {stepStats.pendingNext} waiting
        </span>
      )}
    </div>
  ) : null;

  const toggle = () => setExpanded((v) => !v);
  return (
    // Hover style mirrors the email-row treatment in EmailsPanel: border
    // ramps to brand-primary and a soft shadow lifts the card. Reads as
    // "this is interactive" without competing with the inner toggle
    // button's own focus ring.
    <div className="border border-[var(--border)] rounded-lg bg-[var(--surface-card)] overflow-hidden transition-all duration-200 hover:border-[var(--brand-primary)] hover:shadow-[0_4px_14px_-4px_rgba(25,85,166,0.18)]">
      {/* Accordion header. Three sibling buttons share one row so we
           don't nest interactive elements (invalid HTML) — the toggle
           is the wide left button, trash and caret are separate.
           Hovering the row tints the whole strip so it reads as one
           clickable surface. */}
      <div
        className={`group flex items-stretch hover:bg-[var(--surface-raised)] transition-colors ${
          expanded ? 'border-b border-[var(--border)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`step-body-${step.id}`}
          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left bg-transparent border-none cursor-pointer"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--brand-bg)] text-[var(--brand-primary)] text-[11px] font-bold flex-shrink-0">
            {idx + 1}
          </span>
          {/* Day-N badge — cumulative offset from enrollment so the
               whole cadence reads at a glance: Day 0, Day 3, Day 7, … */}
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] flex-shrink-0"
            title={
              dayOffset === 0
                ? 'Sent the day the contact is enrolled'
                : `Sent ${dayOffset} day${dayOffset === 1 ? '' : 's'} after enrollment`
            }
          >
            Day {dayOffset}
          </span>
          <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">
            {step.subject || <span className="text-[var(--text-tertiary)] font-normal italic">No subject yet</span>}
          </span>
          {Stats && (
            <span className="ml-2 flex-shrink-0">{Stats}</span>
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove this step"
          aria-label="Remove this step"
          className="px-2 my-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer flex items-center"
        >
          <XIcon size={12} />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? 'Collapse step' : 'Expand step'}
          aria-expanded={expanded}
          className="px-2.5 bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center"
        >
          {expanded
            ? <CaretUp size={12} weight="bold" />
            : <CaretDown size={12} weight="bold" />
          }
        </button>
      </div>

      {/* Expanded body — subject input, auto-grow textarea, options.
           When collapsed we render nothing so the card height drops to
           just the header row. */}
      {expanded && (
        <div id={`step-body-${step.id}`} className="px-3 py-3">
          <input
            value={step.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="Subject (use {{firstName}} for personalization)"
            className="w-full text-[13px] font-semibold text-[var(--text-primary)] bg-transparent border-b border-[var(--border)] outline-none py-1 mb-3"
          />
          <textarea
            ref={bodyRef}
            value={step.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Email body…"
            // overflow-hidden + auto-resize via the effect above means
            // the textarea grows with content — no inner scroll, the
            // whole message stays visible.
            className="w-full text-[12.5px] leading-relaxed text-[var(--text-primary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-md px-2.5 py-2 outline-none placeholder:text-[var(--text-tertiary)] resize-none overflow-hidden mb-3"
            style={{ minHeight: '96px' }}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1 text-[11.5px] text-[var(--text-secondary)]">
              Wait
              <input
                type="number"
                min={0}
                max={365}
                value={step.delayDays}
                onChange={(e) => onChange({ delayDays: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-14 text-[12px] text-center bg-[var(--surface-raised)] border border-[var(--border)] rounded px-1 py-0.5 outline-none"
              />
              days {idx === 0 ? 'after enrollment' : 'after previous step'}
            </label>
            <label className="flex items-center gap-1 text-[11.5px] text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={step.stopOnReply}
                onChange={(e) => onChange({ stopOnReply: e.target.checked })}
                className="cursor-pointer"
              />
              Stop sequence if contact replies
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function EnrollmentsTable({
  enrollments,
  sequence,
}: {
  enrollments: SequenceEnrollment[];
  sequence: EmailSequence;
}) {
  const recordStepSent = useSequenceStore((s) => s.recordStepSent);
  const pauseEnrollment = useSequenceStore((s) => s.pauseEnrollment);
  const resumeEnrollment = useSequenceStore((s) => s.resumeEnrollment);
  const unenrollContact = useSequenceStore((s) => s.unenrollContact);
  const [sending, setSending] = useState<string | null>(null);

  const gmailStatus = useGmailStatusStore((s) => s.status);

  const sendNextStep = async (e: SequenceEnrollment) => {
    const step = sequence.steps[e.currentStepIdx];
    if (!step) return;
    setSending(e.id);

    // Demo-mode short-circuit — see BulkEmailComposer for rationale.
    // Records the step as "sent" without touching /api/gmail/send so
    // demo viewers can click "Send next step" and watch the funnel
    // update without firing real email.
    if (!gmailStatus?.connected) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      recordStepSent(e.id);
      setSending(null);
      return;
    }

    try {
      // Subject + body are templated — render with the contact's data
      // before send. (`renderStepForContact` lives in the store; we
      // duplicate the lightweight substitution here to avoid pulling
      // contact-store data through the store API.)
      const { applyTemplateVariables, buildTemplateContext } = await import('@/stores/template-store');
      const ctx = buildTemplateContext({
        contactName: e.contactName,
        contactType: 'person',
        email: e.contactEmail,
      });
      const subject = applyTemplateVariables(step.subject, ctx);
      const body = applyTemplateVariables(step.body, ctx);
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: e.contactEmail,
          subject,
          bodyText: body,
          contactId: e.contactId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      recordStepSent(e.id);
    } catch (err) {
      alert(`Failed to send: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="border border-[var(--border)] rounded-md overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-[var(--surface-raised)]">
          <tr className="text-left">
            <th className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Contact</th>
            <th className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Step</th>
            <th className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Started</th>
            <th className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Next due</th>
            <th className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Expected end</th>
            <th className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
            <th className="px-2.5 py-1.5 w-[1%]" />
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => {
            const stepLabel = e.status === 'completed'
              ? `Done · ${sequence.steps.length} of ${sequence.steps.length}`
              : `Step ${e.currentStepIdx + 1} of ${sequence.steps.length}`;
            const dueDate = new Date(e.nextDueAt);
            const isDue = dueDate.getTime() <= Date.now();
            const dueLabel = e.status === 'completed' || e.status === 'cancelled' || e.status === 'replied'
              ? '—'
              : isDue
                ? 'Now'
                : dueDate.toLocaleDateString();
            // Expected end = enrolledAt + total cadence days. Only
            // surface for still-running enrollments (active/paused);
            // for completed/replied/cancelled we show the actual end
            // landmark or "—".
            const cadenceDays = totalCadenceDays(sequence.steps);
            const expectedEndIso = isoPlusDays(e.enrolledAt, cadenceDays);
            const expectedEndLabel =
              e.status === 'completed'
                ? formatSeqDate(expectedEndIso)
                : e.status === 'cancelled' || e.status === 'replied'
                  ? '—'
                  : formatSeqDate(expectedEndIso);
            return (
              <tr key={e.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-2.5 py-2">
                  <div className="font-semibold text-[var(--text-primary)]">{e.contactName}</div>
                  <div className="text-[10.5px] text-[var(--text-tertiary)]">{e.contactEmail}</div>
                </td>
                <td className="px-2.5 py-2 text-[var(--text-secondary)]">{stepLabel}</td>
                <td
                  className="px-2.5 py-2 text-[var(--text-secondary)] tabular-nums"
                  title={new Date(e.enrolledAt).toLocaleString()}
                >
                  {formatSeqDate(e.enrolledAt)}
                </td>
                <td className={`px-2.5 py-2 tabular-nums ${isDue && e.status === 'active' ? 'text-[var(--success)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                  {dueLabel}
                </td>
                <td
                  className="px-2.5 py-2 text-[var(--text-secondary)] tabular-nums"
                  title={`Total cadence ${cadenceDays} day${cadenceDays === 1 ? '' : 's'} from start`}
                >
                  {expectedEndLabel}
                </td>
                <td className="px-2.5 py-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass(e.status)}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  {e.status === 'active' && isDue && (
                    <button
                      onClick={() => sendNextStep(e)}
                      disabled={sending === e.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
                    >
                      <EnvelopeSimple size={10} weight="fill" />
                      {sending === e.id ? 'Sending…' : 'Send next step'}
                    </button>
                  )}
                  {e.status === 'active' && !isDue && (
                    <button
                      onClick={() => pauseEnrollment(e.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] cursor-pointer hover:border-[var(--text-primary)]"
                    >
                      <PauseCircle size={10} weight="bold" /> Pause
                    </button>
                  )}
                  {e.status === 'paused' && (
                    <button
                      onClick={() => resumeEnrollment(e.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold text-[var(--brand-primary)] bg-transparent border border-[var(--brand-primary)] cursor-pointer hover:bg-[var(--brand-bg)]"
                    >
                      <PlayCircle size={10} weight="bold" /> Resume
                    </button>
                  )}
                  {(e.status === 'active' || e.status === 'paused') && (
                    <button
                      onClick={() => unenrollContact(e.id)}
                      title="Remove from sequence"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] ml-1"
                    >
                      <XIcon size={10} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Sequence timeline strip — sits below the title bar and answers the
 * three "place in time" questions every sequence-aware tool surfaces:
 *   • When was this created?
 *   • How long is the cadence (start to last step)?
 *   • When does the most-recent enrollment finish?
 *
 * If there are no enrollments yet, the "Next finish" slot stays empty
 * and we show the cadence as a planning hint instead.
 */
function SequenceTimeline({
  sequence,
  enrollments,
  steps,
}: {
  sequence: EmailSequence;
  enrollments: SequenceEnrollment[];
  steps: SequenceStep[];
}) {
  const cadenceDays = totalCadenceDays(steps);
  // Among active/paused enrollments, pick the one whose final step is
  // due latest — that's the "earliest the cohort fully wraps" date.
  const activeEnrollments = enrollments.filter(
    (e) => e.status === 'active' || e.status === 'paused',
  );
  let nextFinishIso: string | null = null;
  for (const e of activeEnrollments) {
    const finishIso = isoPlusDays(e.enrolledAt, cadenceDays);
    if (!nextFinishIso || Date.parse(finishIso) > Date.parse(nextFinishIso)) {
      nextFinishIso = finishIso;
    }
  }
  return (
    <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)] flex items-center gap-5 flex-wrap text-[12px]">
      <TimelineCell
        label="Created"
        value={formatSeqDate(sequence.createdAt)}
        title={new Date(sequence.createdAt).toLocaleString()}
      />
      <TimelineCell
        label="Last edit"
        value={formatSeqDate(sequence.updatedAt)}
        title={new Date(sequence.updatedAt).toLocaleString()}
      />
      <TimelineCell
        label="Cadence length"
        value={cadenceDays === 0 ? 'Same-day' : `${cadenceDays} day${cadenceDays === 1 ? '' : 's'}`}
        title={`Sum of every step's delay — ${steps.length} step${steps.length === 1 ? '' : 's'}`}
      />
      {nextFinishIso ? (
        <TimelineCell
          label="Latest finish"
          value={formatSeqDate(nextFinishIso)}
          title={`Most-recent active enrollment is due to wrap on ${new Date(nextFinishIso).toLocaleString()}`}
          accent
        />
      ) : (
        <TimelineCell
          label="Latest finish"
          value="—"
          title="No active enrollments yet"
        />
      )}
    </div>
  );
}

function TimelineCell({
  label,
  value,
  title,
  accent = false,
}: {
  label: string;
  value: string;
  title?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col" title={title}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <span
        className={`text-[12.5px] font-bold tabular-nums ${
          accent ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Top-of-editor analytics dashboard. Four stat cards (Active, Completed,
 * Replied, Reply Rate) + a horizontal step funnel that shows the drop-off
 * across the sequence. Calibrated to feel like HubSpot's sequence
 * performance panel — same chart-less, count-based density.
 */
function SequenceAnalytics({ stats, sequence }: { stats: SequenceStats; sequence: EmailSequence }) {
  const replyPct = Math.round(stats.replyRate * 100);
  // Funnel max — used to normalize bar widths so the tallest step fills
  // the full track. If nothing's been sent, hide the funnel entirely.
  const funnelMax = Math.max(0, ...stats.steps.map((s) => s.sent));
  const showFunnel = stats.totalEnrolled > 0 && funnelMax > 0;
  return (
    <div className="px-6 py-4 border-b border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
          Performance
        </h3>
        <span className="text-[10.5px] text-[var(--text-tertiary)]">
          Live · {stats.totalEnrolled} total enrolled
        </span>
      </div>
      {/* Tone mapping mirrors /bulk's positional palette so the two
           pages feel like one system:
             1st card → brand-blue (primary count)
             2nd card → info-teal (secondary count)
             3rd card → success-green / danger-red (performance)
             4th card → lavender (raw count) */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <SeqStatCard
          label="Active"
          value={stats.active + stats.paused}
          icon={<Pulse size={14} weight="fill" />}
          tone="brand"
          hint={stats.paused > 0 ? `${stats.paused} paused` : undefined}
          delayMs={0}
        />
        <SeqStatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle size={14} weight="fill" />}
          tone="info"
          delayMs={80}
        />
        <SeqStatCard
          // Reply Rate: never paints danger-red. Cold outreach rates are
          // naturally 1-5% — flagging that as failure would be misleading
          // AND visually clash with the calm palette across the row.
          // Mapping mirrors /bulk's Delivery Rate position: success-green
          // is the default positive treatment; we only fade to neutral
          // info-teal when there's literally no send activity yet.
          label="Reply rate"
          value={replyPct}
          suffix="%"
          icon={<Pulse size={14} weight="fill" />}
          tone={stats.totalEnrolled === 0 ? 'info' : 'success'}
          hint={
            stats.totalEnrolled === 0
              ? 'No sends yet'
              : replyPct >= 20 ? 'Above industry avg'
              : replyPct >= 5 ? 'On track'
              : 'Building data'
          }
          delayMs={160}
        />
        <SeqStatCard
          label="Replied"
          value={stats.replied}
          icon={<ChatCircleDots size={14} weight="fill" />}
          tone="warm"
          delayMs={240}
        />
      </div>
      {showFunnel && (
        <FunnelChart steps={stats.steps} sequence={sequence} />
      )}
    </div>
  );
}

/**
 * Step funnel — actual funnel SHAPE.
 *
 * Earlier iterations used a horizontal progress bar to visualize per-step
 * volume; users found that abstract — "what does the bar represent?" —
 * because the bar is decoupled from the numbers it represents. This
 * version makes the *card itself* shrink: each successive step's block
 * is narrower than the one above, creating a literal top-to-bottom
 * funnel cone. The shape IS the chart — no separate bar to interpret.
 *
 * Width formula: `step.sent / steps[0].sent * 100%`. So step 1 always
 * fills the row (the cohort's starting size), and each later step is
 * the percent of the original cohort that still received that step.
 *
 * Industry reference: this is the same shape Mixpanel, Amplitude, and
 * GA4 use for their conversion funnels — and what most people picture
 * when they hear the word "funnel". Drop-off chips between cards
 * communicate the step-to-step attrition explicitly.
 *
 * All text sits inside the dark-on-light cards (≥10:1 contrast) — WCAG
 * AAA across the board.
 */
function FunnelChart({
  steps,
  sequence,
}: {
  steps: Array<{ stepId: string; sent: number; pendingNext: number; replied: number }>;
  sequence: EmailSequence;
}) {
  // Use step 1 as the cohort baseline — every subsequent step is a
  // fraction of it. Falls back to overall max if step 1 had 0 sends
  // (rare, but possible if the first step was skipped manually).
  const baseline = steps[0]?.sent || Math.max(0, ...steps.map((s) => s.sent));
  const totalSends = steps.reduce((sum, s) => sum + s.sent, 0);
  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Step funnel
        </span>
        <span className="text-[10.5px] text-[var(--text-tertiary)]">
          {totalSends} total sends · width = % of starting cohort
        </span>
      </div>
      <div className="flex flex-col items-center">
        {steps.map((s, idx) => {
          const widthPct = baseline === 0 ? 0 : Math.max(8, Math.round((s.sent / baseline) * 100));
          const cohortPct = baseline === 0 ? 0 : Math.round((s.sent / baseline) * 100);
          const replyRate = s.sent === 0 ? 0 : Math.round((s.replied / s.sent) * 100);
          const stepDef = sequence.steps[idx];
          // Drop-off vs the previous step (the chip above this card).
          let dropPct: number | null = null;
          if (idx > 0) {
            const prev = steps[idx - 1].sent;
            if (prev > 0) dropPct = Math.round(((prev - s.sent) / prev) * 100);
          }
          return (
            <div key={s.stepId} className="w-full flex flex-col items-center">
              {/* Drop-off chip between cards. Color-graded by severity. */}
              {dropPct !== null && (
                <div className="flex items-center gap-1.5 my-1">
                  <span aria-hidden="true" className="inline-block w-px h-3 bg-[var(--border)]" />
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      dropPct === 0
                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                        : dropPct <= 25
                        ? 'bg-[var(--info-bg)] text-[var(--info)]'
                        : 'bg-[#FFF6E5] text-[#92400E]'
                    }`}
                    title={
                      dropPct === 0
                        ? 'No drop-off between steps'
                        : `${dropPct}% of step ${idx} did not advance to step ${idx + 1}`
                    }
                  >
                    {dropPct === 0 ? '→ no drop-off' : `↓ ${dropPct}% drop-off`}
                  </span>
                  <span aria-hidden="true" className="inline-block w-px h-3 bg-[var(--border)]" />
                </div>
              )}

              {/* The card itself — width shrinks per step. THIS is the
                   funnel shape; no separate bar required. */}
              <div
                className="rounded-md border border-[var(--brand-primary)] bg-[var(--surface-card)] px-3 py-2 transition-all duration-500 hover:shadow-md"
                style={{ width: `${widthPct}%`, minWidth: '160px' }}
                role="figure"
                aria-label={`Step ${idx + 1} card: ${s.sent} sent — ${cohortPct}% of starting cohort`}
              >
                {/* Header row: step number + subject */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-extrabold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[11.5px] font-bold text-[var(--text-primary)] truncate flex-1">
                    {stepDef?.subject || `Step ${idx + 1}`}
                  </span>
                  <span className="text-[10px] font-extrabold text-[var(--brand-primary)] tabular-nums flex-shrink-0">
                    {cohortPct}%
                  </span>
                </div>
                {/* Metrics row: sent + replied + reply-rate chip + waiting */}
                <div className="flex items-center gap-2.5 text-[11px] font-semibold tabular-nums pl-7 flex-wrap">
                  <span className="text-[var(--text-primary)]">
                    <strong className="font-extrabold">{s.sent}</strong>{' '}
                    <span className="text-[var(--text-secondary)] font-medium">sent</span>
                  </span>
                  {s.replied > 0 && (
                    <span className="text-[var(--text-primary)]">
                      <strong className="font-extrabold">{s.replied}</strong>{' '}
                      <span className="text-[var(--text-secondary)] font-medium">replied</span>
                    </span>
                  )}
                  {s.sent > 0 && s.replied > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] text-[10px] font-bold">
                      {replyRate}% reply
                    </span>
                  )}
                  {s.pendingNext > 0 && (
                    <span className="text-[var(--text-tertiary)] font-medium">
                      · {s.pendingNext} waiting
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend caption — defends against any "what is this?" reaction
           by spelling out the visual encoding in one line. Sized at
           12px / text-secondary so it's easily readable (≥7:1 contrast
           on the surface-raised bg = WCAG AAA). */}
      <p className="text-[12px] leading-snug text-[var(--text-secondary)] mt-3 text-center px-2">
        <strong className="font-bold text-[var(--text-primary)]">Each card&apos;s width</strong> = % of step 1&apos;s cohort that received this step.
        Cards narrow downward as people reply, get unenrolled, or are still waiting.
      </p>
    </div>
  );
}

// Palette mirrors /bulk so the two pages feel like one system. Tones:
//   brand  → primary count (cool blue)
//   info   → secondary count (teal)
//   success/danger → performance metrics (green / red)
//   warm   → raw category count (lavender, matches /bulk Recipients)
//   neutral → fallback / disabled
type SeqStatTone = 'brand' | 'success' | 'info' | 'neutral' | 'warm' | 'danger';

/**
 * Count-up hook duplicated here from /bulk so the sequences page can
 * animate its numbers without a cross-page import. Both call sites
 * keep their own copy on purpose — small, ref-stable, no dependency
 * graph headache.
 */
function useSeqCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setValue(target); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function SeqStatCard({
  label,
  value,
  icon,
  tone,
  hint,
  suffix = '',
  delayMs = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: SeqStatTone;
  hint?: string;
  suffix?: string;
  delayMs?: number;
}) {
  const toneStyles: Record<SeqStatTone, { bg: string; text: string; iconColor: string }> = {
    brand: { bg: 'var(--brand-bg)', text: 'var(--brand-primary)', iconColor: 'var(--brand-primary)' },
    success: { bg: 'var(--success-bg)', text: 'var(--success)', iconColor: 'var(--success)' },
    info: { bg: 'var(--info-bg)', text: 'var(--info)', iconColor: 'var(--info)' },
    // Identical tokens to /bulk's StatCard so the two pages share one
    // palette across every tone. If we tweak /bulk later we should mirror
    // it here.
    neutral: { bg: 'var(--surface-card)', text: 'var(--text-primary)', iconColor: 'var(--text-tertiary)' },
    // Lavender — same CSS vars as /bulk's Recipients card, so Replied
    // and Recipients share visual identity across pages AND adapt to
    // dark mode (vars are defined in globals.css with light + dark).
    warm: { bg: 'var(--lavender-bg)', text: 'var(--lavender-fg)', iconColor: 'var(--lavender)' },
    danger: { bg: 'var(--danger-bg, #FEE2E2)', text: 'var(--danger, #B91C1C)', iconColor: 'var(--danger, #B91C1C)' },
  };
  const s = toneStyles[tone];
  // Count-up if the value is numeric.
  const targetNum = typeof value === 'number' ? value : 0;
  const counted = useSeqCountUp(typeof value === 'number' ? targetNum : 0);
  const displayValue = typeof value === 'number' ? `${counted}${suffix}` : `${value}${suffix}`;
  return (
    <div
      className="animate-stat-card border border-[var(--border)] rounded-lg p-2.5"
      style={{ background: s.bg, ['--stat-delay' as string]: `${delayMs}ms` } as React.CSSProperties}
    >
      <div className="flex items-center gap-1.5 mb-0.5" style={{ color: s.iconColor }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[18px] font-extrabold leading-tight tabular-nums" style={{ color: s.text }}>
        {displayValue}
      </div>
      {hint && (
        <div className="text-[9.5px] font-semibold mt-0.5" style={{ color: s.iconColor, opacity: 0.8 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function statusClass(status: SequenceEnrollment['status']): string {
  switch (status) {
    case 'active': return 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]';
    case 'paused': return 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]';
    case 'completed': return 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]';
    case 'replied': return 'bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info)]';
    case 'cancelled': return 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] border border-[var(--border)]';
    default: return '';
  }
}
