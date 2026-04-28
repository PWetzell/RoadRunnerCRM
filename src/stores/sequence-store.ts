'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTemplateVariables, buildTemplateContext } from '@/stores/template-store';

/**
 * Email-sequence store. A sequence is an ordered list of email steps,
 * each with a delay before send and an optional "stop on reply" rule.
 * Contacts are enrolled into a sequence; the per-enrollment record
 * tracks which step they're on and when the next step is due.
 *
 * MVP scope (Paul, 2026-04-28): manual-step send, no background
 * automation yet. User clicks "Send next step" on each enrollment
 * when the delay has elapsed. Phase 2 will add a Vercel cron route
 * that processes due sends automatically and a reply-detection rule
 * that auto-stops enrollments when the contact replies.
 *
 * Industry pattern reference (most similar to **Close**):
 *   • Sequence = name + steps[]
 *   • Step = { subject, body (templated), delayDays, stopOnReply }
 *   • Enrollment = { sequenceId, contactId, currentStepIdx,
 *                    enrolledAt, nextDueAt, status }
 *   • Status: 'active' | 'paused' | 'completed' | 'replied' | 'cancelled'
 *
 * Persistence: localStorage via Zustand persist for now. When we add
 * automation in Phase 2, this graduates to a Supabase table so the
 * cron worker can read enrollments without depending on a logged-in
 * browser.
 */

export type SequenceEnrollmentStatus =
  | 'active'      // running normally — next step due at nextDueAt
  | 'paused'     // user manually paused — won't auto-send
  | 'completed'  // all steps sent
  | 'replied'    // contact replied; auto-stopped per stopOnReply
  | 'cancelled'; // user manually unenrolled

export interface SequenceStep {
  /** Stable id within the sequence — keeps step references stable
   *  even when the user reorders or inserts steps. */
  id: string;
  subject: string;
  body: string;
  /** Days to wait AFTER the previous step's send (or after enrollment
   *  for step 0) before this step becomes due. */
  delayDays: number;
  /** If true, when the contact replies to ANY email in this sequence,
   *  remaining steps are skipped and enrollment status flips to
   *  'replied'. Phase-2 reply-detection wires this up; until then it's
   *  a stored intent the UI surfaces but doesn't enforce. */
  stopOnReply: boolean;
}

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  currentStepIdx: number;
  enrolledAt: string;
  /** ISO timestamp when the next step should fire. Computed on enroll
   *  (now + step[0].delayDays) and updated after each send. */
  nextDueAt: string;
  /** Last-step send timestamps, indexed by step id. Lets the UI show
   *  "Step 2 sent 3 days ago" without a separate log table. */
  sendLog: Record<string, string>;
  status: SequenceEnrollmentStatus;
}

interface SequenceStore {
  sequences: EmailSequence[];
  enrollments: SequenceEnrollment[];

  // Sequence CRUD
  createSequence: (input: { name: string; description?: string; steps?: SequenceStep[] }) => EmailSequence;
  updateSequence: (id: string, patch: Partial<Pick<EmailSequence, 'name' | 'description' | 'steps'>>) => void;
  deleteSequence: (id: string) => void;

  // Enrollment lifecycle
  enrollContact: (input: { sequenceId: string; contactId: string; contactName: string; contactEmail: string }) => SequenceEnrollment | null;
  unenrollContact: (enrollmentId: string) => void;
  pauseEnrollment: (enrollmentId: string) => void;
  resumeEnrollment: (enrollmentId: string) => void;
  /** Mark a step as just-sent and advance to the next step (or
   *  complete if no more). Caller is responsible for actually firing
   *  the email (via /api/gmail/send). */
  recordStepSent: (enrollmentId: string) => void;

  /** Convenience selectors. */
  getActiveEnrollmentsForContact: (contactId: string) => SequenceEnrollment[];
  /** Returns enrollments where nextDueAt <= now AND status is active. */
  getDueEnrollments: (now?: Date) => SequenceEnrollment[];

  /** Wipe everything — used by AuthGate on identity change so demo
   *  sequences don't bleed into real accounts. */
  clearAll: () => void;

  /** Seed-once: drops in a demo "Inbound lead nurture" sequence with
   *  a populated enrollment pool so the analytics dashboard and step
   *  funnel render with real-looking data on a fresh demo. No-op when
   *  the store already has any sequences. */
  seedDemoIfEmpty: (contacts: { id: string; name: string; email: string }[]) => void;

  /** Remove every demo sequence + its enrollments. Called on any page
   *  that detects a real Gmail-connected account so demo records from
   *  a prior session don't pollute the user's actual sequences. */
  removeDemoData: () => void;
}

