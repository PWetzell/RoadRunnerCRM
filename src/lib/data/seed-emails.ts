import type { EmailAttachment } from '@/types/email-attachment';
import { BULK_EMAILS } from './seed-emails-bulk';

/**
 * Client-side seed emails for the demo.
 *
 * Why this file exists:
 *   The real email pipeline is `/api/gmail/sync` → `email_messages` in Supabase.
 *   For a Gmail-connected user we never touch this seed. For the demo path
 *   (unauthenticated / no Gmail sync), we fall back to this fixture so the
 *   Emails sub-tab and the Activity Log still have rich content to showcase.
 *
 *   HubSpot, Folk, and Attio all ship "sample email" fixtures in their demo
 *   workspaces for the same reason — product surfaces need to breathe, and
 *   an empty state kills the tour.
 *
 * HR/recruiting context:
 *   Paul's Roadrunner case study positions the CRM for HR / recruiting ops.
 *   Every thread here mirrors a realistic HR moment — offer negotiation,
 *   background check consent, onboarding kickoff, performance review cycle,
 *   reference outreach, comp review, benefits enrollment. Attachments use
 *   true HR-domain filenames (Resume-[Name].pdf, Offer-Letter.pdf,
 *   I-9-Form.pdf, W-2-2025.pdf, Performance-Review.docx, NDA-Signed.pdf,
 *   Background-Check-Report.pdf, Reference-Notes.docx, Benefits-Summary.pdf,
 *   Non-Compete.pdf, Employment-Agreement.pdf, 401k-Enrollment.pdf,
 *   Cover-Letter.docx, Compensation-Analysis.xlsx, Interview-Feedback.docx).
 *
 * Unread state:
 *   `readAt: null` flags the email as unread. The most recent ~3-5 emails
 *   per hot contact are unread so the demo always has the "new email" dot
 *   state to show — mirrors HubSpot's inbox-style unread treatment + Gmail's
 *   bold-subject-plus-dot convention.
 *
 * Time spread:
 *   Timestamps span ~14 months back to "just now" so a year-view chart /
 *   activity-log year group renders with real density instead of a spike at
 *   the present. Individual contacts get 3-12 emails each depending on how
 *   active the relationship should feel.
 */

export interface SeedEmail {
  id: string;
  gmailMessageId: string;
  threadId: string;
  contactId: string;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: string;           // ISO
  direction: 'from' | 'to' | 'cc' | 'bcc';
  readAt?: string | null;       // null = unread
  openCount?: number;
  lastOpenedAt?: string | null;
  clickCount?: number;
  lastClickedAt?: string | null;
  archivedAt?: string | null;
  pinnedAt?: string | null;
  tags?: string[];
  attachments?: EmailAttachment[];
}

