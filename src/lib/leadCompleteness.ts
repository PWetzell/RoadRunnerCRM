import { Deal } from '@/types/deal';
import { Contact } from '@/types/contact';

/**
 * Describes a single field that counts toward a deal's completeness score.
 * `filled` is computed at check time against the deal + its linked contacts.
 */
export interface CompletenessField {
  /** Stable id used for keys / tracking which field the user still needs to fill. */
  id: string;
  /** Human label shown in the "still missing" list. */
  label: string;
  /** Whether this field is currently populated. */
  filled: boolean;
}

export interface LeadCompleteness {
  /** 0..100, rounded. */
  pct: number;
  filled: number;
  total: number;
  /** Per-field breakdown (in order). Useful for tooltips / UI lists. */
  fields: CompletenessField[];
  /** Labels of fields that aren't yet filled — shorthand for UI "still needed" lists. */
  missing: string[];
}

function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

function hasNumber(v: unknown): boolean {
  return typeof v === 'number' && !Number.isNaN(v) && v > 0;
}

/**
 * Compute completeness for a lead based on its type.
 *
 * Person leads: person identity + contact info + deal essentials.
 *   (The associated company is NOT required — candidates may be between roles.)
 *
 * Company leads: org identity + deal essentials + engagement context.
 *   (A primary contact is counted but not strictly required.)
 */
export function getLeadCompleteness(
  deal: Deal,
  person: Contact | undefined,
  org: Contact | undefined
): LeadCompleteness {
  const fields: CompletenessField[] = [];

  // Common deal essentials — apply to both types
  fields.push({ id: 'name', label: 'Deal name', filled: hasText(deal.name) });
  fields.push({ id: 'stage', label: 'Stage', filled: hasText(deal.stage) });
  fields.push({ id: 'amount', label: 'Amount', filled: hasNumber(deal.amount) });
  fields.push({ id: 'expectedCloseDate', label: 'Expected close date', filled: hasText(deal.expectedCloseDate) });
  fields.push({ id: 'source', label: 'Source', filled: hasText(deal.source) });
  fields.push({ id: 'owner', label: 'Owner', filled: hasText(deal.owner) });

  if (deal.type === 'person') {
    // Person identity + contact info
    fields.push({ id: 'person', label: 'Person linked', filled: Boolean(person) });
    fields.push({
      id: 'title',
      label: 'Title',
      filled: Boolean(person && person.type === 'person' && hasText(person.title)),
    });
    fields.push({
      id: 'email',
      label: 'Email',
      filled: Boolean(person && person.type === 'person' && hasText(person.email)),
    });
    fields.push({
      id: 'phone',
      label: 'Phone',
      filled: Boolean(person && person.type === 'person' && hasText(person.phone)),
    });
  } else {
    // Company leads — org identity + engagement context
    fields.push({ id: 'org', label: 'Company linked', filled: Boolean(org) });
    fields.push({
      id: 'industry',
      label: 'Industry',
      filled: Boolean(org && org.type === 'org' && hasText(org.industry)),
    });
    fields.push({
      id: 'hq',
      label: 'HQ / address',
      filled: Boolean(org && org.type === 'org' && hasText(org.hq)),
    });
    fields.push({ id: 'primaryContact', label: 'Primary contact', filled: Boolean(person) });
    fields.push({ id: 'initiative', label: 'Initiative / need', filled: hasText(deal.initiative) });
  }

  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);

  return { pct, filled, total, fields, missing };
}
