'use client';

import { useRef, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  X, BookOpen, Compass, Play, Question, Sparkle, House, Users, CurrencyDollar,
  UsersFour, Files, ChartPieSlice, UserCircleGear, Keyboard, ChatCircle, Lifebuoy,
  ArrowRight, GraduationCap, Lightning, Flag, BellRinging, Gear, GridFour,
  UserPlus, Buildings, Bookmark, Envelope, PaperPlaneTilt, ListNumbers,
} from '@phosphor-icons/react';
// TourSpotlight rendering moved to ActiveTourOverlay (independent of panel open/close)
import { TOUR_STEPS, getTourForPath, TourStep } from '@/lib/tour-steps';
import { useTourStore } from '@/stores/tour-store';

interface Props {
  onClose: () => void;
}

/**
 * Context-aware help panel. Based on industry best practices from
 * Salesforce Help, HubSpot Knowledge Base, Intercom, and Zendesk:
 *
 * 1. Context-sensitive — shows help relevant to the current page
 * 2. Guided walkthroughs — step-by-step tours per section
 * 3. Quick links — keyboard shortcuts, docs, support
 * 4. AI assistance — "Ask AI" for natural language help
 * 5. Getting started checklist — onboarding progress
 */

const SECTION_HELP: Record<string, { title: string; icon: React.ReactNode; tips: string[]; walkthrough: string[] }> = {
  '/dashboard': {
    title: 'Dashboard',
    icon: <House size={14} weight="duotone" />,
    tips: [
      'Click the gear icon on any widget to customize colors, text, and icon.',
      'Drag the ⋮⋮ handle to reorder widgets.',
      'Use S / M / W pills to resize widgets.',
      'Drag the corner handle to freely resize.',
      'Switch views with the View dropdown — try Sales Rep, Recruiter, or Manager.',
      'Add new widgets with the + Add widget button.',
    ],
    walkthrough: [
      'Welcome to your Dashboard — your CRM command center.',
      'Each card is a widget you can customize. Try clicking the gear icon.',
      'Widgets come in different sizes. Use the S/M/W pills or drag the corner.',
      'Change colors, text size, and icons from the Edit Card panel.',
      'Switch between preset views for different roles — Sales Rep, Recruiter, Manager.',
      'Add new widgets to build the view that works for you.',
    ],
  },
  '/contacts': {
    title: 'Contacts',
    icon: <Users size={14} weight="duotone" />,
    tips: [
      'Toggle between List and Card view for different perspectives.',
      'Filter by All, Organizations, or People.',
      'Click any contact to see their full profile with Overview, Details, Org Chart, and Documents tabs.',
      'Edit any field by clicking the pencil icon on detail cards.',
      'Tags help you categorize contacts — add them from the detail header.',
      'AI badges show which fields were auto-populated.',
      'Use the Density button to switch between Compact, Comfortable, and Spacious row heights.',
    ],
    walkthrough: [
      'This is your contact list — everyone you do business with.',
      'Use the filter bar to show All contacts, just Organizations, or just People.',
      'Click a contact to open their full profile.',
      'The Overview tab shows key info at a glance. Details has editable field cards.',
      'The Documents tab shows files attached to this contact.',
      'Use the search bar to find contacts by name, company, or email.',
      'Density picks row height. Compact fits ~40 rows on screen for fast scanning.',
    ],
  },
  '/bulk': {
    title: 'Bulk Email',
    icon: <PaperPlaneTilt size={14} weight="duotone" />,
    tips: [
      'Click "+ New bulk send" to compose a personalized email to many recipients at once.',
      'Use {{firstName}}, {{company}}, {{senderName}} merge fields — they auto-fill per recipient at send time.',
      'Apply a template to skip writing from scratch. Templates auto-sort by most-used.',
      'Click ✨ AI draft to generate a draft with goal + tone + length controls.',
      'Every batch tracks per-recipient delivery (sent / failed / pending). Click any batch to open the detail panel.',
      'Search by subject, recipient, or template. Sort by newest, most recipients, or delivery rate.',
      'Hover any batch row to reveal the trash icon — removes from history without affecting Gmail.',
    ],
    walkthrough: [
      'Bulk Email is your hub for sending personalized messages to many recipients.',
      'The stats row shows lifetime totals: sent, batches, delivery rate, recipients.',
      'Search and sort the history feed to find any past send.',
      'Click "+ New bulk send" to compose a new one. Pick recipients from contacts, lists, or paste addresses.',
      'Inside the composer, ✨ AI draft generates a draft from a goal + tone + length you specify.',
      'Each batch card shows subject, attachment count, and live delivery progress.',
      'Click any batch to open a detail panel with per-recipient status and attachment previews.',
    ],
  },
  '/sequences': {
    title: 'Sequences',
    icon: <ListNumbers size={14} weight="duotone" />,
    tips: [
      'Sequences are multi-step email cadences that pace your follow-ups across days.',
      'The funnel shape shows what % of your starting cohort received each step. Cards narrow as people drop off.',
      'Each step is a collapsible accordion. Click to expand and edit subject, body, delay.',
      'Day-N badges on each step show cumulative timing: Day 0, Day 3, Day 7…',
      'The timeline strip shows: Created · Last edit · Cadence length · Latest finish.',
      'Click "Send next step" on a due enrollment to fire the email manually (Phase 1).',
      'Reply detection auto-stops a sequence when the contact replies.',
    ],
    walkthrough: [
      'Sequences automate multi-step email follow-ups so you stay top-of-mind without manual nagging.',
      'The left panel lists your sequences with search and sort. Click "+ New" to start one.',
      'The Performance dashboard shows live stats: active enrollments, completed cadences, reply rate.',
      'The step funnel visualizes drop-off across the cadence — each card width is the % of starting cohort.',
      'Each step is collapsible. Day-N badges show when each fires relative to enrollment.',
      'The timeline strip tells you when this sequence was created and when its current cohort wraps.',
      'Enroll a contact, then "Send next step" when due. Reply detection auto-stops it on reply.',
    ],
  },
  '/sales': {
    title: 'Sales',
    icon: <CurrencyDollar size={14} weight="duotone" />,
    tips: [
      'Switch between List and Status (kanban) views.',
      'Filter by People or Company lead types.',
      'Each deal has Overview, Details, Qualify, and Documents tabs.',
      'The completeness bar shows how much info has been gathered.',
      'Edit deal fields by clicking the pencil on any card.',
      'Move deals through pipeline stages on the Qualify tab.',
    ],
    walkthrough: [
      'The Sales module tracks your deals from Lead to Closed Won.',
      'Deals can be Person-first (individual leads) or Company-first (org deals).',
      'The Status view shows a kanban board organized by pipeline stage.',
      'Click any deal to see its full profile with editable detail cards.',
      'The Qualify tab has cards for Company Details, Revenue, and Products.',
      'The completeness bar fills as you add more information.',
    ],
  },
  '/recruiting': {
    title: 'Recruiting',
    icon: <UsersFour size={14} weight="duotone" />,
    tips: [
      'The pipeline shows candidates flowing through recruiting stages.',
      'AI match scores indicate how well a candidate fits the role.',
      'Click any candidate card to see their deal details.',
      'Data comes from your Sales deals — person-type deals become candidates in the recruiting pipeline.',
    ],
    walkthrough: [
      'The Recruiting pipeline visualizes your candidate flow.',
      'Stages: Sourced → Screening → Interview → Offer → Placed.',
      'Each card shows the candidate, their role, and an AI match score.',
      'The match score is based on probability, contact completeness, and deal value.',
      'Click a card to jump to the full deal details.',
    ],
  },
  '/documents': {
    title: 'Documents',
    icon: <Files size={14} weight="duotone" />,
    tips: [
      'Upload any file type — PDFs, images, spreadsheets, presentations.',
      'Switch between Grid (table) and Card (thumbnail) views.',
      'Click a document to open the preview panel.',
      'Images show inline previews. PDFs show a placeholder (production would use pdf.js).',
      'Filter by category — Contract, Proposal, Invoice, Report, etc.',
      'Documents linked to contacts or deals appear on their Documents tab.',
    ],
    walkthrough: [
      'The Documents module manages all files in your CRM.',
      'Upload documents by clicking Upload or dragging files onto the drop zone.',
      'Each document has a category, description, and can be linked to contacts or deals.',
      'The Card view shows visual thumbnails — great for finding documents visually.',
      'Click any document to open a preview panel with full metadata.',
    ],
  },
  '/reporting': {
    title: 'Reporting',
    icon: <ChartPieSlice size={14} weight="duotone" />,
    tips: [
      'KPI tiles at the top show your key metrics at a glance.',
      'Pipeline Funnel shows deal distribution by stage.',
      'Revenue by Source shows where your deals are coming from.',
      'Deal Metrics shows win rate, velocity, and average deal size.',
      'CRM Health shows contact completeness and document counts.',
    ],
    walkthrough: [
      'Reports give you a bird\'s eye view of your CRM data.',
      'The AI Summary bar at the top highlights key insights.',
      'KPI tiles show the numbers that matter most.',
      'Charts break down your pipeline and revenue by stage and source.',
      'Use these reports to identify trends and areas for improvement.',
    ],
  },
  '/admin': {
    title: 'Admin',
    icon: <UserCircleGear size={14} weight="duotone" />,
    tips: [
      'System Health shows the status of all CRM services.',
      'User Management lets you invite and manage team members.',
      'Roles & Permissions control what each user role can access.',
      'The Audit Log tracks all recent actions in the system.',
      'Data Management has tools for import, export, and cleanup.',
      'AI Usage shows how many API calls your team is making.',
    ],
    walkthrough: [
      'The Admin dashboard gives you control over your CRM system.',
      'Check System Health to make sure everything is running smoothly.',
      'Manage users and their roles from the User Management section.',
      'Set up roles with specific permissions for each team function.',
      'Review the Audit Log to see who did what and when.',
      'Use Data Management tools to import, export, or clean up data.',
    ],
  },
  '/settings': {
    title: 'Settings',
    icon: <Gear size={14} weight="duotone" />,
    tips: [
      'The AI Insights master switch turns every AI feature on or off across the whole app.',
      'Account, Appearance, and Contacts apply instantly — no Save button needed.',
      'Click Edit next to Name or Email to inline-edit with live validation.',
      'Sidebar Badges control the alert-count chips in the left nav.',
      'Page Insights Bars are AI-branded — they require the master AI switch to be on.',
      'Notifications has fine-grained toggles for email summaries, incomplete-contact warnings, and AI suggestions.',
    ],
    walkthrough: [
      'Settings is where you personalize the CRM — your profile, theme, defaults, and what the app alerts you about.',
      'Start with AI Insights. The master switch disables every AI feature app-wide with one click.',
      'Account lets you change your name, email, and password. Inline edits are live-validated.',
      'Appearance toggles light / dark mode. It applies instantly and persists across sessions.',
      'Sidebar Badges and Page Insights Bars let you declutter — hide the alert chips and AI bars you don\'t want.',
      'Notifications fine-tunes weekly emails, stale-contact alerts, and AI suggestion bubbles.',
    ],
  },
  '/contacts/new/person': {
    title: 'Create a Person',
    icon: <UserPlus size={14} weight="duotone" />,
    tips: [
      'Name is required; every other field has live validation as you type.',
      'The AI sidebar searches real public sources (GitHub, Wikidata, LinkedIn) for duplicates while you type a name or email.',
      'On step 2, the sidebar suggests a reports-to based on the title you entered.',
      'Step 3 classifies the person — Client, Prospect, Partner, Vendor, Investor, or Personal — and sets a Private flag if needed.',
      'Tip: drop a resume PDF on the chooser page instead and the AI will fill this whole form for you.',
    ],
    walkthrough: [
      'Creating a Person is a 3-step flow — Basic Info, Organization, Relationship — with an AI sidebar that runs alongside each step.',
      'Step 1 captures the essentials: name, prefix/suffix, email + type, phone + ext + type, and title. Live validation runs as you type.',
      'The AI sidebar is Duplicate Detection on step 1. It queries public sources for existing matches so you merge instead of creating duplicates.',
      'Step 2 links the person to a company, adds department, reports-to, and role level. The AI sidebar switches to Org Hierarchy suggestions.',
      'Step 3 classifies the relationship and lets you mark the contact Private so the rest of the team can\'t see them.',
      'You can also start the whole flow from a resume — drop a PDF on the chooser and the AI extracts everything into this form.',
    ],
  },
  '/contacts/new/company': {
    title: 'Create a Company',
    icon: <Buildings size={14} weight="duotone" />,
    tips: [
      'Name is required; website, industry, size, HQ, and founded year all live-validate.',
      'Typing a company name searches Clearbit, Crunchbase, SEC EDGAR, and OpenCorporates in real time for existing matches.',
      'Step 2 is AI Enrichment — every suggested field has a source badge and you accept or reject one by one.',
      'Step 3 links parents, subsidiaries, partners, vendors, and customer people so the org graph stays connected.',
      'Step 4 is a full summary review before saving — nothing is persisted until you confirm.',
    ],
    walkthrough: [
      'Creating a Company is a 4-step flow — Details, AI Enrichment, Relationships, Confirm — with an AI sidebar that previews public data as you type.',
      'Step 1 takes the basics: name, website, industry, size, phone, founded year, HQ, and description. All live-validated.',
      'The AI Enrichment sidebar shows what public data the AI will pull on the next step. Every row is traceable to its source.',
      'Step 2 is the enrichment review. Nothing lands on the record without your explicit accept.',
      'Step 3 creates graph links to existing contacts — parents, subsidiaries, partners, vendors, customer people.',
      'Step 4 shows the full summary. Saving creates the org and all pending relationships in one go.',
    ],
  },
  'lists': {
    title: 'Saved Lists',
    icon: <Bookmark size={14} weight="duotone" />,
    tips: [
      'Saved lists group contacts, deals, or documents — they work everywhere that record type shows up.',
      'Pin a list from the Pin Manager (gear on the SAVED LISTS sidebar header) to put it one click away.',
      'Click the Bookmark icon on any contact / deal / document header to add it to one or more lists.',
      'Make a list Private (only you) or Public (everyone can pin it to their sidebar).',
      'The Star icon is the Favorites shortcut — a built-in list per record type, no setup needed.',
      'When a grid is filtered by a list (via ?list=…), a chip at the top lets you clear the filter without deleting the list.',
    ],
    walkthrough: [
      'Saved Lists are how you group records for quick access — "Q2 High Priority", "Portsmouth Branch", "Client Contracts", anything you want.',
      'Pinned lists show in the sidebar under SAVED LISTS. The gear opens the Pin Manager to choose which show.',
      'Click the Bookmark on any record\'s detail header to open the Save-to-list menu. Add to existing lists or create new ones inline.',
      'New lists are tied to the record type you created them from — a contact list won\'t appear when you bookmark a deal.',
      'The list-filter chip at the top of a filtered grid clears the filter only — the list itself is untouched.',
      'The Star next to the Bookmark is the one-click Favorites shortcut — handy for records you touch often.',
    ],
  },
  'gmail': {
    title: 'Gmail Integration',
    icon: <Envelope size={14} weight="duotone" />,
    tips: [
      '"Synced 11h ago" is the stored timestamp of the last successful pull — it\'s NOT live status.',
      'If Sync now fails with "no_gmail_connection", your auth row is missing a refresh token — reconnect from Settings.',
      'Import contacts ranks senders by frequency, strips noise (no-reply, notifications, marketing), and dedupes against your CRM.',
      'Emails from senders already in your CRM attach to their timeline silently — no action required.',
      'There is no "remove Gmail-imported contacts" action — Gmail contacts look identical to manually-created ones, so delete them from the contacts grid.',
      'If the suggestions modal is empty, it could mean a quiet inbox, fully-imported senders, OR a sync that hasn\'t actually run yet.',
    ],
    walkthrough: [
      'The Gmail integration pulls email activity into the CRM — every inbound and outbound message gets matched to the right contact automatically.',
      'The banner on Contacts shows your connected account, messages tracked, and last sync time. That time is stored, not live.',
      'Sync now does an on-demand pull. If it errors "no_gmail_connection", OAuth was only partially completed and you need to reconnect from Settings.',
      'Import contacts runs the suggestions algorithm: frequency-rank senders, drop noise, dedupe against existing contacts. What\'s left is what you import.',
      'Gmail-imported contacts don\'t carry a "source" tag — they look identical to manual contacts. Delete them from the contacts grid if you need to prune.',
    ],
  },
  'ai': {
    title: 'AI Assistance',
    icon: <Sparkle size={14} weight="duotone" />,
    tips: [
      'AI Insights bar (Contacts page) flags incomplete profiles and AI-suggested edits in real time.',
      'AI badges on contact rows mark fields the AI auto-populated — review them in the Tags column.',
      'Inside any email composer, click "✨ Draft with AI" to generate a contextual draft.',
      'In Bulk Email, AI keeps your {{firstName}} {{company}} merge fields intact so a single draft personalizes per recipient.',
      'AI multi-suggestion chips appear during contact entry when a company has multiple known offices.',
      'The "Ask AI" bar at the top of this Help panel answers natural-language questions about your CRM.',
      'AI features require your ANTHROPIC_API_KEY to be set in environment variables.',
    ],
    walkthrough: [
      'AI assistance is woven across the CRM — drafting, suggesting, flagging — wherever it saves keystrokes.',
      'On Contacts, the AI Insights bar monitors your data and flags incomplete profiles + recent suggestions.',
      'Contacts the AI has flagged show an "AI" badge in the Tags column — at-a-glance signal.',
      'Inside any single-contact email composer, "Draft with AI" pulls in the contact\'s recent activity to write a contextual first pass.',
      'In Bulk Email, the AI draft panel takes a goal + tone + length, then writes a draft with merge fields preserved.',
      'When entering a new contact at a company with multiple offices, AI suggests them as one-click chips.',
      'For anything else, the Ask AI input at the top of Help answers in natural language — no exact wording needed.',
    ],
  },
  'grids': {
    title: 'Grids',
    icon: <GridFour size={14} weight="duotone" />,
    tips: [
      'Every grid (Contacts, Sales, Recruiting, Documents) shares the same toolbar — learn it once.',
      'Click Columns to show/hide, drag to reorder, or pin a column to the left or right edge.',
      'Views let you save custom column layouts you can switch between.',
      'Density picks row height — Compact, Comfortable, or Spacious. Zebra striping toggles alternating rows.',
      'The Actions column is always pinned to the right edge — icons appear on row hover.',
      'Reset restores the default layout. Saved views are unaffected.',
    ],
    walkthrough: [
      "Every grid in the CRM uses the same toolbar — learn it once and you'll know how to work with every list in the app.",
      'Views save snapshots of your grid layout. Change columns and sort, then save it as "My view" to switch back anytime.',
      'Columns controls which columns are visible, their order, and their pinning. Pin left to keep Name visible; pin right to keep Actions visible.',
      'Density picks row height: Compact (info-dense), Comfortable (default), Spacious (easy scanning). Zebra striping is separate.',
      'Column headers are interactive — click to sort, drag the ⋮⋮ handle to reorder, click the funnel for a per-column filter, drag the right edge to resize.',
      'The Actions column (right edge) is always pinned. Edit and delete icons appear when you hover a row.',
      'Reset restores defaults. Saved views are untouched — switch to them from View: [name].',
    ],
  },
  '/notifications': {
    title: 'Notifications',
    icon: <BellRinging size={14} weight="duotone" />,
    tips: [
      'Alerts are color-coded by severity — blue (info), green (success), yellow (warning), red (critical).',
      'Hover over any alert to see Mark as Read (eye icon) and Dismiss (X) buttons.',
      'Use the gear icon to filter alert types and set a minimum severity threshold.',
      'Create Alert Rules to get automated alerts when deals go idle or exceed a threshold.',
      'Set Reminders with date/time, optional recurrence, and a link to any contact, deal, or document.',
      'Quick Alerts let you create one-off custom notifications for anything.',
    ],
    walkthrough: [
      'The Notification Center shows all your CRM alerts in one place.',
      'Alerts are grouped into New (unread) and Earlier (read) sections.',
      'Each alert has a severity level with a colored left border.',
      'Use the gear icon to customize which types and severities you see.',
      'Create Alert Rules, Reminders, or Quick Alerts from the footer button.',
    ],
  },
};

