'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sparkle, CheckCircle, Phone, EnvelopeSimple, Briefcase, Buildings, MapPin } from '@phosphor-icons/react';
import { detectDuplicates, DuplicateCandidate } from '@/lib/data/mock-ai/duplicate-contacts';
import { getFakeContactCount } from '@/lib/data/fake-database/generator';
import { initials } from '@/lib/utils';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { usePublicPeopleSearch } from '@/lib/hooks/usePublicSourceSearch';
import type { ExternalPerson } from '@/lib/data/public-sources/types';
import { SourceBadge } from './SourceBadge';

/**
 * Shape passed to the parent when the user picks a suggestion card.
 * Both internal CRM cards and external public-source cards map into
 * this common shape so the parent has one populate path.
 */
export interface PickedCandidate {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
}

interface Props {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  onPickCandidate: (picked: PickedCandidate) => void;
}

/**
 * Two-column duplicate scanner:
 *   1. Internal — the user's own CRM records (source: CRM badge)
 *   2. External — real public data sources (GitHub, Gravatar, Wikidata, ORCID)
 *
 * Each result shows its source so the user can trust or verify the provenance.
 */
export function AIDuplicateDetection({ firstName, lastName, email, phone, company, onPickCandidate }: Props) {
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [internalCandidates, setInternalCandidates] = useState<DuplicateCandidate[]>([]);

  const totalContacts = useMemo(() => getFakeContactCount(), []);
  const query = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);
  const hasInput = firstName.length >= 2 || lastName.length >= 2 || email.length >= 4;

  // Fan out to public data sources in parallel
  const { results: externalCandidates, loading: externalLoading } = usePublicPeopleSearch(
    query,
    email,
    hasInput,
  );

  // Internal CRM scan (mock for now — Phase 3 will make this a real SQLite query)
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
        const matches = detectDuplicates({ firstName, lastName, email, phone, company });
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
  }, [firstName, lastName, email, phone, company, hasInput]);

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

      {!hasInput && (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Start typing — AI cross-references your CRM and public data sources (GitHub, Gravatar, Wikidata, ORCID) so you can merge duplicates and catch dirty data at intake.
        </p>
      )}

      {hasInput && (
        <>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Checking <strong className="text-[var(--text-primary)]">{totalContacts.toLocaleString()}</strong> CRM contacts + <strong className="text-[var(--text-primary)]">public data sources</strong>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-[var(--surface-raised)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--ai)] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
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
                  onClick={() => onPickCandidate({
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    title: c.title && c.title !== '—' ? c.title : undefined,
                    company: c.company,
                  })}
                  className="text-left bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 cursor-pointer hover:border-[var(--ai)] transition-all animate-[fadeUp_0.3s_ease-out]"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                      style={{ background: c.avatarColor }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] truncate">{c.company}</div>
                    </div>
                    <ConfidenceBadge confidence={c.confidence} />
                  </div>
                  <div className="flex items-center gap-1 ml-[42px] mb-1.5">
                    <SourceBadge source="crm" />
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] text-[var(--text-secondary)] ml-[42px]">
                    {c.email && (
                      <div className="flex items-center gap-1">
                        <EnvelopeSimple size={11} className="text-[var(--text-tertiary)]" />
                        <span className="truncate">{c.email}</span>
                        {c.matchedFields.includes('email') && <CheckCircle size={11} className="text-[var(--success)] flex-shrink-0" />}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1">
                        <Phone size={11} className="text-[var(--text-tertiary)]" />
                        <span>{c.phone}</span>
                        {c.matchedFields.includes('phone') && <CheckCircle size={11} className="text-[var(--success)] flex-shrink-0" />}
                      </div>
                    )}
                    {c.title && c.title !== '—' && (
                      <div className="flex items-center gap-1">
                        <Briefcase size={11} className="text-[var(--text-tertiary)]" />
                        <span className="truncate">{c.title}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* External public-source matches */}
          {externalCandidates.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                From public sources
              </div>
              {externalCandidates.slice(0, 6).map((p) => (
                <ExternalPersonCard
                  key={p.id}
                  person={p}
                  onPick={() => onPickCandidate({
                    name: p.name,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    email: p.email,
                    title: p.title,
                    company: p.company,
                  })}
                />
              ))}
            </div>
          )}

          {!scanning && !externalLoading && !anyResults && (
            <div className="flex items-center gap-2 p-3 bg-[var(--success-bg)] border border-[var(--success)] rounded-[var(--radius-md)]">
              <CheckCircle size={16} className="text-[var(--success)] flex-shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-[var(--success)]">No duplicates found</div>
                <div className="text-[var(--text-secondary)] mt-0.5">This looks like a new contact.</div>
              </div>
            </div>
          )}

          {(internalCandidates.length > 0 || externalCandidates.length > 0) && (
            <p className="text-[10px] text-[var(--text-tertiary)] italic mt-1">
              Click any suggestion to fill the form — or keep typing to create a new contact.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ExternalPersonCard({ person, onPick }: { person: import('@/lib/data/public-sources/types').ExternalPerson; onPick: () => void }) {
  const display = person.name;
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 cursor-pointer hover:border-[var(--ai)] transition-all animate-[fadeUp_0.3s_ease-out] block"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0">
          {initials(display)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{display}</div>
          {(person.title || person.company) && (
            <div className="text-[10px] text-[var(--text-tertiary)] truncate">
              {[person.title, person.company].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <ConfidenceBadge confidence={person.confidence} />
      </div>
      <div className="flex items-center gap-1 ml-[42px] mb-1.5">
        <SourceBadge source={person.source} />
        {person.identifiers && Object.keys(person.identifiers).filter((k) => k !== person.source).map((k) => (
          <SourceBadge key={k} source={k as import('@/lib/data/public-sources/types').ProviderId} />
        ))}
      </div>
      <div className="flex flex-col gap-1 text-[11px] text-[var(--text-secondary)] ml-[42px]">
        {person.email && (
          <div className="flex items-center gap-1">
            <EnvelopeSimple size={11} className="text-[var(--text-tertiary)]" />
            <span className="truncate">{person.email}</span>
          </div>
        )}
        {person.bio && (
          <div className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">{person.bio}</div>
        )}
        {person.location && (
          <div className="flex items-center gap-1">
            <MapPin size={11} className="text-[var(--text-tertiary)]" />
            <span className="truncate">{person.location}</span>
          </div>
        )}
      </div>
    </button>
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
