'use client';

import { Sparkle } from '@phosphor-icons/react';
import { useCompanyEnrichment } from '@/lib/hooks/usePublicSourceSearch';
import { buildEnrichmentFromAggregator } from '@/lib/data/mock-ai/company-enrichment';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import { SourceBadge } from './SourceBadge';

interface Props {
  companyName: string;
  website?: string;
}

/**
 * Live preview shown alongside the company-details form. Pulls real data
 * from the public-source aggregator as the user types and shows what
 * would be discoverable in the Enrichment step.
 */
export function AIEnrichmentPreview({ companyName }: Props) {
  const enabled = companyName.trim().length >= 2;
  const { candidates, employees, loading } = useCompanyEnrichment(companyName, enabled);
  const result = enabled ? buildEnrichmentFromAggregator(companyName, candidates, employees) : null;
  const shownFields = result?.fields.slice(0, 6) || [];

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--ai-dark)]">
          <Sparkle size={16} weight="duotone" className="text-[var(--ai)]" />
          AI Enrichment Preview
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <Spinner size={12} color="var(--ai)" />
            Scanning
          </span>
        )}
      </div>

      {!enabled && (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Enter a company name — AI will scan real public registries (Clearbit, SEC EDGAR, Wikidata, GLEIF) to enrich the record. Every field shows the source it came from.
        </p>
      )}

      {loading && shownFields.length === 0 && (
        <>
          <Skeleton width="100%" height={48} rounded="md" />
          <Skeleton width="100%" height={48} rounded="md" />
          <Skeleton width="100%" height={48} rounded="md" />
        </>
      )}

      {!loading && enabled && result && result.fields.length === 0 && (
        <p className="text-[11px] text-[var(--text-tertiary)] italic">
          No matching public records found — you can still add this company manually.
        </p>
      )}

      {result && shownFields.length > 0 && (
        <>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Scanning public sources... <strong className="text-[var(--text-primary)]">{result.totalFound}</strong> field{result.totalFound === 1 ? '' : 's'} discovered
          </div>

          <div className="flex flex-col gap-2">
            {shownFields.map((f) => (
              <div
                key={f.key}
                className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-2.5 animate-[fadeUp_0.25s_ease-out]"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{f.label}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <SourceBadge source={f.source} href={f.sourceUrl} />
                    <ConfidencePercent confidence={f.confidence} />
                  </div>
                </div>
                <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{f.value}</div>
              </div>
            ))}

            {result.totalFound > 0 && (
              <div className="mt-1 p-2.5 rounded-[var(--radius-md)] border border-[var(--ai-border)] bg-[var(--ai-bg)] animate-[fadeUp_0.3s_ease-out]">
                <div className="text-[11px] font-bold text-[var(--ai-dark)]">
                  {result.totalFound} fields ready to review
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  Avg confidence: <strong className="text-[var(--ai-dark)]">{result.avgConfidence}%</strong> · Quality: <strong className="text-[var(--ai-dark)]">{result.qualityLabel}</strong>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ConfidencePercent({ confidence }: { confidence: number }) {
  const color = confidence >= 90 ? 'var(--success)' : confidence >= 75 ? 'var(--brand-primary)' : 'var(--warning)';
  return (
    <span className="text-[10px] font-extrabold" style={{ color }}>{confidence}%</span>
  );
}
