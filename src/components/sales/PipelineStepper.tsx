'use client';

import { CaretRight, CheckCircle } from '@phosphor-icons/react';
import { DealStage, PIPELINE_STAGES, STAGE_META } from '@/types/deal';
import { useIsDark } from '@/hooks/useIsDark';

export default function PipelineStepper({ stage, onChange }: { stage: DealStage; onChange: (s: DealStage) => void }) {
  const isDark = useIsDark();
  const currentOrder = STAGE_META[stage]?.order ?? 1;
  const isLost = stage === 'closed-lost';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE_STAGES.map((s, i) => {
        const meta = STAGE_META[s];
        const isPast = !isLost && meta.order < currentOrder;
        const isCurrent = !isLost && s === stage;
        const isFuture = !isLost && meta.order > currentOrder;
        return (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => onChange(s)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-all ${
                isCurrent ? 'border-transparent text-white' : isPast ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)]' : 'border-[var(--border-strong)] text-[var(--text-tertiary)] bg-transparent hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
              }`}
              style={isCurrent ? { background: isDark ? meta.darkBg : meta.color, color: isDark ? meta.darkColor : '#FFFFFF' } : undefined}
            >
              {isPast && <CheckCircle size={11} weight="fill" />}
              {meta.label}
            </button>
            {i < PIPELINE_STAGES.length - 1 && <CaretRight size={10} className="text-[var(--text-tertiary)]" />}
          </div>
        );
      })}
      {!isLost && (
        <>
          <span className="mx-1 text-[var(--text-tertiary)]">|</span>
          <button
            onClick={() => onChange('closed-lost')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border border-[var(--border-strong)] text-[var(--text-tertiary)] bg-transparent cursor-pointer hover:border-[var(--danger)] hover:text-[var(--danger)]"
          >
            Mark as Lost
          </button>
        </>
      )}
    </div>
  );
}
