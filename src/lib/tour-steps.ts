/**
 * Guided walkthrough step definitions. Each step has:
 *   - content: the instructional text shown in the tooltip
 *   - target: a data-tour value or CSS selector to spotlight
 *   - placement: where the tooltip goes relative to the target
 *   - navigateTo: optional URL to navigate to before showing (for cross-page tours)
 *   - clickTarget: if true, click the target element when the step is shown
 *   - showSettingsPreview: if true, show inline widget settings preview
 *
 * Steps are grouped by section. The HelpPanel picks the right set based
 * on the current page.
 */

export interface TourStep {
  content: string;
  target: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  navigateTo?: string;
  clickTarget?: boolean;
  showSettingsPreview?: boolean;
}

export const TOUR_STEPS: Record<string, TourStep[]> = {
  '/notifications': [
    {
      content: 'Click the bell icon to open your Notification Center. The badge shows how many unread alerts you have.',
      target: 'topbar-notifications',
      placement: 'bottom',
      clickTarget: true,
    },
    {
      content: 'The header shows the count of new (unread) alerts. Use "Mark all read" to clear them at once, or hover over any alert and click the eye icon to mark just that one as read.',
      target: 'alert-header',
      placement: 'bottom',
    },
    {
      content: 'Alerts are color-coded by severity: blue for info, green for success, yellow for warnings, and red for critical. Unread alerts have a tinted background.',
      target: 'alert-list',
      placement: 'left',
    },
    {
      content: 'Click the gear icon to customize which alert types you see and set a minimum severity threshold. You can also toggle desktop notifications and sound alerts.',
      target: 'alert-settings-btn',
      placement: 'bottom',
    },
    {
      content: 'Create custom alerts here. Choose from three types: Alert Rules (automated triggers based on deal or contact conditions), Reminders (scheduled with optional recurrence), or Quick Alerts (one-off manual notes).',
      target: 'alert-create-btn',
      placement: 'top',
    },
  ],
  '/dashboard': [
    {
      content: 'Welcome to your Dashboard — your CRM command center. These widgets show key metrics at a glance.',
      target: 'dashboard-grid',
      placement: 'top',
    },
    {
      content: 'Switch between preset views here. Each role (Sales Rep, Recruiter, Manager) has a different default layout.',
      target: 'dashboard-view-picker',
      placement: 'bottom',
    },
    {
      content: 'Add new widgets to customize your view. Choose from KPIs, charts, lists, to-dos, and AI suggestions.',
      target: 'dashboard-add-widget',
      placement: 'bottom',
    },
    {
      content: 'Each widget has a gear icon for settings — change the header color, icon, text size, and alignment.',
      target: 'widget-settings',
      placement: 'left',
      showSettingsPreview: true,
    },
    {
      content: 'Use these pills to quickly resize widgets between Compact, Medium, and Wide.',
      target: 'widget-size-pills',
      placement: 'bottom',
    },
    {
      content: 'The bell icon shows your notifications. You can filter by type and severity, and create custom alerts.',
      target: 'topbar-notifications',
      placement: 'bottom',
    },
    {
      content: 'Click the question mark any time for contextual help and guided walkthroughs like this one.',
      target: 'topbar-help',
      placement: 'bottom',
    },
  ],
  /**
   * Cross-page tour for creating a Person. Walks through the actual click
   * flow a first-time user takes. IMPORTANT: clickTarget fires on step
   * mount, so it MUST only be used when the click reveals something
   * in-place (e.g. opens a slide panel or dropdown). It must NOT be used
   * when the click navigates away — the spotlight unmounts before the
   * bubble ever renders. Navigation between pages is done via
   * `navigateTo` on the NEXT step (triggered on user's Next press).
   */
  '/contacts/new/person': [
    {
      content: 'Let\'s add a person. Every new contact in Roadrunner starts with the "+ New Contact" button on the Contacts page — we\'ll auto-open it for you. When you hit Next, pick Person from the chooser that appears on the right.',
      target: 'new-contact-btn',
      placement: 'left',
      navigateTo: '/contacts',
      // clickTarget opens the chooser SlidePanel in-place so step 2 can
      // find `contact-type-person` inside it. The button itself does NOT
      // navigate away, so the step-1 bubble stays put.
      clickTarget: true,
    },
    {
      content: 'The chooser has three choices: Person for an individual, Company for an org, or the Upload Resume card below to have AI extract fields from a PDF/DOCX and prefill the form. Hit Next to follow us into the Person flow.',
      target: 'contact-type-person',
      placement: 'left',
      // NO clickTarget — clicking a type card NAVIGATES, which would
      // unmount this bubble before the user can read it. Instead, the
      // next step carries `navigateTo: '/contacts/new/person'` so
      // pressing Next takes the user there.
    },
    {
      content: 'Welcome to the Person creation flow. The breadcrumb shows which step you\'re on — the form has 3 steps: Basic Info → Organization → Relationship. Click any crumb to jump around after you\'ve touched a step.',
      target: 'person-breadcrumb',
      placement: 'bottom',
      navigateTo: '/contacts/new/person',
    },
    {
      content: 'Step 1 — Basic Info. Name (first/last required), prefix/suffix, email + type, phone + extension + type, and job title. Live validation runs as you type — no need to hit Save to see what\'s wrong.',
      target: 'person-step-basic',
      placement: 'right',
    },
    {
      content: 'The AI sidebar runs alongside each step. On step 1 it\'s Duplicate Detection — as you type a name or email, it queries real public sources (GitHub, Wikidata, LinkedIn) for existing matches. Click a candidate to merge instead of creating a duplicate.',
      target: 'person-ai-sidebar',
      placement: 'left',
    },
    {
      content: 'Step 2 (Organization) links the person to a company, sets department, reports-to, and role level. Step 3 (Relationship) classifies as Client / Prospect / Partner / etc. and flips the Private toggle if you don\'t want teammates to see the record. Hit Save on step 3 and the person lands in the grid.',
      target: 'person-breadcrumb',
      placement: 'bottom',
    },
  ],
  /**
   * Cross-page tour for creating a Company. Same entry-point flow as the
   * Person tour — same clickTarget / navigateTo discipline.
   */
  '/contacts/new/company': [
    {
      content: 'Let\'s add a company. Same entry point as a person — the "+ New Contact" button on the Contacts page. We\'ll auto-open it for you; hit Next and pick Company from the chooser.',
      target: 'new-contact-btn',
      placement: 'left',
      navigateTo: '/contacts',
      clickTarget: true,
    },
    {
      content: 'The chooser shows Person, Company, and Upload Resume. For an employer / client / vendor / any org record, pick Company. Hit Next to follow us into the Company flow.',
      target: 'contact-type-company',
      placement: 'left',
      // NO clickTarget — see Person tour comment above. The next step
      // carries `navigateTo: '/contacts/new/company'`.
    },
    {
      content: 'Welcome to the Company creation flow. The breadcrumb shows 4 steps: Details → AI Enrichment → Relationships → Confirm.',
      target: 'company-breadcrumb',
      placement: 'bottom',
      navigateTo: '/contacts/new/company',
    },
    {
      content: 'Step 1 — Company Details. Name is required; website, industry, size, phone, founded year, HQ, and description are validated as you type. As you type a name, the AI sidebar searches Clearbit, Crunchbase, SEC EDGAR, and OpenCorporates for existing matches.',
      target: 'company-step-details',
      placement: 'right',
    },
    {
      content: 'The AI Enrichment Preview sidebar shows what public data AI will pull in on the next step — industry, HQ, size, and social links sourced from real providers. Every row has a source badge so the data is traceable.',
      target: 'company-ai-sidebar',
      placement: 'left',
    },
    {
      content: 'Step 2 (AI Enrichment) lets you accept or reject each suggested field one by one — nothing auto-saves. Step 3 (Relationships) links the new company to existing records. Step 4 (Confirm) is the final review before Save.',
      target: 'company-breadcrumb',
      placement: 'bottom',
    },
  ],
  '/contacts': [
    {
      content: 'Contacts are the foundation of Roadrunner CRM — Sales deals, Recruiting candidates, and Documents all link back to the records you create here. This page is where you browse them.',
      target: 'contacts-filter-bar',
      placement: 'bottom',
    },
    {
      content: 'Filter by All, Organizations, or People. The type pills also filter the AI Insights bar below.',
      target: 'contacts-filter-bar',
      placement: 'bottom',
    },
    {
      content: 'The AI Insights bar monitors your contacts and flags incomplete profiles or recent AI activity.',
      target: 'contacts-insights',
      placement: 'bottom',
    },
    {
      content: 'Your contacts appear here in a sortable grid. Click any row to open their full profile with Overview, Details, Org Chart, and Documents tabs.',
      target: 'contacts-grid',
      placement: 'top',
    },
    {
      content: 'Use the search bar to find contacts by name, company, email, or any field. Click the X (or press Esc) to clear it.',
      target: 'topbar-search',
      placement: 'bottom',
    },
    {
      content: 'The Density button switches row height: Compact (~20px, fits ~40 rows) / Comfortable / Spacious. Pick what suits your scanning style.',
      target: 'grid-density-menu',
      placement: 'bottom',
    },
    {
      content: 'The sidebar navigation takes you to any section of the CRM. Click "Manage Emails" to expand Bulk + Sequencing.',
      target: 'sidebar-nav',
      placement: 'right',
    },
  ],
  '/bulk': [
    {
      content: 'Welcome to Bulk Email. Send personalized messages to many recipients at once and track delivery for every one.',
      target: 'bulk-header',
      placement: 'bottom',
    },
    {
      content: 'Live stats across every batch you\'ve sent: total messages, batches, delivery rate, and unique recipients.',
      target: 'bulk-stats',
      placement: 'bottom',
    },
    {
      content: 'Search by subject, recipient, or template. Sort by newest, most recipients, or delivery rate.',
      target: 'bulk-search-sort',
      placement: 'bottom',
    },
    {
      content: 'Click here to compose a new bulk send — pick recipients, apply a template or use AI draft, and send with merge fields.',
      target: 'bulk-new-send',
      placement: 'left',
    },
    {
      content: 'Each batch shows the subject, attachment count, and live delivery progress. Hover any row to reveal the trash icon.',
      target: 'bulk-feed',
      placement: 'top',
    },
  ],
  '/sequences': [
    {
      content: 'Sequences are multi-step email cadences that pace your follow-ups across days. Pick one from the left or click "+ New" to start.',
      target: 'seq-list-panel',
      placement: 'right',
    },
    {
      content: 'Timeline strip — shows when this sequence was created, last edited, total cadence length, and when your most-recent enrollment will wrap.',
      target: 'seq-timeline',
      placement: 'bottom',
    },
    {
      content: 'Performance dashboard. Live stats: active enrollments, completed cadences, replied contacts, and reply rate. The funnel below shows step-by-step drop-off.',
      target: 'seq-analytics',
      placement: 'bottom',
    },
    {
      content: 'Each step is a collapsible accordion with a Day-N badge. "Day 0" sends on enrollment; later steps fire after the configured delay.',
      target: 'seq-steps',
      placement: 'top',
    },
    {
      content: 'Contacts enrolled in this sequence. Click "Send next step" on any due row to fire the email manually. Reply detection auto-stops on inbound replies.',
      target: 'seq-enrollments',
      placement: 'top',
    },
  ],
  'ai': [
    {
      content: 'AI assistance is woven throughout the CRM. Let\'s tour the major surfaces — drafting, suggestions, and contextual flags.',
      target: 'sidebar-nav',
      placement: 'right',
      navigateTo: '/contacts',
    },
    {
      content: 'AI Insights bar — monitors your contacts in real time. Flags incomplete profiles and shows recent AI-suggested edits.',
      target: 'contacts-insights',
      placement: 'bottom',
    },
    {
      content: 'Contacts the AI has flagged show an "AI" badge in the Tags column. Clicking the contact opens their detail page where you can review/accept the suggestions.',
      target: 'contacts-grid',
      placement: 'top',
    },
    {
      content: 'Inside any single-contact email composer, "Draft with AI" pulls the contact\'s recent activity to write a contextual first draft.',
      target: 'ai-draft-single',
      placement: 'top',
    },
    {
      content: 'In Bulk Email, the AI draft panel takes a goal + tone + length, then writes a single draft that personalizes per recipient via merge fields.',
      target: 'bulk-ai-draft',
      placement: 'top',
      navigateTo: '/bulk',
    },
  ],
  // Sales tour removed alongside the sidebar Sales nav entry — pulled
  // from the demo until the sales-grid pill styling is reconciled with
  // the contacts/recruiting grids.
  '/recruiting': [
    {
      content: 'The Recruiting module visualizes your candidate pipeline. Data is projected from your Sales deals — person-type deals become candidates.',
      target: 'recruiting-insights',
      placement: 'bottom',
    },
    {
      content: 'Switch between List, Card, and Pipeline views. Card view shows one card per candidate. Pipeline view is a kanban board grouped by stage.',
      target: 'recruiting-view-toggle',
      placement: 'bottom',
    },
    {
      content: 'Each column is a recruiting stage. Drag cards between columns to update a candidate\'s status. Click any card to view their full profile.',
      target: 'recruiting-pipeline',
      placement: 'top',
    },
    {
      content: 'Use the Filters button to narrow candidates by stage, date range, or source. Filter counts show how many are active.',
      target: 'recruiting-filters',
      placement: 'bottom',
    },
  ],
  '/documents': [
    {
      content: 'The Documents module manages all files in your CRM — resumes, contracts, invoices, proposals, and more. Filter by category or search by name.',
      target: 'documents-filter-bar',
      placement: 'bottom',
    },
    {
      content: 'Switch between List and Card views. Card view shows a content preview of each file so you can see what\'s inside without opening it.',
      target: 'documents-grid',
      placement: 'top',
    },
    {
      content: 'Upload files here. Accepted types: BMP, CSV, DOC, DOCX, GIF, JPG, MOV, MP3, MP4, PNG, PPT, PPTX, PDF, RTF, SVG, TXT, WAV, XLS, XLSX, ZIP.',
      target: 'documents-upload',
      placement: 'bottom',
    },
  ],
  '/reporting': [
    {
      content: 'The AI Report Summary gives you an instant snapshot — win rate, weighted forecast, and key pipeline metrics.',
      target: 'reporting-ai-summary',
      placement: 'bottom',
    },
    {
      content: 'Reporting has two tabs. "Report Dashboards" are multi-widget packets — the grid you\u2019re looking at now. "Report Library" is where you build reusable single-metric reports that can be dropped onto any dashboard.',
      target: 'reporting-tabs',
      placement: 'bottom',
    },
    {
      content: 'Switch between dashboards. Preset dashboards (Pipeline Health, Revenue, Team Performance…) come with the template; your own custom dashboards show a CUSTOM label and can be renamed or deleted.',
      target: 'reporting-views',
      placement: 'bottom',
    },
    {
      content: 'Rename or delete the current dashboard. These actions only appear on dashboards you created — presets are protected.',
      target: 'reporting-view-actions',
      placement: 'bottom',
    },
    {
      content: 'Add widgets to the current dashboard. KPIs, pipeline charts, activity lists, AI suggestions — and any custom report you\u2019ve saved in the Report Library appears here as a drop-in widget.',
      target: 'reporting-add-widget',
      placement: 'bottom',
    },
    {
      content: 'The widget canvas. Each widget has a gear icon for customization (header color, icon, text sizes, content alignment). Drag to reorder, resize with the corner handle.',
      target: 'reporting-charts',
      placement: 'top',
    },
    {
      content: 'Export widget data as CSV for Excel / Google Sheets, or as a print-formatted PDF that mirrors the dashboard layout.',
      target: 'reporting-export',
      placement: 'bottom',
    },
    {
      content: 'Print the dashboard. Each widget\u2019s customizations — colors, sizes, titles — carry through to the printed 8.5\u00d711 PDF.',
      target: 'reporting-print',
      placement: 'bottom',
    },
    {
      content: 'Now let\u2019s switch to the Report Library. Click the "Report Library" tab to follow along, then press Next.',
      target: 'reporting-tabs',
      placement: 'bottom',
    },
    {
      content: 'The Report Library holds reusable single-metric reports. Use the toolbar to search, filter by source (Deals / Contacts / Documents / Cross-object), Print All filtered reports as one PDF packet, or click "+ New Report" to open the Report Builder.',
      target: 'reporting-library-toolbar',
      placement: 'bottom',
    },
    {
      content: 'Each card shows the actual live data so you can recognize it at a glance. The "Live on N dashboards" badge tells you where it\u2019s in use — click it to see the list. Primary actions on every card: Print (opens a full 8.5\u00d711 preview before your browser\u2019s print dialog) and CSV (self-describing data file). The "…" kebab has Edit, Duplicate, and Delete.',
      target: 'reporting-library-grid',
      placement: 'top',
    },
    {
      content: 'Hover any card to reveal its selection checkbox. Pick 2+ reports and a floating action bar appears: "Compose dashboard" spins up a new Report Dashboard from the selection, or "Print selected" builds a multi-page PDF packet.',
      target: 'reporting-library-grid',
      placement: 'top',
    },
  ],
  '/settings': [
    {
      content: 'Welcome to Settings — the control center for how the CRM looks and behaves. Every preference here is saved per-user and persists across sessions.',
      target: 'settings-ai',
      placement: 'bottom',
    },
    {
      content: 'AI Insights is the master switch for every AI feature: duplicate detection, enrichment, record-health, suggestions, and all the "AI Insights" bars across the app. Flip it off and every AI surface hides app-wide.',
      target: 'settings-ai',
      placement: 'bottom',
    },
    {
      content: 'Account holds your profile. Click Edit next to Name or Email to change them — live validation catches empty values and bad email formats. "Change" opens a password form that requires the current password and confirms the new one.',
      target: 'settings-account',
      placement: 'bottom',
    },
    {
      content: 'Appearance toggles light / dark mode. The theme applies instantly across every page and is remembered next time you sign in.',
      target: 'settings-appearance',
      placement: 'bottom',
    },
    {
      content: 'Grid Density sets how tight or relaxed the data grids look across Contacts, Sales, Recruiting, and Documents. Compact fits 30+ rows; Comfortable is the default; Spacious matches the original look. Zebra striping toggles alternate-row backgrounds.',
      target: 'settings-grid-density',
      placement: 'bottom',
    },
    {
      content: 'Contacts sets the default filter (All, Organizations, or People) used when you open the Contacts page.',
      target: 'settings-contacts',
      placement: 'bottom',
    },
    {
      content: 'Sidebar Badges control which of the left-nav items show alert count chips — Contacts (incomplete profiles), Sales (stalled deals), Recruiting (needs action), and Documents (uncategorized).',
      target: 'settings-sidebar-badges',
      placement: 'top',
    },
    {
      content: 'Page Insights Bars toggle the AI insights strip at the top of each workspace. These are AI-branded — turning off the master AI Insights switch above disables this whole section.',
      target: 'settings-insights-bars',
      placement: 'top',
    },
    {
      content: 'Notifications fine-tunes what the CRM alerts you about: weekly email summaries, incomplete-contact warnings, and AI suggestions. The AI-gated ones sit under the master AI Insights toggle.',
      target: 'settings-notifications',
      placement: 'top',
    },
  ],
  '/admin': [
    {
      content: 'System Health shows the real-time status of all CRM services — API, database, AI engine, and file storage.',
      target: 'admin-system-health',
      placement: 'bottom',
    },
    {
      content: 'Manage your team here. Invite new users, assign roles, and control what each person can access across the CRM.',
      target: 'admin-user-mgmt',
      placement: 'bottom',
    },
    {
      content: 'Roles & Permissions lets you define custom access levels. Control who can view, edit, delete, and export data in each module.',
      target: 'admin-roles',
      placement: 'bottom',
    },
    {
      content: 'The Audit Log tracks every action in the system — who did what and when. Filter by user, action type, or date range.',
      target: 'admin-audit-log',
      // ConfigurableCard renders cardId as data-tour
      placement: 'bottom',
    },
    {
      content: 'Data Management has tools for bulk import, export, deduplication, and cleanup. Use this to maintain data quality.',
      target: 'admin-data-mgmt',
      placement: 'bottom',
    },
  ],
  /**
   * Route-agnostic tour — Saved Lists. Starts by navigating INTO an actual
   * filtered list view so the user sees what a list looks like before we
   * explain how to build one. Then walks through the sidebar pin manager,
   * the bookmark-to-save flow on a record, and the Favorites star.
   */
  'lists': [
    {
      content: 'Saved Lists are how you group contacts, deals, and documents — like "Q2 High Priority" or "Portsmouth Branch". We\'ve loaded an example: the "Portsmouth" list filtered down to just the records in that list. This chip at the top tells you the grid is list-filtered — click the X on the chip to clear it and see the full grid again.',
      target: 'list-filter-chip',
      placement: 'bottom',
      // Jump straight into a seed list so the user sees what a filtered
      // list view actually looks like. list-contacts-portsmouth has 3
      // members (org-1, org-4, per-1) and ships with the demo data.
      navigateTo: '/contacts?list=list-contacts-portsmouth',
    },
    {
      content: 'This is the grid, filtered to only the records in the list. Everything else (sort, search, column controls) still works — the list is just a filter layered on top. Clear the chip and you\'re back to the full contact list.',
      target: 'contacts-grid',
      placement: 'top',
    },
    {
      content: 'Lists you\'ve pinned appear in the left sidebar under SAVED LISTS. One click jumps straight to the filtered grid for that list — the same view you\'re looking at now was reached that way.',
      target: 'sidebar-pinned-lists',
      placement: 'right',
    },
    {
      content: 'The gear icon on the SAVED LISTS header opens the Pin Manager — a dropdown of every list you own where you check the ones you want pinned to the sidebar. Click it yourself after the tour to try it; we\'re not auto-opening it here because the dropdown would sit right where this bubble is.',
      target: 'lists-pin-manager',
      placement: 'right',
      // NO clickTarget — the Pin Manager dropdown opens directly over
      // where the bubble would sit. The user can open it themselves.
    },
    {
      content: 'Now let\'s add a record to a list. We\'re taking you to Sarah Chen\'s contact page and opening the Save to List picker from the bookmark icon in her header — watch the right side of the screen.',
      target: 'detail-save-to-list',
      placement: 'left',
      navigateTo: '/contacts/per-1',
      // clickTarget fires in-place (opens the Save-to-list portal) so
      // step 6 can spotlight the "Create new list" button inside it.
      clickTarget: true,
    },
    {
      content: '"Create new list" (at the top of the open picker) makes a new list tied to the record\'s type — contact, deal, or document — and drops the current record into it. You pick the name and visibility: Private (only you) or Public (sidebar-pinnable for the whole team).',
      target: 'save-to-list-create',
      placement: 'left',
    },
    {
      content: 'Last stop: the Star icon next to the Bookmark. That\'s Favorites — a built-in list that already exists for every record type (contacts, deals, documents). One click toggles the record in or out. Good for the 5–10 records you touch most often.',
      target: 'detail-favorite-star',
      placement: 'bottom',
    },
  ],
  /**
   * Gmail integration tour — connection banner, manual sync, contact import.
   * Launches with navigateTo /contacts because the GmailSyncBanner renders
   * at the top of the contacts page, so every anchor is guaranteed visible.
   * Copy is deliberately honest about the "synced 11h ago but Sync now
   * fails" case: the banner shows stored state, the button does a live pull
   * which can fail if the OAuth refresh token is missing.
   */
  'gmail': [
    {
      content: 'The Gmail integration pulls email activity into the CRM — inbound and outbound messages get matched to the right contact automatically. The banner at the top of Contacts is where you manage the connection.',
      target: 'gmail-banner',
      placement: 'bottom',
      navigateTo: '/contacts',
    },
    {
      content: 'The banner shows three things: the account you connected, how many messages Roadrunner has pulled so far, and when the last sync ran. "Synced 11h ago" is the timestamp of your last successful pull — it does not mean a sync is happening right now.',
      target: 'gmail-banner',
      placement: 'bottom',
    },
    {
      content: 'Sync now triggers an on-demand pull of the newest inbox pages. If it fails with "no_gmail_connection", your stored auth row is missing a refresh token — usually because Google OAuth was partially completed. Reconnect from Settings to fix.',
      target: 'gmail-sync-now',
      placement: 'bottom',
    },
    {
      content: 'Import contacts scans your most frequent senders, strips noise (no-reply, notifications, marketing), dedupes against contacts you already have, and offers what\'s left. Each one you import gets its past emails auto-linked to its contact timeline.',
      target: 'gmail-import',
      placement: 'bottom',
    },
    {
      content: 'Two things worth knowing. First: contacts imported from Gmail look identical to manually-created ones — there is no "remove Gmail contacts" button, so delete them from the contacts grid if you want them gone. Second: new messages from senders already in your CRM attach silently in the background, no action needed.',
      target: 'gmail-banner',
      placement: 'bottom',
    },
  ],
  /**
   * Route-agnostic tour — teaches the shared grid controls that appear in
   * every list view (Contacts, Sales, Recruiting, Documents, Custom Reports).
   * Launched from the Help panel with a preceding navigate-to /contacts so
   * there's always a grid on screen.
   */
  'grids': [
    {
      content: "Every grid in the CRM uses the same toolbar. Learn it once and you'll know how to work with lists of contacts, deals, candidates, and documents.",
      target: 'grid-toolbar',
      placement: 'bottom',
    },
    {
      content: 'Views save a snapshot of your grid layout — which columns are shown, in what order, sorted how. Click Save to keep a custom view you can switch back to anytime.',
      target: 'grid-view-menu',
      placement: 'bottom',
    },
    {
      content: 'Click Columns to show or hide any column, drag the ⋮⋮ handles to reorder them, or click a pin icon to lock a column to the left or right edge — great for keeping the Name column visible when scrolling.',
      target: 'grid-columns-menu',
      placement: 'bottom',
      clickTarget: true,
    },
    {
      content: 'Density controls row height — Compact fits more rows on screen, Spacious gives each row room to breathe. Zebra striping alternates row backgrounds so your eye tracks across wide tables.',
      target: 'grid-density-menu',
      placement: 'bottom',
    },
    {
      content: 'Click a header to sort. Drag the ⋮⋮ handle to reorder columns inline. The funnel icon opens a per-column filter. Drag the right edge of a header to resize.',
      target: 'grid-header-row',
      placement: 'bottom',
    },
    {
      content: 'The Actions column is always pinned to the right edge. Edit and delete icons appear when you hover a row — no scrolling back to the start of the row.',
      target: 'grid-actions-col',
      placement: 'left',
    },
    {
      content: 'Lost track of your layout? Reset restores the default columns, widths, sorting, filters, and pinning. Saved views are unaffected.',
      target: 'grid-reset',
      placement: 'bottom',
    },
    {
      content: 'The count on the right updates live as you filter or search. Combine it with the search bar, list filter, and type pills at the top to narrow results.',
      target: 'grid-count',
      placement: 'left',
    },
  ],
};

/**
 * Find the best tour for a given pathname. Falls back to /dashboard
 * if no exact match is found, and tries prefix matches for sub-routes
 * like /contacts/per-1.
 */
export function getTourForPath(pathname: string): TourStep[] {
  if (TOUR_STEPS[pathname]) return TOUR_STEPS[pathname];
  const prefix = Object.keys(TOUR_STEPS).find((k) => pathname.startsWith(k) && k !== '/');
  if (prefix) return TOUR_STEPS[prefix];
  return TOUR_STEPS['/dashboard'];
}
