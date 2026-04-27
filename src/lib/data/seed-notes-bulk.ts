import { Note } from '@/types/note';

/**
 * Rich book-of-business notes for the bulk contacts (org-5..org-21, per-9..per-112).
 * These mirror the tone and structure of seed-notes.ts so the Activity feed on
 * every major contact reads like an established recruiter relationship — repeat
 * intake calls, candidate submissions, interview debriefs, offer negotiations,
 * placements, and follow-on requests.
 *
 * Dates are anchored to the seed "today" of 2026-04-22. Authors and colors
 * are reused across files so the feed looks consistent.
 */

// ─── Authors ──────────────────────────────────────────────────────────────
const PW = { author: 'Paul Wentzell',  authorInitials: 'PW', authorColor: '#D4A61A', location: 'Portsmouth Branch' } as const;
const DH = { author: 'Dexter Howell',  authorInitials: 'DH', authorColor: '#3BAFC4', location: 'Portsmouth Branch' } as const;
const JP = { author: 'Janet Parker',   authorInitials: 'JP', authorColor: '#6A0FB8', location: 'ESI Boston' } as const;
const AH = { author: 'Antonia Hopkins',authorInitials: 'AH', authorColor: '#D96FA8', location: 'ESI East' } as const;
const MP = { author: 'Mercedes Paul',  authorInitials: 'MP', authorColor: '#247A8A', location: 'ESI Boston' } as const;
// Desk-specialist recruiters who only appear in bulk notes
const KA = { author: 'Keisha Alvarado',authorInitials: 'KA', authorColor: '#2563EB', location: 'Portsmouth Branch' } as const;
const RC = { author: 'Rhonda Chase',   authorInitials: 'RC', authorColor: '#DC2626', location: 'ESI Boston' } as const;
const NB = { author: 'Nolan Briggs',   authorInitials: 'NB', authorColor: '#16A34A', location: 'Portsmouth Branch' } as const;
const TY = { author: 'Trevor Yates',   authorInitials: 'TY', authorColor: '#EA580C', location: 'ESI East' } as const;

type AuthorInfo = typeof PW;
type NoteSpec = {
  id: string;
  contactId: string;
  author: AuthorInfo;
  body: string;
  tags: Note['tags'];
  noteType?: Note['noteType'];
  createdAt: string;
  pinned?: boolean;
};

const N = (s: NoteSpec): Note => ({
  id: s.id,
  contactId: s.contactId,
  author: s.author.author,
  authorInitials: s.author.authorInitials,
  authorColor: s.author.authorColor,
  location: s.author.location,
  body: s.body,
  pinned: s.pinned ?? false,
  tags: s.tags,
  noteType: s.noteType,
  createdAt: s.createdAt,
});

