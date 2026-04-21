'use client';

import { useEffect, useState } from 'react';
import { Sparkle, Buildings } from '@phosphor-icons/react';
import { suggestHierarchy, OrgNode, HierarchySuggestion } from '@/lib/data/mock-ai/org-hierarchies';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  companyName: string;
  personName: string;
  personTitle: string;
  onApplySuggestion: (reportsTo: { id: string; name: string; title: string }) => void;
}

export function AIOrgHierarchy({ companyName, personName, personTitle, onApplySuggestion }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<HierarchySuggestion | null>(null);

  useEffect(() => {
    if (!companyName || companyName.trim().length < 2) {
      setSuggestion(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSuggestion(null);

    const timer = setTimeout(() => {
      const result = suggestHierarchy({ companyName, personName, personTitle });
      setSuggestion(result);
      setLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [companyName, personName, personTitle]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--ai-dark)]">
          <Sparkle size={16} weight="duotone" className="text-[var(--ai)]" />
          AI Org Hierarchy Suggestion
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <Spinner size={12} color="var(--ai)" />
            Analyzing
          </span>
        )}
      </div>

      {!companyName && !loading && (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Enter a company name to see the org hierarchy suggestion and reports-to recommendation.
        </p>
      )}

      {loading && (
        <>
          <Skeleton width="100%" height={140} rounded="md" />
          <Skeleton width="80%" height={32} rounded="md" />
          <Skeleton width="100%" height={36} rounded="md" />
        </>
      )}

      {!loading && suggestion && (
        <>
          {/* Tree */}
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-3">
            <HierarchyNode node={suggestion.tree} depth={0} />
          </div>

          {/* Rationale */}
          <div className="flex gap-2 p-3 bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)]">
            <Sparkle size={14} weight="duotone" className="text-[var(--ai)] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {suggestion.rationale} <span className="font-bold text-[var(--ai-dark)]">Confidence: {suggestion.confidence}%</span>
            </div>
          </div>

          {/* Apply button */}
          <button
            onClick={() => onApplySuggestion(suggestion.reportsTo)}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2 text-[13px] font-extrabold text-white rounded-[var(--radius-md)] cursor-pointer border-none"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}
          >
            <Sparkle size={14} weight="duotone" />
            Apply Suggestion
          </button>
        </>
      )}
    </div>
  );
}

function HierarchyNode({ node, depth }: { node: OrgNode; depth: number }) {
  const isCompany = depth === 0;
  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] border my-0.5 ${
          node.isNew
            ? 'bg-[var(--brand-bg)] border-[var(--brand-primary)]'
            : isCompany
            ? 'bg-[var(--success-bg)] border-[var(--success)]'
            : 'bg-[var(--surface-card)] border-[var(--border)]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCompany && <Buildings size={12} className="text-[var(--success)] flex-shrink-0" />}
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{node.name}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] truncate">{node.title}</div>
          </div>
        </div>
        {node.isNew && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[var(--brand-primary)] text-white flex-shrink-0">
            NEW
          </span>
        )}
      </div>
      {node.children && (
        <div className="ml-4 border-l border-[var(--border)] pl-2">
          {node.children.map((child) => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
