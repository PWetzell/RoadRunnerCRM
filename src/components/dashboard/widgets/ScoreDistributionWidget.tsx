'use client';

import { useEffect, useMemo } from 'react';
import Widget from '../Widget';
import ScoreDistributionChart from '@/components/admin/scoring/ScoreDistributionChart';
import { useScoringStore } from '@/stores/scoring-store';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useSequenceStore } from '@/stores/sequence-store';
import { computeScore, bucketFor } from '@/lib/scoring/computeScore';
import type { WidgetConfig } from '@/types/dashboard';
import type { ScoreBucket } from '@/types/scoring';

/**
 * Score distribution chart card. Was bundled in the combined Quality
 * Score widget; split out so the chart can be hidden/dragged
 * independently. Default size 4×2 (~320px) gives the four bars
 * comfortable breathing room.
 *
 * The chart component itself is unchanged from the standalone page —
 * it already uses the four AA-compliant band hexes that match the
 * QualityScoreBadge bucket fills.
 */
export default function ScoreDistributionWidget({ widget }: { widget: WidgetConfig }) {
  const rules = useScoringStore((s) => s.rules);

  useEffect(() => {
    useScoringStore.persist.rehydrate();
  }, []);

  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const enrollments = useSequenceStore((s) => s.enrollments);

  const counts: Record<ScoreBucket, number> = useMemo(() => {
    const ctx = {
      contacts,
      deals,
      enrollments: enrollments.map((e) => ({
        contactId: e.contactId,
        status: e.status,
        enrolledAt: e.enrolledAt,
        sendLog: e.sendLog,
      })),
      now: Date.now(),
    };
    const persons = contacts.filter((c) => c.type === 'person');
    const c: Record<ScoreBucket, number> = { critical: 0, low: 0, mid: 0, high: 0 };
    for (const p of persons) {
      const total = computeScore(p, rules, ctx).total;
      c[bucketFor(total)]++;
    }
    return c;
  }, [contacts, deals, enrollments, rules]);

  return (
    <Widget widget={widget} title={widget.title || 'Score distribution'} defaultIconName="ChartBar">
      {/* The shared chart already provides its own card chrome (border,
          rounded corners, header). Inside the Widget shell we don't
          need that extra layer — render the bars directly using a
          minimal inline copy of the chart's body. To avoid duplication
          we just reuse the existing component; the visual nesting
          (card-in-card) is acceptable and keeps the chart logic in
          one place. */}
      <ScoreDistributionChart counts={counts} />
    </Widget>
  );
}
