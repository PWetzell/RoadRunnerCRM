import type { ContactWithEntries, Person } from '@/types/contact';
import type { Deal } from '@/types/deal';
import type {
  ScoringRule,
  ScoreContribution,
  ScoreResult,
  ScoreBucket,
} from '@/types/scoring';

/**
 * Subset of `SequenceEnrollment` the scoring engine reads. Kept narrow so
 * the engine stays a pure function and doesn't import the Zustand store.
 */
export interface SequenceEnrollmentLite {
  contactId: string;
  status: string;
  enrolledAt: string;
  /** Step-id → ISO timestamp of last send for that step. */
  sendLog: Record<string, string>;
}

export interface ScoreContext {
  /** Full contact list — the engine looks up linked orgs via Person.orgId
   *  for firmographic rules (companySizeGt, industryIn). */
  contacts: ContactWithEntries[];
  deals: Deal[];
  enrollments: SequenceEnrollmentLite[];
  /** Pass `Date.now()` from the caller so tests can pin time. */
  now: number;
}

/**
 * Compute a 0-100 quality score for a single Person contact.
 *
 * Returns the clamped total and a per-rule contributions array used by
 * the badge breakdown tooltip. Org contacts return total: 0 with empty
 * contributions — callers should not render a badge for them.
 *
 * Pure function — does not import Zustand stores. Caller passes context.
 */
export function computeScore(
  contact: ContactWithEntries,
  rules: ScoringRule[],
  ctx: ScoreContext,
): ScoreResult {
  if (contact.type !== 'person') {
    return { total: 0, contributions: [], bucket: 'critical' };
  }
  const p = contact as Person & { entries: ContactWithEntries['entries'] };

  // Firmographic rules (companySizeGt, industryIn) read from the linked
  // org. Person-only contacts without an org just don't match those.
  const linkedOrg = p.orgId
    ? ctx.contacts.find((c) => c.id === p.orgId && c.type === 'org')
    : undefined;

  let total = 0;
  const contributions: ScoreContribution[] = [];

  for (const rule of rules) {
    if (!rule.active) {
      contributions.push({ rule, applied: false, points: 0 });
      continue;
    }
    const evaluation = evaluateRule(rule, p, linkedOrg, ctx);
    if (evaluation.applied) {
      total += rule.points;
      contributions.push({ rule, applied: true, points: rule.points, detail: evaluation.detail });
    } else {
      contributions.push({ rule, applied: false, points: 0 });
    }
  }

  const clamped = Math.max(0, Math.min(100, total));
  return { total: clamped, contributions, bucket: bucketFor(clamped) };
}

/**
 * Map a numeric score to its visual bucket. Thresholds chosen to give
 * four readable bands matching the badge color palette.
 */
export function bucketFor(score: number): ScoreBucket {
  if (score < 25) return 'critical';
  if (score < 50) return 'low';
  if (score < 75) return 'mid';
  return 'high';
}

/**
 * Single-rule evaluator. Returns `applied: true` when the rule's
 * condition matches, plus a `detail` string used in the tooltip
 * (matched value, employee count, relative date, etc.).
 */
