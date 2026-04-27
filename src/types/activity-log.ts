export type ActivityLogEventType =
  | 'field_update'
  | 'entry_added'
  | 'entry_removed'
  | 'contact_created'
  | 'relationship_change'
  | 'tag_change'
  | 'status_change'
  | 'title_change'
  | 'org_transfer'
  | 'industry_change'
  | 'note_added'
  | 'email_sent'
  | 'email_received'
  | 'email_opened'
  | 'email_clicked';

export type ActivityLogCategory = 'field' | 'relationship' | 'status' | 'entry' | 'note' | 'email';

export interface ActivityLogEntry {
  id: string;
  contactId: string;
  eventType: ActivityLogEventType;
  category: ActivityLogCategory;
  field: string;           // e.g. "Phone Number", "Email", "Title"
  action: string;          // "added", "updated", "removed", "created"
  oldValue?: string;
  newValue?: string;
  snippet?: string;        // email preview text (not strike-through like oldValue)
  archived?: boolean;      // email archived — still shown here, hidden from Emails tab
  author: string;
  authorInitials: string;
  authorColor: string;
  createdAt: string;       // ISO or display string
  timestamp: number;       // epoch ms for sorting
}
