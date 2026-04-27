import type { Task } from '@/types/task';
import {
  BULK_ORGS,
  HM_SEEDS,
  CANDIDATE_SEEDS,
  type HMSeed,
  type CandidateSeed,
} from './seed-contacts-bulk';

/**
 * Bulk seed tasks — generator-based, mirroring seed-emails-bulk.ts.
 *
 * Tasks are derived from the same stage/tag metadata:
 *   - Candidate stage drives what's open vs done and the task title
 *     (e.g. `submitted` → "debrief with client" due soon; `placed` → two
 *     follow-up tasks, one done, one open for 90-day check-in).
 *   - HM tags (VIP / Client) control how many action items are on the
 *     recruiter's plate — VIPs get a QBR-prep task and a submission-review
 *     task; plain Client gets one open-req task; non-clients get a
 *     re-engagement reminder.
 *   - Orgs get billing/compliance admin tasks (MSA renewal, Q1 summary
 *     delivery).
 *
 * Where possible, tasks carry `sourceEmailId` that points at the seeded
 * email the task was "created from", mirroring the HubSpot / Close pattern
 * of one-click "Create task from email". The IDs line up exactly with the
 * generator in seed-emails-bulk.ts.
 */

// ──────────────────────────────────────────────────────────────────────────
// Date helpers — match seed-tasks.ts so both files render consistently
// ──────────────────────────────────────────────────────────────────────────

