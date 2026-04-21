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
  | 'note_added';

export type ActivityLogCategory = 'field' | 'relationship' | 'status' | 'entry' | 'note';

export interface ActivityLogEntry {
  id: string;
  contactId: string;
  eventType: ActivityLogEventType;
  category: ActivityLogCategory;
  field: string;           // e.g. "Phone Number", "Email", "Title"
  action: string;          // "added", "updated", "removed", "created"
  oldValue?: string;
  newValue?: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  createdAt: string;       // ISO or display string
  timestamp: number;       // epoch ms for sorting
}
