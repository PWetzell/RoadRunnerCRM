/**
 * Quality Score type definitions.
 *
 * The scoring engine is rule-based and deterministic — no AI calls. Each
 * `ScoringRule` describes one positive or negative condition, points
 * awarded when it matches, and which category the rule belongs to. The
 * engine evaluates active rules against a contact and returns both the
 * clamped 0-100 total and a per-rule contributions array used by the
 * badge tooltip.
 *
 * v1 scope: Person contacts only. Org contacts return total: 0 with empty
 * contributions; the badge component does not render on Org rows.
 */

export type ScoringCategory = 'completeness' | 'firmographics' | 'engagement';

export type FieldPresenceField = 'email' | 'phone' | 'title' | 'company' | 'address' | 'tags';

/**
 * Discriminated union of conditions the engine knows how to evaluate.
 * Each variant carries the parameters specific to its kind.
 *
 * Note: `openedWithinDays` is intentionally excluded — the deployed demo
 * has no email-open event source. See decision log entry, 2026-04-29.
 */
export type ScoringCondition =
  | { kind: 'fieldPresent'; field: FieldPresenceField }
  | { kind: 'fieldContains'; field: 'title'; anyOf: string[] }
  | { kind: 'companySizeGt'; value: number }
  | { kind: 'industryIn'; values: string[] }
  | { kind: 'hasActiveDeal' }
  | { kind: 'repliedWithinDays'; days: number }
  | { kind: 'contactedWithinDays'; days: number }
  | { kind: 'noActivityForDays'; days: number };

export interface ScoringRule {
  id: string;
  /** Human-readable name; shown in the breakdown tooltip. */
  name: string;
  category: ScoringCategory;
  /** Can be negative. Negative rules apply when the condition matches
   *  (e.g. "Stale" applies when there has been no activity for X days). */
  points: number;
  active: boolean;
  condition: ScoringCondition;
}

/**
 * Per-rule outcome from a single score evaluation. The engine returns one
 * of these for every rule it considered (active or not). The badge
 * tooltip renders only `applied: true` rows.
 */
export interface ScoreContribution {
  rule: ScoringRule;
  applied: boolean;
  /** Actual points contributed: `rule.points` when applied, else 0. */
  points: number;
  /** Contextual detail ("'VP Engineering' (matched 'VP')",
   *  "12 days ago", "500-1000 employees"). Omitted when not applicable. */
  detail?: string;
}

export type ScoreBucket = 'critical' | 'low' | 'mid' | 'high';

export interface ScoreResult {
  /** Clamped 0-100. */
  total: number;
  contributions: ScoreContribution[];
  bucket: ScoreBucket;
}