let _idCounter = 0;
function nextId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${_idCounter}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const useSequenceStore = create<SequenceStore>()(
  persist(
    (set, get) => ({
      sequences: [],
      enrollments: [],

      createSequence: ({ name, description, steps }) => {
        const now = new Date().toISOString();
        const seq: EmailSequence = {
          id: nextId('seq'),
          name: name.trim() || 'Untitled Sequence',
          description: description?.trim(),
          steps: steps ?? [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ sequences: [...s.sequences, seq] }));
        return seq;
      },

      updateSequence: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          sequences: s.sequences.map((seq) =>
            seq.id === id ? { ...seq, ...patch, updatedAt: now } : seq,
          ),
        }));
      },

      deleteSequence: (id) => {
        set((s) => ({
          sequences: s.sequences.filter((seq) => seq.id !== id),
          // Cascade: remove all enrollments for the deleted sequence.
          enrollments: s.enrollments.filter((e) => e.sequenceId !== id),
        }));
      },

      enrollContact: ({ sequenceId, contactId, contactName, contactEmail }) => {
        const seq = get().sequences.find((s) => s.id === sequenceId);
        if (!seq || seq.steps.length === 0) return null;
        // Don't double-enroll the same contact in the same sequence.
        const existing = get().enrollments.find(
          (e) => e.sequenceId === sequenceId && e.contactId === contactId && e.status !== 'cancelled' && e.status !== 'completed',
        );
        if (existing) return existing;
        const now = new Date().toISOString();
        const firstStep = seq.steps[0];
        const enrollment: SequenceEnrollment = {
          id: nextId('enr'),
          sequenceId,
          contactId,
          contactName,
          contactEmail,
          currentStepIdx: 0,
          enrolledAt: now,
          nextDueAt: addDays(now, firstStep.delayDays),
          sendLog: {},
          status: 'active',
        };
        set((s) => ({ enrollments: [...s.enrollments, enrollment] }));
        return enrollment;
      },

      unenrollContact: (enrollmentId) => {
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.id === enrollmentId ? { ...e, status: 'cancelled' as const } : e,
          ),
        }));
      },

      pauseEnrollment: (enrollmentId) => {
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.id === enrollmentId && e.status === 'active' ? { ...e, status: 'paused' as const } : e,
          ),
        }));
      },

      resumeEnrollment: (enrollmentId) => {
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.id === enrollmentId && e.status === 'paused' ? { ...e, status: 'active' as const } : e,
          ),
        }));
      },

      recordStepSent: (enrollmentId) => {
        const now = new Date().toISOString();
        set((s) => {
          const enrollment = s.enrollments.find((e) => e.id === enrollmentId);
          if (!enrollment) return s;
          const seq = s.sequences.find((sq) => sq.id === enrollment.sequenceId);
          if (!seq) return s;
          const justSentStep = seq.steps[enrollment.currentStepIdx];
          const nextIdx = enrollment.currentStepIdx + 1;
          const isComplete = nextIdx >= seq.steps.length;
          const nextDueAt = isComplete
            ? enrollment.nextDueAt // no more steps; leave as-is
            : addDays(now, seq.steps[nextIdx].delayDays);
          return {
            enrollments: s.enrollments.map((e) =>
              e.id === enrollmentId
                ? {
                    ...e,
                    currentStepIdx: isComplete ? e.currentStepIdx : nextIdx,
                    nextDueAt,
                    sendLog: justSentStep ? { ...e.sendLog, [justSentStep.id]: now } : e.sendLog,
                    status: isComplete ? ('completed' as const) : e.status,
                  }
                : e,
            ),
          };
        });
      },

      getActiveEnrollmentsForContact: (contactId) => {
        return get().enrollments.filter(
          (e) => e.contactId === contactId && (e.status === 'active' || e.status === 'paused'),
        );
      },

      getDueEnrollments: (now = new Date()) => {
        const cutoff = now.getTime();
        return get().enrollments.filter(
          (e) => e.status === 'active' && new Date(e.nextDueAt).getTime() <= cutoff,
        );
      },

      clearAll: () => set({ sequences: [], enrollments: [] }),

      removeDemoData: () => {
        set((s) => {
          const demoSeqIds = new Set(
            s.sequences.filter((seq) => seq.id.includes('-demo')).map((seq) => seq.id),
          );
          return {
            sequences: s.sequences.filter((seq) => !demoSeqIds.has(seq.id)),
            enrollments: s.enrollments.filter((e) => !demoSeqIds.has(e.sequenceId)),
          };
        });
      },

      seedDemoIfEmpty: (contacts) => {
        // Versioned demo marker — bumping `SEED_VERSION` triggers a
        // refresh of the demo data while preserving any sequences the
        // user actually created. Mirrors the pattern in
        // bulk-batch-store.
        const SEED_VERSION = 'v2';
        const demoMarker = `-demo-${SEED_VERSION}`;

        // ── Always-on orphan cleanup ─────────────────────────────────
        // Sweeps up any sequence with the default "+New" name. These
        // come from the user clicking "+ New" once and walking away
        // without renaming. Runs on every mount (regardless of seed
        // version state) so the abandoned templates don't pile up.
        // Catches enrollments tied to those orphans too.
        set((s) => {
          const orphanIds = new Set(
            s.sequences
              .filter((seq) =>
                !seq.id.includes('-demo')
                && (seq.name === 'New Sequence' || seq.name.trim() === '' || seq.name === 'Untitled Sequence')
                && seq.steps.length <= 1,
              )
              .map((seq) => seq.id),
          );
          if (orphanIds.size === 0) return s;
          return {
            sequences: s.sequences.filter((seq) => !orphanIds.has(seq.id)),
            enrollments: s.enrollments.filter((e) => !orphanIds.has(e.sequenceId)),
          };
        });

        const hasCurrentDemo = get().sequences.some((s) => s.id.includes(demoMarker));
        if (hasCurrentDemo) return;
        const now = Date.now();
        const isoMinusDay = (d: number) => new Date(now - d * 86_400_000).toISOString();
        const isoPlusDay = (d: number) => new Date(now + d * 86_400_000).toISOString();

        // Pool of candidate contacts for enrollments. Mix real contact
        // ids when available so the enrollments table can deep-link to
        // /contacts/:id; ad-hoc fallbacks ensure the demo holds up even
        // on an empty contact store.
        const candidates: Array<{ id: string; name: string; email: string }> = [
          ...contacts.slice(0, 8),
          { id: 'demo-priya', name: 'Priya Shah', email: 'priya.shah@northwind.io' },
          { id: 'demo-alistair', name: 'Alistair Penrose', email: 'alistair.penrose@penroseco.com' },
          { id: 'demo-ana', name: 'Anastasia Kuznetsova', email: 'anastasia.k@kuznetsova.partners' },
          { id: 'demo-margot', name: 'Margot Delacroix', email: 'm.delacroix@helixhealth.com' },
          { id: 'demo-jamal', name: 'Jamal Okafor', email: 'jamal.okafor@fairwind.co' },
          { id: 'demo-sayuri', name: 'Sayuri Tanaka', email: 'sayuri.tanaka@orca-labs.jp' },
          { id: 'demo-ben', name: 'Ben Andrews', email: 'ben.andrews@cascadepartners.com' },
          { id: 'demo-rachel', name: 'Rachel Koh', email: 'rachel.koh@northstar.vc' },
          { id: 'demo-decl', name: 'Declan Murphy', email: 'declan.murphy@redfern.ie' },
          { id: 'demo-amel', name: 'Amelia Cho', email: 'amelia.cho@quantbridge.io' },
          { id: 'demo-thie', name: 'Thierry Lambert', email: 'thierry.lambert@meridian.fr' },
          { id: 'demo-paolo', name: 'Paolo Serra', email: 'paolo.serra@trevisogroup.it' },
          { id: 'demo-hann', name: 'Hannah Weiss', email: 'hannah.weiss@firstline.com' },
          { id: 'demo-omar', name: 'Omar Haddad', email: 'omar.haddad@oasisventures.ae' },
          { id: 'demo-felix', name: 'Felix Schröder', email: 'felix.schroeder@oberland.de' },
          { id: 'demo-arjun', name: 'Arjun Iyer', email: 'arjun.iyer@kestrelai.com' },
          { id: 'demo-lena', name: 'Lena Vogel', email: 'lena.vogel@altweg.ch' },
          { id: 'demo-rohan', name: 'Rohan Bhatt', email: 'rohan.bhatt@oakridge.partners' },
          { id: 'demo-mei', name: 'Mei Lin', email: 'mei.lin@horizonbio.com' },
          { id: 'demo-zara', name: 'Zara Malik', email: 'zara.malik@kestrel.uk' },
        ];
        // Dedupe by email (first wins — real contacts trump fallbacks).
        const seenEmails = new Set<string>();
        const pool = candidates.filter((c) => {
          const k = c.email.toLowerCase();
          if (seenEmails.has(k)) return false;
          seenEmails.add(k);
          return true;
        });

        /**
         * Build one demo sequence + its enrollments in a single
         * self-contained block. Returns the sequence and its
         * enrollments so the top-level seed can flatten them.
         *
         * `enrollmentSpecs` is an array of (poolIdx, status,
         * stepsSent, daysAgo) tuples — a tiny DSL that keeps each
         * sequence's variety pattern compact and readable.
         */
        type EnrollSpec = {
          poolIdx: number;
          status: SequenceEnrollmentStatus;
          stepsSent: number; // 0..steps.length
          enrolledDaysAgo: number;
          /** When provided, controls the nextDueAt offset; default 0. */
          nextDueDaysFromNow?: number;
        };

        const buildSequence = (cfg: {
          slug: string;
          name: string;
          description: string;
          createdDaysAgo: number;
          /** Step subjects + bodies, in order. */
          steps: Array<{ subject: string; body: string; delayDays: number; stopOnReply?: boolean }>;
          enrollments: EnrollSpec[];
        }): { sequence: EmailSequence; enrollments: SequenceEnrollment[] } => {
          const seqId = `seq-${now.toString(36)}-${cfg.slug}-${demoMarker.replace(/^-/, '')}`;
          const stepDefs = cfg.steps.map((st, i) => ({
            id: `step-${now.toString(36)}-${cfg.slug}-${i + 1}`,
            subject: st.subject,
            body: st.body,
            delayDays: st.delayDays,
            stopOnReply: st.stopOnReply ?? true,
          }));
          const sequence: EmailSequence = {
            id: seqId,
            name: cfg.name,
            description: cfg.description,
            createdAt: isoMinusDay(cfg.createdDaysAgo),
            updatedAt: isoMinusDay(cfg.createdDaysAgo),
            steps: stepDefs,
          };
          const enrollments: SequenceEnrollment[] = cfg.enrollments
            .map((spec) => {
              const c = pool[spec.poolIdx];
              if (!c) return null;
              const sendLog: Record<string, string> = {};
              // sendLog covers steps 0..stepsSent-1, each timestamped
              // a day apart so the funnel + recent-activity feel real.
              for (let i = 0; i < spec.stepsSent; i += 1) {
                const stepDef = stepDefs[i];
                if (!stepDef) break;
                const daysOffset = Math.max(0, spec.enrolledDaysAgo - i * 2);
                sendLog[stepDef.id] = isoMinusDay(daysOffset);
              }
              const nextDueDays = spec.nextDueDaysFromNow ?? 0;
              return {
                id: `enr-${now.toString(36)}-${cfg.slug}-${c.id}`,
                sequenceId: seqId,
                contactId: c.id,
                contactName: c.name,
                contactEmail: c.email,
                currentStepIdx: spec.stepsSent,
                enrolledAt: isoMinusDay(spec.enrolledDaysAgo),
                nextDueAt: nextDueDays >= 0 ? isoPlusDay(nextDueDays) : isoMinusDay(-nextDueDays),
                sendLog,
                status: spec.status,
              };
            })
            .filter((e): e is SequenceEnrollment => e !== null);
          return { sequence, enrollments };
        };

        // ── Sequence 1: Inbound lead nurture ─────────────────────────
        const inbound = buildSequence({
          slug: 'inbound-nurture',
          name: 'Inbound lead nurture',
          description:
            'Three-touch cadence for newly captured leads — intro, value-add, soft close. Tuned for a 5–7 day window.',
          createdDaysAgo: 14,
          steps: [
            {
              subject: 'Quick intro, {{firstName}} — and how we help teams like {{company}}',
              body:
                'Hi {{firstName}},\n\n'
                + "Saw {{company}}'s recent move into the new market and wanted to drop you a note. We work with a handful of teams in the same space — happy to share what's working for them in 15 minutes if that's useful.\n\n"
                + 'No agenda beyond that — just thought it might land at a useful time.\n\n'
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: 'Re: Quick intro, {{firstName}}',
              body:
                'Hi {{firstName}},\n\n'
                + "Floating this back to the top of your inbox in case it got buried. Two specific things I think would land at {{company}}:\n\n"
                + '  1. The intake-time numbers from a similar team (4-6 hrs/wk recovered)\n'
                + "  2. The shared-pipeline view that's been a hit with hybrid sales/recruiting orgs\n\n"
                + 'Worth a 15-min look?\n\n'
                + 'Thanks,\n{{senderName}}',
              delayDays: 3,
            },
            {
              subject: 'Last one from me, {{firstName}}',
              body:
                'Hi {{firstName}},\n\n'
                + "I'll stop chasing after this one — I know inboxes get noisy. If the timing isn't right, totally understood. If it ever is, you know where to find me.\n\n"
                + 'Wishing you a good week,\n{{senderName}}',
              delayDays: 4,
            },
          ],
          enrollments: [
            { poolIdx: 0, status: 'active', stepsSent: 1, enrolledDaysAgo: 4, nextDueDaysFromNow: -1 },
            { poolIdx: 1, status: 'active', stepsSent: 2, enrolledDaysAgo: 7, nextDueDaysFromNow: 0 },
            { poolIdx: 2, status: 'active', stepsSent: 1, enrolledDaysAgo: 1, nextDueDaysFromNow: 2 },
            { poolIdx: 3, status: 'completed', stepsSent: 3, enrolledDaysAgo: 9 },
            { poolIdx: 4, status: 'completed', stepsSent: 3, enrolledDaysAgo: 12 },
            { poolIdx: 5, status: 'replied', stepsSent: 2, enrolledDaysAgo: 5 },
            { poolIdx: 6, status: 'replied', stepsSent: 1, enrolledDaysAgo: 3 },
            { poolIdx: 7, status: 'paused', stepsSent: 1, enrolledDaysAgo: 6, nextDueDaysFromNow: 0 },
          ],
        });

        // ── Sequence 2: Outbound cold prospecting ────────────────────
        const outbound = buildSequence({
          slug: 'outbound-cold',
          name: 'Outbound cold prospecting',
          description:
            'Four-touch outbound cadence for ICP-matched accounts. Calibrated for a 12-day window with a value-prop, social-proof, ask, and break-up.',
          createdDaysAgo: 21,
          steps: [
            {
              subject: '{{company}} + Roadrunner — quick thought',
              body:
                'Hi {{firstName}},\n\n'
                + "Came across {{company}} after seeing your post about scaling intake — that's exactly the gap our platform was built around. Teams your size are trimming 4–6 hours/wk on intake alone.\n\n"
                + 'Open to a 15-min call to see if the math works for {{company}}?\n\n'
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: 'How {{company}} stacks up vs similar teams',
              body:
                'Hi {{firstName}},\n\n'
                + "Pulled together a one-pager comparing how {{company}}'s peer set is handling inbound + intake. Two patterns stood out — happy to walk through if it's useful.\n\n"
                + "Worth 15 minutes?\n\n"
                + 'Thanks,\n{{senderName}}',
              delayDays: 3,
            },
            {
              subject: 'Anything I can send over, {{firstName}}?',
              body:
                'Hi {{firstName}},\n\n'
                + "Realized I haven't asked — is there anything I can send over that would be useful (case study, integration docs, pricing)?\n\n"
                + 'Happy to make this easy.\n\n'
                + 'Thanks,\n{{senderName}}',
              delayDays: 4,
            },
            {
              subject: "Closing the loop, {{firstName}}",
              body:
                'Hi {{firstName}},\n\n'
                + "I'll go quiet on this one. If timing changes, we'll be here — and please reach out direct if anything we shipped catches your eye later.\n\n"
                + 'All the best,\n{{senderName}}',
              delayDays: 5,
            },
          ],
          enrollments: [
            { poolIdx: 8, status: 'active', stepsSent: 2, enrolledDaysAgo: 5, nextDueDaysFromNow: -1 },
            { poolIdx: 9, status: 'active', stepsSent: 1, enrolledDaysAgo: 2, nextDueDaysFromNow: 1 },
            { poolIdx: 10, status: 'active', stepsSent: 3, enrolledDaysAgo: 10, nextDueDaysFromNow: 1 },
            { poolIdx: 11, status: 'completed', stepsSent: 4, enrolledDaysAgo: 14 },
            { poolIdx: 12, status: 'completed', stepsSent: 4, enrolledDaysAgo: 17 },
            { poolIdx: 13, status: 'replied', stepsSent: 1, enrolledDaysAgo: 6 },
            { poolIdx: 14, status: 'replied', stepsSent: 2, enrolledDaysAgo: 8 },
            { poolIdx: 15, status: 'replied', stepsSent: 3, enrolledDaysAgo: 11 },
            { poolIdx: 16, status: 'cancelled', stepsSent: 1, enrolledDaysAgo: 4 },
          ],
        });

        // ── Sequence 3: Re-engagement ────────────────────────────────
        const reengage = buildSequence({
          slug: 'reengage',
          name: 'Re-engagement campaign',
          description:
            'Three-touch revival for dormant accounts that went quiet. Light, low-pressure, with a clean opt-out at the end.',
          createdDaysAgo: 30,
          steps: [
            {
              subject: 'Long time, {{firstName}} — what are you working on?',
              body:
                'Hi {{firstName}},\n\n'
                + "It's been a minute. Curious what's keeping the {{company}} team busy this quarter — anything we can help with?\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: "What's new at Roadrunner since we last spoke",
              body:
                'Hi {{firstName}},\n\n'
                + "Two things since we last spoke that might land at {{company}}: AI drafting for outbound and the sequencing rebuild. Either feel timely?\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 5,
            },
            {
              subject: 'Should I keep you on the list?',
              body:
                'Hi {{firstName}},\n\n'
                + "Quick yes/no — keep you on these, or let you go?\n\n"
                + 'Either is fine. Thanks for being patient with me,\n{{senderName}}',
              delayDays: 5,
            },
          ],
          enrollments: [
            { poolIdx: 17, status: 'active', stepsSent: 1, enrolledDaysAgo: 3, nextDueDaysFromNow: 2 },
            { poolIdx: 18, status: 'active', stepsSent: 2, enrolledDaysAgo: 8, nextDueDaysFromNow: -1 },
            { poolIdx: 19, status: 'completed', stepsSent: 3, enrolledDaysAgo: 16 },
            { poolIdx: 0, status: 'replied', stepsSent: 1, enrolledDaysAgo: 4 },
            { poolIdx: 4, status: 'cancelled', stepsSent: 2, enrolledDaysAgo: 9 },
          ],
        });

        // ── Sequence 4: Customer onboarding (5-step) ─────────────────
        const onboarding = buildSequence({
          slug: 'onboarding',
          name: 'Customer onboarding — first 30 days',
          description:
            'Five-touch hand-holding for new customers across days 0/3/7/14/30. Goal: drive activation milestones, not just touchpoints.',
          createdDaysAgo: 45,
          steps: [
            {
              subject: 'Welcome aboard, {{firstName}} — your day-1 checklist',
              body:
                'Hi {{firstName}},\n\n'
                + "Excited to have {{company}} on Roadrunner. Three things to get the most out of week one:\n\n"
                + '  1. Connect your Gmail (60 seconds)\n'
                + '  2. Import or invite your team (5 minutes)\n'
                + '  3. Pin your most-used lists (1 minute)\n\n'
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: 'How is week one going, {{firstName}}?',
              body:
                "Hi {{firstName}},\n\n"
                + "Anything sticking that I can clear up? Common day-3 questions: how merge fields work, how to invite a teammate, where the AI draft lives.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 3,
            },
            {
              subject: 'Try this — your first sequence',
              body:
                'Hi {{firstName}},\n\n'
                + "Now that the basics are in, try a 3-touch sequence — even on a small list. The compounding wins start there.\n\n"
                + 'Want me to draft one with you live?\n\n'
                + '{{senderName}}',
              delayDays: 4,
            },
            {
              subject: 'Two-week check — anything blocking the team?',
              body:
                'Hi {{firstName}},\n\n'
                + "Quick pulse check — anything getting in the way for the {{company}} team? I keep a Friday office hour for exactly this.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 7,
            },
            {
              subject: 'One-month milestone — and what comes next',
              body:
                'Hi {{firstName}},\n\n'
                + "Welcome to month two. Quick recap of what your team shipped, plus three features to grow into next.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 16,
            },
          ],
          enrollments: [
            { poolIdx: 1, status: 'active', stepsSent: 3, enrolledDaysAgo: 14, nextDueDaysFromNow: 0 },
            { poolIdx: 5, status: 'active', stepsSent: 4, enrolledDaysAgo: 22, nextDueDaysFromNow: -1 },
            { poolIdx: 11, status: 'completed', stepsSent: 5, enrolledDaysAgo: 35 },
            { poolIdx: 14, status: 'completed', stepsSent: 5, enrolledDaysAgo: 40 },
            { poolIdx: 17, status: 'active', stepsSent: 1, enrolledDaysAgo: 1, nextDueDaysFromNow: 2 },
          ],
        });

        // ── Sequence 5: Renewal cadence (3-step, tight window) ───────
        const renewal = buildSequence({
          slug: 'renewal',
          name: 'Renewal cadence — 60/30/7',
          description:
            "Three-touch cadence at 60, 30, and 7 days before subscription renewal. Internal goal: zero surprise churn.",
          createdDaysAgo: 60,
          steps: [
            {
              subject: 'Your {{company}} renewal is 60 days out',
              body:
                'Hi {{firstName}},\n\n'
                + "Heads-up: {{company}}'s annual subscription is set to renew in 60 days. No action needed from you — but worth a 20-min review to make sure your plan still fits.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: 'Quick review — 30 days to renewal',
              body:
                'Hi {{firstName}},\n\n'
                + "30 days now. Want to make sure we don't quietly auto-renew if there's anything off. Three things I'd ask:\n\n"
                + '  1. Are the right people on the seat list?\n'
                + '  2. Is the plan tier still right?\n'
                + '  3. Any features you want me to walk you through?\n\n'
                + 'Best,\n{{senderName}}',
              delayDays: 30,
            },
            {
              subject: 'Final notice — renewal in 7 days',
              body:
                'Hi {{firstName}},\n\n'
                + "Renewing on the 18th unless I hear otherwise. Want me to send the updated invoice or set up a brief call before then?\n\n"
                + 'Thanks,\n{{senderName}}',
              delayDays: 23,
            },
          ],
          enrollments: [
            { poolIdx: 3, status: 'active', stepsSent: 1, enrolledDaysAgo: 28, nextDueDaysFromNow: 2 },
            { poolIdx: 7, status: 'active', stepsSent: 2, enrolledDaysAgo: 53, nextDueDaysFromNow: 7 },
            { poolIdx: 12, status: 'completed', stepsSent: 3, enrolledDaysAgo: 65 },
            { poolIdx: 16, status: 'replied', stepsSent: 2, enrolledDaysAgo: 50 },
          ],
        });

        // ── Sequence 6: Event follow-up (post-conference) ────────────
        const eventFollowup = buildSequence({
          slug: 'event-followup',
          name: 'Event follow-up — SaaSConnect 2026',
          description:
            'Two-touch warm follow-up for everyone we met at SaaSConnect. First message within 24h, second a week later with a tailored ask.',
          createdDaysAgo: 10,
          steps: [
            {
              subject: 'Great meeting at SaaSConnect, {{firstName}}',
              body:
                'Hi {{firstName}},\n\n'
                + "Really enjoyed our chat at the {{company}} booth. As promised, the slides + the chart pack from the panel are below — and I'd love a 20-minute follow-up if the timing works.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: 'Following up post-SaaSConnect',
              body:
                'Hi {{firstName}},\n\n'
                + "Hope the post-conference inbox has settled. Still happy to set up a deeper dive on the workflow piece we touched on — anything I can send ahead?\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 6,
            },
          ],
          enrollments: [
            { poolIdx: 0, status: 'replied', stepsSent: 1, enrolledDaysAgo: 9 },
            { poolIdx: 1, status: 'replied', stepsSent: 2, enrolledDaysAgo: 9 },
            { poolIdx: 2, status: 'active', stepsSent: 1, enrolledDaysAgo: 4, nextDueDaysFromNow: 2 },
            { poolIdx: 3, status: 'completed', stepsSent: 2, enrolledDaysAgo: 9 },
            { poolIdx: 4, status: 'completed', stepsSent: 2, enrolledDaysAgo: 9 },
            { poolIdx: 5, status: 'completed', stepsSent: 2, enrolledDaysAgo: 9 },
            { poolIdx: 6, status: 'replied', stepsSent: 1, enrolledDaysAgo: 8 },
            { poolIdx: 7, status: 'replied', stepsSent: 1, enrolledDaysAgo: 8 },
            { poolIdx: 8, status: 'active', stepsSent: 2, enrolledDaysAgo: 7, nextDueDaysFromNow: 4 },
            { poolIdx: 9, status: 'replied', stepsSent: 2, enrolledDaysAgo: 9 },
            { poolIdx: 10, status: 'completed', stepsSent: 2, enrolledDaysAgo: 9 },
          ],
        });

        // ── Sequence 7: Webinar registrant nurture ───────────────────
        const webinar = buildSequence({
          slug: 'webinar',
          name: 'Webinar registrant nurture',
          description:
            "Three-touch path for everyone who registered for the RevOps webinar — pre-event reminder, post-event recap with replay link, and a single conversion ask.",
          createdDaysAgo: 18,
          steps: [
            {
              subject: 'See you Thursday, {{firstName}}',
              body:
                'Hi {{firstName}},\n\n'
                + "Reminder: the RevOps automation walk-through goes live Thursday 2pm ET. We'll send the meet link 30 min before. Bring your gnarliest workflow — happy to whiteboard live.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 0,
            },
            {
              subject: "Replay + the resources we promised",
              body:
                'Hi {{firstName}},\n\n'
                + "Replay is up. We also pulled together the three workflow templates that came up during Q&A — link in the post-event recap deck.\n\n"
                + 'Best,\n{{senderName}}',
              delayDays: 5,
            },
            {
              subject: '{{company}} workflow review — 30 min walk-through?',
              body:
                'Hi {{firstName}},\n\n'
                + "If anything from the webinar resonated for {{company}}'s setup, happy to do a focused 30-min walk-through this or next week. No prep needed — just bring the workflow you want to fix.\n\n"
                + 'Thanks,\n{{senderName}}',
              delayDays: 4,
            },
          ],
          enrollments: [
            { poolIdx: 11, status: 'completed', stepsSent: 3, enrolledDaysAgo: 14 },
            { poolIdx: 12, status: 'completed', stepsSent: 3, enrolledDaysAgo: 14 },
            { poolIdx: 13, status: 'replied', stepsSent: 3, enrolledDaysAgo: 14 },
            { poolIdx: 14, status: 'replied', stepsSent: 2, enrolledDaysAgo: 11 },
            { poolIdx: 15, status: 'active', stepsSent: 2, enrolledDaysAgo: 8, nextDueDaysFromNow: -1 },
            { poolIdx: 16, status: 'active', stepsSent: 2, enrolledDaysAgo: 8, nextDueDaysFromNow: 0 },
            { poolIdx: 17, status: 'replied', stepsSent: 1, enrolledDaysAgo: 12 },
            { poolIdx: 18, status: 'cancelled', stepsSent: 1, enrolledDaysAgo: 13 },
            { poolIdx: 19, status: 'completed', stepsSent: 3, enrolledDaysAgo: 14 },
          ],
        });

        const allBuilt = [inbound, outbound, reengage, onboarding, renewal, eventFollowup, webinar];
        const allSequences = allBuilt.map((b) => b.sequence);
        const allEnrollments = allBuilt.flatMap((b) => b.enrollments);

        // Replace any prior-version demo sequences (and their orphaned
        // enrollments) with the new set, preserve user-created
        // sequences. Same shape as bulk-batch-store's seed.
        set((s) => {
          const userSequences = s.sequences.filter((seq) => !seq.id.includes('-demo'));
          const userSeqIds = new Set(userSequences.map((seq) => seq.id));
          const userEnrollments = s.enrollments.filter((e) => userSeqIds.has(e.sequenceId));
          return {
            sequences: [...allSequences, ...userSequences],
            enrollments: [...allEnrollments, ...userEnrollments],
          };
        });
      },
    }),
    {
      name: 'roadrunner.sequences',
      version: 1,
    },
  ),
);