function evaluateRule(
  rule: ScoringRule,
  p: Person & { entries: ContactWithEntries['entries'] },
  org: ContactWithEntries | undefined,
  ctx: ScoreContext,
): { applied: boolean; detail?: string } {
  const c = rule.condition;
  switch (c.kind) {
    case 'fieldPresent':
      return evalFieldPresent(c.field, p, org);

    case 'fieldContains': {
      // Only `title` supported in v1.
      if (c.field !== 'title') return { applied: false };
      const t = p.title || '';
      const tLower = t.toLowerCase();
      const match = c.anyOf.find((s) => tLower.includes(s.toLowerCase()));
      if (!match) return { applied: false };
      // Detail is the title itself, plain. The matched-against substring
      // is debugger-noise — visitors trust the rule already named it.
      return { applied: true, detail: t };
    }

    case 'companySizeGt': {
      if (!org || org.type !== 'org') return { applied: false };
      const upper = parseEmployeeUpperBound(org.employees);
      if (upper > c.value) {
        return { applied: true, detail: `${org.employees ?? upper} employees` };
      }
      return { applied: false };
    }

    case 'industryIn': {
      if (!org || org.type !== 'org') return { applied: false };
      const ind = org.industry;
      if (!ind) return { applied: false };
      // Substring match (case-insensitive). "Software" matches
      // "Marketing Software" / "Payments / Software"; "Investment"
      // matches "Investment Management". Rule values are concept-
      // level tokens, not strict labels, so subcategory matches the
      // category. Verified vs the seed industries on 2026-04-30.
      const indLower = ind.toLowerCase();
      const match = c.values.find((v) => indLower.includes(v.toLowerCase()));
      if (!match) return { applied: false };
      return { applied: true, detail: ind };
    }

    case 'hasActiveDeal': {
      const deal = ctx.deals.find(
        (d) =>
          (d.personContactId === p.id || (p.orgId && d.orgContactId === p.orgId)) &&
          d.stage !== 'closed-won' &&
          d.stage !== 'closed-lost',
      );
      return deal ? { applied: true, detail: deal.name } : { applied: false };
    }

    case 'repliedWithinDays': {
      // Approximation: contact has at least one enrollment with status
      // 'replied' whose most-recent send timestamp (or enrolledAt
      // fallback) is within `days` of now. The seeded sequence data has
      // `enrolledDaysAgo` so this lines up with realistic recency.
      const replied = ctx.enrollments.filter(
        (e) => e.contactId === p.id && e.status === 'replied',
      );
      if (replied.length === 0) return { applied: false };
      const cutoff = ctx.now - c.days * 86_400_000;
      let mostRecent = -Infinity;
      for (const e of replied) {
        const sendTimes = Object.values(e.sendLog).map((iso) => new Date(iso).getTime());
        const t = sendTimes.length > 0 ? Math.max(...sendTimes) : new Date(e.enrolledAt).getTime();
        if (t > mostRecent) mostRecent = t;
      }
      if (!Number.isFinite(mostRecent) || mostRecent < cutoff) return { applied: false };
      return { applied: true, detail: relativeTimeAgo(ctx.now - mostRecent) };
    }

    case 'contactedWithinDays': {
      const last = p.recentEmail?.lastEmailAt;
      if (!last) return { applied: false };
      const t = new Date(last).getTime();
      const cutoff = ctx.now - c.days * 86_400_000;
      if (t < cutoff) return { applied: false };
      return { applied: true, detail: relativeTimeAgo(ctx.now - t) };
    }

    case 'noActivityForDays': {
      // Most recent of: lastEmailAt, lastUpdated. Both treated as activity.
      const candidates: number[] = [];
      if (p.recentEmail?.lastEmailAt) candidates.push(new Date(p.recentEmail.lastEmailAt).getTime());
      if (p.lastUpdated) candidates.push(new Date(p.lastUpdated).getTime());
      const lastActivity = candidates.length > 0 ? Math.max(...candidates) : 0;
      const cutoff = ctx.now - c.days * 86_400_000;
      if (lastActivity > cutoff) return { applied: false };
      return {
        applied: true,
        detail: lastActivity
          ? `last activity ${relativeTimeAgo(ctx.now - lastActivity)}`
          : 'no activity recorded',
      };
    }
  }
}

function evalFieldPresent(
  field: 'email' | 'phone' | 'title' | 'company' | 'address' | 'tags',
  p: Person & { entries: ContactWithEntries['entries'] },
  org: ContactWithEntries | undefined,
): { applied: boolean; detail?: string } {
  switch (field) {
    case 'email': {
      const v =
        p.email ||
        p.entries.emails.find((e) => e.primary)?.value ||
        p.entries.emails[0]?.value;
      return v ? { applied: true, detail: v } : { applied: false };
    }
    case 'phone': {
      const v =
        p.phone ||
        p.entries.phones.find((e) => e.primary)?.value ||
        p.entries.phones[0]?.value;
      return v ? { applied: true, detail: v } : { applied: false };
    }
    case 'title':
      return p.title ? { applied: true, detail: p.title } : { applied: false };
    case 'company': {
      const v = p.orgName || org?.name;
      return v ? { applied: true, detail: v } : { applied: false };
    }
    case 'address': {
      const a = p.entries.addresses[0];
      if (!a) return { applied: false };
      const cityState = [a.city, a.state].filter(Boolean).join(', ');
      return { applied: true, detail: cityState || a.value };
    }
    case 'tags': {
      const tags = p.tags ?? [];
      if (tags.length === 0) return { applied: false };
      const display = tags.slice(0, 2).join(', ') + (tags.length > 2 ? ` +${tags.length - 2}` : '');
      return { applied: true, detail: display };
    }
  }
}

/**
 * Parse the upper bound of an employee-count string.
 *
 *   "500-1,000"     → 1000
 *   "10,000+"       → 10000
 *   "5,000-10,000"  → 10000
 *   "150,000+"      → 150000
 *   "50"            → 50
 *   undefined       → 0
 *
 * Strips commas before regex matching. The earlier version's `\d+`
 * regex stopped at the first comma in "5,000-10,000" and returned 10
 * — which made Boeing (150,000+ employees) score correctly while
 * Stripe (5,000-10,000) parsed as 10. Verified against the seed
 * orgs on 2026-04-30.
 */
export function parseEmployeeUpperBound(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/,/g, '');
  const range = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return parseInt(range[2], 10);
  const single = cleaned.match(/(\d+)/);
  return single ? parseInt(single[1], 10) : 0;
}

function relativeTimeAgo(ms: number): string {
  if (ms < 0) return 'just now';
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}
