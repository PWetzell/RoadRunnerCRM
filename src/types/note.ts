export type NoteTag = 'Phone Call' | 'Left Message' | 'Instant Messaged' | 'Email' | 'Meeting'
  | 'Investigate' | 'Trade Show' | 'Cold Call' | 'Contact Morning' | 'High Priority'
  | 'Small Business' | 'Large Business' | 'Enterprise';

export type NoteType = 'Sales' | 'Support' | 'General' | 'Follow-up' | 'Meeting' | 'Call Log';

export interface Note {
  id: string;
  contactId: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  location: string;
  body: string;
  pinned: boolean;
  tags: NoteTag[];
  noteType?: NoteType;
  createdAt: string;
}