type HelpTab = 'tips' | 'tours' | 'resources';

export default function HelpPanel({ onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [subPanel, setSubPanel] = useState<'whats-new' | 'report-bug' | null>(null);
  const [activeTab, setActiveTab] = useState<HelpTab>('tips');

  // Tour state lives in Zustand — survives unmount/remount during navigation
  const activeWalkthrough = useTourStore((s) => s.activeWalkthrough);
  const walkthroughStep = useTourStore((s) => s.walkthroughStep);
  const startTour = useTourStore((s) => s.startTour);
  const exitTour = useTourStore((s) => s.exitTour);
  const setWalkthroughStep = useTourStore((s) => s.setWalkthroughStep);

  // Find the best section match for the current path
  const sectionKey = Object.keys(SECTION_HELP).find((k) => pathname.startsWith(k)) || '/dashboard';
  const section = SECTION_HELP[sectionKey];

  // Tour steps for the active walkthrough
  const tourSteps = activeWalkthrough ? (TOUR_STEPS[activeWalkthrough] || []) : [];
  const currentTourStep: TourStep | null = tourSteps[walkthroughStep] || null;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (activeWalkthrough && tourSteps.length > 0) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose, activeWalkthrough, tourSteps.length]);

  // Per-step navigateTo handling lives in ActiveTourOverlay (which stays
  // mounted for the entire tour). It used to live here, but HelpPanel
  // auto-closes on tour start, which meant only step 1's navigateTo ever
  // fired — every subsequent step was stuck on the wrong page.

  const walkthrough = activeWalkthrough ? SECTION_HELP[activeWalkthrough]?.walkthrough : null;

  // Tour rendering is handled by ActiveTourOverlay in Topbar — independent of this panel.
  // When a tour starts, close the help panel so it's not in the way.
  useEffect(() => {
    if (activeWalkthrough && tourSteps.length > 0) {
      onClose();
    }
  }, [activeWalkthrough, tourSteps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      className="fixed right-0 top-0 w-[400px] h-full bg-[var(--surface-card)] border-l border-[var(--border)] shadow-xl z-[60] flex flex-col animate-[fadeUp_0.15s_ease-out]"
    >
      {/* Sub-panels override the main content */}
      {subPanel === 'whats-new' ? (
        <WhatsNewPanel onBack={() => setSubPanel(null)} />
      ) : subPanel === 'report-bug' ? (
        <ReportBugPanel onBack={() => setSubPanel(null)} />
      ) : (
      <>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <Lifebuoy size={16} weight="duotone" className="text-[var(--brand-primary)]" />
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1">Help & Guidance</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Walkthrough mode */}
        {walkthrough ? (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={16} weight="duotone" className="text-[var(--brand-primary)]" />
              <span className="text-[12px] font-extrabold text-[var(--text-primary)]">
                {SECTION_HELP[activeWalkthrough!].title} Walkthrough
              </span>
              <span className="ml-auto text-[10px] font-bold text-[var(--text-tertiary)]">
                Step {walkthroughStep + 1} of {walkthrough.length}
              </span>
            </div>

            {/* Step content */}
            <div className="bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-lg p-4 mb-3">
              <div className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                {walkthrough[walkthroughStep]}
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {walkthrough.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWalkthroughStep(i)}
                  className={`w-2 h-2 rounded-full border-none cursor-pointer transition-all ${
                    i === walkthroughStep ? 'bg-[var(--brand-primary)] w-4' : i < walkthroughStep ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { exitTour(); }}
                className="text-[11px] font-bold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)]"
              >
                Exit tour
              </button>
              <div className="flex-1" />
              {walkthroughStep > 0 && (
                <button
                  onClick={() => setWalkthroughStep(walkthroughStep - 1)}
                  className="h-[30px] px-3 text-[11px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer"
                >
                  Back
                </button>
              )}
              {walkthroughStep < walkthrough.length - 1 ? (
                <button
                  onClick={() => setWalkthroughStep(walkthroughStep + 1)}
                  className="h-[30px] px-4 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => { exitTour(); }}
                  className="h-[30px] px-4 text-[11px] font-bold text-white bg-[var(--success)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
                >
                  Done ✓
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* AI Help — compact single-row */}
            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)]">
              <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-lg p-2 flex items-center gap-2">
                <Sparkle size={14} weight="duotone" className="text-[var(--ai)] flex-shrink-0" />
                <input
                  placeholder="Ask AI: How do I add a deal?"
                  className="flex-1 h-[26px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--ai)]"
                />
                <button className="h-[26px] px-2.5 text-[10px] font-bold text-white bg-[var(--ai)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90 whitespace-nowrap">
                  Ask
                </button>
              </div>
            </div>

            {/* Tab bar — pill-segment control (matches List/Card toggle pattern) */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full p-1 w-full">
                <TabButton active={activeTab === 'tips'} onClick={() => setActiveTab('tips')} label="Tips" icon={<Lightning size={12} weight="fill" />} />
                <TabButton active={activeTab === 'tours'} onClick={() => setActiveTab('tours')} label="Tours" icon={<Play size={10} weight="fill" />} />
                <TabButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} label="Resources" icon={<BookOpen size={12} weight="bold" />} />
              </div>
            </div>

            {/* Tab: Tips */}
            {activeTab === 'tips' && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  {section.icon}
                  <span className="text-[11px] font-extrabold text-[var(--text-primary)]">{section.title} Tips</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                      <Lightning size={10} weight="fill" className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
                {/* CTA to start the tour for this section */}
                {(() => {
                  const hasSectionTour = TOUR_STEPS[sectionKey] && TOUR_STEPS[sectionKey].length > 0;
                  if (!hasSectionTour) return null;
                  return (
                    <button
                      onClick={() => startTour(sectionKey)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[var(--brand-primary)] text-white text-[11px] font-bold border-none cursor-pointer hover:opacity-90"
                    >
                      <Play size={11} weight="fill" /> Start {section.title} tour · {TOUR_STEPS[sectionKey].length} steps
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Tab: Tours — compact rows, with recommended tour pinned first */}
            {activeTab === 'tours' && (
              <div className="px-4 py-3">
                {(() => {
                  const entries = Object.entries(SECTION_HELP);
                  const recommendedKey =
                    Object.keys(SECTION_HELP).find((k) => k !== 'grids' && pathname.startsWith(k))
                    || '/dashboard';
                  const recommended = entries.find(([k]) => k === recommendedKey);
                  const rest = entries
                    .filter(([k]) => k !== recommendedKey)
                    .sort(([, a], [, b]) => a.title.localeCompare(b.title));
                  return (
                    <>
                      {recommended && (
                        <>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--brand-primary)] mb-1.5">
                            Recommended for this page
                          </div>
                          <TourRow entry={recommended} pathname={pathname} router={router} startTour={startTour} highlight />
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mt-3 mb-1.5">
                            All tours
                          </div>
                        </>
                      )}
                      <div className="flex flex-col">
                        {rest.map((entry) => (
                          <TourRow key={entry[0]} entry={entry} pathname={pathname} router={router} startTour={startTour} />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Tab: Resources */}
            {activeTab === 'resources' && (
              <div className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <HelpLink
                    icon={<Keyboard size={12} />}
                    label="Keyboard shortcuts"
                    onClick={() => {
                      onClose();
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
                    }}
                  />
                  <HelpLink
                    icon={<BookOpen size={12} />}
                    label="Documentation"
                    onClick={() => {
                      onClose();
                      router.push('/admin');
                    }}
                    hint="Opens Admin → system docs"
                  />
                  <HelpLink
                    icon={<ChatCircle size={12} />}
                    label="Contact support"
                    onClick={() => {
                      window.open('mailto:paul@paulwentzellux.com?subject=Roadrunner CRM Support', '_blank');
                    }}
                    hint="Opens email"
                  />
                  <HelpLink
                    icon={<Compass size={12} />}
                    label="What's new"
                    onClick={() => setSubPanel('whats-new')}
                  />
                  <HelpLink
                    icon={<Flag size={12} />}
                    label="Report a bug"
                    onClick={() => setSubPanel('report-bug')}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count?: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer border-none transition-colors ${
        active
          ? 'bg-[var(--brand-primary)] text-white shadow-sm'
          : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon && <span className={active ? 'text-white' : 'text-[var(--text-tertiary)]'}>{icon}</span>}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className={`px-1.5 py-0 rounded-full text-[9px] font-extrabold ${
          active ? 'bg-white/20 text-white' : 'bg-[var(--surface-card)] text-[var(--text-tertiary)] border border-[var(--border)]'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function TourRow({
  entry,
  pathname,
  router,
  startTour,
  highlight,
}: {
  entry: [string, { title: string; icon: React.ReactNode; tips: string[]; walkthrough: string[] }];
  pathname: string;
  router: ReturnType<typeof useRouter>;
  startTour: (key: string) => void;
  highlight?: boolean;
}) {
  const [key, s] = entry;
  const hasTour = TOUR_STEPS[key] && TOUR_STEPS[key].length > 0;
  const stepCount = hasTour ? TOUR_STEPS[key].length : s.walkthrough.length;
  const GRID_PAGES = ['/contacts', '/sales', '/recruiting', '/documents'];
  const isGridTour = key === 'grids';
  // Route-agnostic tour keys — either not valid URLs (grids/lists/gmail),
  // or the tour deliberately starts somewhere other than its own key
  // (the contact-creation tours start on `/contacts` so the user sees the
  // "+ New Contact" entry point before being taken into the form). Each
  // of these tours seeds its own landing page via `navigateTo` on step 1,
  // so TourRow must NOT pre-navigate based on the key.
  const ROUTE_AGNOSTIC_KEYS = new Set([
    'grids',
    'lists',
    'gmail',
    '/contacts/new/person',
    '/contacts/new/company',
  ]);
  return (
    <button
      onClick={() => {
        if (isGridTour) {
          if (!GRID_PAGES.some((p) => pathname.startsWith(p))) router.push('/contacts');
        } else if (
          pathname !== key
          && key !== '/'
          && key !== '/notifications'
          && !ROUTE_AGNOSTIC_KEYS.has(key)
        ) {
          router.push(key);
        }
        startTour(key);
      }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-transparent cursor-pointer text-left w-full group transition-colors ${
        highlight
          ? 'bg-[var(--brand-bg)] border border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]'
          : 'border border-transparent hover:bg-[var(--surface-raised)]'
      }`}
    >
      <span className={highlight ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)]'}>
        {s.icon}
      </span>
      <span className={`flex-1 text-[12px] font-semibold ${highlight ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>
        {s.title}
      </span>
      <span className="text-[9px] font-bold text-[var(--text-tertiary)]">{stepCount} steps</span>
      <Play size={10} weight="fill" className={highlight ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)]'} />
    </button>
  );
}

function HelpLink({ icon, label, onClick, hint }: { icon: React.ReactNode; label: string; onClick?: () => void; hint?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left w-full group"
    >
      <span className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)]">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">{label}</span>
        {hint && <div className="text-[9px] text-[var(--text-tertiary)]">{hint}</div>}
      </div>
      <ArrowRight size={10} className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)]" />
    </button>
  );
}

function WhatsNewPanel({ onBack }: { onBack: () => void }) {
  const updates = [
    { version: '2.1', date: 'Apr 16, 2026', items: [
      'Documents module — upload, preview, grid/card views',
      'Recruiting pipeline — kanban + list views with AI match scores',
      'Reporting dashboard — KPIs, pipeline funnel, revenue charts',
      'Admin dashboard — users, roles, audit log, AI usage',
      'Alert system — 22 types, 4 severities, custom alerts',
      'Interactive guided walkthroughs per section',
      'Keyboard shortcuts (press ? anywhere)',
    ]},
    { version: '2.0', date: 'Apr 15, 2026', items: [
      'Customizable dashboard with draggable widgets',
      'Per-widget settings — icon, colors, text size, alignment',
      'Sales lead types — person-first and company-first',
      'Completeness progress bar on deal profiles',
      'Drag-to-change-stage on kanban boards',
    ]},
    { version: '1.0', date: 'Apr 13, 2026', items: [
      'Contacts module — person + org types, grid + card views',
      'Sales pipeline — list + kanban views',
      'AI auto-populate, duplicate detection, deal scoring',
      'Dark/light theme with Acme design tokens',
    ]},
  ];

  return (
    <>
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <button onClick={onBack} className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">
          <ArrowRight size={14} weight="bold" className="rotate-180" />
        </button>
        <Compass size={16} weight="duotone" className="text-[var(--brand-primary)]" />
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1">What&apos;s New</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {updates.map((u) => (
          <div key={u.version} className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-[var(--brand-primary)]">v{u.version}</span>
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{u.date}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {u.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

function ReportBugPanel({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [bugErrors, setBugErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Summary is required';
    else if (title.trim().length < 5) errs.title = 'Summary must be at least 5 characters';
    setBugErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); onBack(); }, 2000);
  };

  return (
    <>
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <button onClick={onBack} className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">
          <ArrowRight size={14} weight="bold" className="rotate-180" />
        </button>
        <Flag size={16} weight="duotone" className="text-[var(--danger)]" />
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1">Report a Bug</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-10 h-10 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
              <Flag size={20} weight="fill" className="text-[var(--success)]" />
            </div>
            <div className="text-[13px] font-bold text-[var(--text-primary)]">Bug reported!</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">Thank you — we&apos;ll look into it.</div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">What went wrong? <span className="text-[var(--danger)]">*</span></label>
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (bugErrors.title) setBugErrors((p) => ({ ...p, title: '' })); }}
                placeholder="Brief summary of the issue"
                className={`w-full h-[34px] px-2.5 border rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none ${bugErrors.title ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
              />
              {bugErrors.title && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{bugErrors.title}</div>}
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">Steps to reproduce</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What were you doing when the bug happened?"
                rows={4}
                className="w-full px-2.5 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none resize-y focus:border-[var(--brand-primary)]"
              />
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              Current page: <span className="font-bold text-[var(--text-secondary)]">{typeof window !== 'undefined' ? window.location.pathname : ''}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className={`h-[34px] px-4 text-[12px] font-bold text-white rounded-[var(--radius-sm)] border-none ${
                title.trim() ? 'bg-[var(--brand-primary)] cursor-pointer hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
              }`}
            >
              Submit Bug Report
            </button>
          </>
        )}
      </div>
    </>
  );
}
