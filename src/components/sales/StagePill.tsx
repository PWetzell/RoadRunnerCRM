'use client';

import { DealStage, STAGE_META } from '@/types/deal';
import { CheckCircle, XCircle, Lightbulb, ShieldCheck, MagnifyingGlass, FileText, Handshake } from '@phosphor-icons/react';
import { useIsDark } from '@/hooks/useIsDark';
import { dc } from '@/lib/pill-colors';

const STAGE_ICONS: Record<DealStage, React.ComponentType<{ size?: number; weight?: 'fill' | 'bold' | 'duotone' | 'regular' }>> = {
  'lead':         Lightbulb,
  'qualified':    ShieldCheck,
  'discovery':    MagnifyingGlass,
  'proposal':     FileText,
  'negotiation':  Handshake,
  'closed-won':   CheckCircle,
  'closed-lost':  XCircle,
};

export default function StagePill({ stage, size = 'sm' }: { stage: DealStage; size?: 'sm' | 'md' }) {
  const meta = STAGE_META[stage];
  const Icon = STAGE_ICONS[stage];
  const isDark = useIsDark();
  const c = dc(meta, isDark);
  const text = size === 'md' ? 'text-[11px]' : 'text-[10px]';
  const iconSize = size === 'md' ? 12 : 10;
  return (
    <span
      title={meta.label}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold truncate min-w-0 ${text}`}
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}` }}
    >
      <span className="flex-shrink-0"><Icon size={iconSize} weight="fill" /></span> <span className="truncate">{meta.label}</span>
    </span>
  );
}