/**
 * Resolves a step's templated subject + body for a specific contact
 * by substituting merge fields ({{firstName}}, {{company}}, etc.).
 * Pulled out as a free function so both the manual "Send next step"
 * UI and the future Phase-2 cron worker can use the same logic.
 */
export function renderStepForContact(
  step: SequenceStep,
  ctx: {
    contactName: string;
    contactType?: 'person' | 'org';
    orgName?: string;
    title?: string;
    email: string;
    userName?: string;
    userEmail?: string;
  },
): { subject: string; body: string } {
  const tplCtx = buildTemplateContext({
    contactName: ctx.contactName,
    contactType: ctx.contactType,
    orgName: ctx.orgName,
    title: ctx.title,
    email: ctx.email,
    userName: ctx.userName,
    userEmail: ctx.userEmail,
  });
  return {
    subject: applyTemplateVariables(step.subject, tplCtx),
    body: applyTemplateVariables(step.body, tplCtx),
  };
}

export function makeStep(input: Partial<SequenceStep>): SequenceStep {
  return {
    id: input.id ?? nextId('step'),
    subject: input.subject ?? '',
    body: input.body ?? '',
    delayDays: input.delayDays ?? 0,
    stopOnReply: input.stopOnReply ?? true,
  };
}

/**
 * Per-step delivery stats. We compute these client-side by walking the
 * enrollments' sendLog so the analytics dashboard doesn't need a separate
 * tracking table — sendLog is the source of truth.
 *
 * Industry pattern: HubSpot Sequences shows per-step "Sent / Opened /
 * Clicked / Replied" counts in the Step List. Outreach calls this the
 * "Step Performance" panel. Apollo shows the same as a funnel. We only
 * have Sent + Replied for now (open/click tracking is Phase-3 once we
 * proxy Gmail open-pixels), but the data shape leaves room for them.
 */
