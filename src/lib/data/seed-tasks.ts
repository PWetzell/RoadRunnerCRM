import type { Task } from '@/types/task';
import { BULK_TASKS } from './seed-tasks-bulk';

/**
 * Client-side seed tasks for the demo, keyed to the core story contacts.
 *
 * Why not in the DB: like the email seed, tasks live purely in the Zustand
 * store. The real Tasks tab operates on `contact-store.tasks` and doesn't
 * hit Supabase — so seeding this array as the store's initial value is all
 * we need to light up the Tasks panel, the activity log task events, and
 * the email → task provenance link.
 *
 * Mix of states:
 *   - open with overdue due date (red / highest urgency)
 *   - open with near-future due date
 *   - open with no due date (someday bucket)
 *   - done, completed recently
 *   - done, completed months ago (establishes history for the timeline)
 *
 * Email provenance:
 *   Several tasks reference a seeded email id (sourceEmailId), mirroring
 *   the "create task from email" flow. When we merge email + task data
 *   into the activity log we'll see both rows with the same source ref.
 *
 * Dates span ~10 months so the Tasks tab and activity log show a plausible
 * year of HR/recruiting work rather than just "today".
 */

// Deterministic ISO relative to "now".
const iso = (days: number, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// Due date is just a YYYY-MM-DD (no time), matching how the Tasks panel
// renders it. Positive `daysFromNow` → future; negative → overdue.
const due = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

const CORE_TASKS: Task[] = [
  // ─────────────────────────────────────────────────────────────────────
  // per-1 · Sarah Chen
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-chen-1',
    contactId: 'per-1',
    title: 'Review Q2 promotion offer scope section',
    done: false,
    dueDate: due(1),
    notes: 'Sarah flagged reporting structure — confirm matches March convo before she signs.',
    sourceEmailId: 'seed-em-chen-1',
    createdAt: iso(0, 8, 50),
  },
  {
    id: 'seed-task-chen-2',
    contactId: 'per-1',
    title: 'Screen Meera Krishnan for Sarah\'s risk analytics bench',
    done: false,
    dueDate: due(3),
    sourceEmailId: 'seed-em-chen-2',
    createdAt: iso(2, 14, 30),
  },
  {
    id: 'seed-task-chen-3',
    contactId: 'per-1',
    title: 'Schedule 90-day retrospective with Sarah',
    done: true,
    dueDate: due(-85),
    completedAt: iso(85, 11, 0),
    createdAt: iso(95, 10, 5),
  },
  {
    id: 'seed-task-chen-4',
    contactId: 'per-1',
    title: 'Follow up on I-9 form — due before start date',
    done: true,
    dueDate: due(-300),
    completedAt: iso(302, 9, 0),
    createdAt: iso(305, 16, 10),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-2 · Marcus Webb
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-webb-1',
    contactId: 'per-2',
    title: 'Push back on comp band — Stripe Director role',
    done: false,
    dueDate: due(0), // DUE TODAY
    notes: 'Marcus needs 15% above quoted band to leave Stripe cleanly.',
    sourceEmailId: 'seed-em-webb-1',
    createdAt: iso(1, 16, 30),
  },
  {
    id: 'seed-task-webb-2',
    contactId: 'per-2',
    title: 'Prep Marcus for final round Thursday',
    done: false,
    dueDate: due(-2), // OVERDUE
    notes: 'Two gaps: team scaling 12→40 story, cross-team platform handoff example.',
    sourceEmailId: 'seed-em-webb-2',
    createdAt: iso(4, 11, 20),
  },
  {
    id: 'seed-task-webb-3',
    contactId: 'per-2',
    title: 'Call Rachel Ahmed for reference check',
    done: true,
    dueDate: due(-5),
    completedAt: iso(5, 15, 0),
    sourceEmailId: 'seed-em-webb-3',
    createdAt: iso(8, 14, 15),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-3 · Diana Reyes
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-reyes-1',
    contactId: 'per-3',
    title: 'Read Diana\'s 6-month review + send congrats',
    done: false,
    dueDate: due(1),
    sourceEmailId: 'seed-em-reyes-1',
    createdAt: iso(3, 10, 15),
  },
  {
    id: 'seed-task-reyes-2',
    contactId: 'per-3',
    title: 'Advise Diana on 401k vesting schedule',
    done: true,
    dueDate: due(-150),
    completedAt: iso(153, 10, 0),
    sourceEmailId: 'seed-em-reyes-3',
    createdAt: iso(155, 9, 20),
  },
  {
    id: 'seed-task-reyes-3',
    contactId: 'per-3',
    title: 'Non-compete redlines — push to legal',
    done: true,
    dueDate: due(-13),
    completedAt: iso(13, 17, 0),
    sourceEmailId: 'seed-em-reyes-2',
    createdAt: iso(14, 16, 35),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-6 · James Harford (client)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-harford-1',
    contactId: 'per-6',
    title: 'Kick off sourcing on 4 Q2 reqs',
    done: false,
    dueDate: due(2),
    notes: 'Sr ML Eng, Platform SRE x2, Product Security Lead. Priority 1.',
    sourceEmailId: 'seed-em-harford-1',
    createdAt: iso(0, 11, 25),
  },
  {
    id: 'seed-task-harford-2',
    contactId: 'per-6',
    title: 'Send counter on 2026 renewal terms',
    done: false,
    dueDate: due(1), // Monday per James's email
    notes: 'Board meets Tuesday — need answer Monday.',
    sourceEmailId: 'seed-em-dj-org-1',
    createdAt: iso(0, 7, 30),
  },
  {
    id: 'seed-task-harford-3',
    contactId: 'per-6',
    title: 'Debrief Aisha Okafor final round',
    done: true,
    dueDate: due(-10),
    completedAt: iso(10, 14, 0),
    sourceEmailId: 'seed-em-harford-3',
    createdAt: iso(11, 15, 35),
  },
  {
    id: 'seed-task-harford-4',
    contactId: 'per-6',
    title: 'Send Q1 placement summary + invoice',
    done: true,
    dueDate: due(-28),
    completedAt: iso(28, 10, 5),
    sourceEmailId: 'seed-em-harford-4',
    createdAt: iso(30, 9, 0),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-7 · Alex Rivera
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-rivera-1',
    contactId: 'per-7',
    title: 'Q3 follow-up — Dow Jones data role',
    done: false,
    dueDate: due(90),
    notes: 'Alex passing on Q2 due to rewrite. Circle back in 3 months.',
    sourceEmailId: 'seed-em-rivera-1',
    createdAt: iso(1, 20, 15),
  },
  {
    id: 'seed-task-rivera-2',
    contactId: 'per-7',
    title: 'Quarterly touchpoint',
    done: true,
    dueDate: due(-90),
    completedAt: iso(92, 18, 30),
    createdAt: iso(95, 10, 0),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-8 · Priya Shah
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-shah-1',
    contactId: 'per-8',
    title: 'File Priya\'s signed Director agreement',
    done: false,
    dueDate: due(2),
    sourceEmailId: 'seed-em-shah-1',
    createdAt: iso(2, 9, 10),
  },
  {
    id: 'seed-task-shah-2',
    contactId: 'per-8',
    title: 'Build comp benchmark — Director PMM',
    done: true,
    dueDate: due(-19),
    completedAt: iso(19, 13, 0),
    sourceEmailId: 'seed-em-shah-2',
    createdAt: iso(22, 10, 0),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-4 · Tom Nakamura
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-naka-1',
    contactId: 'per-4',
    title: 'Thank-you note — audit clean',
    done: false,
    dueDate: null, // Someday — low priority
    sourceEmailId: 'seed-em-naka-1',
    createdAt: iso(6, 10, 10),
  },
  {
    id: 'seed-task-naka-2',
    contactId: 'per-4',
    title: 'Confirm Tom received 2025 W-2',
    done: true,
    dueDate: due(-84),
    completedAt: iso(84, 9, 0),
    sourceEmailId: 'seed-em-naka-2',
    createdAt: iso(85, 8, 15),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-5 · Lisa Park
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-park-1',
    contactId: 'per-5',
    title: 'Brief Lisa on 3 principal SA roles',
    done: false,
    dueDate: due(4),
    notes: 'Prefer payments/fintech. Stripe, Plaid, Ramp all hiring at level.',
    sourceEmailId: 'seed-em-park-1',
    createdAt: iso(4, 16, 25),
  },

  // ─────────────────────────────────────────────────────────────────────
  // Org-level tasks
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-task-org1-1',
    contactId: 'org-1',
    title: 'Schedule Q2 QBR with Fidelity talent ops',
    done: false,
    dueDate: due(14),
    createdAt: iso(21, 10, 10),
  },
  {
    id: 'seed-task-org2-1',
    contactId: 'org-2',
    title: 'Update Stripe account plan with renewed MSA terms',
    done: true,
    dueDate: due(-55),
    completedAt: iso(55, 11, 0),
    sourceEmailId: 'seed-em-stripe-org-1',
    createdAt: iso(58, 14, 10),
  },
  {
    id: 'seed-task-org3-1',
    contactId: 'org-3',
    title: 'Acknowledge HubSpot referral bonus',
    done: true,
    dueDate: due(-168),
    completedAt: iso(168, 10, 0),
    sourceEmailId: 'seed-em-hubspot-org-1',
    createdAt: iso(170, 9, 35),
  },
];

/**
 * Final seed export = hand-crafted core tasks (the 10 story contacts) +
 * generated bulk tasks for the rest of the 2026 recruiter book. Bulk tasks
 * are stage-driven and line their `sourceEmailId` up with the matching
 * bulk email ids so task rows can link back to the originating email.
 */
export const SEED_TASKS: Task[] = [...CORE_TASKS, ...BULK_TASKS];