export const BULK_NOTES: Note[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // ORG-5 — MASS GENERAL BRIGHAM (healthcare anchor client)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-mgb-1', contactId: 'org-5', author: PW, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 10:15 AM',
    body: 'Quarterly account review with Karen O\'Brien, Andrea Kowalski, and Dr. Chen. MGB confirmed 18 open RN reqs across MGH + Brigham for the summer surge; they want us running retained on 6 specialty roles (NICU × 2, OR × 2, ICU × 2) and contingent on the rest. $49,500 fee for the Whitaker director search still outstanding — Karen said AP is reissuing this week after the PO number fix.' }),
  N({ id: 'bn-mgb-2', contactId: 'org-5', author: KA, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 17, 2026 2:30 PM',
    body: 'Andrea Kowalski walked me through the revised allied-health hiring plan. MGB is backfilling 14 positions from the Epic go-live attrition — PT, OT, RT, and pharmacy tech. Contingent at 20% of base, net-30. I pushed back on their original 60-day guarantee ask; we landed at 90 days (our standard).' }),
  N({ id: 'bn-mgb-3', contactId: 'org-5', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 15, 2026 11:05 AM',
    body: 'Sent the Amara Johnson oncology CNS slate to Dr. Chen — strong response. He wants to bring her in for a panel with the Dana-Farber collab lead, but she\'s passive and won\'t move without a $20K comp bump. Karen approved the stretch; coordinating interview logistics.' }),
  N({ id: 'bn-mgb-4', contactId: 'org-5', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 12, 2026 3:45 PM',
    body: 'Placement check-in: Brandon Tillman (OR RN) started Apr 6 at Brigham. Day-7 call with his preceptor was positive — scrub/circulate rotation going well, he\'s already signed up for the robotics cross-train in May. 90-day guarantee ticking; will follow up at day-30.' }),
  N({ id: 'bn-mgb-5', contactId: 'org-5', author: KA, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 8, 2026 9:00 AM',
    body: 'In-person intake at 399 Revolution Dr. Dr. Chen walked through the NICU expansion (10 beds adding Q3). Requirements: RNC-NIC preferred, 3+ yrs Level III/IV NICU, Magnet-hospital background. Omar Khouri and one other Boston Children\'s RN are top of mind — Omar already submitted last week.' }),
  N({ id: 'bn-mgb-6', contactId: 'org-5', author: PW, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 3, 2026 4:20 PM',
    body: 'MSA renewal for 2027 is on Karen\'s desk. She wants to add an RPO-light addendum for allied health (sourcing + screening only, they handle offers). Proposed 10% of first-year base, minimum 6-month commitment. Legal review targeted for May.' }),
  N({ id: 'bn-mgb-7', contactId: 'org-5', author: KA, tags: ['Cold Call'], noteType: 'Sales',
    createdAt: 'Mar 28, 2026 1:15 PM',
    body: 'Cold outreach into Salem Hospital (MGB community-hospital affiliate) — they have a Nursing Director vacancy. Left voicemail with their CNO, followed up via email. Karen confirmed it\'s okay for us to pursue under the master MSA since Salem rolls up to MGB now.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-6 — MODERNA (biotech anchor)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-mod-1', contactId: 'org-6', author: PW, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 21, 2026 11:30 AM',
    body: 'Met with Rachel Finkelstein and her ops lead Chris Ayala. Moderna is standing up an mRNA oncology unit — 22 hires planned for H2, mix of CRAs, biostat, regulatory, and formulation scientists. Retained on 4 senior roles at 25%; contingent at 22% for the rest. JD for the Senior CRA mRNA Oncology role uploaded to Documents.' }),
  N({ id: 'bn-mod-2', contactId: 'org-6', author: KA, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 19, 2026 2:00 PM',
    body: 'Interview debrief with Rachel on Anastasia Kuznetsova (Principal Scientist, mRNA formulation). Panel scored her strong on technical (9/10) and culture (8/10). Concern: she\'s on a 60-day notice at Alnylam and their IP non-compete. Legal is reviewing scope — Rachel wants to move to offer if it clears.' }),
  N({ id: 'bn-mod-3', contactId: 'org-6', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 16, 2026 10:45 AM',
    body: 'Sent Chris Ayala the CRA/CRC slate (Sophia Nguyen PhD, Yolanda Pritchard, Joaquín Herrera). Chris prefers Sophia for the senior CRA slot — oncology background + Veeva CTMS fluency is exactly their stack. Phone screen scheduled Apr 23.' }),
  N({ id: 'bn-mod-4', contactId: 'org-6', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 11, 2026 3:00 PM',
    body: 'Rachel called to flag a freeze on the regulatory director search — internal candidate surfaced. She was apologetic; we agreed to pause the retainer and reactivate if internal falls through. No fee adjustment needed per Section 4.2 of the MSA.' }),
  N({ id: 'bn-mod-5', contactId: 'org-6', author: KA, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 4, 2026 9:30 AM',
    body: 'Tour of the Binney St. lab space with Chris and the head of CMC. Culture observation: very cross-functional, scientists sit in pods with regulatory and QA. Worth emphasizing to candidates who\'ve struggled in siloed biotech environments (e.g., big-pharma defectors).' }),
  N({ id: 'bn-mod-6', contactId: 'org-6', author: PW, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 25, 2026 4:00 PM',
    body: 'Congrats email from Rachel — our placement Anusha Mehta (Sr. Biostatistician, placed Dec 2025) was just promoted to Associate Director. Good referral leverage; asked Rachel if she\'d be willing to be a reference for future Moderna candidates. She said yes.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-7 — PFIZER (newer client, ramping)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-pfz-1', contactId: 'org-7', author: PW, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 14, 2026 1:00 PM',
    body: 'First in-person with Monica Delacroix at 66 Hudson. Commercial org is restructuring — she owns 11 reqs across medical affairs, market access, and US oncology marketing. Retained MSA countersigned last month; first engagement (Director, Oncology Marketing) just kicked off.' }),
  N({ id: 'bn-pfz-2', contactId: 'org-7', author: KA, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 9, 2026 11:20 AM',
    body: 'Sent Monica the first 3-candidate slate for the Director role. She\'s lukewarm on candidate #1 (too agency-heavy), hot on #2 (in-house pharma marketing + patient advocacy exp). Arranging panel interviews for week of Apr 27.' }),
  N({ id: 'bn-pfz-3', contactId: 'org-7', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 2, 2026 10:15 AM',
    body: 'Monica mentioned Pfizer is running a vendor consolidation — currently using 8 search firms, targeting to narrow to 3 by EOY. We\'re on the shortlist thanks to the MGB reference. Need to show placement velocity on this first search to stay on the list.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-8 — MEDTRONIC (dormant, nurture)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-mdt-1', contactId: 'org-8', author: NB, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 6, 2026 3:30 PM',
    body: 'Quarterly check-in email to Jeffrey Lindqvist in Minneapolis. Medtronic engineering hiring is flat Q2 — he\'s holding headcount pending the cardiovascular division\'s reorg announcement in May. Asked to reconnect late May. No active reqs.' }),
  N({ id: 'bn-mdt-2', contactId: 'org-8', author: NB, tags: ['Phone Call'], noteType: 'General',
    createdAt: 'Mar 15, 2026 2:00 PM',
    body: 'Jeffrey mentioned our Q4 placement (Sr. Firmware Eng) is crushing it — promoted to tech lead. Good relationship capital. He\'s going to introduce me to his counterpart in the Neurovascular BU next month.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-9 — ANTHROPIC (VIP tech client, highest-profile)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-ant-1', contactId: 'org-9', author: PW, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 22, 2026 9:00 AM',
    body: 'Early-morning call with Taylor Ng. Anthropic closed the Head of Research Ops placement (invoice #1053 — PAID). Taylor is now briefing 3 new searches: Senior Research Scientist (Alignment), Research Engineering Manager, and Head of RL. All retained at 25%, all Bay Area or NYC, all need to close by EOQ. JDs landing today.' }),
  N({ id: 'bn-ant-2', contactId: 'org-9', author: NB, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 18, 2026 4:30 PM',
    body: 'Debrief with Taylor on the Senior Research Scientist slate. Ethan Park (Meta AI, RLHF specialist) advanced to final — ML interview scored 8.5/10, research taste panel scored 9/10. Ravi Narayan (DeepMind) declined to move forward, staying at Google. Sourcing replacement this week.' }),
  N({ id: 'bn-ant-3', contactId: 'org-9', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 15, 2026 1:00 PM',
    body: 'Priscilla Okafor wants us to help on 4 Applied AI roles (solutions eng + customer eng). Contingent, 22%. She\'s seeing softness in the passive ML candidate pool — everyone\'s anchored to big-tech comp, which Anthropic is now competitive on post-Series G. Slate due Apr 29.' }),
  N({ id: 'bn-ant-4', contactId: 'org-9', author: NB, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 10, 2026 10:30 AM',
    body: 'Sent Taylor the alignment-scientist longlist (11 names, all PhD, all with published safety work). Top 5 are being outreached this week. Flagging Sofia Restrepo too — she\'s a systems/infra candidate but has interesting alignment-adjacent work on verifiable ML.' }),
  N({ id: 'bn-ant-5', contactId: 'org-9', author: PW, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 1, 2026 11:00 AM',
    body: 'Dinner with Taylor at Mourad (SF). Anthropic is expecting to hire ~400 people in 2026, ~60% of which are research + engineering roles. Our current allocation is 8 reqs — ambition is to 3x that by Q3. Need to prove volume on the current cohort.' }),
  N({ id: 'bn-ant-6', contactId: 'org-9', author: PW, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 20, 2026 2:45 PM',
    body: 'Anthropic invited us to their internal recruiter offsite May 8 (Napa). Taylor extended the invite as a "VIP agency partner" — confirmed attending. Will also be a chance to meet the Claude.ai product recruiting team who we haven\'t worked with yet.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-10 — SNOWFLAKE
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-snw-1', contactId: 'org-10', author: NB, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 13, 2026 10:00 AM',
    body: 'Dmitri Volkov (Staff TR, Platform) briefed me on 3 Senior SRE reqs for their data-cloud infra team. Remote-friendly, base $220-260K + equity. Targets: Kubernetes + Terraform + incident-response rigor. Nikolai Petrov submitted — Dmitri liked the resume.' }),
  N({ id: 'bn-snw-2', contactId: 'org-10', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 7, 2026 3:15 PM',
    body: 'Dmitri pushed back on my $240K floor for Nikolai — Snowflake\'s internal band tops at $245K for Senior SRE. Going back to candidate to check flex on base if equity is strong (usually $120-180K at Snowflake\'s stage).' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-11 — DATADOG
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-ddg-1', contactId: 'org-11', author: NB, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 3:00 PM',
    body: 'Hannah Bergstrom moved forward to final round with Heather Nolan (Eng Director — Observability). Hannah\'s VP loved Heather\'s OpenTelemetry depth. Offer expected week of Apr 27 — need to prep Heather for comp conversation (her floor is $420K all-in, Datadog band is $380-450K).' }),
  N({ id: 'bn-ddg-2', contactId: 'org-11', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 11, 2026 11:45 AM',
    body: 'Hannah briefed 2 additional Staff SWE roles on the observability pipelines team. Go/Rust preferred, working on trace-aggregation performance. Looking for people who can onboard fast — target start Q3.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-12 — FIGMA
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-fig-1', contactId: 'org-12', author: NB, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 8, 2026 2:30 PM',
    body: 'Kelsey Broussard (Design Recruiting Lead) shared the 2026 design hiring plan. 6 senior/staff product designers, 2 design eng, 1 design leadership role (Head of Design — Communications). Warm intro to Kwame Adebayo (Stripe Head of Design) queued for the leadership slot.' }),
  N({ id: 'bn-fig-2', contactId: 'org-12', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Mar 30, 2026 1:10 PM',
    body: 'Kelsey asked about our fee structure for design leadership vs. IC. Quoted 25% retained for director+, 20% contingent for IC. She\'s getting internal approval on the retainer structure for the Head of Design search.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-13 — GOLDMAN SACHS (RPO engagement)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-gs-1', contactId: 'org-13', author: TY, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 9:30 AM',
    body: 'Alistair Penrose renewed the RPO engagement for H1 2026 — 15% per placement, 6-month commitment, 18 target hires in their Technology Recruiting program. Invoice #1067 ($81,000 first-tranche) is sitting with AP. Alistair said it clears this week.' }),
  N({ id: 'bn-gs-2', contactId: 'org-13', author: TY, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 14, 2026 11:00 AM',
    body: 'Weekly RPO sync with Alistair\'s team. Submitted 14 candidates last week across Java, Python quant dev, and cloud eng. 3 advanced to onsite, 2 offered, 1 accepted (starts May 12). Velocity is on track for the 18-hire target.' }),
  N({ id: 'bn-gs-3', contactId: 'org-13', author: TY, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 6, 2026 3:45 PM',
    body: 'Alistair flagged that GS is adding a fixed-income quant search — retained, separate from the RPO, fee will come in around $120K at 25% of expected comp. Alexander Rothstein (Morgan Stanley) was the first name he mentioned. Already in our pipeline as a sourced candidate.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-14 — BLACKROCK
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-bx-1', contactId: 'org-14', author: TY, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 16, 2026 2:15 PM',
    body: 'Vanessa Shapiro (VP Aladdin Eng Talent) walked through Q2 hiring: 8 SWE roles focused on the Aladdin risk engine and portfolio-analytics APIs. Tough technical bar (LeetCode hard + systems design). Contingent 22%. First slate due Apr 30.' }),
  N({ id: 'bn-bx-2', contactId: 'org-14', author: TY, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 4, 2026 10:00 AM',
    body: 'Vanessa shared BlackRock\'s updated leveling doc (IC1-IC6). Helpful for comp mapping — their IC4 bands to Senior SWE at most peers but they want near-staff experience. Adjusting candidate targeting accordingly.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-15 — SCHWAB (prospect, not yet contracted)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-sch-1', contactId: 'org-15', author: TY, tags: ['Cold Call'], noteType: 'Sales',
    createdAt: 'Apr 2, 2026 11:30 AM',
    body: 'Intro call with Gregory Mwangi (Dir Talent, Advisor Services). Schwab uses 4 incumbents for advisor recruiting — we\'re pitching to be added as #5. Gregory wants a sample slate of 3 senior advisors in TX/CO before committing to a trial engagement.' }),
  N({ id: 'bn-sch-2', contactId: 'org-15', author: TY, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Mar 22, 2026 4:00 PM',
    body: 'Sent Gregory the fee schedule + MSA template. He asked about benchmarking — shared our win-rate data (38% YTD) and avg time-to-fill on advisor roles (47 days). Ball in his court; next touch late April.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-16 — SIDLEY AUSTIN (legal anchor)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-sid-1', contactId: 'org-16', author: PW, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 21, 2026 3:30 PM',
    body: 'Lateral partner meeting with Robert Goldstein and the M&A practice chair. Sidley is targeting 8 lateral partners in 2026 — corporate, tax, capital markets, and IP. Our exclusive on the M&A chair is live; Rebecca Feinstein (Wachtell) is the top target. Retainer installment 1 of 3 invoiced ($45K).' }),
  N({ id: 'bn-sid-2', contactId: 'org-16', author: RC, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 17, 2026 10:00 AM',
    body: 'Lateral partner questionnaire completed for Rebecca Feinstein. Book of business is $4.2M portable (conservative), 60% committed commitments. Conflicts check in progress with Sidley\'s NY office — no flags expected, her book is mostly PE buy-side work that Sidley doesn\'t currently cover.' }),
  N({ id: 'bn-sid-3', contactId: 'org-16', author: RC, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 10, 2026 2:45 PM',
    body: 'Elena Vasquez (Assoc Recruiting Mgr, NYC) briefed 4 senior associate reqs — 2 M&A, 1 tax, 1 litigation. All 2027 class. Contingent 22%. Rebecca\'s hire would set up natural follow-on associate pulls from Wachtell.' }),
  N({ id: 'bn-sid-4', contactId: 'org-16', author: RC, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 3, 2026 9:15 AM',
    body: 'Robert asked for references on our lateral partner track record. Sent anonymized case studies from 3 prior placements (K&E partner to Latham, Cravath to Paul Weiss, WLRK to Sullivan). He forwarded to the firm\'s lateral hiring committee.' }),
  N({ id: 'bn-sid-5', contactId: 'org-16', author: RC, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Mar 27, 2026 1:00 PM',
    body: 'Visited Sidley Chicago — tour with Robert. Met 5 partners across M&A and finance. Useful context: they\'re trying to rebuild the Chicago M&A bench after losing 3 partners to K&E in 2024. Strong cultural pitch: collegial, less eat-what-you-kill than peers.' }),
  N({ id: 'bn-sid-6', contactId: 'org-16', author: PW, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 12, 2026 11:20 AM',
    body: 'Robert confirmed Sidley is renewing our lateral-partner engagement for 2026 ($540K total retainer across 4 searches). Signed SOW pending. First search (M&A NY) kicking off this week.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-17 — KIRKLAND & ELLIS
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-ke-1', contactId: 'org-17', author: RC, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 16, 2026 4:00 PM',
    body: 'Nathaniel Burke (Sr Dir Paralegal & Staff Recruiting) briefed a 7-role paralegal hiring push — corporate and capital markets focus, Chicago + NY. Contingent 18% (K&E\'s standard for staff roles). Ian Sokolowski submitted — Nathaniel flagged him as "exactly the profile."' }),
  N({ id: 'bn-ke-2', contactId: 'org-17', author: RC, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 5, 2026 2:30 PM',
    body: 'Nathaniel asked about volume discount if we hit 5+ placements in the engagement. Proposed 18% standard, stepping to 16% after 4 hires. He\'s taking it to finance for approval.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-18 — CATERPILLAR (manufacturing anchor)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-cat-1', contactId: 'org-18', author: DH, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 10:00 AM',
    body: 'On-site at Caterpillar Decatur with Lindsey Carter and plant leadership. 12 skilled trades roles (welders, machinists, millwrights) for the Q3 production ramp. Contingent 20% on journey-level, $8K flat on apprentices. Tight market — Wichita and Peoria competing for same candidate pool.' }),
  N({ id: 'bn-cat-2', contactId: 'org-18', author: DH, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 15, 2026 1:30 PM',
    body: 'Interview debrief with Lindsey on Roland Kosinski (Plant Manager candidate from John Deere). Panel loved the lean manufacturing depth and union-environment experience. Offer prep underway — target: $220K base + 30% STI + relocation package.' }),
  N({ id: 'bn-cat-3', contactId: 'org-18', author: DH, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 11, 2026 11:15 AM',
    body: 'Manuel Ortega (Dir Skilled Trades Recruiting, Irving TX) added 4 CNC machinist roles for the aerospace components plant. AS9100 experience required. Miguel Acosta (Textron) submitted — 5-axis + aerospace tolerances fit perfectly.' }),
  N({ id: 'bn-cat-4', contactId: 'org-18', author: DH, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 6, 2026 3:00 PM',
    body: 'Lindsey asked us to add Derek Holcomb (laid off from closed plant) to the manufacturing engineer search. He\'s sharp on robotics and PLC integration — Caterpillar\'s automation initiative is exactly where he\'d fit. Submitting this week.' }),
  N({ id: 'bn-cat-5', contactId: 'org-18', author: DH, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Mar 31, 2026 9:30 AM',
    body: 'Quarterly review with Lindsey. 2026 YTD: 7 placements, $218K in fees. She\'s the highest-velocity client we have outside of Goldman RPO. Renewed our preferred-vendor status and added us to the Peoria plant\'s approved list.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-19 — BOEING (security clearance roles, prospect)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-boe-1', contactId: 'org-19', author: DH, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Mar 28, 2026 2:00 PM',
    body: 'Dana Whitfield (Sr Mgr Cleared TA) briefed 6 cleared-engineer roles — Secret minimum, TS/SCI preferred. Contingent 22% on cleared talent. Our cleared-candidate pipeline is thin; may need to sub with a specialist partner. Flagged to Paul.' }),
  N({ id: 'bn-boe-2', contactId: 'org-19', author: DH, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Mar 10, 2026 4:30 PM',
    body: 'Dana sent over the cleared-hiring SOW draft. Clearance verification workflow requires us to run FSO through Boeing\'s approved vendor. Standard 90-day guarantee, 30-day replacement on cleared roles. Legal reviewing.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-20 — VERTEX ANALYTICS (existing core client, engineering)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-vx-1', contactId: 'org-20', author: NB, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 18, 2026 11:00 AM',
    body: 'Met with Devon Halstrom (VP Eng) in NYC. Vertex is expanding the data-platform team — 3 Senior Data Engineer reqs. Devon wants Snowflake + dbt + Airflow stack fluency. Aisha Rahman (Okta) submitted; her Okta data-platform work is a direct analog.' }),
  N({ id: 'bn-vx-2', contactId: 'org-20', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 9, 2026 2:30 PM',
    body: 'Devon requested a rewrite of the role JD — he wants to de-emphasize years of experience and focus on specific project outcomes. Collaborating with his EM on the new draft. Re-post targeted for Apr 21.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // ORG-21 — MERIDIAN CAPITAL (longtime client, Jennifer Morrison placed)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-mer-1', contactId: 'org-21', author: PW, pinned: true, tags: ['High Priority'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 4:45 PM',
    body: 'Sloan Pemberton (COO) called to thank us for the Jennifer Morrison placement — she\'s crushing it at day-70, already rebuilt the compliance workflow and onboarded a new senior compliance analyst. Invoice #1058 ($144,750) cleared Feb 20. Sloan wants to talk about a VP of HR search next.' }),
  N({ id: 'bn-mer-2', contactId: 'org-21', author: TY, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 14, 2026 10:30 AM',
    body: 'Angela Farhi (VP People Ops) walked through the VP of HR search requirements. Meridian needs someone who can build a real HR function (they\'ve been running with a fractional partner). 14 years experience, PE or financial services background, team-of-8 leadership exp. Retained 25%.' }),
  N({ id: 'bn-mer-3', contactId: 'org-21', author: TY, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 7, 2026 3:00 PM',
    body: 'Kickoff for the VP HR search. Angela and Sloan in the room. Top target profile: senior HR leader from a midsize PE-backed company. Nadia Whitfield-Ajani (Wayfair, Total Rewards bent) surfaced — adjacent profile, worth a tap.' }),
  N({ id: 'bn-mer-4', contactId: 'org-21', author: PW, tags: ['Email'], noteType: 'General',
    createdAt: 'Feb 28, 2026 2:15 PM',
    body: 'Formal placement complete: Jennifer Morrison started Feb 12 as VP Compliance. $285K base + 40% bonus + $180K sign-on. First-year comp = $579K. Fee = 25% = $144,750. Placement contract, offer letter, and I-9 filed to Documents. 60-day guarantee ticking to Apr 13.' }),
  N({ id: 'bn-mer-5', contactId: 'org-21', author: PW, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Jan 28, 2026 11:00 AM',
    body: 'Offer negotiation call with Jennifer + Sloan. Jennifer counter-offered on sign-on ($200K asked, $180K final) and pushed for 4 weeks PTO (Meridian standard is 3, Sloan approved exception). Verbal accepted Jan 30; paper goes out today.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // HIRING-MANAGER NOTES (per-9 through per-32)
  // ═══════════════════════════════════════════════════════════════════════

  // per-9 Karen O'Brien — VP HR @ MGB
  N({ id: 'bn-p9-1', contactId: 'per-9', author: PW, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 4:00 PM',
    body: 'Karen is frustrated with a competing agency\'s last slate quality — used it as the opening to lock us in for the 6 retained RN roles. She asked for a written engagement summary by EOW.' }),
  N({ id: 'bn-p9-2', contactId: 'per-9', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 12, 2026 9:30 AM',
    body: 'Karen approved the Amara Johnson comp stretch ($20K over band). She values nurse-leader retention and is willing to pay for proven performers — pattern to remember for future MGB exec searches.' }),
  N({ id: 'bn-p9-3', contactId: 'per-9', author: KA, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 1, 2026 10:15 AM',
    body: 'Karen\'s quarterly talent report to the MGB board is due Apr 30. She asked for a data sheet: our placements, time-to-fill, 90-day retention. Compiling now — retention is 94% over trailing 12 months, strong story.' }),

  // per-10 Michael Chen, MD — Director of Nursing MGH
  N({ id: 'bn-p10-1', contactId: 'per-10', author: KA, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 8, 2026 1:30 PM',
    body: 'Dr. Chen walked the NICU unit with me. He\'s specifically impressed by candidates who have trauma-informed care training — will prioritize in the slate scoring. Adding that filter to the screening rubric.' }),
  N({ id: 'bn-p10-2', contactId: 'per-10', author: KA, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 3, 2026 2:00 PM',
    body: 'Dr. Chen liked Omar Khouri\'s phone screen. Moving to panel — he\'ll bring in 2 charge nurses and the unit educator. Target onsite: Apr 28.' }),

  // per-11 Andrea Kowalski — Talent Acquisition MGB
  N({ id: 'bn-p11-1', contactId: 'per-11', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 19, 2026 11:00 AM',
    body: 'Andrea flagged that 3 of our submitted candidates were previously in MGB\'s ATS — she wants us to pre-check against their system before submitting. Getting API access via their TA ops team.' }),
  N({ id: 'bn-p11-2', contactId: 'per-11', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 13, 2026 3:45 PM',
    body: 'Andrea shared the allied-health JD standard template — more structured than what I\'d worked off before. Using it as the template going forward for all MGB contingent roles.' }),

  // per-12 Rachel Finkelstein — Clinical Talent Moderna
  N({ id: 'bn-p12-1', contactId: 'per-12', author: KA, pinned: true, tags: ['High Priority', 'Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 2:30 PM',
    body: 'Rachel wants to accelerate the Anastasia Kuznetsova offer — she\'s worried Alnylam will counter. Target: get her paper by Apr 29. Comp proposed: $265K + 25% bonus + $125K RSUs over 4 years. Needs Chris\'s sign-off by EOD.' }),
  N({ id: 'bn-p12-2', contactId: 'per-12', author: KA, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 15, 2026 11:30 AM',
    body: 'Rachel shared her H2 clinical-hiring forecast — 14 additional CRAs across oncology, RSV, and rare disease programs. Wants to lock us in for the oncology stream (4 of 14). Retainer discussion next week.' }),
  N({ id: 'bn-p12-3', contactId: 'per-12', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 2, 2026 9:00 AM',
    body: 'Rachel pushed back on Yolanda Pritchard — she\'s CRO-side (PPD), Rachel wants sponsor-side CRAs. Adjusting sourcing focus to pull from BMS, Regeneron, Vertex Pharma.' }),

  // per-13 Chris Ayala — Clinical Ops Moderna
  N({ id: 'bn-p13-1', contactId: 'per-13', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 16, 2026 11:45 AM',
    body: 'Chris prefers Sophia Nguyen for the senior CRA slot. Wants to fast-track — skip phone screen, straight to hiring manager panel. Scheduled Apr 23.' }),
  N({ id: 'bn-p13-2', contactId: 'per-13', author: KA, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 25, 2026 4:15 PM',
    body: 'Chris is Rachel\'s deputy and handles day-to-day on 8-10 open reqs at a time. Less formal than Rachel — prefers Slack/text to email for quick asks. Comm preference noted.' }),

  // per-14 Monica Delacroix — Pfizer Commercial
  N({ id: 'bn-p14-1', contactId: 'per-14', author: KA, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 14, 2026 1:30 PM',
    body: 'Monica is our champion at Pfizer — she pushed for our retainer against the 3 incumbent agencies. Need to over-deliver on this first search. She mentioned her director in oncology marketing will be her main interviewer — align the slate accordingly.' }),

  // per-15 Jeffrey Lindqvist — Medtronic Eng Talent
  N({ id: 'bn-p15-1', contactId: 'per-15', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 6, 2026 3:30 PM',
    body: 'Jeffrey is frozen on headcount until the CV division reorg is announced mid-May. No new reqs in Q2. He\'ll reintroduce us to Neurovascular BU in June.' }),

  // per-16 Taylor Ng — Anthropic Research Recruiting
  N({ id: 'bn-p16-1', contactId: 'per-16', author: PW, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 22, 2026 9:15 AM',
    body: 'Taylor is our VIP at Anthropic. Shares JDs + leveling docs openly, communicates via Slack Connect, expects 48-hour slate turnaround. Key insight: she prioritizes research taste over publication count — don\'t over-index on h-index.' }),
  N({ id: 'bn-p16-2', contactId: 'per-16', author: NB, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 18, 2026 4:00 PM',
    body: 'Taylor flagged Ethan Park (Meta AI) as a strong match. RLHF background + production ML = exactly the shape of the Senior Research Scientist (Alignment) role. Moving fast — final round targeted Apr 30.' }),
  N({ id: 'bn-p16-3', contactId: 'per-16', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 10, 2026 11:00 AM',
    body: 'Taylor shared Anthropic\'s research-scientist leveling doc. L5 is staff-equivalent, L6 is principal. Ethan\'s profile maps to high L5 / low L6. Compensation: $425-500K base + significant equity tranche.' }),

  // per-17 Priscilla Okafor — Anthropic Applied AI
  N({ id: 'bn-p17-1', contactId: 'per-17', author: NB, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 15, 2026 1:30 PM',
    body: 'Priscilla\'s 4 Applied AI roles are more commercial (customer eng + solutions eng) than Taylor\'s research side. Different interviewing bar — less research taste, more product + customer empathy + technical communication.' }),

  // per-18 Dmitri Volkov — Snowflake Platform TR
  N({ id: 'bn-p18-1', contactId: 'per-18', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 7, 2026 3:30 PM',
    body: 'Dmitri\'s band cap of $245K on Senior SRE is the blocker for Nikolai Petrov. Going back to Nikolai with equity-heavy structure — Snowflake RSUs at current price are material.' }),

  // per-19 Hannah Bergstrom — Datadog EM
  N({ id: 'bn-p19-1', contactId: 'per-19', author: NB, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 19, 2026 3:15 PM',
    body: 'Hannah moved Heather Nolan (Eng Director) to final. Datadog\'s director band is $380-450K all-in. Heather\'s floor is $420K — deal-able. Offer prep call scheduled Apr 25.' }),
  N({ id: 'bn-p19-2', contactId: 'per-19', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 11, 2026 12:00 PM',
    body: 'Hannah wants 2 additional Staff SWE hires in observability pipelines. Trace aggregation + high-throughput. Go or Rust experience required. Kicks off Apr 21.' }),

  // per-20 Kelsey Broussard — Figma Design Recruiting
  N({ id: 'bn-p20-1', contactId: 'per-20', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Mar 30, 2026 1:30 PM',
    body: 'Kelsey is pricing our retainer vs. Shapiro Negotiations\' fixed-fee structure. We\'re 2-3% more expensive but she likes the depth of our design-leader network. Should close on retainer within 2 weeks.' }),

  // per-21 Alistair Penrose — Goldman RPO lead
  N({ id: 'bn-p21-1', contactId: 'per-21', author: TY, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 10:00 AM',
    body: 'Alistair is the single most important relationship in the book of business after Paul\'s personal clients. RPO extension locked in through Dec 2026. He values velocity + data — weekly metrics dashboard is non-negotiable.' }),
  N({ id: 'bn-p21-2', contactId: 'per-21', author: TY, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 14, 2026 11:30 AM',
    body: 'Alistair\'s team likes our cadence — 14 submits last week, 2 hires. He mentioned GS has capacity to hire an additional 6 roles beyond the RPO scope if we bring pre-vetted candidates. Opening for opportunistic submissions.' }),

  // per-22 Vanessa Shapiro — BlackRock Aladdin
  N({ id: 'bn-p22-1', contactId: 'per-22', author: TY, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 16, 2026 2:30 PM',
    body: 'Vanessa\'s technical bar is notoriously high. Suggested adjusting our intake screen to include a 45-min systems design question. She offered to train one of our sourcers on Aladdin-specific interviewing patterns — accepted.' }),

  // per-23 Gregory Mwangi — Schwab (prospect)
  N({ id: 'bn-p23-1', contactId: 'per-23', author: TY, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 2, 2026 12:00 PM',
    body: 'Gregory\'s trial-engagement decision depends on the sample slate quality. Three target advisors identified (TX, CO, AZ). Time-to-complete: 2 weeks. High-stakes — this is the foot in the door at Schwab.' }),

  // per-24 Robert Goldstein — Sidley Lateral Partner
  N({ id: 'bn-p24-1', contactId: 'per-24', author: RC, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 21, 2026 4:00 PM',
    body: 'Robert is deal-driven — he responds to specific named candidates, not general pitches. Always lead with a name + book of business estimate. Rebecca Feinstein has his full attention right now.' }),
  N({ id: 'bn-p24-2', contactId: 'per-24', author: RC, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 3, 2026 10:00 AM',
    body: 'Robert\'s lateral committee wanted references on our track record. Sent 3 case studies. They approved us formally as exclusive on the M&A chair search — first exclusive we\'ve ever had at Sidley.' }),

  // per-25 Elena Vasquez — Sidley NYC Assoc Recruiting
  N({ id: 'bn-p25-1', contactId: 'per-25', author: RC, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 10, 2026 3:00 PM',
    body: 'Elena owns 4 senior-associate reqs tied to the lateral-partner hires. Her preference: Rebecca Feinstein\'s hire drives a natural pull of 2-3 associates from Wachtell. Timing: start outreach mid-May once Rebecca\'s acceptance is public.' }),

  // per-26 Nathaniel Burke — K&E paralegal
  N({ id: 'bn-p26-1', contactId: 'per-26', author: RC, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 5, 2026 2:45 PM',
    body: 'Nathaniel is pushing for volume discount. Approved stepped fee: 18% for first 4 hires, 16% for 5+. He\'s going to finance for sign-off.' }),

  // per-27 Lindsey Carter — Caterpillar Decatur HR
  N({ id: 'bn-p27-1', contactId: 'per-27', author: DH, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 10:30 AM',
    body: 'Lindsey is our highest-velocity client outside Goldman RPO. She operates on a weekly cadence, expects updates every Friday. Her priority order: welders > machinists > millwrights. Union steward relationships matter — she\'ll flag candidates with non-union backgrounds for cultural fit review.' }),
  N({ id: 'bn-p27-2', contactId: 'per-27', author: DH, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 15, 2026 1:45 PM',
    body: 'Lindsey moved Roland Kosinski to offer. She was blunt — "he\'s the strongest plant manager candidate we\'ve seen in 2 years." Offer target: $220K base + 30% STI + $40K relocation.' }),

  // per-28 Manuel Ortega — Caterpillar Irving
  N({ id: 'bn-p28-1', contactId: 'per-28', author: DH, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 11, 2026 11:30 AM',
    body: 'Manuel has 4 CNC machinist reqs at the Irving aerospace plant. AS9100 non-negotiable. Tight local market — may need to offer relocation to pull from Wichita/Kansas City.' }),

  // per-29 Dana Whitfield — Boeing Cleared TA
  N({ id: 'bn-p29-1', contactId: 'per-29', author: DH, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Mar 28, 2026 2:15 PM',
    body: 'Dana briefed 6 cleared-engineer roles. Our pipeline thin on Secret+ candidates. Partnering with a cleared-specialist agency for this engagement may be necessary — flagged to Paul for business decision.' }),

  // per-30 Sloan Pemberton — Meridian COO
  N({ id: 'bn-p30-1', contactId: 'per-30', author: PW, pinned: true, tags: ['High Priority'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 4:50 PM',
    body: 'Sloan is effusive about the Jennifer Morrison placement. She said our intake process was "night and day" vs. the agency Meridian used before us. Opening for additional executive searches — VP HR next, likely CFO in 2027.' }),
  N({ id: 'bn-p30-2', contactId: 'per-30', author: PW, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 5, 2026 2:30 PM',
    body: 'Sloan forwarded the Jennifer offer docs for our file. Noted that Meridian added a 6-month compliance-hire freeze clause ("no poaching within compliance function") to future engagements. Standard practice — no pushback.' }),

  // per-31 Angela Farhi — Meridian VP People Ops
  N({ id: 'bn-p31-1', contactId: 'per-31', author: TY, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 14, 2026 10:45 AM',
    body: 'Angela is Sloan\'s day-to-day for the VP HR search. She\'s methodical — wants weekly updates, written slates (not decks). Preference for mid-size PE-backed HR leaders over enterprise.' }),

  // per-32 Devon Halstrom — Vertex VP Engineering
  N({ id: 'bn-p32-1', contactId: 'per-32', author: NB, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 18, 2026 11:15 AM',
    body: 'Devon wants data-platform engineers who can onboard in <30 days. Vertex has a messy Snowflake + dbt environment — candidates who\'ve done migrations score highest. Aisha Rahman\'s Okta migration work is her strongest pitch.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE NOTES — per-85 Jennifer Morrison (placed)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p85-1', contactId: 'per-85', author: PW, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'General',
    createdAt: 'Apr 4, 2026 11:00 AM',
    body: '60-day check-in call. Jennifer loves the Meridian culture, already hired a senior compliance analyst under her. Sloan gave her unqualified praise on our last touchpoint. Placement officially beyond guarantee window — billing cycle closed, no clawback exposure.' }),
  N({ id: 'bn-p85-2', contactId: 'per-85', author: PW, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Feb 20, 2026 3:30 PM',
    body: 'Day-8 check-in — Jennifer started Feb 12. Onboarding going smoothly, met with all team leads, inherited the 2026 SEC exam prep workstream. She\'s comfortable with the pace, slightly anxious about the board presentation in March.' }),
  N({ id: 'bn-p85-3', contactId: 'per-85', author: PW, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Jan 30, 2026 4:15 PM',
    body: 'Verbal accept! Jennifer signed today. Start date Feb 12. Sloan did the final handshake call. Fee invoice goes out on start date per MSA terms.' }),
  N({ id: 'bn-p85-4', contactId: 'per-85', author: PW, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Jan 28, 2026 11:30 AM',
    body: 'Final offer negotiation. Jennifer asked for $200K sign-on, landed at $180K. Pushed PTO from 3 to 4 weeks (Sloan approved). Start date flexible, she requested Feb 12 to wrap up a project at Atlantic Financial.' }),
  N({ id: 'bn-p85-5', contactId: 'per-85', author: PW, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Jan 22, 2026 2:00 PM',
    body: 'Final round at Meridian. Jennifer interviewed with Sloan, Angela, the CFO, and 2 board members. Feedback all positive — Sloan said "she\'s the only candidate who understood our scale problem." Verbal offer prep underway.' }),
  N({ id: 'bn-p85-6', contactId: 'per-85', author: PW, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Jan 8, 2026 10:00 AM',
    body: 'Initial intake call. Jennifer is at Atlantic Financial, built compliance from 2 to 12 people. Open to a COO-reporting role with broader mandate. Current comp: $195K + 30%. Target: $280K+. Fit for Meridian VP Compliance spec is strong.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-35 Sofia Restrepo (interview, Anthropic)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p35-1', contactId: 'per-35', author: NB, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 20, 2026 3:00 PM',
    body: 'Sofia advanced past the technical screen at Anthropic. Interviewer feedback: "strongest Kubernetes + Rust combination we\'ve seen all quarter." Scheduled for system design + values round Apr 28.' }),
  N({ id: 'bn-p35-2', contactId: 'per-35', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 14, 2026 11:30 AM',
    body: 'Prep call with Sofia before her technical screen. Coached on Anthropic\'s interview style (less LeetCode, more "walk me through a hard system you built"). She chose the Firecracker cold-start program story.' }),
  N({ id: 'bn-p35-3', contactId: 'per-35', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 8, 2026 2:00 PM',
    body: 'Sofia wants to understand Anthropic\'s on-call expectations before advancing. Checked with Taylor — it\'s light (1 week / quarter, platform only, no customer-facing pager). Sofia is comfortable.' }),
  N({ id: 'bn-p35-4', contactId: 'per-35', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Mar 28, 2026 4:15 PM',
    body: 'Initial outreach call. Sofia is at AWS Lambda, worked on Firecracker cold-start optimization. 60-day notice at AWS (non-standard, long vest cliff coming up). Anthropic role is $340K + equity target — likely a $50-80K bump vs. current.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-38 Marcus Abernathy (interview, Vertex)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p38-1', contactId: 'per-38', author: NB, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 17, 2026 2:30 PM',
    body: 'Marcus onsite at Vertex. Devon gave strong feedback — "best EM candidate for the data-platform role." Concern: Marcus\'s current team at Groupon is only 6 engineers, Vertex role is 14 directs. Devon wants a 2nd panel focused on org-scale leadership.' }),
  N({ id: 'bn-p38-2', contactId: 'per-38', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 10, 2026 1:00 PM',
    body: 'Marcus prep call. Coached him on Vertex\'s hiring-manager style (Devon likes concrete metrics, not narratives). Marcus has strong retention + promotion numbers from Groupon — leading with those.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-83 Lorraine McCutcheon (interview, exec EA)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p83-1', contactId: 'per-83', author: TY, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 21, 2026 10:00 AM',
    body: 'Lorraine did final-round at Meridian (CEO EA role). Sloan and the CEO both rated her top-decile. Her McKinsey C-suite support background translates directly. Offer prep this week, target $120K + 15% bonus.' }),
  N({ id: 'bn-p83-2', contactId: 'per-83', author: TY, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 7, 2026 3:00 PM',
    body: 'Lorraine is a referral from Jennifer Morrison. Strong signal — Jennifer doesn\'t refer casually. Currently at McKinsey NYC, 30-day notice. Ready to move for the right role.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-87 Maria Santos (interview, comp/legal exec)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p87-1', contactId: 'per-87', author: TY, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 19, 2026 11:30 AM',
    body: 'Maria interviewed for a CCO role at a Greenwich hedge fund (prior slate candidate reactivated). Her JD + CFA combo is rare; fund CEO is extremely interested. Offer would be $400K+ base, $1M+ total comp.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-56 Anastasia Kuznetsova (interview, Moderna)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p56-1', contactId: 'per-56', author: KA, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 19, 2026 2:15 PM',
    body: 'Final-round feedback: Anastasia scored 9/10 technical, 8/10 culture. Rachel wants to push to offer. Blocker: Alnylam IP non-compete — Moderna legal is reviewing scope. ETA 5 business days.' }),
  N({ id: 'bn-p56-2', contactId: 'per-56', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 14, 2026 10:00 AM',
    body: 'Anastasia prep call. Coached on Moderna\'s values-based interview style. She\'s anxious about the non-compete — walked her through how Moderna handled a similar Alnylam hire in 2024 (clean departure after 45 days).' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-49 Brandon Tillman (placed, MGB OR RN)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p49-1', contactId: 'per-49', author: KA, pinned: true, tags: ['High Priority'], noteType: 'General',
    createdAt: 'Apr 12, 2026 3:30 PM',
    body: 'Brandon\'s day-7 check-in at Brigham OR. Preceptor feedback strong — scrub/circulate rotations going well. Already signed up for robotics cross-train. Placement holding through guarantee window.' }),
  N({ id: 'bn-p49-2', contactId: 'per-49', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Mar 25, 2026 2:00 PM',
    body: 'Offer accepted! Brandon signed for $130K base + $15K sign-on, start Apr 6 at Brigham OR. CNOR cert transfer confirmed, RI → MA license pending.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-65 Gregory Fitzpatrick (interview, finance)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p65-1', contactId: 'per-65', author: TY, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 17, 2026 11:00 AM',
    body: 'Gregory final-round at a State Street competitor (for Dir Internal Audit). SOX + IT audit depth scored highly. Competing offer from his current employer likely — need to lock preference quickly.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-74 Roland Kosinski (offer, Caterpillar)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p74-1', contactId: 'per-74', author: DH, pinned: true, tags: ['High Priority', 'Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 19, 2026 9:45 AM',
    body: 'Roland in offer stage at Caterpillar Decatur. Lindsey approved $220K base + 30% STI + $40K relocation. Verbal accept expected early next week — Roland is doing one last counter with John Deere.' }),
  N({ id: 'bn-p74-2', contactId: 'per-74', author: DH, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 12, 2026 10:00 AM',
    body: 'Roland\'s final-round debrief. Lindsey was emphatic — "he\'s the strongest PM candidate in 2 years." Roland told me he\'s 80% lean-toward Caterpillar, 20% stay at Deere. Follow-up Apr 22.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE LIFECYCLE — per-45 Heather Nolan (interview, Datadog)
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p45-1', contactId: 'per-45', author: NB, tags: ['Meeting'], noteType: 'Meeting',
    createdAt: 'Apr 19, 2026 3:30 PM',
    body: 'Heather advanced to final at Datadog (Eng Director — Observability). Hannah\'s VP loved her OpenTelemetry depth. Offer target: $420K all-in. Heather\'s floor is the same — tight but deal-able.' }),
  N({ id: 'bn-p45-2', contactId: 'per-45', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 8, 2026 1:15 PM',
    body: 'Heather prep call. Coached her on Datadog\'s technical-leadership interview format (heavy on scaling stories, less on pure tech). She chose her Honeycomb sampling-pipeline architecture.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // SUBMITTED CANDIDATES — 1-2 notes each
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p33-1', contactId: 'per-33', author: NB, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 4:30 PM',
    body: 'Ethan Park submitted to Anthropic (Senior Research Scientist — Alignment). Phone screen with Taylor scheduled Apr 25. His RLHF work at Meta AI is directly relevant.' }),
  N({ id: 'bn-p33-2', contactId: 'per-33', author: NB, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 15, 2026 10:30 AM',
    body: 'Ethan interested. Current comp ~$385K, target $425-500K. 30-day notice at Meta. Resume uploaded to Documents.' }),

  N({ id: 'bn-p36-1', contactId: 'per-36', author: NB, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 18, 2026 11:00 AM',
    body: 'Nikolai submitted to Snowflake Senior SRE. Dmitri\'s band cap is $245K — Nikolai\'s current base is $245K at PayPal. Leaning on equity story to close the gap.' }),

  N({ id: 'bn-p40-1', contactId: 'per-40', author: NB, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 2:00 PM',
    body: 'Danielle Okonkwo (Notion Sr PM) submitted to Anthropic\'s Applied AI PM role. Priscilla\'s review pending. Strong AI-product background.' }),

  N({ id: 'bn-p44-1', contactId: 'per-44', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 21, 2026 10:00 AM',
    body: 'Blake Ferrer (laid off Mar 2026, Go backend) submitted to 3 roles: Snowflake, Datadog, and a Series C fintech. Immediate availability helps — all 3 fast-tracked his resume.' }),

  N({ id: 'bn-p46-1', contactId: 'per-46', author: KA, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 1:30 PM',
    body: 'Jasmine Carter (Tufts ICU RN, CCRN) submitted to MGB ICU req. 2-week notice. Dr. Chen reviewing — preliminary interest high.' }),

  N({ id: 'bn-p48-1', contactId: 'per-48', author: KA, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 11:15 AM',
    body: 'Priya Venkatesh (Atrius NP) submitted to MGB family medicine NP role. Her Epic + patient education depth is a fit. 30-day notice.' }),

  N({ id: 'bn-p51-1', contactId: 'per-51', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 15, 2026 2:00 PM',
    body: 'Liam O\'Sullivan MD (Beth Israel hospitalist) submitted to MGB hospitalist req. 60-day notice. Board-certified IM, teaching interest — Dr. Chen flagged as strong fit for academic environment.' }),

  N({ id: 'bn-p54-1', contactId: 'per-54', author: KA, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 10:30 AM',
    body: 'Sophia Nguyen PhD submitted to Moderna Senior CRA — oncology. Chris flagged as top-of-slate. Phone screen Apr 23.' }),

  N({ id: 'bn-p57-1', contactId: 'per-57', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 16, 2026 2:45 PM',
    body: 'Benjamin Oyelaran (QA Specialist, contract at Moderna) submitted for full-time conversion. Unusual — his contract manager is Chris Ayala, same as hiring manager. Conflict check with Rachel cleared.' }),

  N({ id: 'bn-p60-1', contactId: 'per-60', author: TY, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 3:00 PM',
    body: 'David Hernandez (Deloitte Audit Mgr, CPA) submitted to a regional bank CFO-track role. Strong SOX + GAAP background. 30-day notice.' }),

  N({ id: 'bn-p62-1', contactId: 'per-62', author: TY, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 18, 2026 10:45 AM',
    body: 'Chandra Reddy (JPMorgan, BSA/AML) submitted to a Goldman RPO compliance req. CAMS cert + FINRA depth. 2-week notice. Alistair\'s team reviewing.' }),

  N({ id: 'bn-p68-1', contactId: 'per-68', author: RC, tags: ['Meeting'], noteType: 'Sales',
    createdAt: 'Apr 18, 2026 11:00 AM',
    body: 'Rebecca Feinstein submitted as lateral M&A partner candidate for Sidley. Book of business $4.2M portable. Conflicts check in progress. This is the highest-profile submission of the quarter.' }),

  N({ id: 'bn-p71-1', contactId: 'per-71', author: RC, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 17, 2026 1:30 PM',
    body: 'Thomas Blackburn (HubSpot in-house counsel) submitted to a Series D SaaS GC role. SaaS contracts + GDPR/CCPA depth. 30-day notice.' }),

  N({ id: 'bn-p73-1', contactId: 'per-73', author: RC, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 14, 2026 3:00 PM',
    body: 'Jamal Whitfield (Fidelity Compliance Counsel) submitted to a BlackRock equivalent role. JD + CFA unusual combo. 60-day notice; Fidelity non-compete review underway.' }),

  N({ id: 'bn-p75-1', contactId: 'per-75', author: DH, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 18, 2026 2:00 PM',
    body: 'Derek Holcomb (plant closure laid off) submitted to Caterpillar manufacturing engineer role. Robotics + PLC background fits their automation initiative. Lindsey interested.' }),

  N({ id: 'bn-p77-1', contactId: 'per-77', author: DH, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 13, 2026 10:15 AM',
    body: 'Jessica Laferriere (Boeing quality engineer, AS9100 + CQE) submitted to Caterpillar Irving quality lead. Manuel reviewing — AS9100 background is rare in his local pool.' }),

  N({ id: 'bn-p80-1', contactId: 'per-80', author: TY, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 12:30 PM',
    body: 'Maya Patel (Airbnb HRBP, SPHR) submitted to Meridian VP HR search. Her tech-HRBP experience is a stretch for PE but Angela is open. Kickoff screen Apr 28.' }),

  N({ id: 'bn-p89-1', contactId: 'per-89', author: TY, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 12, 2026 11:00 AM',
    body: 'Valentina Rossi (Asana CMO) submitted to a Series D SaaS CMO role. PLG + demand-gen depth. 60-day notice; likely counter-offer from Asana.' }),

  N({ id: 'bn-p90-1', contactId: 'per-90', author: NB, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 19, 2026 10:45 AM',
    body: 'Aisha Rahman (Okta data engineer) submitted to Vertex data-platform role. Her Okta migration work maps directly. Devon reviewing resume.' }),

  N({ id: 'bn-p95-1', contactId: 'per-95', author: RC, tags: ['Phone Call'], noteType: 'Sales',
    createdAt: 'Apr 20, 2026 2:45 PM',
    body: 'Ian Sokolowski (corporate paralegal, relocating) submitted to K&E\'s capital markets paralegal req. IPO + SEC filings depth. Immediate availability. Nathaniel flagged as "exactly the profile."' }),

  // ═══════════════════════════════════════════════════════════════════════
  // SCREENED CANDIDATES — 1 note each
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p37-1', contactId: 'per-37', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 19, 2026 11:30 AM',
    body: 'Olivia Chen (contract ending Apr 30). TS + React + Next.js + AWS full-stack. Screened well, immediate availability. Matching to a Series C fintech and a remote-first SaaS this week.' }),

  N({ id: 'bn-p41-1', contactId: 'per-41', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 16, 2026 2:30 PM',
    body: 'Tyler Kwiatkowski (Cloudflare AppSec) screened. Strong OWASP + pen testing background. Targeting Datadog security-engineering roles and an Anthropic security-engineer req.' }),

  N({ id: 'bn-p47-1', contactId: 'per-47', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 17, 2026 1:00 PM',
    body: 'Dmitri Sokolov (ED RN, travel contract ended). TNCC + trauma + triage. Cambridge/Boston focus. Submitting to MGB ED req this week.' }),

  N({ id: 'bn-p52-1', contactId: 'per-52', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 18, 2026 10:30 AM',
    body: 'Isabella Ricci (DPT, relocating from CA). Outpatient ortho, McKenzie method cert. Submitting to MGB physical therapist reqs this week.' }),

  N({ id: 'bn-p55-1', contactId: 'per-55', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 17, 2026 3:15 PM',
    body: 'Joaquín Herrera (Brigham CRC) screened. Medidata EDC + IRB submissions. Moderna CRC role is a natural fit — Chris reviewing.' }),

  N({ id: 'bn-p59-1', contactId: 'per-59', author: KA, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 13, 2026 11:00 AM',
    body: 'Gabriela Santos-Mendes (Sanofi biostatistician, MS). R/SAS + Bayesian + CDISC. Submitting to Moderna biostat rotation this week.' }),

  N({ id: 'bn-p64-1', contactId: 'per-64', author: TY, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 15, 2026 10:00 AM',
    body: 'Fernanda Montoya (Aetna FP&A, MBA). Power BI + Hyperion. 2-week notice. Matching to BlackRock FP&A and a Fidelity analyst req.' }),

  N({ id: 'bn-p67-1', contactId: 'per-67', author: TY, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 11, 2026 2:30 PM',
    body: 'Madison Kellerman (BofA credit risk). Basel III + stress testing + SAS/Python. 60-day notice. Targeting Goldman RPO risk reqs.' }),

  N({ id: 'bn-p72-1', contactId: 'per-72', author: RC, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 16, 2026 1:45 PM',
    body: 'Priscilla Durand (Fragomen immigration attorney). H-1B + L-1 + PERM + I-9. Immediate availability. Matching to a tech in-house immigration counsel role.' }),

  N({ id: 'bn-p76-1', contactId: 'per-76', author: DH, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 16, 2026 11:30 AM',
    body: 'Miguel Acosta (Textron 5-axis CNC). Aerospace tolerances + Mastercam. 2-week notice. Caterpillar Irving AS9100 plant is a strong match.' }),

  N({ id: 'bn-p78-1', contactId: 'per-78', author: DH, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 20, 2026 1:00 PM',
    body: 'Tyrone Beasley (pressure vessel welder, AWS cert). ASME code + 6G pipe. Contract ending. Immediate fit for Houston petrochemical client (separate from Caterpillar).' }),

  N({ id: 'bn-p81-1', contactId: 'per-81', author: TY, tags: ['Email'], noteType: 'Follow-up',
    createdAt: 'Apr 17, 2026 9:45 AM',
    body: 'Tomás Ríos (Indeed tech recruiter). Full-cycle + Greenhouse + LinkedIn Recruiter. 2-week notice. Matching to Goldman RPO internal TA augmentation role.' }),

  N({ id: 'bn-p84-1', contactId: 'per-84', author: TY, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 18, 2026 10:00 AM',
    body: 'Cameron Whitlock (laid off Apr 2026, People Ops, Workday HRIS). Immediate availability, remote flexibility. Matching to mid-market PeopleOps roles.' }),

  N({ id: 'bn-p91-1', contactId: 'per-91', author: NB, tags: ['Email'], noteType: 'Sales',
    createdAt: 'Apr 15, 2026 3:15 PM',
    body: 'Hector Valenzuela (GoDaddy DevOps). GitLab CI + Terraform + AWS. 2-week notice, remote-only. Matching to remote-friendly Series C DevOps reqs.' }),

  N({ id: 'bn-p92-1', contactId: 'per-92', author: NB, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 8, 2026 2:00 PM',
    body: 'Felicity Abara (Microsoft UX research). Qualitative + service design. Passive — open to the right conversation. Figma design-research role flagged.' }),

  // ═══════════════════════════════════════════════════════════════════════
  // SOURCED CANDIDATES — 1 brief note each
  // ═══════════════════════════════════════════════════════════════════════
  N({ id: 'bn-p34-1', contactId: 'per-34', author: NB, tags: ['Cold Call'], noteType: 'General',
    createdAt: 'Apr 14, 2026 10:30 AM',
    body: 'Cold outreach to Ravi Narayan (DeepMind, PhD, NLP). Passive. Declined Anthropic conversation — tied into DeepMind equity vest. Reconnect Q3.' }),

  N({ id: 'bn-p39-1', contactId: 'per-39', author: NB, tags: ['Email'], noteType: 'General',
    createdAt: 'Apr 10, 2026 1:45 PM',
    body: 'Cold outreach to Yuki Tanaka (Apple Staff iOS). Passive. Apple RSU cliff in July — reach out early May.' }),

  N({ id: 'bn-p42-1', contactId: 'per-42', author: NB, tags: ['Cold Call'], noteType: 'General',
    createdAt: 'Apr 2, 2026 11:00 AM',
    body: 'Cold outreach to Mei-Lin Huang (Google Sr DS). Passive. Causal inference + Bayesian rare combo. Monitoring — Google layoff rumors could surface her.' }),

  N({ id: 'bn-p50-1', contactId: 'per-50', author: KA, tags: ['Email'], noteType: 'General',
    createdAt: 'Apr 4, 2026 2:30 PM',
    body: 'Sourced Amara Johnson (Dana-Farber oncology CNS). Passive. Pitched MGB oncology expansion; she\'s open to a $20K comp stretch conversation.' }),

  N({ id: 'bn-p53-1', contactId: 'per-53', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 18, 2026 11:30 AM',
    body: 'Reginald Whitaker (BMC healthcare admin). Interview scheduled at MGB for Director of Nursing Operations. MBA + MSN combo fits their Magnet initiative.' }),

  N({ id: 'bn-p58-1', contactId: 'per-58', author: KA, tags: ['Cold Call'], noteType: 'General',
    createdAt: 'Mar 30, 2026 4:00 PM',
    body: 'Cold outreach to Harper Sinclair (BMS regulatory). Passive. Oncology IND depth — parked for Moderna oncology regulatory expansion (expected Q3).' }),

  N({ id: 'bn-p63-1', contactId: 'per-63', author: TY, tags: ['Cold Call'], noteType: 'General',
    createdAt: 'Apr 1, 2026 10:45 AM',
    body: 'Alexander Rothstein (Morgan Stanley VP fixed income). Sourced. Alistair Penrose mentioned him for a Goldman FI quant role — Alexander open to confidential conversation.' }),

  N({ id: 'bn-p66-1', contactId: 'per-66', author: TY, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 22, 2026 2:00 PM',
    body: 'Cold outreach to Kenji Yamamoto (Citadel quant researcher, PhD Math). Passive. Compensation floor $500K — parked for high-comp quant reqs only.' }),

  N({ id: 'bn-p69-1', contactId: 'per-69', author: RC, tags: ['Cold Call'], noteType: 'General',
    createdAt: 'Apr 11, 2026 11:15 AM',
    body: 'Marcus Oyelowo (Latham litigation associate). Sourced. Open to in-house move — parked for corporate litigation in-house searches.' }),

  N({ id: 'bn-p79-1', contactId: 'per-79', author: DH, tags: ['Email'], noteType: 'General',
    createdAt: 'Apr 5, 2026 3:45 PM',
    body: 'Stacy Rinehart (BMW supply chain mgr, APICS CSCP). Passive. S&OP + SAP depth. Parked for Caterpillar supply chain roles (expected Q3).' }),

  N({ id: 'bn-p82-1', contactId: 'per-82', author: TY, tags: ['Cold Call'], noteType: 'General',
    createdAt: 'Apr 8, 2026 2:15 PM',
    body: 'Nadia Whitfield-Ajani (Wayfair Total Rewards, CCP). Passive — open to intro conversation. Parked for Meridian VP HR search adjacency.' }),

  N({ id: 'bn-p88-1', contactId: 'per-88', author: TY, tags: ['Email'], noteType: 'General',
    createdAt: 'Mar 26, 2026 4:00 PM',
    body: 'Jonathan Whitfield (Toast CFO). Sourced for a pre-IPO SaaS CFO role. Passive; monitoring. CPA + MBA + IPO readiness makes him a top-tier profile.' }),

  N({ id: 'bn-p70-1', contactId: 'per-70', author: RC, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 19, 2026 1:30 PM',
    body: 'Eleanor Whitmore (Ropes & Gray senior paralegal). Final round at a Boston GC team. Strong closing management + cap table depth. 2-week notice.' }),

  N({ id: 'bn-p93-1', contactId: 'per-93', author: KA, tags: ['Phone Call'], noteType: 'Call Log',
    createdAt: 'Apr 14, 2026 10:30 AM',
    body: 'Omar Khouri (Boston Children\'s NICU RN, RNC-NIC). Screened; submitted to MGB NICU expansion. Dr. Chen phone screen Apr 28.' }),

  N({ id: 'bn-p94-1', contactId: 'per-94', author: KA, tags: ['Email'], noteType: 'General',
    createdAt: 'Apr 3, 2026 11:00 AM',
    body: 'Yolanda Pritchard (PPD CRA II, oncology). Sourced for Moderna oncology CRA — Rachel pushed back (wants sponsor-side, not CRO). Reactivating for a Pfizer CRA conversation.' }),
];