export interface SequenceStepStats {
  stepId: string;
  /** Total enrollments that have sent this step (regardless of where they
   *  are now — completed, replied, cancelled all count). */
  sent: number;
  /** Enrollments still actively waiting for the NEXT step after this one. */
  pendingNext: number;
  /** Enrollments that replied while this step was their last-sent step. */
  replied: number;
}

export interface SequenceStats {
  sequenceId: string;
  /** Total enrollments ever — active + paused + completed + replied + cancelled. */
  totalEnrolled: number;
  active: number;
  paused: number;
  completed: number;
  replied: number;
  cancelled: number;
  /** Reply rate over enrollments that received at least one step. 0..1. */
  replyRate: number;
  /** Per-step funnel stats, ordered by step index. */
  steps: SequenceStepStats[];
}

export function getSequenceStats(
  sequence: EmailSequence,
  enrollments: SequenceEnrollment[],
): SequenceStats {
  const own = enrollments.filter((e) => e.sequenceId === sequence.id);
  const totalEnrolled = own.length;
  let active = 0, paused = 0, completed = 0, replied = 0, cancelled = 0;
  for (const e of own) {
    if (e.status === 'active') active += 1;
    else if (e.status === 'paused') paused += 1;
    else if (e.status === 'completed') completed += 1;
    else if (e.status === 'replied') replied += 1;
    else if (e.status === 'cancelled') cancelled += 1;
  }
  // Per-step stats — walk the sendLog. An enrollment "sent" a step if
  // its sendLog has an entry for that step's id.
  const steps: SequenceStepStats[] = sequence.steps.map((step, idx) => {
    let sent = 0;
    let pendingNext = 0;
    let stepReplied = 0;
    for (const e of own) {
      const didSend = !!e.sendLog[step.id];
      if (didSend) sent += 1;
      // If this step IS the last one they sent and they're still active,
      // count them as "pending next" so the funnel makes sense.
      if (
        didSend
        && e.currentStepIdx === idx + 1
        && e.status === 'active'
      ) {
        pendingNext += 1;
      }
      // If they replied AND the last step they actually sent matches this
      // index (currentStepIdx points at the NEXT step on a normal advance,
      // so the replied step is currentStepIdx - 1).
      if (
        e.status === 'replied'
        && didSend
        && e.currentStepIdx - 1 === idx
      ) {
        stepReplied += 1;
      }
    }
    return { stepId: step.id, sent, pendingNext, replied: stepReplied };
  });
  // Reply rate: enrollments-that-replied / enrollments-that-received-at-least-one-step.
  const everSent = own.filter((e) => Object.keys(e.sendLog).length > 0).length;
  const replyRate = everSent === 0 ? 0 : replied / everSent;
  return {
    sequenceId: sequence.id,
    totalEnrolled,
    active,
    paused,
    completed,
    replied,
    cancelled,
    replyRate,
    steps,
  };
}

/**
 * Mark an enrollment as 'replied' — used by the reply-detection effect
 * on the sequences page when a contact's inbound email lands after
 * their enrollment date. Idempotent: no-op if already replied/cancelled.
 */
export function markEnrollmentReplied(enrollmentId: string): void {
  useSequenceStore.setState((s) => ({
    enrollments: s.enrollments.map((e) =>
      e.id === enrollmentId
        && (e.status === 'active' || e.status === 'paused')
        ? { ...e, status: 'replied' as const }
        : e,
    ),
  }));
}
