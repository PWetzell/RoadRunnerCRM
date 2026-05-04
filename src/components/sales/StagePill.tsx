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

/**
 * Sales-stage pill — triplet style (light bg + colored text + colored
 * border). Per-stage colors come from `STAGE_META[stage]` in
 * `types/deal.ts`, which already carries the canonical light/dark
 * pairs (color/bg/darkColor/darkBg). `dc()` picks the right pair for
 * the active theme.
 */
export default function StagePill({ stage, size = 'sm' }: { stage: DealStage; size?: 'sm' | 'md' }) {
  const meta = STAGE_META[stage];
  const Icon = STAGE_ICONS[stage];
  const isDark = useIsDark();
  const c = dc(meta, isDark);
  const iconSize = size === 'md' ? 12 : 10;
  return (
    <span
      title={meta.label}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold truncate min-w-0 border"
      style={{ background: c.bg, color: c.color, borderColor: c.color }}
    >
      <span className="flex-shrink-0"><Icon size={iconSize} /></span> <span className="truncate">{meta.label}</span>
    </span>
  );
}
