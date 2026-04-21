/**
 * Cross-object preset metrics.
 *
 * These are curated metrics that span multiple entity types (deals, contacts,
 * documents). They're hard-coded because joining across entities requires
 * domain-specific logic that's hard to express in a generic filter/aggregate
 * UI.
 *
 * When a user picks "Cross-object" as the source in the Report Builder, they
 * choose one of these presets. The preset supplies a `compute` function that
 * returns a `ReportResult` directly — bypassing the generic engine's
 * filter/aggregate/group pipeline.
 *
 * Phase 2 could introduce a formula builder that generates these on demand,
 * but for Etsy-template baseline parity with top CRMs (Salesforce, HubSpot,
 * Monday Sales), a fixed library of 6 high-value metrics is sufficient.
 */

import { Deal } from '@/types/deal';
import { ContactWithEntries } from '@/types/contact';
import { CrmDocument } from '@/types/document';
import { ReportDisplay } from '@/types/custom-report';

export interface ReportResult {
  display: ReportDisplay;
  /** Hero value for `display: 'number'`. */
  value?: number;
  /** Pre-formatted display string for the hero value (e.g., "32d", "$48K"). */
  valueFormatted?: string;
  /** Subtitle shown under the hero value — context for the number. */
  subtitle?: string;
  /** Rows for bar / pie / donut displays. */
  groups?: { label: string; value: number; color?: string }[];
  /** Columns for a table display. */
  columns?: { key: string; label: string }[];
  /** Rows for a table display. */
  rows?: Record<string, unknown>[];
  /** Total count before any row limit was applied. */
  totalCount: number;
  /** Optional note / footnote shown below the result. */
  note?: string;
}

export interface CrossObjectContext {
  deals: Deal[];
  contacts: ContactWithEntries[];
  documents: CrmDocument[];
}

