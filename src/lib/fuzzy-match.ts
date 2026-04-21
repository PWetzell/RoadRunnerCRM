/**
 * Fuzzy matching utilities for AI Duplicate Detection.
 * Pure functions, no dependencies.
 *
 * MATCH CRITERIA (tuned to avoid false positives):
 * - Token edit-distance ratio must be ≤ 0.25 (stricter than raw distance ≤ 2)
 * - Names shorter than 4 characters require exact match
 * - When query has 2 tokens, BOTH must match (not just first name)
 * - Composite score threshold is applied by the caller (detectDuplicates uses 75)
 */

/** Levenshtein distance — # of edits to turn a into b */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** Token-to-token match. Returns 0-1 similarity, or 0 if not similar enough. */
function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  // Require minimum 4 chars for fuzzy — shorter names need exact match
  const maxLen = Math.max(a.length, b.length);
  if (maxLen < 4) return 0;
  const dist = levenshtein(a, b);
  const ratio = dist / maxLen;
  // Reject anything above 0.25 (allows 1 typo in a 4-char name, 2 in a 7-char name)
  if (ratio > 0.25) return 0;
  // Higher similarity for lower ratios: 0.0 ratio = 1.0 score, 0.25 = 0.75
  return 1 - ratio;
}

/** Score 0-100 for name similarity.
 *
 * Confidence scales with how complete the query is:
 *   - 1 token (just first name) — cap at 45%, below duplicate threshold
 *   - 2 tokens (first + last)   — can reach 95%+
 *   - 3+ tokens (with middle)   — can reach 100%
 *
 * Rationale: first names are common. "Jim" matching "Jim Ford" should NOT be
 * a duplicate — we need the last name too.
 */
export function nameScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (q === t) return 100;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = t.split(/\s+/).filter(Boolean);
  const qTokenCount = qTokens.length;

  // Completeness cap — more query tokens entered = higher possible confidence
  const completenessCap = qTokenCount === 1 ? 0.45 : qTokenCount === 2 ? 0.95 : 1.0;

  // Substring — whole query contained in target (e.g., "Sarah Chen" in "Sarah Chen-Williams")
  if (q.length >= 3 && t.includes(q)) {
    const base = 85 + Math.min(15, Math.floor((q.length / t.length) * 15));
    return Math.round(base * completenessCap);
  }
  if (t.length >= 3 && q.includes(t)) {
    return Math.round(80 * completenessCap);
  }

  // Greedy pair-matching: for each query token, find its best target match
  let totalScore = 0;
  let matchedTokens = 0;
  const usedTargetIdx = new Set<number>();

  for (const qt of qTokens) {
    let bestSim = 0;
    let bestIdx = -1;
    for (let i = 0; i < tTokens.length; i++) {
      if (usedTargetIdx.has(i)) continue;
      const sim = tokenSimilarity(qt, tTokens[i]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestSim > 0) {
      usedTargetIdx.add(bestIdx);
      totalScore += bestSim;
      matchedTokens += 1;
    }
  }

  if (matchedTokens === 0) return 0;

  // For multi-token queries, REQUIRE all tokens to match for high score
  if (qTokenCount >= 2 && matchedTokens < qTokenCount) {
    // Partial match — return low score so it falls below 75% threshold
    const partialRatio = matchedTokens / qTokenCount;
    return Math.round(partialRatio * totalScore * 35);
  }

  // All query tokens matched — score them
  const avgSim = totalScore / qTokenCount;
  return Math.min(98, Math.round(avgSim * 100 * completenessCap));
}

/** Score 0-100 for email similarity */
export function emailScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (q === t) return 100;

  const qDomain = q.split('@')[1] || '';
  const tDomain = t.split('@')[1] || '';
  const qLocal = q.split('@')[0] || '';
  const tLocal = t.split('@')[0] || '';

  if (qDomain && tDomain && qDomain === tDomain) {
    if (qLocal === tLocal) return 100;
    if (qLocal && tLocal) {
      const localScore = nameScore(qLocal.replace(/[._-]/g, ' '), tLocal.replace(/[._-]/g, ' '));
      if (localScore < 50) return 0; // different people at same company — don't flag
      return Math.max(60, Math.round(60 + (localScore / 100) * 40));
    }
    return 0;
  }

  if (qLocal && tLocal && qLocal === tLocal) return 75;
  return 0;
}

/** Score 0-100 for phone similarity (digits only comparison) */
export function phoneScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const q = query.replace(/\D/g, '');
  const t = target.replace(/\D/g, '');
  if (!q || !t) return 0;
  const qLast = q.slice(-10);
  const tLast = t.slice(-10);
  if (qLast === tLast && qLast.length === 10) return 100;
  return 0;
}

export interface MatchInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export interface MatchTarget {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

/** Composite confidence 0-100 + which fields matched */
export function compositeScore(query: MatchInput, target: MatchTarget): { confidence: number; matchedFields: string[] } {
  const matched: string[] = [];
  let weighted = 0;
  let totalWeight = 0;

  // Name (40% weight)
  const queryName = `${query.firstName || ''} ${query.lastName || ''}`.trim();
  if (queryName.length > 1 && target.name) {
    const ns = nameScore(queryName, target.name);
    weighted += ns * 0.4;
    totalWeight += 0.4;
    if (ns >= 75) matched.push('name');
  }

  // Email (30% weight)
  if (query.email && target.email) {
    const es = emailScore(query.email, target.email);
    weighted += es * 0.3;
    totalWeight += 0.3;
    if (es >= 75) matched.push('email');
  }

  // Phone (20% weight)
  if (query.phone && target.phone) {
    const ps = phoneScore(query.phone, target.phone);
    weighted += ps * 0.2;
    totalWeight += 0.2;
    if (ps >= 70) matched.push('phone');
  }

  // Company (10% weight)
  if (query.company && target.company) {
    const cs = nameScore(query.company, target.company);
    weighted += cs * 0.1;
    totalWeight += 0.1;
    if (cs >= 70) matched.push('company');
  }

  if (totalWeight === 0) return { confidence: 0, matchedFields: [] };

  // Composite is the weighted average of all checked fields.
  // matchedFields tracks only high-confidence individual matches (for badges/highlights).
  // The overall confidence number is what gates display in the UI.
  const confidence = weighted / totalWeight;
  return { confidence: Math.round(confidence), matchedFields: matched };
}
