/**
 * Inter-contact relationships.
 * Stored as directional edges: fromContactId → toContactId with a typed label.
 * The UI renders them bidirectionally (e.g., "Reports to" on Sarah implies "Direct report" on James).
 */

export type RelationshipKind =
  // Person → Person
  | 'reports-to' | 'manages' | 'peer' | 'mentor' | 'mentee' | 'family' | 'friend' | 'introduced-by'
  // Person → Org
  | 'employee-of' | 'board-member' | 'investor-in' | 'customer-of-org' | 'vendor-of-org'
  // Org → Org
  | 'parent-of' | 'subsidiary-of' | 'partner-with' | 'customer-of' | 'vendor-of' | 'competitor-of';

export interface Relationship {
  id: string;
  fromContactId: string;
  toContactId: string;
  kind: RelationshipKind;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface RelationshipKindMeta {
  label: string;
  inverseLabel: string; // shown on the other side of the relationship
  category: 'reporting' | 'social' | 'org-membership' | 'org-structure' | 'commercial';
  validFrom: ('person' | 'org')[];
  validTo: ('person' | 'org')[];
}

/**
 * Labels describe what the LINKED (other) contact IS to the current contact.
 * - `label` is shown when current contact is on the FROM side of the edge.
 * - `inverseLabel` is shown when current contact is on the TO side.
 *
 * Example for kind 'employee-of' (Diana → Vertex):
 *   On Diana's page (FROM side): linked contact is Vertex → label = "Employer"
 *   On Vertex's page (TO side):  linked contact is Diana → inverseLabel = "Employee"
 */
export const RELATIONSHIP_META: Record<RelationshipKind, RelationshipKindMeta> = {
  // Person → Person
  'reports-to': { label: 'Manager', inverseLabel: 'Direct report', category: 'reporting', validFrom: ['person'], validTo: ['person'] },
  'manages': { label: 'Direct report', inverseLabel: 'Manager', category: 'reporting', validFrom: ['person'], validTo: ['person'] },
  'peer': { label: 'Peer', inverseLabel: 'Peer', category: 'reporting', validFrom: ['person'], validTo: ['person'] },
  'mentor': { label: 'Mentee', inverseLabel: 'Mentor', category: 'social', validFrom: ['person'], validTo: ['person'] },
  'mentee': { label: 'Mentor', inverseLabel: 'Mentee', category: 'social', validFrom: ['person'], validTo: ['person'] },
  'family': { label: 'Family', inverseLabel: 'Family', category: 'social', validFrom: ['person'], validTo: ['person'] },
  'friend': { label: 'Friend', inverseLabel: 'Friend', category: 'social', validFrom: ['person'], validTo: ['person'] },
  'introduced-by': { label: 'Introducer', inverseLabel: 'Introduced', category: 'social', validFrom: ['person'], validTo: ['person'] },

  // Person → Org
  'employee-of': { label: 'Employer', inverseLabel: 'Employee', category: 'org-membership', validFrom: ['person'], validTo: ['org'] },
  'board-member': { label: 'Board seat at', inverseLabel: 'Board member', category: 'org-membership', validFrom: ['person'], validTo: ['org'] },
  'investor-in': { label: 'Portfolio company', inverseLabel: 'Investor', category: 'org-membership', validFrom: ['person'], validTo: ['org'] },
  'customer-of-org': { label: 'Vendor', inverseLabel: 'Customer', category: 'commercial', validFrom: ['person'], validTo: ['org'] },
  'vendor-of-org': { label: 'Customer', inverseLabel: 'Vendor', category: 'commercial', validFrom: ['person'], validTo: ['org'] },

  // Org → Org
  'parent-of': { label: 'Subsidiary', inverseLabel: 'Parent', category: 'org-structure', validFrom: ['org'], validTo: ['org'] },
  'subsidiary-of': { label: 'Parent', inverseLabel: 'Subsidiary', category: 'org-structure', validFrom: ['org'], validTo: ['org'] },
  'partner-with': { label: 'Partner', inverseLabel: 'Partner', category: 'commercial', validFrom: ['org'], validTo: ['org'] },
  'customer-of': { label: 'Vendor', inverseLabel: 'Customer', category: 'commercial', validFrom: ['org'], validTo: ['org'] },
  'vendor-of': { label: 'Customer', inverseLabel: 'Vendor', category: 'commercial', validFrom: ['org'], validTo: ['org'] },
  'competitor-of': { label: 'Competitor', inverseLabel: 'Competitor', category: 'commercial', validFrom: ['org'], validTo: ['org'] },
};

/** Get all valid relationship kinds for a directional pairing */
export function validKindsFor(fromType: 'person' | 'org', toType: 'person' | 'org'): RelationshipKind[] {
  return (Object.keys(RELATIONSHIP_META) as RelationshipKind[]).filter((k) => {
    const m = RELATIONSHIP_META[k];
    return m.validFrom.includes(fromType) && m.validTo.includes(toType);
  });
}

/**
 * Get all relationship kinds available for any pairing of two contacts,
 * regardless of which is from and which is to. The dialog uses this so the
 * user can pick ANY contact and still get a meaningful kind list.
 *
 * Returns kinds with a flag indicating whether direction needs to be flipped
 * when persisting.
 */
export function bidirectionalKindsFor(currentType: 'person' | 'org', linkedType: 'person' | 'org'): { kind: RelationshipKind; flipDirection: boolean }[] {
  const direct = validKindsFor(currentType, linkedType).map((k) => ({ kind: k, flipDirection: false }));
  const reverse = validKindsFor(linkedType, currentType).map((k) => ({ kind: k, flipDirection: true }));
  // De-dupe by kind (prefer non-flipped if both exist)
  const seen = new Set<RelationshipKind>();
  const out: { kind: RelationshipKind; flipDirection: boolean }[] = [];
  for (const item of [...direct, ...reverse]) {
    if (!seen.has(item.kind)) { seen.add(item.kind); out.push(item); }
  }
  return out;
}
