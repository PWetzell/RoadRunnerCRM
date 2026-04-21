'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkle, Plus, ArrowLeft } from '@phosphor-icons/react';

interface SummaryRow {
  label: string;
  value: string;
}

interface Props {
  title: string;
  subtitle: string;
  summary: SummaryRow[];
  contactId: string;
  contactType: 'person' | 'company';
  variant?: 'person' | 'company';
  qualityScore?: number;
  enrichmentSummary?: { fieldsAccepted: string; avgConfidence: string; dataSources: string; qualityLabel: string };
}

export function SuccessScreen({ title, subtitle, summary, contactId, contactType, variant = 'person', qualityScore, enrichmentSummary }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(variant === 'person');
  const [score, setScore] = useState<number | null>(qualityScore || null);

  // For person flow: simulate AI quality score computation after save
  useEffect(() => {
    if (variant !== 'person') return;
    const timer = setTimeout(() => {
      const computed = 78 + Math.floor(Math.random() * 17); // 78-95
      setScore(computed);
      setAnalyzing(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [variant]);

  const scoreColor = (score ?? 0) >= 90 ? 'var(--success)' : (score ?? 0) >= 75 ? 'var(--brand-primary)' : 'var(--warning)';

  return (
    <div className="px-6 py-10 flex justify-center">
      <div
        className="bg-[var(--surface-card)] border-2 border-[var(--success)] rounded-xl p-8 w-full max-w-[700px] relative"
        style={{ boxShadow: '0 0 0 4px var(--success-bg)' }}
      >
        {/* Quality score badge (top-right) */}
        {variant === 'company' && score !== null && (
          <div
            className="absolute top-6 right-6 w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-[18px] border-2"
            style={{ color: scoreColor, borderColor: scoreColor }}
          >
            {score}
          </div>
        )}

        {/* Big checkmark */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] border-2 border-[var(--success)] flex items-center justify-center">
            <Check size={32} weight="bold" className="text-[var(--success)]" />
          </div>
          <h1 className="text-[22px] font-extrabold text-[var(--success)]">{title}</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">{subtitle}</p>
        </div>

        {/* Summary card */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 mb-4">
          <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            {contactType === 'person' ? 'Contact Summary' : 'Company Summary'}
          </div>
          <div className="flex flex-col gap-1.5">
            {summary.map((row) => (
              <div key={row.label} className="grid grid-cols-[120px_1fr] gap-2">
                <div className="text-[12px] text-[var(--text-tertiary)]">{row.label}</div>
                <div className="text-[13px] text-[var(--text-primary)] font-semibold">{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrichment summary (company only) */}
        {variant === 'company' && enrichmentSummary && (
          <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] p-4 mb-4">
            <div className="text-[10px] font-bold text-[var(--ai-dark)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkle size={10} weight="duotone" /> AI Enrichment Results
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[12px]">
              <div className="text-[var(--text-tertiary)]">Fields Enriched</div>
              <div className="font-bold text-[var(--success)]">{enrichmentSummary.fieldsAccepted}</div>
              <div className="text-[var(--text-tertiary)]">Avg Confidence</div>
              <div className="font-bold text-[var(--brand-primary)]">{enrichmentSummary.avgConfidence}</div>
              <div className="text-[var(--text-tertiary)]">Data Sources</div>
              <div className="font-bold text-[var(--text-primary)]">{enrichmentSummary.dataSources}</div>
              <div className="text-[var(--text-tertiary)]">Quality Score</div>
              <div className="font-bold" style={{ color: scoreColor }}>
                {score} — {enrichmentSummary.qualityLabel}
              </div>
            </div>
          </div>
        )}

        {/* AI analyzing banner (person only) */}
        {variant === 'person' && (
          analyzing ? (
            <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] p-3 flex items-center gap-2 mb-4">
              <Sparkle size={14} weight="duotone" className="text-[var(--ai)] flex-shrink-0 animate-pulse" />
              <div className="text-[11px] text-[var(--text-secondary)]">
                AI is analyzing this contact&apos;s quality score and enriching profile data. This may take a few moments.
              </div>
            </div>
          ) : (
            <div className="bg-[var(--success-bg)] border border-[var(--success)] rounded-[var(--radius-md)] p-3 flex items-center gap-2 mb-4">
              <Check size={14} weight="bold" className="text-[var(--success)] flex-shrink-0" />
              <div className="text-[11px] text-[var(--text-secondary)]">
                Quality Score: <span className="font-bold" style={{ color: scoreColor }}>{score}</span> — profile enrichment complete.
              </div>
            </div>
          )
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push(`/contacts/${contactId}`)}
            className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-md)] cursor-pointer border-none"
          >
            View {contactType === 'person' ? 'Contact Profile' : 'Company Profile'}
          </button>
          <button
            onClick={() => router.push('/contacts?add=1')}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
          >
            <Plus size={12} weight="bold" /> Add {contactType === 'person' ? 'Another' : 'Another Company'}
          </button>
          <button
            onClick={() => router.push('/contacts')}
            className="flex items-center gap-1 text-[13px] text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline ml-auto"
          >
            <ArrowLeft size={12} /> Back to Contacts
          </button>
        </div>
      </div>
    </div>
  );
}
