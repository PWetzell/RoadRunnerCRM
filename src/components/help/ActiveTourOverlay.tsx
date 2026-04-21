'use client';

import { useTourStore } from '@/stores/tour-store';
import { TOUR_STEPS, TourStep } from '@/lib/tour-steps';
import TourSpotlight from './TourSpotlight';
import { GraduationCap, Palette, TextAa, TextAlignLeft, TextAlignCenter, TextAlignRight } from '@phosphor-icons/react';

const SECTION_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contacts': 'Contacts',
  '/sales': 'Sales',
  '/recruiting': 'Recruiting',
  '/documents': 'Documents',
  '/reporting': 'Reporting',
  '/admin': 'Admin',
};

const PREVIEW_COLORS = ['#1B3A5C', '#1955A6', '#047857', '#D97706', '#DC2626', '#7C3AED', '#BE185D', '#64748B'];

export default function ActiveTourOverlay() {
  const activeWalkthrough = useTourStore((s) => s.activeWalkthrough);
  const walkthroughStep = useTourStore((s) => s.walkthroughStep);
  const setWalkthroughStep = useTourStore((s) => s.setWalkthroughStep);
  const exitTour = useTourStore((s) => s.exitTour);

  if (!activeWalkthrough) return null;

  const tourSteps = TOUR_STEPS[activeWalkthrough] || [];
  const currentStep: TourStep | null = tourSteps[walkthroughStep] || null;

  if (!currentStep || tourSteps.length === 0) {
    if (activeWalkthrough) exitTour();
    return null;
  }

  const title = SECTION_TITLES[activeWalkthrough] || 'Tour';

  return (
    <TourSpotlight
      target={currentStep.target}
      placement={currentStep.placement || 'bottom'}
      clickTarget={currentStep.clickTarget}
      onBackdropClick={exitTour}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap size={14} weight="duotone" className="text-[var(--brand-primary)]" />
          <span className="text-[11px] font-extrabold text-[var(--text-primary)]">
            {title} Tour
          </span>
          <span className="ml-auto text-[10px] font-bold text-[var(--text-tertiary)]">
            {walkthroughStep + 1} / {tourSteps.length}
          </span>
        </div>
        <div className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-3">
          {currentStep.content}
        </div>

        {/* Inline settings preview */}
        {currentStep.showSettingsPreview && <SettingsPreview />}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {tourSteps.map((_: TourStep, i: number) => (
            <button
              key={i}
              onClick={() => setWalkthroughStep(i)}
              className={`w-2 h-2 rounded-full border-none cursor-pointer transition-all ${
                i === walkthroughStep ? 'bg-[var(--brand-primary)] w-4' : i < walkthroughStep ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exitTour}
            className="text-[11px] font-bold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)]"
          >
            Exit tour
          </button>
          <div className="flex-1" />
          {walkthroughStep > 0 && (
            <button
              onClick={() => setWalkthroughStep(walkthroughStep - 1)}
              className="h-[28px] px-3 text-[11px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer"
            >
              Back
            </button>
          )}
          {walkthroughStep < tourSteps.length - 1 ? (
            <button
              onClick={() => setWalkthroughStep(walkthroughStep + 1)}
              className="h-[28px] px-4 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
            >
              Next
            </button>
          ) : (
            <button
              onClick={exitTour}
              className="h-[28px] px-4 text-[11px] font-bold text-white bg-[var(--success)] rounded-[var(--radius-sm)] border-none cursor-pointer hover:opacity-90"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </TourSpotlight>
  );
}

/** Mini preview of widget settings controls shown inline in the tour tooltip */
function SettingsPreview() {
  return (
    <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 flex flex-col gap-2.5">
      {/* Header color */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
          <Palette size={10} weight="bold" /> Header Color
        </div>
        <div className="flex gap-1">
          {PREVIEW_COLORS.map((c) => (
            <div
              key={c}
              className="w-5 h-5 rounded-[3px] border border-white/20"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      {/* Text size */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
          <TextAa size={10} weight="bold" /> Text Size
        </div>
        <div className="flex gap-0.5">
          {['SM', 'MD', 'LG', 'XL', 'XXL'].map((s, i) => (
            <div
              key={s}
              className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                i === 1 ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--surface-card)] text-[var(--text-tertiary)] border border-[var(--border)]'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
      {/* Alignment */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
          Alignment
        </div>
        <div className="flex gap-0.5">
          <div className="w-7 h-6 rounded bg-[var(--brand-primary)] flex items-center justify-center">
            <TextAlignLeft size={10} weight="bold" className="text-white" />
          </div>
          <div className="w-7 h-6 rounded bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center">
            <TextAlignCenter size={10} weight="bold" className="text-[var(--text-tertiary)]" />
          </div>
          <div className="w-7 h-6 rounded bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center">
            <TextAlignRight size={10} weight="bold" className="text-[var(--text-tertiary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
