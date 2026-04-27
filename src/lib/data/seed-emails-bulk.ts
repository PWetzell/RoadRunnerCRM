import type { EmailAttachment } from '@/types/email-attachment';
import type { SeedEmail } from './seed-emails';
import {
  BULK_ORGS,
  HM_SEEDS,
  CANDIDATE_SEEDS,
  type HMSeed,
  type CandidateSeed,
} from './seed-contacts-bulk';

/**
 * Bulk seed emails — generator-based coverage for the 2026 recruiter book.
 *
 * Why generator-based:
 *   Hand-writing 240+ HR threads across 104 contacts is infeasible and, more
 *   importantly, unnecessary. Every bulk contact already carries the metadata
 *   needed to produce a plausible email history:
 *     - Candidates have `stage`, `vertical`, `availability`, `compBase`,
 *       `currentEmployer`, `credentials`, `daysSinceUpdate`.
 *     - Hiring managers carry `tags` (VIP / Client) and `department`.
 *     - Orgs carry `industry`, `tags`, and `lastUpdated`.
 *
 *   Each row in this file is templated off those fields so the output reads
 *   as genuine recruiting correspondence — not lorem-ipsum. Resumes are
 *   attached for submitted+ candidates, req packets for HM outreach,
 *   renewal terms for QBR orgs, etc.
 *
 * Unread dynamics:
 *   ~15% of the most-recent incoming rows are flagged `readAt: null` so the
 *   inbox always has new-email dots. The stage drives which contacts get
 *   unread rows — late-stage candidates (interview / submitted with recent
 *   feedback), VIP hiring managers with active reqs, and orgs with recent
 *   pings.
 *
 * Time spread:
 *   Seed day is the candidate/HM's `daysSinceUpdate`. We stagger thread
 *   timestamps around that anchor (outreach earliest, feedback/follow-ups
 *   later) so every record has a plausible chronology relative to the
 *   lastUpdated pill rendered on the contact card.
 */

// ──────────────────────────────────────────────────────────────────────────
// Shared helpers — mirror seed-emails.ts so both seeds feel like one system
// ──────────────────────────────────────────────────────────────────────────

