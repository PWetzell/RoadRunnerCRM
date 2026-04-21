'use client';

import { useEffect, useState } from 'react';
import { Sparkle, Heart, Lock, ChartBar, Tag } from '@phosphor-icons/react';
import { getPrivacyAdvisory, PrivacyAdvisoryItem } from '@/lib/data/mock-ai/privacy-advisory';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  relationshipType: string;
  companyName: string;
  isPrivate: boolean;
}

const ICON_MAP = {
  strength: Heart,
  privacy: Lock,
  engagement: ChartBar,
  tags: Tag,
};

export function AIPrivacyAdvisory({ relationshipType, companyName, isPrivate }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PrivacyAdvisoryItem[]>([]);

  useEffect(() => {
    if (!relationshipType) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems([]);
    const timer = setTimeout(() => {
      setItems(getPrivacyAdvisory({ relationshipType, companyName, isPrivate }));
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [relationshipType, companyName, isPrivate]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--ai-border)] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--ai-dark)]">
          <Sparkle size={16} weight="duotone" className="text-[var(--ai)]" />
          AI Privacy Advisory
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <Spinner size={12} color="var(--ai)" />
            Analyzing
          </span>
        )}
      </div>

      {!relationshipType && !loading && (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Select a relationship type to see privacy considerations, engagement predictions, and suggested tags.
        </p>
      )}

      {loading && (
        <>
          <Skeleton width="100%" height={64} rounded="md" />
          <Skeleton width="100%" height={64} rounded="md" />
          <Skeleton width="100%" height={64} rounded="md" />
        </>
      )}

      {!loading && items.map((item) => <AdvisoryCard key={item.id} item={item} />)}
    </div>
  );
}

function AdvisoryCard({ item }: { item: PrivacyAdvisoryItem }) {
  const Icon = ICON_MAP[item.icon];
  const borderColor = item.severity === 'warning' ? 'var(--warning)' : item.severity === 'success' ? 'var(--success)' : 'var(--ai-border)';
  const iconColor = item.severity === 'warning' ? 'var(--warning)' : item.severity === 'success' ? 'var(--success)' : 'var(--ai)';
  const bgColor = item.severity === 'warning' ? 'var(--warning-bg)' : item.severity === 'success' ? 'var(--success-bg)' : 'var(--ai-bg)';

  return (
    <div
      className="rounded-[var(--radius-md)] border p-3 flex gap-2.5 animate-[fadeUp_0.2s_ease-out]"
      style={{ borderColor, background: bgColor }}
    >
      <Icon size={16} weight="duotone" style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold text-[var(--text-primary)]">{item.title}</div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">{item.body}</p>
      </div>
    </div>
  );
}