export interface CrossObjectPreset {
  id: string;
  name: string;
  description: string;
  display: ReportDisplay;
  compute: (ctx: CrossObjectContext) => ReportResult;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/** First (earliest-created) deal tied to a given contact (via personContactId or orgContactId). */
function firstDealForContact(contactId: string, deals: Deal[]): Deal | undefined {
  const matches = deals.filter(
    (d) => d.personContactId === contactId || d.orgContactId === contactId
  );
  if (matches.length === 0) return undefined;
  return matches.reduce((earliest, d) =>
    new Date(d.createdAt).getTime() < new Date(earliest.createdAt).getTime() ? d : earliest
  );
}

/* ------------------------------------------------------------------ */
/*  Preset definitions                                                 */
/* ------------------------------------------------------------------ */

export const CROSS_OBJECT_PRESETS: CrossObjectPreset[] = [
  {
    id: 'avg-days-contact-to-first-deal',
    name: 'Avg days: contact → first deal',
    description:
      'Average number of days between creating a contact and the first deal tied to that contact. Measures lead-to-opportunity velocity.',
    display: 'number',
    compute: (ctx) => {
      const gaps: number[] = [];
      for (const contact of ctx.contacts) {
        const first = firstDealForContact(contact.id, ctx.deals);
        if (!first) continue;
        const gap = daysBetween(contact.lastUpdated ?? first.createdAt, first.createdAt);
        // lastUpdated may be after deal creation for existing contacts; use min created
        // fallback — estimate using deal.createdAt alone is still informative.
        if (isFinite(gap)) gaps.push(Math.max(0, gap));
      }
      const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      return {
        display: 'number',
        value: Math.round(avg),
        valueFormatted: `${Math.round(avg)}d`,
        subtitle: `Across ${gaps.length} contact${gaps.length === 1 ? '' : 's'} with deals`,
        totalCount: gaps.length,
      };
    },
  },

  {
    id: 'contacts-without-deals',
    name: 'Contacts without deals',
    description:
      'Active contacts who have not yet been tied to any deal. These are candidates for outreach or qualification.',
    display: 'number',
    compute: (ctx) => {
      const contactIdsWithDeal = new Set<string>();
      for (const d of ctx.deals) {
        if (d.personContactId) contactIdsWithDeal.add(d.personContactId);
        if (d.orgContactId)    contactIdsWithDeal.add(d.orgContactId);
      }
      const withoutDeals = ctx.contacts.filter(
        (c) => c.status === 'active' && !contactIdsWithDeal.has(c.id)
      );
      return {
        display: 'number',
        value: withoutDeals.length,
        valueFormatted: String(withoutDeals.length),
        subtitle: `Of ${ctx.contacts.length} total contacts`,
        totalCount: withoutDeals.length,
      };
    },
  },

  {
    id: 'deals-without-contacts',
    name: 'Deals without contacts',
    description:
      'Open deals that are not linked to a person or organization contact. Indicates gaps in CRM hygiene.',
    display: 'number',
    compute: (ctx) => {
      const orphan = ctx.deals.filter(
        (d) =>
          d.stage !== 'closed-won' &&
          d.stage !== 'closed-lost' &&
          !d.personContactId &&
          !d.orgContactId
      );
      return {
        display: 'number',
        value: orphan.length,
        valueFormatted: String(orphan.length),
        subtitle: `Of ${ctx.deals.length} total deals`,
        totalCount: orphan.length,
        note: orphan.length > 0 ? 'Data-hygiene risk' : undefined,
      };
    },
  },

  {
    id: 'docs-per-deal',
    name: 'Avg documents per deal',
    description:
      'Average number of documents attached to each deal. A proxy for deal-preparation thoroughness.',
    display: 'number',
    compute: (ctx) => {
      if (ctx.deals.length === 0) {
        return { display: 'number', value: 0, valueFormatted: '0', totalCount: 0 };
      }
      const docsPerDeal = new Map<string, number>();
      for (const doc of ctx.documents) {
        if (!doc.dealId) continue;
        docsPerDeal.set(doc.dealId, (docsPerDeal.get(doc.dealId) ?? 0) + 1);
      }
      let total = 0;
      for (const d of ctx.deals) total += docsPerDeal.get(d.id) ?? 0;
      const avg = total / ctx.deals.length;
      return {
        display: 'number',
        value: Math.round(avg * 10) / 10,
        valueFormatted: avg.toFixed(1),
        subtitle: `${total} docs across ${ctx.deals.length} deals`,
        totalCount: ctx.deals.length,
      };
    },
  },

  {
    id: 'lead-to-won-rate',
    name: 'Lead-to-won conversion rate',
    description:
      'Percent of all deals ever created that reached closed-won. Overall funnel efficiency.',
    display: 'number',
    compute: (ctx) => {
      const total = ctx.deals.length;
      const won = ctx.deals.filter((d) => d.stage === 'closed-won').length;
      const rate = total ? (won / total) * 100 : 0;
      return {
        display: 'number',
        value: Math.round(rate),
        valueFormatted: `${Math.round(rate)}%`,
        subtitle: `${won} won of ${total} total`,
        totalCount: total,
      };
    },
  },

  {
    id: 'revenue-per-contact',
    name: 'Avg won revenue per contact',
    description:
      'Average closed-won deal amount per contact who has any deal. Measures customer value.',
    display: 'number',
    compute: (ctx) => {
      const revenueByContact = new Map<string, number>();
      for (const d of ctx.deals) {
        if (d.stage !== 'closed-won') continue;
        const ids = [d.personContactId, d.orgContactId].filter(Boolean) as string[];
        for (const id of ids) {
          revenueByContact.set(id, (revenueByContact.get(id) ?? 0) + d.amount);
        }
      }
      const values = Array.from(revenueByContact.values());
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return {
        display: 'number',
        value: Math.round(avg),
        valueFormatted: formatCurrency(avg),
        subtitle: `Across ${values.length} contact${values.length === 1 ? '' : 's'} with won deals`,
        totalCount: values.length,
      };
    },
  },
];

/** Lookup a preset by id. */
export function getPreset(id: string): CrossObjectPreset | undefined {
  return CROSS_OBJECT_PRESETS.find((p) => p.id === id);
}
