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
  '/contacts': [
    {
      content: 'This is your contact list — everyone you do business with. Filter by All, Organizations, or People.',
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
      content: 'Use the search bar to find contacts by name, company, email, or any field.',
      target: 'topbar-search',
      placement: 'bottom',
    },
    {
      content: 'The sidebar navigation takes you to any section of the CRM. The badge shows incomplete contacts.',
      target: 'sidebar-nav',
      placement: 'right',
    },
  ],
  '/sales': [
    {
      content: 'The Sales module tracks your deals from Lead to Closed Won. Switch between List, Card, and Status views.',
      target: 'sales-filter-bar',
      placement: 'bottom',
    },
    {
      content: 'The AI Pipeline Forecast shows weighted revenue, total open pipeline, and highlights stalled deals.',
      target: 'sales-insights',
      placement: 'bottom',
    },
    {
      content: 'Your deals appear here. In List view you get a full data grid with sort, search, drag-to-reorder columns, and column visibility controls.',
      target: 'sales-grid',
      placement: 'top',
    },
    {
      content: 'Filter deals by type — People or Company — to focus on individual candidates or corporate clients.',
      target: 'sales-type-filter',
      placement: 'bottom',
    },
    {
      content: 'Filter by deal stage — All, Open, Won, or Lost — to quickly narrow your pipeline view.',
      target: 'sales-stage-filter',
      placement: 'bottom',
    },
    {
      content: 'Create a new lead directly from here. The form slides out from the right with full validation on every field.',
      target: 'sales-new-lead',
      placement: 'bottom',
    },
  ],
  '/recruiting': [
    {
      content: 'The Recruiting module visualizes your candidate pipeline. Data is projected from your Sales deals — person-type deals become placements.',
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
