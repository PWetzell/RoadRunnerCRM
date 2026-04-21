'use client';

import { useMemo } from 'react';
import { Sparkle, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { WidgetConfig, itemLimitForSize } from '@/types/dashboard';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import Widget from '../Widget';

interface Suggestion {
  id: string;
  title: string;
  reason: string;
  href: string;
}

/**
 * Produces a small set of "next best action" suggestions based on simple
 * deterministic rules on top of the current data. Not a real LLM call — this
 * is the portfolio-ready UI that would plug into one later.
 */
function buildSuggestions(
  deals: ReturnType<typeof useSalesStore.getState>['deals'],
  contacts: ReturnType<typeof useContactStore.getState>['contacts'],
): Suggestion[] {
  const out: Suggestion[] = [];
  const now = Date.now();

  // Stalled deals
  const stalled = deals
    .filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost')
    .map((d) => ({ d, days: Math.floor((now - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)) }))
    .filter((x) => x.days > 21)
    .sort((a, b) => b.days - a.days);
  if (stalled[0]) {
    const s = stalled[0];
    out.push({
      id: `sugg-stalled-${s.d.id}`,
      title: `Reach out on ${s.d.name}`,
      reason: `Idle ${s.days} days — momentum is slipping.`,
      href: `/sales/${s.d.id}`,
    });
  }

  // Negotiation-stage deals — flag as high leverage
  const closing = deals.find((d) => d.stage === 'negotiation');
  if (closing) {
    out.push({
      id: `sugg-close-${closing.id}`,
      title: `Close ${closing.name}`,
      reason: 'In negotiation — one more touch could tip it.',
      href: `/sales/${closing.id}`,
    });
  }

  // Incomplete contacts
  const stale = contacts.find((c) => c.stale);
  if (stale) {
    out.push({
      id: `sugg-clean-${stale.id}`,
      title: `Clean up ${stale.name}`,
      reason: stale.staleReason || 'Contact record is incomplete.',
      href: `/contacts/${stale.id}`,
    });
  }

  // Person-first lead with no company
  const candidate = deals.find((d) => d.type === 'person' && !d.orgContactId);
  if (candidate) {
    out.push({
      id: `sugg-link-${candidate.id}`,
      title: `Link a company to ${candidate.name}`,
      reason: 'Person lead is missing current employer context.',
      href: `/sales/${candidate.id}`,
    });
  }

  return out;
}

export default function AISuggestionsWidget({ widget }: { widget: WidgetConfig }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const notifications = useUserStore((s) => s.notifications);

  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const all = useMemo(() => {
    if (!aiEnabled) return [];
    const items = buildSuggestions(deals, contacts);
    // Filter out suggestion types the user has muted
    return items.filter((s) => {
      // Stale-contact suggestions are gated by staleAlerts
      if (s.id.startsWith('sugg-clean-')) return notifications.staleAlerts;
      // Everything else (stalled deals, close-suggestions, link-company) is an AI suggestion
      return notifications.aiSuggestions;
    });
  }, [deals, contacts, notifications.aiSuggestions, notifications.staleAlerts, aiEnabled]);
  const limit = itemLimitForSize(widget.size);
  const suggestions = all.slice(0, limit);

  // Per-suggestion card customization — falls back to design-token defaults.
  const suggestionBg = (widget.config?.suggestionBg as string | undefined) || 'var(--ai-bg)';
  const suggestionBorder = (widget.config?.suggestionBorder as string | undefined) || 'var(--ai-border)';
  const suggestionAccent = (widget.config?.suggestionAccent as string | undefined) || 'var(--ai)';

  return (
    <Widget
      widget={widget}
      title={widget.title || 'AI suggestions'}
      defaultIconName="Sparkle"
    >
      {suggestions.length === 0 ? (
        <div className="text-[12px] italic text-[var(--widget-tertiary-text)] flex items-center justify-center h-full text-center px-3">
          {!aiEnabled
            ? 'AI features are turned off in Settings.'
            : !notifications.aiSuggestions && !notifications.staleAlerts
              ? 'AI suggestions are turned off in Settings.'
              : 'Nothing pressing right now.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 @md:gap-2 @xl:gap-3">
          {suggestions.map((s) => (
            <li key={s.id}>
              <Link
                href={s.href}
                className="group flex items-start gap-2 @md:gap-2.5 @xl:gap-3 p-1.5 @md:p-2 @xl:p-3 rounded-md no-underline transition-colors"
                style={{
                  background: suggestionBg,
                  border: `1px solid ${suggestionBorder}`,
                }}
              >
                <Sparkle size={12} weight="duotone" className="mt-0.5 flex-shrink-0 @md:size-[14px] @xl:size-[16px]" style={{ color: suggestionAccent }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[calc(11px*var(--content-scale,1))] @md:text-[calc(12px*var(--content-scale,1))] @xl:text-[calc(14px*var(--content-scale,1))] font-bold text-[var(--widget-primary-text)] truncate">{s.title}</div>
                  <div className="text-[calc(10px*var(--widget-subtitle-scale,1))] @md:text-[calc(11px*var(--widget-subtitle-scale,1))] @xl:text-[calc(12px*var(--widget-subtitle-scale,1))] text-[var(--widget-tertiary-text)] truncate">{s.reason}</div>
                </div>
                <ArrowRight size={12} weight="bold" className="mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 @md:size-[14px] @xl:size-[16px]" style={{ color: suggestionAccent }} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
