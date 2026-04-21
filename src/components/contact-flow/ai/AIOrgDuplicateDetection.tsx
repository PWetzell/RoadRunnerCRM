'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkle, CheckCircle, Globe, MapPin, Buildings } from '@phosphor-icons/react';
import { detectOrgDuplicates, OrgDuplicateCandidate } from '@/lib/data/mock-ai/duplicate-orgs';
import { getFakeContactCount } from '@/lib/data/fake-database/generator';
import { initials } from '@/lib/utils';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { usePublicCompanySearch } from '@/lib/hooks/usePublicSourceSearch';
import type { ExternalCompany, ProviderId } from '@/lib/data/public-sources/types';
import { SourceBadge } from './SourceBadge';

interface Props {
  companyName: string;
  website?: string;
  hq?: string;
  onReviewCandidate: (candidate: OrgDuplicateCandidate) => void;
}

/**
 * Duplicate scanner for organizations. Runs two checks in parallel:
 *   1. Internal — user's own CRM (Zustand store)
 *   2. External — public data sources (Clearbit, SEC EDGAR, Wikidata, GLEIF,
 *      GitHub orgs, plus key-gated OpenCorporates / Companies House / SAM.gov)
 *
 * Every suggestion is tagged with its data source.
 */
export function AIOrgDuplicateDetection({ companyName, website, hq, onReviewCandidate }: Props) {
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [internalCandidates, setInternalCandidates] = useState<OrgDuplicateCandidate[]>([]);

  const totalContacts = useMemo(() => getFakeContactCount(), []);
  const hasInput = companyName.trim().length >= 2;

  // External data fan-out
  const { results: externalCandidates, loading: externalLoading } = usePublicCompanySearch(companyName, hasInput);

  useEffect(() => {
    if (!hasInput) {
      setScanning(false);
      setProgress(0);
      setInternalCandidates([]);
      return;
    }

    setScanning(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(95, p + 7));
    }, 80);

    const scanTimer = setTimeout(() => {
      try {
        const matches = detectOrgDuplicates({ companyName, website, hq });
        setInternalCandidates(matches);
      } finally {
        setScanning(false);
        setProgress(100);
        clearInterval(progressInterval);
      }
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(scanTimer);
    };
  }, [companyName, website, hq, hasInput]);

  const anyResults = internalCandidates.length > 0 || externalCandidates.length > 0;

  return (
    <div className="bg-[var(--surface-card)] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--ai-dark)]">
          <Sparkle size={16} weight="duotone" className="text-[var(--ai)]" />
          AI Duplicate Detection
        </div>
        {(scanning || externalLoading) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ai)] animate-pulse" />
            Scanning
          </span>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-tertiary)]">
        As you type, AI cross-references your CRM and public corporate registries (Clearbit, SEC EDGAR, Wikidata, GLEIF, GitHub) — merge duplicates at intake instead of cleaning them up later.
      </p>

      {hasInput && (
        <>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Checking <strong className="text-[var(--text-primary)]">{totalContacts.toLocaleString()}</strong> CRM records + <strong className="text-[var(--text-primary)]">public registries</strong>
          </div>

          <div className="h-1 bg-[var(--surface-raised)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--ai)] transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>

          {scanning && (
            <div className="flex flex-col gap-2 mt-1">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Internal CRM matches */}
          {!scanning && internalCandidates.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                In your CRM
              </div>
              {internalCandidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onReviewCandidate(c)}
                  className="text-left bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 cursor-pointer hover:border-[var(--ai)] transition-all animate-[fadeUp_0.3s_ease-out]"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                      style={{ background: c.avatarColor }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] truncate">{c.industry}</div>
                    </div>
                    <ConfidenceBadge confidence={c.confidence} />
                  </div>
                  <div className="flex items-center gap-1 ml-[42px] mb-2">
                    <SourceBadge source="crm" />
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] text-[var(--text-secondary)] ml-[42px]">
                    {c.website && (
                      <div className="flex items-center gap-1">
                        <Globe size={11} className="text-[var(--text-tertiary)]" />
                        <span className="truncate">{c.website}</span>
                        {c.matchedFields.includes('website') && <CheckCircle size={11} className="text-[var(--success)] flex-shrink-0" />}
                      </div>
                    )}
                    {c.hq && (
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-[var(--text-tertiary)]" />
                        <span>{c.hq}</span>
                        {c.matchedFields.includes('hq') && <CheckCircle size={11} className="text-[var(--success)] flex-shrink-0" />}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Buildings size={11} className="text-[var(--text-tertiary)]" />
                      <span>{c.employees} employees</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* External public-source matches */}
          {externalCandidates.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                From public registries
              </div>
              {externalCandidates.slice(0, 8).map((c) => (
                <ExternalCompanyCard key={c.id} company={c} />
              ))}
            </div>
          )}

          {!scanning && !externalLoading && !anyResults && (
            <div className="flex items-center gap-2 p-3 bg-[var(--success-bg)] border border-[var(--success)] rounded-[var(--radius-md)]">
              <CheckCircle size={16} className="text-[var(--success)] flex-shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-[var(--success)]">No existing organization found</div>
                <div className="text-[var(--text-secondary)] mt-0.5">This looks like a new company.</div>
              </div>
            </div>
          )}

          {anyResults && (
            <p className="text-[10px] text-[var(--text-tertiary)] italic mt-1">
              Tap any match to review, merge, or keep creating as new.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ExternalCompanyCard({ company }: { company: ExternalCompany }) {
  const extraSources: ProviderId[] = Object.keys(company.identifiers || {})
    .filter((k) => k !== company.source) as ProviderId[];
  return (
    <a
      href={company.sourceUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 no-underline hover:border-[var(--ai)] transition-all animate-[fadeUp_0.3s_ease-out] block"
    >
      <div className="flex items-center gap-2.5 mb-2">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={company.name} className="w-8 h-8 rounded-[6px] object-cover bg-[var(--surface-card)] flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-[6px] bg-[var(--brand-primary)] flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0">
            {initials(company.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{company.name}</div>
          {(company.industry || company.description) && (
            <div className="text-[10px] text-[var(--text-tertiary)] truncate">{company.industry || company.description}</div>
          )}
        </div>
        <ConfidenceBadge confidence={company.confidence} />
      </div>
      <div className="flex items-center gap-1 ml-[42px] mb-2 flex-wrap">
        <SourceBadge source={company.source} />
        {extraSources.map((s) => (
          <SourceBadge key={s} source={s} />
        ))}
      </div>
      <div className="flex flex-col gap-1 text-[11px] text-[var(--text-secondary)] ml-[42px]">
        {company.website && (
          <div className="flex items-center gap-1">
            <Globe size={11} className="text-[var(--text-tertiary)]" />
            <span className="truncate">{company.website}</span>
          </div>
        )}
        {company.hq && (
          <div className="flex items-center gap-1">
            <MapPin size={11} className="text-[var(--text-tertiary)]" />
            <span className="truncate">{company.hq}</span>
          </div>
        )}
        {company.employees && (
          <div className="flex items-center gap-1">
            <Buildings size={11} className="text-[var(--text-tertiary)]" />
            <span>{company.employees} employees</span>
          </div>
        )}
      </div>
    </a>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const tier = confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : confidence >= 50 ? 'low' : 'loose';
  const cls = tier === 'high'
    ? 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]'
    : tier === 'medium'
    ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]'
    : tier === 'low'
    ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
    : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] border-[var(--border-strong)]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${cls}`}>
      {confidence}%
    </span>
  );
}