const iso = (days: number, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const att = (
  filename: string,
  mimeType: string,
  size: number,
  idSuffix: string,
): EmailAttachment => ({
  filename,
  mimeType,
  size,
  gmailAttachmentId: `seed-att-${idSuffix}`,
});

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ME_EMAIL = 'pwentzell64@gmail.com';
const ME_NAME = 'Paul Wentzell';

/** Slugify — used for stable id suffixes and gmail-style message ids. */
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const lastName = (fullName: string) => {
  const bare = fullName.replace(/,\s*(MD|PhD|JD|PMP|CPA|CFA|RN|NP|DPT|DO)$/, '').trim();
  const parts = bare.split(/\s+/);
  return parts[parts.length - 1];
};

const firstName = (fullName: string) => {
  const bare = fullName.replace(/,\s*(MD|PhD|JD|PMP|CPA|CFA|RN|NP|DPT|DO)$/, '').trim();
  return bare.split(/\s+/)[0];
};

// ──────────────────────────────────────────────────────────────────────────
// Attachment templates by vertical + stage
//
// Resumes are always named Resume-LastName.pdf (industry norm — recruiters
// rename files when they ship to clients to keep a consistent inbox format).
// Additional artifacts vary — nursing license copy for healthcare, writing
// sample for legal, interview feedback docx for late-stage rows.
// ──────────────────────────────────────────────────────────────────────────

const resume = (c: CandidateSeed, id: string): EmailAttachment => {
  const size = 180_000 + (c.name.length * 1_200);
  return att(`Resume-${lastName(c.name)}.pdf`, PDF, size, `${id}-resume`);
};

const verticalExtra = (c: CandidateSeed, id: string): EmailAttachment | null => {
  const ln = lastName(c.name);
  switch (c.vertical) {
    case 'healthcare':
      if (c.credentials?.includes('RN')) {
        return att(`${ln}-RN-License.pdf`, PDF, 92_000, `${id}-lic`);
      }
      if (c.credentials?.includes('MD')) {
        return att(`${ln}-Medical-License.pdf`, PDF, 98_000, `${id}-lic`);
      }
      return null;
    case 'legal':
      return att(`${ln}-Writing-Sample.pdf`, PDF, 215_000, `${id}-sample`);
    case 'finance':
      if (c.credentials?.includes('CPA') || c.credentials?.includes('CFA')) {
        return att(`${ln}-Credentials.pdf`, PDF, 88_000, `${id}-cred`);
      }
      return null;
    case 'manufacturing':
      if (c.credentials) {
        return att(`${ln}-Certifications.pdf`, PDF, 120_000, `${id}-certs`);
      }
      return null;
    case 'biotech':
      if (c.credentials?.includes('PhD')) {
        return att(`${ln}-Publications.pdf`, PDF, 285_000, `${id}-pubs`);
      }
      return null;
    case 'exec':
      return att(`${ln}-Executive-Bio.pdf`, PDF, 145_000, `${id}-bio`);
    default:
      return null;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Candidate email generator
//
// Stage → thread depth:
//   sourced / not yet engaged   → 1 outbound (cold outreach)
//   screened                     → 2 (outreach → screen notes from candidate)
//   submitted                    → 3 (outreach → interest → "submitted to X")
//   interview                    → 4 (+ interview feedback)
//   placed                       → 5 (+ offer accepted + onboarding)
//   not-a-fit                    → 2 (outreach + polite decline)
//
// Rows get an `unread` flag for the most recent incoming thread when the
// candidate was updated in the last 7 days and is late-stage. This is how
// recruiters actually experience their inbox — late-stage candidates drive
// unread pressure.
// ──────────────────────────────────────────────────────────────────────────

const candidateEmails = (c: CandidateSeed): SeedEmail[] => {
  const id = c.id;
  const fn = firstName(c.name);
  const ln = lastName(c.name);
  const anchor = c.daysSinceUpdate;
  const personal = `${slug(c.name).replace(/-/g, '.')}@gmail.com`;
  const rows: SeedEmail[] = [];

  const verticalLabel: Record<CandidateSeed['vertical'], string> = {
    tech: 'engineering',
    healthcare: 'clinical',
    biotech: 'clinical research',
    finance: 'finance',
    legal: 'legal',
    manufacturing: 'operations',
    'hr-admin': 'people ops',
    exec: 'executive',
  };
  const vlabel = verticalLabel[c.vertical];

  // 1) Cold outreach — always (oldest in thread, ~anchor + 14 days ago or
  //    anchor + 30 days for passive/sourced candidates so "days since update"
  //    still makes sense chronologically).
  const outreachDaysAgo = anchor + (c.stage === 'sourced' || c.availability === 'passive' ? 30 : 14);
  rows.push({
    id: `seed-em-${id}-1`,
    gmailMessageId: `seed-gm-${id}-1`,
    threadId: `seed-th-${id}`,
    contactId: id,
    fromEmail: ME_EMAIL,
    fromName: ME_NAME,
    toEmails: [personal],
    subject: `${fn} — reaching out on a ${c.title.toLowerCase()} opportunity`,
    snippet: `Hi ${fn}, came across your profile and wanted to reach out about a ${vlabel} role I'm working on…`,
    bodyText: `Hi ${fn},

I'm Paul Wentzell — recruiter focused on ${vlabel} placements. Came across your profile (${c.currentEmployer ? `saw you're at ${c.currentEmployer.replace(/\s*\(.*?\)\s*/, '')}` : 'your background caught my eye'}) and wanted to reach out about a ${c.title.toLowerCase()} search I'm running.

Role is ${c.remote ? 'fully remote' : `based in ${c.city}, ${c.state}`}, comp in the $${Math.round(c.compBase / 1000)}K+ range for the right person. Open to a quick 15-minute intro call next week?

Best,
Paul`,
    receivedAt: iso(outreachDaysAgo, 10, 15),
    direction: 'to',
    readAt: iso(outreachDaysAgo, 10, 15),
    openCount: 1,
    lastOpenedAt: iso(outreachDaysAgo - 1, 14, 20),
    clickCount: 0,
    archivedAt: null,
    tags: ['outreach', c.vertical],
  });

  if (!c.stage || c.stage === 'sourced') {
    return rows;
  }

  // 2) Screen — candidate responds (incoming, ~anchor + 10 days ago)
  //
  // Unread rule (attachment-rich): if this candidate was touched in the
  // last 4 days AND is in screened/submitted/interview stage, this row
  // stays unread. It already carries the resume + credential attachments,
  // so the demo can exercise the "move resume to Documents" flow from the
  // email header — the primary reason this fixture exists.
  const screenDaysAgo = Math.max(anchor + 7, anchor + 1);
  const screenUnread =
    anchor <= 4 &&
    (c.stage === 'screened' || c.stage === 'submitted' || c.stage === 'interview');
  rows.push({
    id: `seed-em-${id}-2`,
    gmailMessageId: `seed-gm-${id}-2`,
    threadId: `seed-th-${id}`,
    contactId: id,
    fromEmail: personal,
    fromName: c.name,
    toEmails: [ME_EMAIL],
    subject: `Re: ${fn} — reaching out on a ${c.title.toLowerCase()} opportunity`,
    snippet: `Thanks Paul — interested. Available ${c.availability === 'immediate' ? 'to start immediately' : `in ${c.availability}`}. Attaching resume.`,
    bodyText: `Hi Paul,

Thanks for reaching out. Yes, definitely interested in hearing more. To give you the quick picture:

- Current: ${c.currentEmployer || 'Currently exploring'}
- Availability: ${c.availability === 'immediate' ? 'Can start immediately' : c.availability}
- Target comp: $${Math.round(c.compBase / 1000)}K+ base${c.remote ? ', remote strongly preferred' : ''}
- Must-haves: ${c.skills.slice(0, 3).join(', ')}

Resume attached. Let me know what works for a call.

${fn}`,
    receivedAt: iso(screenDaysAgo, 13, 45),
    direction: 'from',
    readAt: screenUnread ? null : iso(screenDaysAgo, 14, 10),
    openCount: screenUnread ? 0 : 2,
    lastOpenedAt: screenUnread ? null : iso(screenDaysAgo, 14, 10),
    clickCount: screenUnread ? 0 : 1,
    lastClickedAt: screenUnread ? null : iso(screenDaysAgo, 14, 11),
    archivedAt: null,
    tags: ['screen', c.vertical],
    attachments: [resume(c, id), verticalExtra(c, id)].filter(
      (a): a is EmailAttachment => a !== null,
    ),
  });

  if (c.stage === 'screened') {
    return rows;
  }

  if (c.stage === 'not-a-fit') {
    rows.push({
      id: `seed-em-${id}-3`,
      gmailMessageId: `seed-gm-${id}-3`,
      threadId: `seed-th-${id}`,
      contactId: id,
      fromEmail: personal,
      fromName: c.name,
      toEmails: [ME_EMAIL],
      subject: `Re: ${fn} — reaching out on a ${c.title.toLowerCase()} opportunity`,
      snippet: `Had to pass — team scope doesn't match what I'm looking for. Keep me in mind for future.`,
      bodyText: `Paul,

Thanks for walking me through the role. After thinking on it, I need to pass — the scope on ${c.skills[0]} ownership is narrower than what I'm targeting next, and the ${c.remote ? 'hybrid expectation' : 'relocation'} is a hard no for me right now.

Keep me in mind for future searches. Appreciate the thorough intro.

Best,
${fn}`,
      receivedAt: iso(Math.max(anchor, 1), 16, 20),
      direction: 'from',
      readAt: iso(Math.max(anchor, 1), 16, 40),
      openCount: 1,
      archivedAt: null,
      tags: ['declined', c.vertical],
    });
    return rows;
  }

  // 3) Submission confirmation — outbound to candidate
  const submitDaysAgo = Math.max(anchor + 3, anchor);
  rows.push({
    id: `seed-em-${id}-3`,
    gmailMessageId: `seed-gm-${id}-3`,
    threadId: `seed-th-${id}`,
    contactId: id,
    fromEmail: ME_EMAIL,
    fromName: ME_NAME,
    toEmails: [personal],
    subject: `${fn} — submitted to the client`,
    snippet: `Just shipped your packet. Client is reviewing this week — expect feedback within 5 business days.`,
    bodyText: `Hi ${fn},

Good news — just shipped your packet over to the client team this morning. Here's what they have:

- Resume (cleaned up formatting, kept content intact)
- My submission notes (comp target, availability, strongest projects)
${c.credentials ? `- Credential verification (${c.credentials})\n` : ''}
They're reviewing this week. Expect feedback within 5 business days, usually sooner. I'll loop you in the moment I hear.

In the meantime — any questions on the team or role, text me anytime.

Paul`,
    receivedAt: iso(submitDaysAgo, 11, 30),
    direction: 'to',
    readAt: iso(submitDaysAgo, 12, 0),
    openCount: 3,
    lastOpenedAt: iso(submitDaysAgo - 1, 9, 0),
    archivedAt: null,
    tags: ['submission', c.vertical],
  });

  if (c.stage === 'submitted') {
    return rows;
  }

  // 4) Interview feedback — incoming from candidate after first round
  //    The most-recent row for interview-stage candidates — eligible for unread.
  const interviewDaysAgo = Math.max(anchor - 1, 1);
  // markUnread: late-stage interview candidates with recent activity drive
  // inbox pressure. `submitted` returned earlier, so `stage` here is
  // narrowed to 'interview' | 'placed'; we flag only interview because
  // `placed` gets a newer offer row below.
  const isRecent = anchor <= 7;
  const markUnread = isRecent && c.stage === 'interview';

  rows.push({
    id: `seed-em-${id}-4`,
    gmailMessageId: `seed-gm-${id}-4`,
    threadId: `seed-th-${id}`,
    contactId: id,
    fromEmail: personal,
    fromName: c.name,
    toEmails: [ME_EMAIL],
    subject: `Re: ${fn} — interview debrief`,
    snippet: `Round felt strong. Questions on ${c.skills[0]} were deep — wanted your read on whether I nailed the follow-up.`,
    bodyText: `Paul,

Wrapped the round about an hour ago. Overall felt strong — really enjoyed the team. Two quick things:

1. They spent 30 minutes on ${c.skills[0]}-specific scenarios. I walked through my ${c.currentEmployer || 'prior'} experience in detail — wanted your read on whether that's what they were fishing for.
2. They asked about comp expectations at the very end. I gave the $${Math.round(c.compBase / 1000)}K figure we'd discussed. Hope that's still in the right zone given the feedback from hiring manager.

Any color you can share from your side would be great before the next round.

${fn}`,
    receivedAt: iso(interviewDaysAgo, 15, 20),
    direction: 'from',
    readAt: markUnread ? null : iso(interviewDaysAgo, 15, 45),
    openCount: markUnread ? 0 : 1,
    lastOpenedAt: markUnread ? null : iso(interviewDaysAgo, 15, 45),
    archivedAt: null,
    tags: ['interview', 'feedback', c.vertical],
    // Interview rounds almost always come with artifacts to review — the
    // take-home, an updated resume with the latest project, or the
    // interviewer's notes the candidate was asked to self-critique on.
    // Attaching all three gives the Documents-move flow multiple file
    // types to exercise (PDF + DOCX) on an unread row.
    attachments: [
      att(`Take-Home-${ln}.pdf`, PDF, 245_000, `${id}-takehome`),
      att(`Resume-${ln}-updated.pdf`, PDF, 195_000, `${id}-resume-v2`),
      att(`Self-Assessment-${ln}.docx`, DOCX, 68_000, `${id}-selfassess`),
    ],
  });

  if (c.stage === 'interview') {
    return rows;
  }

  // 5) Offer + placed — celebratory outbound, then onboarding paperwork
  if (c.stage === 'placed') {
    const offerDaysAgo = Math.max(anchor + 5, 10);
    rows.push({
      id: `seed-em-${id}-5`,
      gmailMessageId: `seed-gm-${id}-5`,
      threadId: `seed-th-${id}-offer`,
      contactId: id,
      fromEmail: ME_EMAIL,
      fromName: ME_NAME,
      toEmails: [personal],
      subject: `${fn} — offer letter attached`,
      snippet: `Congrats — offer came through at $${Math.round(c.compBase / 1000)}K base. Signed PDF attached.`,
      bodyText: `${fn},

Huge congrats — offer came through this morning exactly where we targeted. $${Math.round(c.compBase / 1000)}K base, full signing bonus, equity per the Radford benchmark we discussed.

Letter attached. Legal gave it the green light — no unusual restrictive covenants, non-compete is scoped reasonably (12 months, same vertical only).

Review and send your DocuSign back by Friday and we're locked in.

Paul`,
      receivedAt: iso(offerDaysAgo, 9, 15),
      direction: 'to',
      readAt: iso(offerDaysAgo, 9, 40),
      openCount: 5,
      lastOpenedAt: iso(offerDaysAgo - 1, 20, 10),
      clickCount: 3,
      lastClickedAt: iso(offerDaysAgo, 10, 5),
      archivedAt: null,
      tags: ['offer', 'placed', c.vertical],
      attachments: [
        att(`Offer-Letter-${ln}.pdf`, PDF, 185_000, `${id}-offer`),
        att('Non-Compete.pdf', PDF, 95_000, `${id}-nc`),
        att('Benefits-Summary.pdf', PDF, 225_000, `${id}-bene`),
      ],
    });
  }

  return rows;
};

// ──────────────────────────────────────────────────────────────────────────
// Hiring-manager email generator
//
// HMs get:
//   - VIP client (tags include 'VIP'):  4 threads (req packet, submission,
//     feedback, QBR scheduling) with 1 unread.
//   - Client (tags include 'Client'):   3 threads (req, submission, feedback)
//   - Other:                            2 threads (intro + last-touch ping)
// ──────────────────────────────────────────────────────────────────────────

const hmEmails = (hm: HMSeed): SeedEmail[] => {
  const id = hm.id;
  const fn = firstName(hm.name);
  const anchor = hm.daysSinceUpdate;
  const rows: SeedEmail[] = [];

  const isVIP = hm.tags?.includes('VIP');
  const isClient = hm.tags?.includes('Client') || isVIP;

  // 1) Intro / last-touch (always) — outbound
  const introDaysAgo = anchor + 35;
  rows.push({
    id: `seed-em-${id}-1`,
    gmailMessageId: `seed-gm-${id}-1`,
    threadId: `seed-th-${id}-intro`,
    contactId: id,
    fromEmail: ME_EMAIL,
    fromName: ME_NAME,
    toEmails: [hm.email],
    subject: `Following up — ${hm.orgName} ${hm.department} talent needs`,
    snippet: `${fn}, wanted to circle back on the ${hm.department.toLowerCase()} reqs we discussed. I have a short list ready.`,
    bodyText: `Hi ${fn},

Wanted to circle back following our conversation about ${hm.department.toLowerCase()} talent at ${hm.orgName}. I've been actively sourcing against the profile we outlined — have a short list of 4-5 candidates I'd like to walk you through.

A few quick highlights:
- 2 candidates currently at top-tier peers who would be meaningful lateral moves
- 1 passive candidate already open to a conversation
- Strong diversity slate across the lineup

Any time this week work for a 20-minute briefing call? I can come prepared with profiles and comp benchmarks.

Best,
Paul`,
    receivedAt: iso(introDaysAgo, 9, 10),
    direction: 'to',
    readAt: iso(introDaysAgo - 1, 14, 30),
    openCount: 2,
    lastOpenedAt: iso(introDaysAgo - 1, 14, 30),
    archivedAt: null,
    tags: ['outreach', 'hm'],
  });

  // 2) HM replies — incoming with reqs
  const reqDaysAgo = anchor + 20;
  rows.push({
    id: `seed-em-${id}-2`,
    gmailMessageId: `seed-gm-${id}-2`,
    threadId: `seed-th-${id}-intro`,
    contactId: id,
    fromEmail: hm.email,
    fromName: hm.name,
    toEmails: [ME_EMAIL],
    subject: `Re: Following up — ${hm.orgName} ${hm.department} talent needs`,
    snippet: `Paul — perfect timing. We just opened 3 new reqs for Q2. Req packet attached.`,
    bodyText: `Paul,

Perfect timing. We just opened 3 new reqs on Friday and I was about to send you the packet. Attaching it now so you have the formal scope.

Priority order:
1. Senior IC role (highest — replacement for attrition)
2. Manager role (growth hire)
3. Mid-level IC (headcount add)

Short-list please by end of next week. Budget is aligned with market — no games on comp this cycle.

${fn}`,
    receivedAt: iso(reqDaysAgo, 11, 40),
    direction: 'from',
    readAt: iso(reqDaysAgo, 12, 0),
    openCount: 4,
    lastOpenedAt: iso(reqDaysAgo - 1, 8, 15),
    clickCount: 2,
    lastClickedAt: iso(reqDaysAgo, 13, 0),
    archivedAt: null,
    tags: ['req', 'hm'],
    attachments: [
      att(`${slug(hm.orgName)}-Q2-Reqs-Packet.pdf`, PDF, 385_000, `${id}-reqs`),
      att(`${slug(hm.orgName)}-Comp-Bands-2026.xlsx`, XLSX, 68_000, `${id}-bands`),
    ],
  });

  if (!isClient) {
    return rows;
  }

  // 3) Submission digest — outbound with 3-4 candidate profiles
  const subDaysAgo = anchor + 7;
  rows.push({
    id: `seed-em-${id}-3`,
    gmailMessageId: `seed-gm-${id}-3`,
    threadId: `seed-th-${id}-submit`,
    contactId: id,
    fromEmail: ME_EMAIL,
    fromName: ME_NAME,
    toEmails: [hm.email],
    subject: `${hm.orgName} — submissions for ${hm.department} search`,
    snippet: `${fn}, sending 4 submissions. All screened, all interested, all within comp band.`,
    bodyText: `${fn},

Sending our first batch of 4 submissions for the ${hm.department} search. All have been screened against your must-haves and are actively interested:

1. Senior candidate — current top-tier peer, 2-week availability
2. Senior candidate — passive but engaged, 60-day notice
3. Mid-level — strong culture-add profile, immediate availability
4. Stretch candidate — slightly under on one dimension but excellent on two others

Profiles + my submission notes attached. Let me know schedule prefs for first rounds.

Paul`,
    receivedAt: iso(subDaysAgo, 10, 20),
    direction: 'to',
    readAt: iso(subDaysAgo, 10, 45),
    openCount: 3,
    lastOpenedAt: iso(subDaysAgo - 1, 16, 10),
    archivedAt: null,
    tags: ['submission', 'hm'],
    attachments: [
      att(`${slug(hm.orgName)}-Submissions-Batch-1.pdf`, PDF, 1_245_000, `${id}-sub1`),
      att('Submission-Notes.docx', DOCX, 78_000, `${id}-notes`),
    ],
  });

  if (!isVIP) {
    return rows;
  }

  // 4) VIP only — recent feedback / QBR thread, flagged unread
  const feedbackDaysAgo = Math.max(anchor - 1, 1);
  rows.push({
    id: `seed-em-${id}-4`,
    gmailMessageId: `seed-gm-${id}-4`,
    threadId: `seed-th-${id}-qbr`,
    contactId: id,
    fromEmail: hm.email,
    fromName: hm.name,
    toEmails: [ME_EMAIL],
    subject: `Q2 QBR + extending retainer through year-end`,
    snippet: `Paul — board signed off on extending our retainer through year-end. Want to align on Q3 targets at the QBR.`,
    bodyText: `Paul,

Good news — board signed off this morning on extending our retainer with you through year-end, expanded scope (included the new ${hm.department} headcount we're forecasting for Q3).

Want to spend the QBR aligning on:
1. Q1 placement quality — two 90-day milestones hit, one at risk. Need your read.
2. Q3 forecast — 6 new reqs likely, comp bands need refreshing.
3. Diversity slate targets — we're at 38%, want to push to 50% by EOY.

Block on my calendar this week? I can do Tues 2pm or Thurs 10am ET.

${fn}`,
    receivedAt: iso(feedbackDaysAgo, 14, 30),
    direction: 'from',
    readAt: null, // UNREAD — VIP client with fresh ping
    openCount: 0,
    archivedAt: null,
    tags: ['qbr', 'renewal', 'hm'],
    // QBR threads almost always ship with a revised MSA redline + the
    // Q3 forecast spreadsheet. Keeping both attached on this unread row
    // means the demo has one more attachment-heavy unread to exercise
    // the "save to Documents" flow.
    attachments: [
      att(`MSA-${slug(hm.orgName)}-Extended-2026.pdf`, PDF, 385_000, `${id}-msa-ext`),
      att(`${slug(hm.orgName)}-Q3-Forecast.xlsx`, XLSX, 128_000, `${id}-fc`),
    ],
  });

  return rows;
};

// ──────────────────────────────────────────────────────────────────────────
// Org-level email generator
//
// Each org gets 2 threads: one procurement/accounting touch (invoice or MSA)
// and one talent-ops touch (QBR scheduling / referral bonus ack).
// ──────────────────────────────────────────────────────────────────────────

const orgEmails = (orgId: string, orgName: string, industry: string, daysSince: number): SeedEmail[] => {
  const id = orgId;
  const rows: SeedEmail[] = [];

  // Look up org's primary email if available
  const orgContact = BULK_ORGS.find((o) => o.id === orgId);
  const orgEmail = orgContact?.entries?.emails?.[0]?.value ?? `talent@${slug(orgName)}.com`;

  // 1) Invoice / AP thread
  const invDaysAgo = daysSince + 45;
  rows.push({
    id: `seed-em-${id}-1`,
    gmailMessageId: `seed-gm-${id}-1`,
    threadId: `seed-th-${id}-invoice`,
    contactId: id,
    fromEmail: ME_EMAIL,
    fromName: ME_NAME,
    toEmails: [`ap@${slug(orgName)}.com`],
    subject: `${orgName} — Q1 2026 placement summary + invoice`,
    snippet: `Attaching Q1 placement summary and consolidated invoice. Net-30, wire preferred.`,
    bodyText: `Hi AP team,

Attaching Q1 2026 placement summary for ${orgName} along with the consolidated invoice. Terms are net-30, wire preferred (details on page 2 of the invoice).

Placements this quarter:
- All clean 90-day holds, no clawback activations
- Replacement guarantee details per MSA §4.2

Reach out with any questions.

Best,
Paul Wentzell
Roadrunner Talent Partners`,
    receivedAt: iso(invDaysAgo, 8, 30),
    direction: 'to',
    readAt: iso(invDaysAgo - 1, 10, 15),
    openCount: 3,
    lastOpenedAt: iso(invDaysAgo - 1, 10, 15),
    archivedAt: null,
    tags: ['invoice', 'ap', 'billing'],
    attachments: [
      att(`${slug(orgName)}-Q1-2026-Placement-Summary.pdf`, PDF, 245_000, `${id}-summary`),
      att(`Invoice-${slug(orgName)}-Q1-2026.pdf`, PDF, 118_000, `${id}-inv`),
    ],
  });

  // 2) Talent-ops touch — recent, industry-appropriate
  const tDaysAgo = Math.max(daysSince, 2);
  const opsEmail = orgEmail;
  rows.push({
    id: `seed-em-${id}-2`,
    gmailMessageId: `seed-gm-${id}-2`,
    threadId: `seed-th-${id}-ops`,
    contactId: id,
    fromEmail: opsEmail,
    fromName: `${orgName} Talent Ops`,
    toEmails: [ME_EMAIL],
    subject: `MSA annual review — ${orgName} / Roadrunner`,
    snippet: `Paul — time for the annual MSA review. Legal flagged two sections they'd like to revisit.`,
    bodyText: `Paul,

Annual MSA review cycle is open — our legal team flagged two sections they'd like to revisit before we renew for another year:

1. §3.1 Replacement guarantee window (currently 90 days — they're pushing for 120)
2. §5.4 Data retention on candidate records (alignment with new state privacy laws in ${industry.includes('Healthcare') ? 'MA (MHPA)' : 'CA (CPRA)'})

Attaching redline. Most edits are housekeeping, but the two above are material. Let's set up a call with your ops lead and our GC.

Best,
${orgName} Talent Ops`,
    receivedAt: iso(tDaysAgo, 11, 0),
    direction: 'from',
    readAt: tDaysAgo <= 5 ? null : iso(tDaysAgo, 11, 30),
    openCount: tDaysAgo <= 5 ? 0 : 2,
    archivedAt: null,
    tags: ['msa', 'renewal'],
    attachments: [
      att(`MSA-${slug(orgName)}-Redline-2026.pdf`, PDF, 325_000, `${id}-msa`),
    ],
  });

  return rows;
};

// ──────────────────────────────────────────────────────────────────────────
// Final bulk export — flatten all generators
// ──────────────────────────────────────────────────────────────────────────

const candidateRows: SeedEmail[] = CANDIDATE_SEEDS.flatMap(candidateEmails);
const hmRows: SeedEmail[] = HM_SEEDS.flatMap(hmEmails);
const orgRows: SeedEmail[] = BULK_ORGS.flatMap((o) =>
  orgEmails(
    o.id,
    o.name,
    ('industry' in o ? o.industry : undefined) ?? 'Business Services',
    // lastUpdated is YYYY-MM-DD; compute days since seed "now"
    Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(o.lastUpdated).getTime()) / (1000 * 60 * 60 * 24),
      ),
    ),
  ),
);

export const BULK_EMAILS: SeedEmail[] = [
  ...candidateRows,
  ...hmRows,
  ...orgRows,
];