// Helper — produce an ISO string `days` ago at a specific hour/minute so the
// fixture is deterministic relative to "now" but still reads as varied times.
const iso = (days: number, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// Shorthand — `att(...)` produces an inbound attachment (gmailAttachmentId
// path). For the demo we don't actually fetch bytes; the chip just has to
// render. `size` values are realistic file sizes so the "· 124 KB" label has
// the right feel.
const att = (filename: string, mimeType: string, size: number, idSuffix: string): EmailAttachment => ({
  filename,
  mimeType,
  size,
  gmailAttachmentId: `seed-att-${idSuffix}`,
});

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const CORE_EMAILS: SeedEmail[] = [
  // ─────────────────────────────────────────────────────────────────────
  // per-1 · Sarah Chen · VP of Operations @ Fidelity
  //   Story: senior candidate we placed ~11 months ago. Mix of onboarding
  //   history, perf review cycle, and two recent unread threads about
  //   Q2 promotion + referral.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-chen-1',
    gmailMessageId: 'seed-gm-chen-1',
    threadId: 'seed-th-chen-1',
    contactId: 'per-1',
    fromEmail: 's.chen@fidelity.com',
    fromName: 'Sarah Chen',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Re: Q2 promotion — VP of Operations',
    snippet: 'Thanks for pushing on this. Comp package landed today and HR is finalizing the letter — can you review the scope section before I sign?',
    bodyText: `Hey Paul,

Thanks for pushing on this. Comp package landed today and HR is finalizing the letter — can you review the scope section before I sign? I want to make sure the reporting structure matches what we discussed in March.

Also attaching the updated compensation analysis you asked for. Let me know if the bands look right for the role.

— Sarah`,
    receivedAt: iso(0, 8, 42),
    direction: 'from',
    readAt: null, // UNREAD — most recent
    tags: ['promotion', 'urgent'],
    attachments: [
      att('Compensation-Analysis-Q2.xlsx', XLSX, 184_320, 'chen-1-a'),
      att('Offer-Letter-Draft.pdf', PDF, 212_992, 'chen-1-b'),
    ],
  },
  {
    id: 'seed-em-chen-2',
    gmailMessageId: 'seed-gm-chen-2',
    threadId: 'seed-th-chen-2',
    contactId: 'per-1',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['s.chen@fidelity.com'],
    subject: 'Referral: strong candidate for your risk analytics team',
    snippet: 'Quick intro — Priya at HubSpot mentioned you\'re rebuilding the risk analytics bench. I just had a great call with a candidate who ran the exact...',
    bodyText: `Sarah,

Quick intro — Priya at HubSpot mentioned you're rebuilding the risk analytics bench. I just had a great call with a candidate who ran the exact stack you're on (Snowflake + dbt + Looker) at State Street for six years. Not actively looking but open to the right conversation.

Resume attached. Worth a 20 minute chat?

Paul`,
    receivedAt: iso(2, 14, 15),
    direction: 'to',
    readAt: iso(2, 14, 16),
    openCount: 3,
    lastOpenedAt: iso(2, 16, 2),
    clickCount: 1,
    lastClickedAt: iso(2, 16, 3),
    tags: ['referral'],
    attachments: [
      att('Resume-Meera-Krishnan.pdf', PDF, 156_672, 'chen-2-a'),
    ],
  },
  {
    id: 'seed-em-chen-3',
    gmailMessageId: 'seed-gm-chen-3',
    threadId: 'seed-th-chen-3',
    contactId: 'per-1',
    fromEmail: 's.chen@fidelity.com',
    fromName: 'Sarah Chen',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Performance review — annual cycle',
    snippet: 'HR wrapped the 360 and the summary is attached. Ratings were strong across the board — only callout is cross-functional visibility which I think...',
    bodyText: `Paul,

HR wrapped the 360 and the summary is attached. Ratings were strong across the board — only callout is cross-functional visibility which I think I can fix by volunteering for the Q3 platform review committee.

Thoughts?

— Sarah`,
    receivedAt: iso(38, 11, 20),
    direction: 'from',
    readAt: iso(38, 13, 5),
    tags: ['performance-review'],
    attachments: [
      att('Performance-Review-2025.docx', DOCX, 98_304, 'chen-3-a'),
    ],
  },
  {
    id: 'seed-em-chen-4',
    gmailMessageId: 'seed-gm-chen-4',
    threadId: 'seed-th-chen-4',
    contactId: 'per-1',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['s.chen@fidelity.com'],
    subject: '90-day onboarding checkpoint',
    snippet: 'How is the team shaping up now that you\'re through onboarding? Happy to run the 90-day retrospective if useful.',
    bodyText: `Sarah,

How is the team shaping up now that you're through onboarding? Happy to run the 90-day retrospective if useful — I ran one with Marcus at Stripe and we pulled out three patterns that helped him accelerate scope.

Let me know.

Paul`,
    receivedAt: iso(95, 10, 0),
    direction: 'to',
    readAt: iso(95, 10, 0),
    openCount: 2,
    lastOpenedAt: iso(94, 9, 30),
    tags: ['onboarding'],
  },
  {
    id: 'seed-em-chen-5',
    gmailMessageId: 'seed-gm-chen-5',
    threadId: 'seed-th-chen-5',
    contactId: 'per-1',
    fromEmail: 's.chen@fidelity.com',
    fromName: 'Sarah Chen',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Signed — Employment Agreement + NDA',
    snippet: 'All signed. I-9 will come Tuesday with the onboarding packet. Excited to get started!',
    bodyText: `Paul,

All signed — Employment Agreement + NDA attached. I-9 will come Tuesday with the onboarding packet. Excited to get started!

— Sarah`,
    receivedAt: iso(305, 15, 40),
    direction: 'from',
    readAt: iso(305, 16, 0),
    tags: ['onboarding', 'contract'],
    attachments: [
      att('Employment-Agreement-Signed.pdf', PDF, 267_264, 'chen-5-a'),
      att('NDA-Signed.pdf', PDF, 89_088, 'chen-5-b'),
    ],
  },
  {
    id: 'seed-em-chen-6',
    gmailMessageId: 'seed-gm-chen-6',
    threadId: 'seed-th-chen-6',
    contactId: 'per-1',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['s.chen@fidelity.com'],
    subject: 'Offer letter — VP of Operations',
    snippet: 'Offer is attached — same structure we walked through last Thursday. Take your time; I\'m around all week if questions come up.',
    bodyText: `Sarah,

Offer is attached — same structure we walked through last Thursday. Take your time; I'm around all week if questions come up. The comp band I quoted holds for 10 business days per Fidelity's policy.

Congrats — this is a great fit.

Paul`,
    receivedAt: iso(315, 13, 0),
    direction: 'to',
    readAt: iso(315, 13, 0),
    openCount: 5,
    lastOpenedAt: iso(314, 8, 15),
    clickCount: 2,
    lastClickedAt: iso(314, 8, 16),
    tags: ['offer'],
    attachments: [
      att('Offer-Letter-Sarah-Chen.pdf', PDF, 198_656, 'chen-6-a'),
      att('Benefits-Summary-2025.pdf', PDF, 421_888, 'chen-6-b'),
    ],
  },
  {
    id: 'seed-em-chen-7',
    gmailMessageId: 'seed-gm-chen-7',
    threadId: 'seed-th-chen-7',
    contactId: 'per-1',
    fromEmail: 's.chen@fidelity.com',
    fromName: 'Sarah Chen',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Background check — consent attached',
    snippet: 'Signed consent form attached. Let me know what else HR needs.',
    bodyText: `Paul,

Signed consent form attached. Let me know what else HR needs — I'm assuming the usual: W-2 from my last role, I-9 proof, references. I can send W-2 separately over secure channel.

— Sarah`,
    receivedAt: iso(325, 10, 12),
    direction: 'from',
    readAt: iso(325, 11, 0),
    tags: ['background-check'],
    attachments: [
      att('Background-Check-Consent.pdf', PDF, 67_584, 'chen-7-a'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-2 · Marcus Webb · Engineering Manager, Payments @ Stripe
  //   Story: active search — we're presenting him to Stripe for a
  //   Director role. Tight cadence, pending interview feedback.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-webb-1',
    gmailMessageId: 'seed-gm-webb-1',
    threadId: 'seed-th-webb-1',
    contactId: 'per-2',
    fromEmail: 'm.webb@stripe.com',
    fromName: 'Marcus Webb',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Re: Director of Payments Infra — next steps',
    snippet: 'Panel went well from my side. Attached my updated resume with the payments-infra scope added and a short cover letter answering the "why now" question...',
    bodyText: `Paul,

Panel went well from my side. Attached my updated resume with the payments-infra scope added and a short cover letter answering the "why now" question Rachel asked.

One flag — comp expectations. The band they quoted is ~15% below what I'd need to leave Stripe cleanly. Can we get that on the table before the next round?

Thanks,
Marcus`,
    receivedAt: iso(1, 16, 22),
    direction: 'from',
    readAt: null, // UNREAD
    tags: ['active-search', 'comp'],
    attachments: [
      att('Resume-Marcus-Webb-v4.pdf', PDF, 178_176, 'webb-1-a'),
      att('Cover-Letter-Stripe-Director.docx', DOCX, 42_496, 'webb-1-b'),
    ],
  },
  {
    id: 'seed-em-webb-2',
    gmailMessageId: 'seed-gm-webb-2',
    threadId: 'seed-th-webb-2',
    contactId: 'per-2',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['m.webb@stripe.com'],
    subject: 'Interview feedback from Rachel',
    snippet: 'Hiring manager feedback attached. Strong signal across the board — two small gaps to address in the next panel.',
    bodyText: `Marcus,

Hiring manager feedback attached. Strong signal across the board — two small gaps to address in the next panel: (1) how you scaled the team from 12→40 at your last role, (2) one concrete example of cross-team platform handoff.

Nothing disqualifying. Let's prep Thursday.

Paul`,
    receivedAt: iso(4, 11, 15),
    direction: 'to',
    readAt: iso(4, 11, 15),
    openCount: 4,
    lastOpenedAt: iso(3, 20, 10),
    tags: ['feedback'],
    attachments: [
      att('Interview-Feedback-Round2.docx', DOCX, 56_320, 'webb-2-a'),
    ],
  },
  {
    id: 'seed-em-webb-3',
    gmailMessageId: 'seed-gm-webb-3',
    threadId: 'seed-th-webb-3',
    contactId: 'per-2',
    fromEmail: 'm.webb@stripe.com',
    fromName: 'Marcus Webb',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'References — Rachel, David, Nikhil',
    snippet: 'My three references, all with permission to contact. Rachel was my skip at block.one; David was my peer at Square; Nikhil reported to me at Stripe.',
    bodyText: `Paul,

My three references, all with permission to contact:

Rachel Ahmed — rachel@blockone.com — my skip at block.one (2021-2023)
David Foley — dfoley@squareup.com — peer at Square (2018-2021)
Nikhil Rao — nikhil.r@stripe.com — direct report at Stripe (2023-present)

Notes from my last reference call with Rachel attached for context (she's already vouched twice).

— Marcus`,
    receivedAt: iso(8, 14, 0),
    direction: 'from',
    readAt: iso(8, 14, 30),
    tags: ['references'],
    attachments: [
      att('Reference-Notes-Rachel-Ahmed.docx', DOCX, 34_816, 'webb-3-a'),
    ],
  },
  {
    id: 'seed-em-webb-4',
    gmailMessageId: 'seed-gm-webb-4',
    threadId: 'seed-th-webb-4',
    contactId: 'per-2',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['m.webb@stripe.com'],
    subject: 'Intro: Director of Payments Infrastructure',
    snippet: 'Role writeup and the org chart for the payments platform group. 40 engineers, reports to the CTO, P1 hire for them this half.',
    bodyText: `Marcus,

Role writeup and the org chart for the payments platform group. 40 engineers, reports to the CTO, P1 hire for them this half. Comp band is 280-340 base + equity; I can push on both if the scope widens.

Worth a 20-minute chat?

Paul`,
    receivedAt: iso(22, 9, 30),
    direction: 'to',
    readAt: iso(22, 9, 30),
    openCount: 3,
    lastOpenedAt: iso(22, 18, 5),
    clickCount: 1,
    lastClickedAt: iso(22, 18, 6),
  },
  {
    id: 'seed-em-webb-5',
    gmailMessageId: 'seed-gm-webb-5',
    threadId: 'seed-th-webb-5',
    contactId: 'per-2',
    fromEmail: 'm.webb@stripe.com',
    fromName: 'Marcus Webb',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Catch up this quarter?',
    snippet: 'Haven\'t talked in a while — are you running any searches in payments infra? I\'m not actively looking but the Stripe role is starting to feel stale.',
    bodyText: `Paul,

Haven't talked in a while — are you running any searches in payments infra? I'm not actively looking but the Stripe role is starting to feel stale (same problems, different quarter). Open to hearing what's out there.

— Marcus`,
    receivedAt: iso(68, 17, 45),
    direction: 'from',
    readAt: iso(68, 19, 0),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-3 · Diana Reyes · Director of Customer Success @ HubSpot
  //   Story: placed ~6 months ago. Just hit first performance review.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-reyes-1',
    gmailMessageId: 'seed-gm-reyes-1',
    threadId: 'seed-th-reyes-1',
    contactId: 'per-3',
    fromEmail: 'd.reyes@hubspot.com',
    fromName: 'Diana Reyes',
    toEmails: ['pwentzell64@gmail.com'],
    subject: '6-month review — team NPS +18 pts',
    snippet: 'First review came in strong — NPS up 18 points and attrition down to 4%. HR attached the summary. Thanks for the coaching through month two.',
    bodyText: `Paul,

First review came in strong — NPS up 18 points and attrition down to 4%. HR attached the summary. Thanks for the coaching through month two when everything was on fire.

— Diana`,
    receivedAt: iso(3, 10, 5),
    direction: 'from',
    readAt: null, // UNREAD
    tags: ['performance-review'],
    attachments: [
      att('Performance-Review-6mo.docx', DOCX, 72_704, 'reyes-1-a'),
    ],
  },
  {
    id: 'seed-em-reyes-2',
    gmailMessageId: 'seed-gm-reyes-2',
    threadId: 'seed-th-reyes-2',
    contactId: 'per-3',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['d.reyes@hubspot.com'],
    subject: 'Non-compete scope — clarification',
    snippet: 'Legal pushed back on the geographic clause; attached the redlined version. They want to narrow to North America and exclude SaaS CS specifically.',
    bodyText: `Diana,

Legal pushed back on the geographic clause; attached the redlined version. They want to narrow to North America and exclude SaaS CS specifically. Standard for HubSpot's level bands — no red flags.

Paul`,
    receivedAt: iso(14, 16, 30),
    direction: 'to',
    readAt: iso(14, 16, 30),
    openCount: 2,
    lastOpenedAt: iso(14, 20, 0),
    tags: ['contract'],
    attachments: [
      att('Non-Compete-Redlined.pdf', PDF, 118_784, 'reyes-2-a'),
    ],
  },
  {
    id: 'seed-em-reyes-3',
    gmailMessageId: 'seed-gm-reyes-3',
    threadId: 'seed-th-reyes-3',
    contactId: 'per-3',
    fromEmail: 'd.reyes@hubspot.com',
    fromName: 'Diana Reyes',
    toEmails: ['pwentzell64@gmail.com'],
    subject: '401k enrollment — questions',
    snippet: 'HR sent the 401k package. The match is 50% up to 6% but the vesting schedule is 4 years cliff — is that standard for Director level?',
    bodyText: `Paul,

HR sent the 401k package. The match is 50% up to 6% but the vesting schedule is 4 years cliff — is that standard for Director level? Feels aggressive compared to what I had at Zendesk.

— Diana`,
    receivedAt: iso(155, 9, 15),
    direction: 'from',
    readAt: iso(155, 10, 0),
    tags: ['benefits'],
    attachments: [
      att('401k-Enrollment-Package.pdf', PDF, 356_352, 'reyes-3-a'),
    ],
  },
  {
    id: 'seed-em-reyes-4',
    gmailMessageId: 'seed-gm-reyes-4',
    threadId: 'seed-th-reyes-4',
    contactId: 'per-3',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['d.reyes@hubspot.com'],
    subject: 'Offer — Director of Customer Success',
    snippet: 'Offer attached. Base + RSU + sign-on all per our call. Let me know if the equity vesting looks right — 4 years with 1-year cliff.',
    bodyText: `Diana,

Offer attached. Base + RSU + sign-on all per our call. Let me know if the equity vesting looks right — 4 years with 1-year cliff. Sign-on gets paid 60 days after start.

Congrats again.

Paul`,
    receivedAt: iso(178, 12, 0),
    direction: 'to',
    readAt: iso(178, 12, 0),
    openCount: 6,
    lastOpenedAt: iso(177, 8, 30),
    clickCount: 3,
    lastClickedAt: iso(177, 8, 31),
    tags: ['offer'],
    attachments: [
      att('Offer-Letter-Diana-Reyes.pdf', PDF, 205_824, 'reyes-4-a'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-6 · James Harford · Head of Talent Acquisition @ Dow Jones
  //   Story: client — we source candidates for his reqs. Active pipeline.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-harford-1',
    gmailMessageId: 'seed-gm-harford-1',
    threadId: 'seed-th-harford-1',
    contactId: 'per-6',
    fromEmail: 'j.harford@dowjones.com',
    fromName: 'James Harford',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Q2 reqs — 4 new roles open',
    snippet: 'Attached req packet for the Q2 cycle: Senior ML Engineer, Platform SRE x2, Product Security Lead. All priority-1, target start in 8 weeks.',
    bodyText: `Paul,

Attached req packet for the Q2 cycle: Senior ML Engineer, Platform SRE x2, Product Security Lead. All priority-1, target start in 8 weeks. Comp bands are in the spreadsheet, same structure as Q1.

Ping when you can spin up sourcing.

— James`,
    receivedAt: iso(0, 11, 18),
    direction: 'from',
    readAt: null, // UNREAD
    pinnedAt: iso(0, 11, 30),
    tags: ['active-reqs', 'urgent'],
    attachments: [
      att('Q2-Reqs-Packet.pdf', PDF, 489_472, 'harford-1-a'),
      att('Compensation-Analysis-Q2.xlsx', XLSX, 156_672, 'harford-1-b'),
    ],
  },
  {
    id: 'seed-em-harford-2',
    gmailMessageId: 'seed-gm-harford-2',
    threadId: 'seed-th-harford-2',
    contactId: 'per-6',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['j.harford@dowjones.com'],
    subject: 'Candidate submission — Sr ML Engineer',
    snippet: 'Presenting Aisha Okafor for the Sr ML Engineer req. Former Spotify recsys, strong publications, notice period 6 weeks. Resume + my notes attached.',
    bodyText: `James,

Presenting Aisha Okafor for the Sr ML Engineer req. Former Spotify recsys, strong publications, notice period 6 weeks. Comp expectation 245 base + equity.

Resume + my candidate notes attached. Let me know if you want me to schedule the first screen.

Paul`,
    receivedAt: iso(5, 13, 45),
    direction: 'to',
    readAt: iso(5, 13, 45),
    openCount: 4,
    lastOpenedAt: iso(4, 9, 15),
    clickCount: 2,
    lastClickedAt: iso(4, 9, 16),
    tags: ['submission'],
    attachments: [
      att('Resume-Aisha-Okafor.pdf', PDF, 164_352, 'harford-2-a'),
      att('Candidate-Notes-Okafor.docx', DOCX, 48_128, 'harford-2-b'),
    ],
  },
  {
    id: 'seed-em-harford-3',
    gmailMessageId: 'seed-gm-harford-3',
    threadId: 'seed-th-harford-3',
    contactId: 'per-6',
    fromEmail: 'j.harford@dowjones.com',
    fromName: 'James Harford',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Interview feedback — Aisha Okafor',
    snippet: 'Strong signal from the panel. One concern on system design; otherwise green across the board. Moving to final round.',
    bodyText: `Paul,

Strong signal from the panel. One concern on system design (she over-indexed on model training and under-specified serving infra) but otherwise green across the board. Moving to final round Thursday.

Feedback summary attached.

— James`,
    receivedAt: iso(11, 15, 30),
    direction: 'from',
    readAt: iso(11, 17, 0),
    tags: ['feedback', 'submission'],
    attachments: [
      att('Interview-Feedback-Okafor.docx', DOCX, 61_440, 'harford-3-a'),
    ],
  },
  {
    id: 'seed-em-harford-4',
    gmailMessageId: 'seed-gm-harford-4',
    threadId: 'seed-th-harford-4',
    contactId: 'per-6',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['j.harford@dowjones.com'],
    subject: 'Q1 wrap — 3 placed, 1 offer out',
    snippet: 'Q1 closeout: 3 placements (Santos, Lin, Rivera), 1 offer pending (Webb → Stripe). Total desk revenue up 22% vs Q1 last year.',
    bodyText: `James,

Q1 closeout: 3 placements (Santos, Lin, Rivera), 1 offer pending (Webb → Stripe). Total desk revenue up 22% vs Q1 last year. Invoice + placement summary attached.

Looking forward to Q2.

Paul`,
    receivedAt: iso(28, 10, 0),
    direction: 'to',
    readAt: iso(28, 10, 0),
    openCount: 2,
    lastOpenedAt: iso(28, 14, 0),
    tags: ['reporting'],
  },
  {
    id: 'seed-em-harford-5',
    gmailMessageId: 'seed-gm-harford-5',
    threadId: 'seed-th-harford-5',
    contactId: 'per-6',
    fromEmail: 'j.harford@dowjones.com',
    fromName: 'James Harford',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Master Services Agreement — executed',
    snippet: 'MSA signed and counter-signed. Attaching the final executed copy. Billing terms as discussed — net 30, milestone-based.',
    bodyText: `Paul,

MSA signed and counter-signed. Attaching the final executed copy. Billing terms as discussed — net 30, milestone-based. Let's get the first req packet over this week.

— James`,
    receivedAt: iso(112, 16, 20),
    direction: 'from',
    readAt: iso(112, 17, 0),
    tags: ['contract'],
    attachments: [
      att('MSA-Executed-DowJones.pdf', PDF, 312_320, 'harford-5-a'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-7 · Alex Rivera · Staff Data Engineer (passive candidate)
  //   Story: casual pipeline, long-cycle warm contact.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-rivera-1',
    gmailMessageId: 'seed-gm-rivera-1',
    threadId: 'seed-th-rivera-1',
    contactId: 'per-7',
    fromEmail: 'alex.rivera@gmail.com',
    fromName: 'Alex Rivera',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Re: Role at Dow Jones data platform',
    snippet: 'Thanks for thinking of me. Timing isn\'t right — mid-way through a rewrite — but attaching an updated resume for Q3.',
    bodyText: `Paul,

Thanks for thinking of me. Timing isn't right — mid-way through a rewrite — but attaching an updated resume for Q3 in case the Dow Jones role is still open then.

— Alex`,
    receivedAt: iso(1, 20, 12),
    direction: 'from',
    readAt: null, // UNREAD
    tags: ['passive', 'follow-up'],
    attachments: [
      att('Resume-Alex-Rivera-2026.pdf', PDF, 142_336, 'rivera-1-a'),
    ],
  },
  {
    id: 'seed-em-rivera-2',
    gmailMessageId: 'seed-gm-rivera-2',
    threadId: 'seed-th-rivera-2',
    contactId: 'per-7',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['alex.rivera@gmail.com'],
    subject: 'Staff Data Engineer — Dow Jones',
    snippet: 'Dow Jones is scaling their data platform team. Scope includes owning dbt migration + warehouse cost governance. 245-290 base.',
    bodyText: `Alex,

Dow Jones is scaling their data platform team. Scope includes owning dbt migration + warehouse cost governance. 245-290 base. You'd report to the VP of Data Infra (ex-Snowflake).

Interested in a quick exploratory call?

Paul`,
    receivedAt: iso(7, 11, 0),
    direction: 'to',
    readAt: iso(7, 11, 0),
    openCount: 1,
    lastOpenedAt: iso(6, 22, 40),
  },
  {
    id: 'seed-em-rivera-3',
    gmailMessageId: 'seed-gm-rivera-3',
    threadId: 'seed-th-rivera-3',
    contactId: 'per-7',
    fromEmail: 'alex.rivera@gmail.com',
    fromName: 'Alex Rivera',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Quarterly catch-up',
    snippet: 'Still heads-down on the migration. Chat in 3 months?',
    bodyText: `Paul,

Still heads-down on the migration. Chat in 3 months?

— Alex`,
    receivedAt: iso(92, 18, 15),
    direction: 'from',
    readAt: iso(92, 19, 0),
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-8 · Priya Shah · Senior PMM @ HubSpot
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-shah-1',
    gmailMessageId: 'seed-gm-shah-1',
    threadId: 'seed-th-shah-1',
    contactId: 'per-8',
    fromEmail: 'p.shah@hubspot.com',
    fromName: 'Priya Shah',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Re: Moving to Director — HubSpot internal',
    snippet: 'I got the promotion. Signing the new agreement this week. Attached the countersigned employment letter for your records.',
    bodyText: `Paul,

I got the promotion. Signing the new agreement this week. Attached the countersigned employment letter for your records — title change effective first of the month.

Thanks for the coaching on the comp conversation.

— Priya`,
    receivedAt: iso(2, 9, 0),
    direction: 'from',
    readAt: iso(2, 10, 0),
    tags: ['promotion'],
    attachments: [
      att('Employment-Agreement-Priya-Shah.pdf', PDF, 234_496, 'shah-1-a'),
    ],
  },
  {
    id: 'seed-em-shah-2',
    gmailMessageId: 'seed-gm-shah-2',
    threadId: 'seed-th-shah-2',
    contactId: 'per-8',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['p.shah@hubspot.com'],
    subject: 'Comp benchmark for Director PMM',
    snippet: 'Attached my comp benchmark — 15 data points from HubSpot peers + public companies. 90th percentile is 265 + 180 equity/yr.',
    bodyText: `Priya,

Attached my comp benchmark — 15 data points from HubSpot peers + public companies. 90th percentile is 265 + 180 equity/yr. Use the bottom of the band as your walk-away and the 75th as your opening ask.

Paul`,
    receivedAt: iso(18, 14, 30),
    direction: 'to',
    readAt: iso(18, 14, 30),
    openCount: 7,
    lastOpenedAt: iso(17, 9, 20),
    clickCount: 2,
    lastClickedAt: iso(17, 9, 22),
    tags: ['comp'],
    attachments: [
      att('Compensation-Analysis-PMM-Director.xlsx', XLSX, 98_304, 'shah-2-a'),
    ],
  },
  {
    id: 'seed-em-shah-3',
    gmailMessageId: 'seed-gm-shah-3',
    threadId: 'seed-th-shah-3',
    contactId: 'per-8',
    fromEmail: 'p.shah@hubspot.com',
    fromName: 'Priya Shah',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Benefits question — parental leave',
    snippet: 'HR says 16 weeks paid with job protection. Benefits summary attached. Is that competitive for my level?',
    bodyText: `Paul,

HR says 16 weeks paid with job protection. Benefits summary attached. Is that competitive for my level?

— Priya`,
    receivedAt: iso(220, 11, 0),
    direction: 'from',
    readAt: iso(220, 12, 0),
    tags: ['benefits'],
    attachments: [
      att('Benefits-Summary-HubSpot.pdf', PDF, 398_848, 'shah-3-a'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-4 · Tom Nakamura · Director of Compliance @ Fidelity
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-naka-1',
    gmailMessageId: 'seed-gm-naka-1',
    threadId: 'seed-th-naka-1',
    contactId: 'per-4',
    fromEmail: 't.nakamura@fidelity.com',
    fromName: 'Tom Nakamura',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Compliance audit — all clear',
    snippet: 'Annual audit wrapped clean. Attached the summary. Thanks for the prep two weeks ago — the document org was night and day vs last year.',
    bodyText: `Paul,

Annual audit wrapped clean. Attached the summary. Thanks for the prep two weeks ago — the document org was night and day vs last year.

— Tom`,
    receivedAt: iso(6, 10, 0),
    direction: 'from',
    readAt: iso(6, 11, 0),
    tags: ['compliance'],
    attachments: [
      att('Audit-Summary-2026.pdf', PDF, 521_216, 'naka-1-a'),
    ],
  },
  {
    id: 'seed-em-naka-2',
    gmailMessageId: 'seed-gm-naka-2',
    threadId: 'seed-th-naka-2',
    contactId: 'per-4',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['t.nakamura@fidelity.com'],
    subject: 'W-2 delivery — 2025 cycle',
    snippet: 'Your 2025 W-2 is attached. Let me know if anything looks off — we send these the same week IRS opens filing.',
    bodyText: `Tom,

Your 2025 W-2 is attached. Let me know if anything looks off — we send these the same week IRS opens filing.

Paul`,
    receivedAt: iso(85, 8, 0),
    direction: 'to',
    readAt: iso(85, 8, 0),
    openCount: 2,
    lastOpenedAt: iso(85, 19, 30),
    tags: ['tax'],
    attachments: [
      att('W-2-2025-Nakamura.pdf', PDF, 87_040, 'naka-2-a'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // per-5 · Lisa Park · Sr Solutions Architect @ Stripe
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-park-1',
    gmailMessageId: 'seed-gm-park-1',
    threadId: 'seed-th-park-1',
    contactId: 'per-5',
    fromEmail: 'l.park@stripe.com',
    fromName: 'Lisa Park',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Re: Any principal-level SA roles?',
    snippet: 'I\'m starting to look again. Would love anything principal-level, payments or fintech preferred. Updated resume attached.',
    bodyText: `Paul,

I'm starting to look again. Would love anything principal-level, payments or fintech preferred. Updated resume attached.

— Lisa`,
    receivedAt: iso(4, 16, 20),
    direction: 'from',
    readAt: iso(4, 17, 0),
    tags: ['active-search'],
    attachments: [
      att('Resume-Lisa-Park-2026.pdf', PDF, 168_960, 'park-1-a'),
    ],
  },
  {
    id: 'seed-em-park-2',
    gmailMessageId: 'seed-gm-park-2',
    threadId: 'seed-th-park-2',
    contactId: 'per-5',
    fromEmail: 'pwentzell64@gmail.com',
    fromName: 'Paul Wentzell',
    toEmails: ['l.park@stripe.com'],
    subject: 'Check-in',
    snippet: 'You still happy at Stripe? Haven\'t caught up in a minute.',
    bodyText: `Lisa,

You still happy at Stripe? Haven't caught up in a minute.

Paul`,
    receivedAt: iso(30, 12, 0),
    direction: 'to',
    readAt: iso(30, 12, 0),
    openCount: 1,
    lastOpenedAt: iso(29, 10, 0),
  },

  // ─────────────────────────────────────────────────────────────────────
  // Org-level seeds — threads tagged to the org (context) rather than a
  // specific person, e.g. MSA renewals and quarterly business reviews.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed-em-fid-org-1',
    gmailMessageId: 'seed-gm-fid-org-1',
    threadId: 'seed-th-fid-org-1',
    contactId: 'org-1',
    fromEmail: 'institutional@fidelity.com',
    fromName: 'Fidelity Institutional',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Q1 business review — placements + metrics',
    snippet: 'Attached the Q1 QBR deck. TL;DR: 3 placements, 1 in offer, cycle time down 18%. Board packet goes out Friday.',
    bodyText: `Paul,

Attached the Q1 QBR deck. TL;DR: 3 placements, 1 in offer, cycle time down 18%. Board packet goes out Friday.

— Fidelity Talent Ops`,
    receivedAt: iso(21, 10, 0),
    direction: 'from',
    readAt: iso(21, 11, 0),
    tags: ['qbr'],
    attachments: [
      att('Q1-Business-Review-Fidelity.pdf', PDF, 1_048_576, 'fid-org-1-a'),
    ],
  },
  {
    id: 'seed-em-stripe-org-1',
    gmailMessageId: 'seed-gm-stripe-org-1',
    threadId: 'seed-th-stripe-org-1',
    contactId: 'org-2',
    fromEmail: 'sales@stripe.com',
    fromName: 'Stripe Talent',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'MSA renewal — signed',
    snippet: 'Renewed MSA signed and attached. Same terms as last year with the new priority-tier SLA.',
    bodyText: `Paul,

Renewed MSA signed and attached. Same terms as last year with the new priority-tier SLA.

— Stripe Talent`,
    receivedAt: iso(58, 14, 0),
    direction: 'from',
    readAt: iso(58, 15, 0),
    tags: ['contract'],
    attachments: [
      att('MSA-Stripe-2026.pdf', PDF, 287_744, 'stripe-org-1-a'),
    ],
  },
  {
    id: 'seed-em-hubspot-org-1',
    gmailMessageId: 'seed-gm-hubspot-org-1',
    threadId: 'seed-th-hubspot-org-1',
    contactId: 'org-3',
    fromEmail: 'talent@hubspot.com',
    fromName: 'HubSpot Talent',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Referral bonus — Diana Reyes placement',
    snippet: 'Referral bonus cleared for the Diana Reyes placement. ACH lands Monday. Invoice attached for your records.',
    bodyText: `Paul,

Referral bonus cleared for the Diana Reyes placement. ACH lands Monday. Invoice attached for your records.

— HubSpot Talent Ops`,
    receivedAt: iso(170, 9, 30),
    direction: 'from',
    readAt: iso(170, 10, 0),
    archivedAt: iso(165, 10, 0), // Archived — settled transaction
    tags: ['billing'],
    attachments: [
      att('Invoice-HubSpot-Reyes.pdf', PDF, 94_208, 'hubspot-org-1-a'),
    ],
  },
  {
    id: 'seed-em-dj-org-1',
    gmailMessageId: 'seed-gm-dj-org-1',
    threadId: 'seed-th-dj-org-1',
    contactId: 'org-4',
    fromEmail: 'j.harford@dowjones.com',
    fromName: 'James Harford',
    toEmails: ['pwentzell64@gmail.com'],
    subject: 'Annual review — renewing for 2026',
    snippet: 'Renewal terms attached. Same volume commit, slight uplift on placement fee. Board meets Tuesday.',
    bodyText: `Paul,

Renewal terms attached. Same volume commit, slight uplift on placement fee. Board meets Tuesday — I'd like to have your counter back by Monday if possible.

— James`,
    receivedAt: iso(0, 7, 15),
    direction: 'from',
    readAt: null, // UNREAD
    tags: ['renewal', 'urgent'],
    attachments: [
      att('Renewal-Terms-2026.pdf', PDF, 145_408, 'dj-org-1-a'),
    ],
  },
];

/**
 * Final seed export = hand-crafted core threads (the 10 story contacts that
 * drive the product demo) + generated bulk threads covering the rest of the
 * 2026 recruiter book. The bulk generator lives in seed-emails-bulk.ts and
 * is stage-/vertical-/tag-driven so the content reads as real recruiting
 * correspondence rather than boilerplate.
 */
export const SEED_EMAILS: SeedEmail[] = [...CORE_EMAILS, ...BULK_EMAILS];

/**
 * Precomputed unread count map for the seed data, keyed by contactId.
 *
 * The contacts grid renders a badge per row for contacts with unread
 * emails (same HubSpot pattern where the list-view surfaces inbox
 * pressure without needing a second click). Computing this once as a
 * module-level Map is far cheaper than filtering the full SEED_EMAILS
 * array per-row on every render of a 100+ contact grid.
 *
 * Only incoming, non-archived messages with `readAt: null` count — the
 * same convention EmailsPanel uses for its header chip so the two
 * surfaces never disagree.
 */
/**
 * Store the unread email IDs per contact (not just counts) so that a
 * reactive store-backed override set can subtract the ones the user has
 * since opened. Counts alone aren't enough — we need to know WHICH emails
 * were originally unread to apply the override.
 */
const _unreadIdsByContact: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const e of SEED_EMAILS) {
    if (e.direction !== 'from') continue;
    if (e.readAt != null) continue;
    if (e.archivedAt != null) continue;
    const list = m.get(e.contactId);
    if (list) list.push(e.id);
    else m.set(e.contactId, [e.id]);
  }
  return m;
})();

/**
 * Raw (override-unaware) unread count for a contact. Kept so non-reactive
 * callers (server routes, tests) can still get a static number. UI surfaces
 * that need to clear when the user reads an email should use
 * `getUnreadCountForContact(id, overrides)` via the `useUnreadCountForContact`
 * hook instead — this one does NOT know about the store.
 */
export function getSeedUnreadCountForContact(contactId: string): number {
  return (_unreadIdsByContact.get(contactId) ?? []).length;
}

/**
 * Override-aware unread count. Subtracts any seed email IDs that the user
 * has opened (tracked in the contact-store's `emailReadOverrides` set).
 * This is what the UI should call so the tab badge + contacts-grid chips
 * clear the moment the user expands an unread email and stay cleared
 * across navigation.
 */
export function getUnreadCountForContact(
  contactId: string,
  readOverrides: ReadonlySet<string>,
): number {
  const ids = _unreadIdsByContact.get(contactId);
  if (!ids || ids.length === 0) return 0;
  if (readOverrides.size === 0) return ids.length;
  let count = 0;
  for (const id of ids) if (!readOverrides.has(id)) count++;
  return count;
}

/** Map view — seed-unread IDs keyed by contact. */
export function getSeedUnreadIdsMap(): ReadonlyMap<string, readonly string[]> {
  return _unreadIdsByContact;
}

/**
 * `true` if this contact has any seed email with attachments. Drives the
 * paperclip indicator in the contacts-grid "Unread" column — Paul's call
 * on 2026-04-27 ("show the new email tag and attachment to the email
 * column"). Seed-only today; for real Gmail-synced contacts the flag
 * needs to come from /api/contacts (extending the response with a
 * per-contact email-activity summary).
 */
export function hasSeedAttachmentForContact(contactId: string): boolean {
  for (const e of SEED_EMAILS) {
    if (e.contactId === contactId && Array.isArray(e.attachments) && e.attachments.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * `true` if this contact has any seed email received within the last
 * `withinMs` milliseconds. Same caveats as `hasSeedAttachmentForContact`
 * — seed-only signal until the API extension lands.
 */
export function hasRecentSeedEmailForContact(contactId: string, withinMs: number = 10 * 60 * 1000): boolean {
  const cutoff = Date.now() - withinMs;
  for (const e of SEED_EMAILS) {
    if (e.contactId === contactId && new Date(e.receivedAt).getTime() >= cutoff) {
      return true;
    }
  }
  return false;
}

/**
 * Return the email rows for a given contact, shaped like the API DTO
 * consumed by EmailsPanel (EmailRow). Sort order matches the API: pinned
 * first, then most-recent first.
 *
 * When `readOverrides` is supplied, any seed email with `readAt: null`
 * whose id is in the override set is returned as "read" (readAt stamped
 * with a sentinel ISO). This makes the Emails tab respect the user's
 * reads across navigation — without it, re-opening the contact would
 * re-surface every read email as unread.
 */
export function getSeedEmailsForContact(
  contactId: string,
  readOverrides?: ReadonlySet<string>,
) {
  const rows = SEED_EMAILS.filter((e) => e.contactId === contactId);
  return rows
    .map((e) => {
      const overridden = readOverrides && e.readAt == null && readOverrides.has(e.id);
      return {
        id: e.id,
        gmailMessageId: e.gmailMessageId,
        threadId: e.threadId,
        fromEmail: e.fromEmail,
        fromName: e.fromName,
        toEmails: e.toEmails,
        subject: e.subject,
        snippet: e.snippet,
        bodyText: e.bodyText,
        receivedAt: e.receivedAt,
        direction: e.direction,
        readAt: overridden ? new Date().toISOString() : (e.readAt ?? null),
        openCount: e.openCount ?? 0,
        lastOpenedAt: e.lastOpenedAt ?? null,
        clickCount: e.clickCount ?? 0,
        lastClickedAt: e.lastClickedAt ?? null,
        archivedAt: e.archivedAt ?? null,
        pinnedAt: e.pinnedAt ?? null,
        tags: e.tags ?? [],
        attachments: e.attachments ?? [],
      };
    })
    .sort((a, b) => {
      const aP = a.pinnedAt ? Date.parse(a.pinnedAt) : 0;
      const bP = b.pinnedAt ? Date.parse(b.pinnedAt) : 0;
      if (aP !== bP) return bP - aP;
      return a.receivedAt < b.receivedAt ? 1 : -1;
    });
}
