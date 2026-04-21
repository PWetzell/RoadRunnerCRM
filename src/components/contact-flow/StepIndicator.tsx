'use client';

import { Check } from '@phosphor-icons/react';

export interface Step {
  id: string;
  label: string;
}

export function StepIndicator({ steps, currentStep, completedSteps }: {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = s.id === currentStep;
        const isDone = completedSteps.includes(s.id);
        return (
          <div
            key={s.id}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold border transition-all ${
              isActive
                ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                : isDone
                ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]'
                : 'bg-transparent text-[var(--text-tertiary)] border-[var(--border-strong)]'
            }`}
          >
            {isDone && <Check size={12} weight="bold" />}
            <span>{i + 1}. {s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
