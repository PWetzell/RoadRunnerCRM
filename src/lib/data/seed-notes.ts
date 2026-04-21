import { Note } from '@/types/note';

export const SEED_NOTES: Note[] = [
  {
    id: 'n1', contactId: 'org-1', author: 'Paul Wentzell', authorInitials: 'PW',
    authorColor: '#D4A61A', location: 'ESI East', pinned: true,
    body: 'Ullamcorper quis vitae quis ultrices. Mauris quam eget suspendisse scelerisque sit scelerisque!\n  \u2022  Dictum eget orci sollicitudin npaue.\n  \u2022  Turpis tortor egestas nulla enim morbi morbi est eget turpis.\n  \u2022  Feugiat sit volutpat nisi sagittis imperdiet.',
    tags: ['Instant Messaged'], noteType: 'Sales', createdAt: 'Nov 26, 2022 11:00 AM',
  },
  {
    id: 'n2', contactId: 'org-1', author: 'Dexter Howell', authorInitials: 'DH',
    authorColor: '#3BAFC4', location: 'ESI East', pinned: false,
    body: 'Ullamcorper quis vitae quis ultrices. Mauris quam eget suspendisse scelerisque sit scelerisque!\n\nFeugiat sit volutpat nisi sagittis imperdiet. Mauris quam eget suspendisse scelerisque.',
    tags: ['Phone Call', 'Left Message'], noteType: 'Sales', createdAt: 'Today 11:00 AM',
  },
  {
    id: 'n3', contactId: 'org-1', author: 'Janet Parker', authorInitials: 'JP',
    authorColor: '#6A0FB8', location: 'ESI Boston', pinned: false,
    body: 'Ullamcorper quis vitae quis ultrices. Mauris quam eget suspendisse scelerisque sit sDis vestibulum posuere ullamcorper mattis in aenean enim.',
    tags: ['Phone Call', 'Left Message'], noteType: 'General', createdAt: 'Nov 29, 2022 11:00 AM',
  },
  {
    id: 'n4', contactId: 'per-1', author: 'Antonia Hopkins', authorInitials: 'AH',
    authorColor: '#D96FA8', location: 'ESI East', pinned: false,
    body: 'Ullamcorper quis vitae quis ultrices. Mauris quam eget suspendisse scelerisque sit scelerisque!\n  \u2022  Dictum eget orci sollicitudin npaue.\n  \u2022  Turpis tortor egestas nulla enim morbi parbi est eget turpis.',
    tags: ['Phone Call', 'Left Message'], noteType: 'Support', createdAt: 'Nov 28, 2022 11:00 AM',
  },
  {
    id: 'n5', contactId: 'per-1', author: 'Mercedes Paul', authorInitials: 'MP',
    authorColor: '#247A8A', location: 'ESI Boston', pinned: false,
    body: 'Ullamcorper quis vitae quis ultrices. Mauris quam eget suspendisse scelerisque sit sDis vestibulum posuere ullamcorper mattis in aenean enim.',
    tags: ['Phone Call', 'Left Message'], noteType: 'Follow-up', createdAt: 'Nov 27, 2022 9:50 AM',
  },
];
