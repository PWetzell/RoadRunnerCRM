import { ActivityLogEntry } from '@/types/activity-log';

// Helper to create timestamps relative to "now" for realistic ordering
const ago = (days: number, hours = 0, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours, d.getMinutes() - minutes);
  return d.getTime();
};

const fmt = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const SEED_ACTIVITY_LOG: ActivityLogEntry[] = [
  // Today
  {
    id: 'log-1', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Phone Number', action: 'updated',
    oldValue: '+1 (617) 000-5555', newValue: '+1 (617) 952-5555',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 1)), timestamp: ago(0, 1),
  },
  {
    id: 'log-2', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Email', action: 'added',
    newValue: 'info@meridiancapital.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 1, 15)), timestamp: ago(0, 1, 15),
  },
  {
    id: 'log-3', contactId: 'org-1', eventType: 'tag_change', category: 'status',
    field: 'Tag', action: 'added',
    newValue: 'High Priority',
    author: 'Dexter Howell', authorInitials: 'DH', authorColor: '#3BAFC4',
    createdAt: fmt(ago(0, 3)), timestamp: ago(0, 3),
  },
  // Yesterday
  {
    id: 'log-4', contactId: 'org-1', eventType: 'title_change', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Senior Analyst', newValue: 'VP of Operations',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(1, 2)), timestamp: ago(1, 2),
  },
  {
    id: 'log-5', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Department', action: 'updated',
    oldValue: 'Research', newValue: 'Operations',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(1, 2)), timestamp: ago(1, 2),
  },
  {
    id: 'log-6', contactId: 'org-1', eventType: 'relationship_change', category: 'relationship',
    field: 'Organization', action: 'updated',
    oldValue: 'ESI East', newValue: 'Meridian Capital Group',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(1, 5)), timestamp: ago(1, 5),
  },
  {
    id: 'log-7', contactId: 'org-1', eventType: 'note_added', category: 'note',
    field: 'Note', action: 'added',
    newValue: 'Quarterly review completed — compliance check passed',
    author: 'Dexter Howell', authorInitials: 'DH', authorColor: '#3BAFC4',
    createdAt: fmt(ago(1, 8)), timestamp: ago(1, 8),
  },
  // 2 days ago
  {
    id: 'log-8', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Address', action: 'added',
    newValue: '100 Cummings Center, Ste-230-G, Portsmouth, NH 03811',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(2, 4)), timestamp: ago(2, 4),
  },
  {
    id: 'log-9', contactId: 'org-1', eventType: 'status_change', category: 'status',
    field: 'Status', action: 'updated',
    oldValue: 'Current', newValue: 'Stale',
    author: 'System', authorInitials: 'SY', authorColor: '#94A3B8',
    createdAt: fmt(ago(2, 6)), timestamp: ago(2, 6),
  },
  {
    id: 'log-10', contactId: 'org-1', eventType: 'industry_change', category: 'field',
    field: 'Industry', action: 'added',
    newValue: '52111 — Commercial Banking',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(2, 8)), timestamp: ago(2, 8),
  },
  // 5 days ago
  {
    id: 'log-11', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Phone Number', action: 'added',
    newValue: '+1 (617) 000-5555',
    author: 'Antonia Hopkins', authorInitials: 'AH', authorColor: '#D96FA8',
    createdAt: fmt(ago(5, 3)), timestamp: ago(5, 3),
  },
  {
    id: 'log-12', contactId: 'org-1', eventType: 'entry_added', category: 'entry',
    field: 'Website', action: 'added',
    newValue: 'meridiancapital.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(5, 4)), timestamp: ago(5, 4),
  },
  {
    id: 'log-13', contactId: 'org-1', eventType: 'field_update', category: 'field',
    field: 'Employees', action: 'updated',
    oldValue: '100-250', newValue: '250-500',
    author: 'Mercedes Paul', authorInitials: 'MP', authorColor: '#247A8A',
    createdAt: fmt(ago(5, 6)), timestamp: ago(5, 6),
  },
  // 10 days ago
  {
    id: 'log-14', contactId: 'org-1', eventType: 'entry_removed', category: 'entry',
    field: 'Email', action: 'removed',
    oldValue: 'old-info@meridian.com',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(10, 2)), timestamp: ago(10, 2),
  },
  {
    id: 'log-15', contactId: 'org-1', eventType: 'contact_created', category: 'status',
    field: 'Contact', action: 'created',
    newValue: 'Meridian Capital Group',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(10, 8)), timestamp: ago(10, 8),
  },
  // Person contact logs
  {
    id: 'log-16', contactId: 'per-1', eventType: 'field_update', category: 'field',
    field: 'Phone Number', action: 'updated',
    oldValue: '+1 (603) 555-0100', newValue: '+1 (603) 555-0199',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(0, 4)), timestamp: ago(0, 4),
  },
  {
    id: 'log-17', contactId: 'per-1', eventType: 'title_change', category: 'field',
    field: 'Title', action: 'updated',
    oldValue: 'Analyst', newValue: 'VP of Operations',
    author: 'Janet Parker', authorInitials: 'JP', authorColor: '#6A0FB8',
    createdAt: fmt(ago(1, 3)), timestamp: ago(1, 3),
  },
  {
    id: 'log-18', contactId: 'per-1', eventType: 'relationship_change', category: 'relationship',
    field: 'Organization', action: 'added',
    newValue: 'Meridian Capital Group',
    author: 'Paul Wentzell', authorInitials: 'PW', authorColor: '#1955A6',
    createdAt: fmt(ago(3, 2)), timestamp: ago(3, 2),
  },
];
