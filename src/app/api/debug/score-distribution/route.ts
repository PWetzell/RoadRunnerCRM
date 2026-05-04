/**
 * Diagnostic endpoint — counts every rule's seed-data trigger frequency
 * so we can see exactly why the distribution is flat before fixing.
 *
 * Sequence enrollments are NOT seeded server-side (seedDemoData runs
 * only at runtime via AuthGate), so `repliedWithinDays` count here is
 * the floor case. The runtime app sees +0 to ~4 person contacts with
 * replied enrollments via the sequence-store seed pool.
 *
 * Delete after the seed-data fix lands.
 */

import { NextResponse } from 'next/server';
import { SEED_CONTACTS } from '@/lib/data/seed-contacts';
import { SEED_DEALS } from '@/lib/data/seed-deals';
import { DEFAULT_RULES } from '@/lib/scoring/seed-rules';
import { computeScore, parseEmployeeUpperBound } from '@/lib/scoring/computeScore';
import type { ContactWithEntries, Person, Organization } from '@/types/contact';

const SENIOR_TOKENS = ['VP', 'Vice President', 'Chief', 'Director', 'Head of', 'Senior'];
// Mirrors `seed-rules.ts` rule-firm-target-industry values. Engine
// uses substring match (case-insensitive) so this debug must too.
const TARGET_INDUSTRIES = [
  'Software', 'SaaS', 'Technology', 'Artificial Intelligence', 'AI',
  'Data Platform', 'Data', 'Observability', 'Design',
  'Healthcare', 'Biotech', 'Biotechnology', 'Pharma', 'Pharmaceutical',
  'Medical', 'Clinical',
  'Financial Services', 'Investment', 'Banking', 'Insurance', 'Payments',
  'Asset Management', 'Wealth', 'Brokerage', 'Equity',
  'Aerospace', 'Manufacturing',
];
const ACTIVE_DEAL_STAGES = new Set(['lead', 'discovery', 'qualified', 'proposal', 'negotiation']);

export async function GET() {
  const now = Date.now();
  const day = 86_400_000;
  const contacts = SEED_CONTACTS as ContactWithEntries[];
  const persons = contacts.filter((c): c is ContactWithEntries & Person => c.type === 'person');
  const orgs = contacts.filter((c): c is ContactWithEntries & Organization => c.type === 'org');
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  // 1. repliedWithinDays:30 — sequence enrollments not seeded server-side
  const q1_replied = 0;

  // 2. hasActiveDeal — active deal stage referencing person OR their org
  const activeDeals = SEED_DEALS.filter((d) => ACTIVE_DEAL_STAGES.has(d.stage));
  const q2_activeDeal = persons.filter((p) =>
    activeDeals.some(
      (d) =>
        d.personContactId === p.id ||
        (p.orgId && d.orgContactId === p.orgId),
    ),
  ).length;

  // 3. contactedWithinDays:7 — recentEmail.lastEmailAt within 7 days
  const q3_contacted = persons.filter((p) => {
    const t = p.recentEmail?.lastEmailAt;
    if (!t) return false;
    return now - new Date(t).getTime() <= 7 * day;
  }).length;

  // 4. noActivityForDays:60 — MAX(lastEmailAt, lastUpdated) older than 60 days
  const q4_stale = persons.filter((p) => {
    const candidates: number[] = [];
    if (p.recentEmail?.lastEmailAt) candidates.push(new Date(p.recentEmail.lastEmailAt).getTime());
    if (p.lastUpdated) candidates.push(new Date(p.lastUpdated).getTime());
    if (candidates.length === 0) return true;
    const last = Math.max(...candidates);
    return now - last > 60 * day;
  }).length;

  // 5. noActivityForDays:90
  const q5_cold = persons.filter((p) => {
    const candidates: number[] = [];
    if (p.recentEmail?.lastEmailAt) candidates.push(new Date(p.recentEmail.lastEmailAt).getTime());
    if (p.lastUpdated) candidates.push(new Date(p.lastUpdated).getTime());
    if (candidates.length === 0) return true;
    const last = Math.max(...candidates);
    return now - last > 90 * day;
  }).length;

  // 6. Senior title (case-insensitive substring match on title)
  const q6_senior = persons.filter((p) => {
    const t = (p.title || '').toLowerCase();
    return SENIOR_TOKENS.some((token) => t.includes(token.toLowerCase()));
  }).length;

  // 7. Linked org with employees > 100
  const q7_largeOrg = persons.filter((p) => {
    if (!p.orgId) return false;
    const org = orgById.get(p.orgId);
    return parseEmployeeUpperBound(org?.employees) > 100;
  }).length;

  // 8. Linked org with employees > 1000
  const q8_enterpriseOrg = persons.filter((p) => {
    if (!p.orgId) return false;
    const org = orgById.get(p.orgId);
    return parseEmployeeUpperBound(org?.employees) > 1000;
  }).length;

  // 9. Industry in target list — substring match per the engine
  const q9_targetIndustry = persons.filter((p) => {
    if (!p.orgId) return false;
    const org = orgById.get(p.orgId);
    if (!org?.industry) return false;
    const indLower = org.industry.toLowerCase();
    return TARGET_INDUSTRIES.some((v) => indLower.includes(v.toLowerCase()));
  }).length;

  // Distribution snapshot (engagement-floor case, no enrollments)
  const ctx = { contacts, deals: SEED_DEALS, enrollments: [], now };
  const scored = persons.map((c) => ({
    id: c.id,
    name: c.name,
    title: c.title,
    orgName: c.orgName,
    score: computeScore(c, DEFAULT_RULES, ctx).total,
  }));
  scored.sort((a, b) => b.score - a.score);
  const buckets = { critical: 0, low: 0, mid: 0, high: 0 };
  for (const s of scored) {
    if (s.score < 25) buckets.critical++;
    else if (s.score < 50) buckets.low++;
    else if (s.score < 75) buckets.mid++;
    else buckets.high++;
  }

  // What the contacts grid actually sees on first paint — sorted by
  // lastUpdated desc, score column shown for the first 14 rows.
  const byLastUpdated = [...scored].sort((a, b) => {
    const pa = persons.find((p) => p.id === a.id);
    const pb = persons.find((p) => p.id === b.id);
    const ta = pa?.lastUpdated ? new Date(pa.lastUpdated).getTime() : 0;
    const tb = pb?.lastUpdated ? new Date(pb.lastUpdated).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({
    top_14_by_lastUpdated: byLastUpdated.slice(0, 14).map((s) => {
      const p = persons.find((pp) => pp.id === s.id);
      return { id: s.id, name: s.name, score: s.score, lastUpdated: p?.lastUpdated };
    }),
    total_persons: persons.length,
    total_orgs: orgs.length,
    rule_trigger_counts: {
      q1_repliedWithinDays_30: q1_replied,
      q2_hasActiveDeal: q2_activeDeal,
      q3_contactedWithinDays_7: q3_contacted,
      q4_noActivityForDays_60: q4_stale,
      q5_noActivityForDays_90: q5_cold,
      q6_seniorTitle: q6_senior,
      q7_largeCompany_emp_gt_100: q7_largeOrg,
      q8_enterprise_emp_gt_1000: q8_enterpriseOrg,
      q9_targetIndustry: q9_targetIndustry,
    },
    distribution_floor_case: buckets,
    top_20: scored.slice(0, 20),
    bottom_5: scored.slice(-5),
  });
}
