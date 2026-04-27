export interface Task {
  id: string;
  contactId: string;
  title: string;
  done: boolean;
  dueDate?: string | null;
  notes?: string | null;
  // Provenance: if this task was created from an email, keep a pointer so
  // the task row can link back. HubSpot/Salesforce do the same "source of
  // activity" trail.
  sourceEmailId?: string | null;
  createdAt: string;
  completedAt?: string | null;
}
