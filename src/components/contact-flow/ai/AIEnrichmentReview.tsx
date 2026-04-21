'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkle, Check, X as XIcon, CheckCircle } from '@phosphor-icons/react';
import { EnrichmentField, EnrichmentResult, buildEnrichmentFromAggregator } from '@/lib/data/mock-ai/company-enrichment';
import { useCompanyEnrichment } from '@/lib/hooks/usePublicSourceSearch';
import { SourceBadge } from './SourceBadge';

interface Props {
  result: EnrichmentResult;
  onChange: (fields: EnrichmentField[]) => void;
}

/**
 * Enrichment review panel. Pulls real data from the public-source aggregator
 * when mounted (using the company name from the initial result), merges it
 * into the review grid, and shows a source badge per field so the user
 * knows exactly where each piece of info came from.
 */
export function AIEnrichmentReview({ result, onChange }: Props) {
  const [fields, setFields] = useState<EnrichmentField[]>(result.fields);

  // Load real enrichment for the company
  const { candidates, employees, loading } = useCompanyEnrichment(result.companyName, Boolean(result.companyName));

  // Rebuild fields whenever the aggregator returns new data
  useEffect(() => {
    if (loading) return;
    const real = buildEnrichmentFromAggregator(result.companyName, candidates, employees);
    const withAutoAccept = real.fields.map((f) => ({ ...f, accepted: f.confidence >= 85 }));
    setFields(withAutoAccept);
    onChange(withAutoAccept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, candidates, employees, result.companyName]);

  const updateField = (key: string, accepted: boolean | undefined) => {
    const next = fields.map((f) => (f.key === key ? { ...f, accepted } : f));
    setFields(next);
    onChange(next);
  };

  const acceptedCount = fields.filter((f) => f.accepted).length;
  const avgConf = acceptedCount > 0
    ? Math.round(fields.filter((f) => f.accepted).reduce((sum, f) => sum + f.confidence, 0) / acceptedCount)
    : 0;
  const overallConfPct = fields.length > 0
    ? Math.round((fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length))
    : 0;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--ai-border)] bg-[var(--ai-bg)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="duotone" className="text-[var(--ai)]" />
          <span className="text-[14px] font-extrabold text-[var(--ai-dark)]">
            AI Enrichment Review — {result.companyName}
          </span>
          {loading && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ai)] animate-pulse" />
              Enriching
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fields.length > 0 && (
            <>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                overallConfPct >= 85 ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]' :
                overallConfPct >= 70 ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]' :
                'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]'
              }`}>
                Confidence: {overallConfPct}%
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{acceptedCount} of {fields.length} accepted</span>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-3 text-[12px] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
        {loading && fields.length === 0
          ? 'Pulling real data from public registries (Clearbit, SEC EDGAR, Wikidata, GLEIF…)'
          : fields.length === 0
            ? 'No matching public records found. You can proceed to add this company manually.'
            : 'Review the AI-discovered data. Each field shows the source it came from — accept to add to the company profile, or reject to discard.'}
      </div>

      {/* Table */}
      {fields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Field</th>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">AI-Discovered Value</th>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Confidence</th>
                <th className="text-right px-4 py-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr
                  key={f.key}
                  className={`border-b border-[var(--border-subtle)] last:border-b-0 transition-colors ${
                    f.accepted ? 'bg-[var(--success-bg)]' : f.accepted === false ? 'bg-[var(--danger-bg)] opacity-70' : 'hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <td className="px-4 py-3 text-[13px] font-bold text-[var(--text-primary)]">{f.label}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)] max-w-[300px] truncate" title={f.value}>{f.value}</td>
                  <td className="px-4 py-3">
                    <SourceBadge source={f.source} href={f.sourceUrl} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold ${
                      f.confidence >= 90 ? 'text-[var(--success)]' :
                      f.confidence >= 75 ? 'text-[var(--brand-primary)]' :
                      'text-[var(--warning)]'
                    }`}>
                      {f.confidence}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => updateField(f.key, true)}
                        className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer transition-all border ${
                          f.accepted
                            ? 'bg-[var(--success)] border-[var(--success)] text-white'
                            : 'bg-transparent border-[var(--border-strong)] text-[var(--text-tertiary)] hover:border-[var(--success)] hover:text-[var(--success)]'
                        }`}
                        title="Accept"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => updateField(f.key, false)}
                        className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer transition-all border ${
                          f.accepted === false
                            ? 'bg-[var(--danger)] border-[var(--danger)] text-white'
                            : 'bg-transparent border-[var(--border-strong)] text-[var(--text-tertiary)] hover:border-[var(--danger)] hover:text-[var(--danger)]'
                        }`}
                        title="Reject"
                      >
                        <XIcon size={14} weight="bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {fields.length > 0 && (
        <div className="px-5 py-2.5 border-t border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-between">
          <div className="text-[11px] text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{acceptedCount} of {fields.length}</strong> fields accepted
            {acceptedCount > 0 && <> · Avg confidence: <strong className="text-[var(--text-primary)]">{avgConf}%</strong></>}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--success)]">
            <CheckCircle size={12} weight="fill" />
            <span>Auto-accepted fields with ≥85% confidence</span>
          </div>
        </div>
      )}
    </div>
  );
}
