'use client';

import { Database } from '@phosphor-icons/react';
import { SOURCE_META, type ProviderId } from '@/lib/data/public-sources/types';

/**
 * Small colored pill that identifies which data source a match came from.
 * Every suggestion in the CRM shows one of these so the user can trust
 * (or question) the provenance of every AI-produced row.
 */
export function SourceBadge({ source, href }: { source: ProviderId; href?: string }) {
  const meta = SOURCE_META[source];
  const content = (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border"
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      <Database size={9} weight="fill" />
      {meta.short}
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="no-underline" onClick={(e) => e.stopPropagation()}>
        {content}
      </a>
    );
  }
  return content;
}

/**
 * Display multiple source badges for a single result (when providers merged
 * on the same entity — e.g. a company matched in both SEC EDGAR and GLEIF).
 */
export function SourceBadges({ sources, primaryHref }: { sources: ProviderId[]; primaryHref?: string }) {
  const unique = Array.from(new Set(sources));
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {unique.map((s, i) => (
        <SourceBadge key={s} source={s} href={i === 0 ? primaryHref : undefined} />
      ))}
    </div>
  );
}