const iso = (days: number, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const due = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

const firstName = (fullName: string) => {
  const bare = fullName.replace(/,\s*(MD|PhD|JD|PMP|CPA|CFA|RN|NP|DPT|DO)$/, '').trim();
  return bare.split(/\s+/)[0];
};

// ──────────────────────────────────────────────────────────────────────────
// Candidate tasks — one per candidate, plus a second for placed/interview
//
// Stage → task template:
//   sourced           → "Follow up on cold outreach" (open, due ~anchor+7)
//   screened          → "Decide on submission — client fit check" (open, due soon)
//   submitted         → "Chase client feedback on submission" (open, soon)
//                       + "Send comp benchmark update" (done, recent)
//   interview         → "Prep debrief call after round" (open, due today)
//                       + "Schedule next round if advancing" (open)
//   placed            → "90-day check-in — ensure onboarding smooth" (open,
//                         far future) + "File signed offer + background
//                         check" (done, recent)
//   not-a-fit         → "Update candidate status in ATS" (done)
// ──────────────────────────────────────────────────────────────────────────

const candidateTasks = (c: CandidateSeed): Task[] => {
  const id = c.id;
  const fn = firstName(c.name);
  const anchor = c.daysSinceUpdate;
  const rows: Task[] = [];

  const stage = c.stage ?? 'sourced';

  switch (stage) {
    case 'sourced': {
      rows.push({
        id: `seed-task-${id}-1`,
        contactId: id,
        title: `Follow up on cold outreach — ${fn}`,
        done: false,
        dueDate: due(Math.max(7 - anchor, 2)),
        notes: c.currentEmployer
          ? `Currently at ${c.currentEmployer}. Availability: ${c.availability}.`
          : undefined,
        sourceEmailId: `seed-em-${id}-1`,
        createdAt: iso(anchor + 30, 10, 20),
      });
      break;
    }
    case 'screened': {
      rows.push({
        id: `seed-task-${id}-1`,
        contactId: id,
        title: `Decide on submission — client fit check for ${fn}`,
        done: false,
        dueDate: due(Math.max(3 - anchor, 1)),
        notes: `Screen done. ${c.skills.slice(0, 3).join(' / ')}. Comp ask: $${Math.round(c.compBase / 1000)}K.`,
        sourceEmailId: `seed-em-${id}-2`,
        createdAt: iso(anchor + 7, 14, 0),
      });
      break;
    }
    case 'submitted': {
      rows.push({
        id: `seed-task-${id}-1`,
        contactId: id,
        title: `Chase client feedback — ${fn}'s submission`,
        done: false,
        dueDate: due(Math.max(5 - anchor, 1)),
        notes: `Submitted ${anchor + 3}d ago. Ping if no response by end of week.`,
        sourceEmailId: `seed-em-${id}-3`,
        createdAt: iso(anchor + 3, 11, 35),
      });
      rows.push({
        id: `seed-task-${id}-2`,
        contactId: id,
        title: `Send updated comp benchmark to ${fn}`,
        done: true,
        dueDate: due(-Math.max(anchor + 1, 2)),
        completedAt: iso(Math.max(anchor + 1, 2), 15, 30),
        sourceEmailId: `seed-em-${id}-2`,
        createdAt: iso(anchor + 6, 9, 40),
      });
      break;
    }
    case 'interview': {
      rows.push({
        id: `seed-task-${id}-1`,
        contactId: id,
        title: `Prep debrief call with ${fn} after round`,
        done: false,
        dueDate: due(anchor <= 1 ? 0 : -1),
        notes: `${fn} wants read on ${c.skills[0]} signal. Send color from HM side.`,
        sourceEmailId: `seed-em-${id}-4`,
        createdAt: iso(Math.max(anchor - 1, 1), 16, 0),
      });
      rows.push({
        id: `seed-task-${id}-2`,
        contactId: id,
        title: `Schedule next round if advancing — ${fn}`,
        done: false,
        dueDate: due(Math.max(4 - anchor, 2)),
        sourceEmailId: `seed-em-${id}-4`,
        createdAt: iso(Math.max(anchor - 1, 1), 17, 15),
      });
      break;
    }
    case 'placed': {
      rows.push({
        id: `seed-task-${id}-1`,
        contactId: id,
        title: `90-day check-in with ${fn} — ensure onboarding smooth`,
        done: false,
        dueDate: due(Math.max(90 - anchor, 30)),
        notes: 'Confirm manager alignment, ramp status, any scope drift.',
        sourceEmailId: `seed-em-${id}-5`,
        createdAt: iso(Math.max(anchor + 5, 10), 9, 45),
      });
      rows.push({
        id: `seed-task-${id}-2`,
        contactId: id,
        title: `File signed offer + background check — ${fn}`,
        done: true,
        dueDate: due(-Math.max(anchor + 3, 8)),
        completedAt: iso(Math.max(anchor + 3, 8), 14, 0),
        sourceEmailId: `seed-em-${id}-5`,
        createdAt: iso(Math.max(anchor + 5, 10), 10, 5),
      });
      break;
    }
    case 'not-a-fit': {
      rows.push({
        id: `seed-task-${id}-1`,
        contactId: id,
        title: `Update ${fn}'s status in ATS — not a fit for current search`,
        done: true,
        dueDate: due(-Math.max(anchor, 1)),
        completedAt: iso(Math.max(anchor, 1), 17, 10),
        notes: 'Keep in pipeline for Q3 re-engagement.',
        sourceEmailId: `seed-em-${id}-3`,
        createdAt: iso(Math.max(anchor, 1), 16, 50),
      });
      break;
    }
  }

  return rows;
};

// ──────────────────────────────────────────────────────────────────────────
// HM tasks — VIP/Client-aware
// ──────────────────────────────────────────────────────────────────────────

const hmTasks = (hm: HMSeed): Task[] => {
  const id = hm.id;
  const fn = firstName(hm.name);
  const anchor = hm.daysSinceUpdate;
  const rows: Task[] = [];

  const isVIP = hm.tags?.includes('VIP');
  const isClient = hm.tags?.includes('Client') || isVIP;

  if (isVIP) {
    rows.push({
      id: `seed-task-${id}-1`,
      contactId: id,
      title: `QBR prep for ${fn} — Q1 recap + Q3 forecast`,
      done: false,
      dueDate: due(Math.max(3 - anchor, 1)),
      notes: 'Pull placement metrics, 90-day hold status, comp band refresh.',
      sourceEmailId: `seed-em-${id}-4`,
      createdAt: iso(Math.max(anchor - 1, 1), 9, 30),
    });
    rows.push({
      id: `seed-task-${id}-2`,
      contactId: id,
      title: `Ship next submission batch to ${hm.orgName}`,
      done: false,
      dueDate: due(Math.max(7 - anchor, 2)),
      sourceEmailId: `seed-em-${id}-3`,
      createdAt: iso(anchor + 7, 10, 45),
    });
    rows.push({
      id: `seed-task-${id}-3`,
      contactId: id,
      title: `Confirm renewal scope with ${fn}`,
      done: true,
      dueDate: due(-Math.max(anchor + 2, 3)),
      completedAt: iso(Math.max(anchor + 2, 3), 15, 20),
      sourceEmailId: `seed-em-${id}-4`,
      createdAt: iso(Math.max(anchor + 2, 3), 14, 10),
    });
  } else if (isClient) {
    rows.push({
      id: `seed-task-${id}-1`,
      contactId: id,
      title: `Follow up on ${hm.department} reqs — ${fn}`,
      done: false,
      dueDate: due(Math.max(5 - anchor, 2)),
      notes: '3 reqs in play. Check status on priority 1 submission.',
      sourceEmailId: `seed-em-${id}-3`,
      createdAt: iso(anchor + 7, 10, 20),
    });
    rows.push({
      id: `seed-task-${id}-2`,
      contactId: id,
      title: `Send ${hm.orgName} comp-band refresh`,
      done: true,
      dueDate: due(-Math.max(anchor + 5, 7)),
      completedAt: iso(Math.max(anchor + 5, 7), 11, 0),
      sourceEmailId: `seed-em-${id}-2`,
      createdAt: iso(anchor + 20, 12, 30),
    });
  } else {
    rows.push({
      id: `seed-task-${id}-1`,
      contactId: id,
      title: `Re-engage ${fn} on ${hm.department} needs`,
      done: false,
      dueDate: null, // Someday bucket — non-client, low urgency
      notes: `Last touch ${anchor}d ago. Cadence: quarterly.`,
      sourceEmailId: `seed-em-${id}-1`,
      createdAt: iso(anchor + 35, 9, 15),
    });
  }

  return rows;
};

// ──────────────────────────────────────────────────────────────────────────
// Org tasks — billing/compliance
// ──────────────────────────────────────────────────────────────────────────

const orgTasks = (orgId: string, orgName: string, daysSince: number): Task[] => {
  const rows: Task[] = [];

  rows.push({
    id: `seed-task-${orgId}-1`,
    contactId: orgId,
    title: `Review MSA redline from ${orgName} legal`,
    done: false,
    dueDate: due(Math.max(7 - daysSince, 3)),
    notes: 'Two material edits: replacement window, data retention.',
    sourceEmailId: `seed-em-${orgId}-2`,
    createdAt: iso(Math.max(daysSince, 2), 11, 30),
  });

  rows.push({
    id: `seed-task-${orgId}-2`,
    contactId: orgId,
    title: `Confirm Q1 invoice received by ${orgName} AP`,
    done: true,
    dueDate: due(-Math.max(daysSince + 30, 35)),
    completedAt: iso(Math.max(daysSince + 30, 35), 10, 10),
    sourceEmailId: `seed-em-${orgId}-1`,
    createdAt: iso(Math.max(daysSince + 45, 50), 8, 45),
  });

  return rows;
};

// ──────────────────────────────────────────────────────────────────────────
// Export — flatten all generators
// ──────────────────────────────────────────────────────────────────────────

const candidateRows: Task[] = CANDIDATE_SEEDS.flatMap(candidateTasks);
const hmRows: Task[] = HM_SEEDS.flatMap(hmTasks);
const orgRows: Task[] = BULK_ORGS.flatMap((o) => {
  const daysSince = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(o.lastUpdated).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  return orgTasks(o.id, o.name, daysSince);
});

export const BULK_TASKS: Task[] = [...candidateRows, ...hmRows, ...orgRows];
