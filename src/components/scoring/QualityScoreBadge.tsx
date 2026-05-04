'use client';

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CheckCircle, XCircle, ArrowRight } from '@phosphor-icons/react';
import { useContactScore } from '@/lib/scoring/useContactScore';
import type { ScoreBucket, ScoreContribution } from '@/types/scoring';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  contactId: string;
  size?: Size;
  /** When true (default), the badge opens a portaled breakdown popover on
   *  hover and click. When false, the badge renders as a static pill. */
  showTooltip?: boolean;
}

/**
 * Bucket → fill color. Each band reads as unambiguously its color
 * (red, orange, blue, green) and EVERY value passes WCAG AA against
 * the white score numerals (≥ 4.5:1 contrast).
 *
 * Earlier iteration used amber-500 (#F59E0B) and green-600 (#16A34A)
 * for vibrancy; both failed AA (2.15:1 and 3.30:1). Replaced with
 * orange-700 and emerald-700 — same hue, slightly darker shade,
 * still distinctly orange/green, and AA-compliant against white.
 *
 * Same hex in light + dark mode — saturated fills read against both
 * light surface and the dark #0B1628 dark-mode surface.
 */
const BUCKET_FILL: Record<ScoreBucket, { fill: string; label: string }> = {
  critical: { fill: '#DC2626', label: 'Critical' }, // red-600,    4.83:1
  low:      { fill: '#C2410C', label: 'Low' },      // orange-700, 5.18:1
  mid:      { fill: '#2563EB', label: 'Mid' },      // blue-600,   5.17:1
  high:     { fill: '#047857', label: 'High' },     // emerald-700,5.48:1
};

/**
 * Disc dimensions per size.
 *
 * `sm` is sized to the compact-row constraint: the smallest row height
 * across density modes is 20px (compact). Per the rule "badge diameter
 * must be at LEAST 4px less than the smallest row," sm = 16px so the
 * disc never clips top/bottom on any density. Confirmed against the
 * `[data-density="compact"] tbody td { max-height: 20px; overflow: hidden }`
 * rule in globals.css.
 *
 * `md` and `lg` sit outside grid rows (detail header, future hero) so
 * they're not bound by the row-height constraint and stay at the
 * spec's 28-32 / 36+ range.
 */
const SIZE_TOKENS: Record<Size, { d: number; font: number }> = {
  sm: { d: 16, font: 9.5 },
  md: { d: 28, font: 13 },
  lg: { d: 36, font: 16 },
};

/**
 * Quality Score pill. Number on the left, mini progress bar on the right,
 * color-coded by bucket. Hovering or clicking the badge opens a portaled
 * breakdown popover that lists every rule with contextual detail and the
 * points it contributed (or would contribute).
 *
 * Hover behavior: opens immediately, closes 150ms after mouseleave —
 * cancellable if the cursor moves into the popover, so the user can read
 * + click links without it disappearing. Click toggles the popover so a
 * tap-or-keyboard user has the same affordance.
 *
 * Renders nothing when the contact isn't a Person — Org rows are
 * unscored in v1 by design.
 */
export default function QualityScoreBadge({ contactId, size = 'sm', showTooltip = true }: Props) {
  const result = useContactScore(contactId);
  const [isOpen, setIsOpen] = useState(false);
  // Position carries placement + dynamic maxHeight so the popover can
  // constrain itself when neither side has enough room for the full
  // breakdown. null = "not yet measured this open" → render hidden until
  // the layout effect computes the real placement.
  const [position, setPosition] = useState<
    | { top: number; left: number; placement: 'below' | 'above'; maxHeight: number }
    | null
  >(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (delay = 150) => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, delay);
  };

  /**
   * Position the popover with viewport-aware flipping. Two-pass approach:
   * the popover first renders with `visibility: hidden` (position null)
   * so we can measure its real height, then this layout effect computes
   * placement and the popover paints in the right spot. Same trick the
   * Widget settings popover uses — see Widget.tsx.
   *
   * Vertical: prefer below the trigger. Flip above when the popover
   * wouldn't fit below AND there's more room above. Always clamp into
   * the viewport so the top edge is at least `viewportPadding` away
   * from the window edge.
   *
   * Horizontal: prefer left-aligned with the trigger. Slide left when
   * the popover would overflow the right edge.
   */
  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    if (!triggerRef.current) return;

    const place = () => {
      if (!triggerRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverEl = popoverRef.current;
      // scrollHeight gives the content's natural height even when an
      // outer maxHeight is applied — so we keep measuring the content's
      // ideal size across re-positions, not the constrained box.
      const naturalHeight = popoverEl?.scrollHeight ?? 420;
      const popoverWidth = popoverEl?.offsetWidth ?? 300;
      const margin = 6;
      const viewportPadding = 12;

      const spaceBelow = window.innerHeight - triggerRect.bottom - margin - viewportPadding;
      const spaceAbove = triggerRect.top - margin - viewportPadding;

      // Pick the side with the most room — not "below first." If neither
      // side fits the natural height, the popover applies maxHeight and
      // its rule list scrolls internally.
      const cap = Math.min(400, window.innerHeight * 0.7);
      const placement: 'below' | 'above' = spaceBelow >= spaceAbove ? 'below' : 'above';
      const sideRoom = placement === 'below' ? spaceBelow : spaceAbove;
      const maxHeight = Math.max(120, Math.min(cap, sideRoom));
      const useHeight = Math.min(naturalHeight, maxHeight);

      const top =
        placement === 'below'
          ? triggerRect.bottom + margin
          : Math.max(viewportPadding, triggerRect.top - useHeight - margin);

      let left = triggerRect.left;
      if (left + popoverWidth + viewportPadding > window.innerWidth) {
        left = Math.max(viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
      }
      if (left < viewportPadding) left = viewportPadding;

      setPosition({ top, left, placement, maxHeight });
    };

    // First pass: measure the trigger and use the height estimate. The
    // popover will paint at the resulting position with visibility:hidden
    // since position is set but the popover ref isn't populated yet on
    // first render.
    place();
    // Second pass after the popover has actually rendered, measuring its
    // real height. requestAnimationFrame lets the DOM commit between
    // passes so popoverRef.current.offsetHeight reads correctly.
    const raf = requestAnimationFrame(place);

    // Reposition on resize / scroll so a tooltip pinned via click stays
    // tied to its trigger.
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  // Click-outside dismisses (covers the click-to-pin path). The
  // mousedown handler ignores clicks on the trigger or inside the
  // popover via createPortal — popover root has its own
  // stopPropagation on click.
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      // The popover dom node lives under document.body; let the
      // popover's own click handler decide. Default close otherwise.
      const popover = document.querySelector('[data-quality-score-popover="1"]');
      if (popover && popover.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // Cleanup timer on unmount.
  useEffect(() => () => cancelClose(), []);

  if (!result) return null;

  const fill = BUCKET_FILL[result.bucket];
  const sizeT = SIZE_TOKENS[size];

  const trigger = (
    <button
      ref={triggerRef}
      onClick={(e) => {
        if (!showTooltip) return;
        // Stop propagation so a row click handler (e.g., grid → detail)
        // doesn't fire when the user is inspecting the breakdown.
        e.stopPropagation();
        cancelClose();
        setIsOpen((v) => !v);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        if (!showTooltip) return;
        cancelClose();
        setIsOpen(true);
      }}
      onMouseLeave={() => {
        if (!showTooltip) return;
        scheduleClose();
      }}
      aria-label={`Quality Score: ${result.total} (${fill.label})`}
      // Solid disc — read as a status indicator, not a tag. White
      // tabular-nums on a saturated fill. The `quality-score-disc`
      // class lets globals.css override compact-mode max-height clip.
      className="quality-score-disc inline-flex items-center justify-center rounded-full font-extrabold tabular-nums border-none cursor-pointer text-white shadow-sm"
      style={{
        width: sizeT.d,
        height: sizeT.d,
        fontSize: sizeT.font,
        background: fill.fill,
        lineHeight: 1,
      }}
    >
      {result.total}
    </button>
  );

  if (!showTooltip) return trigger;

  return (
    <>
      {trigger}
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <ScoreBreakdownPopover
            ref={popoverRef}
            contactId={contactId}
            score={result.total}
            fill={fill}
            contributions={result.contributions}
            position={position}
            onMouseEnter={cancelClose}
            onMouseLeave={() => scheduleClose()}
            onClose={() => {
              cancelClose();
              setIsOpen(false);
            }}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * Breakdown popover — header (score + bar), applied rules with
 * contextual detail and points, optional grayed list of active rules
 * that didn't fire ("here's what would lift this score"), footer link
 * to the admin scoring page.
 *
 * Inactive rules (admin-disabled) are never shown — they're not part
 * of the live ruleset and would just confuse the visitor.
 *
 * `position: null` means "not yet measured this open" — we render with
 * visibility:hidden so the layout effect can read the popover's actual
 * height and decide above-vs-below placement before paint.
 */
const ScoreBreakdownPopover = forwardRef<
  HTMLDivElement,
  {
    contactId: string;
    score: number;
    fill: typeof BUCKET_FILL[ScoreBucket];
    contributions: ScoreContribution[];
    position:
      | { top: number; left: number; placement: 'below' | 'above'; maxHeight: number }
      | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClose: () => void;
  }
>(function ScoreBreakdownPopover({
  contactId,
  score,
  fill,
  contributions,
  position,
  onMouseEnter,
  onMouseLeave,
  onClose,
}, ref) {
  // applied: rules that matched (positive or negative)
  // skipped: rules that are active but didn't match — surfaced grayed
  //          so the user can see why a score is low ("haven't replied,
  //          no active deal").
  const applied = contributions.filter((c) => c.applied);
  const skipped = contributions.filter((c) => !c.applied && c.rule.active);

  return (
    <div
      ref={ref}
      role="tooltip"
      data-quality-score-popover="1"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        zIndex: 100,
        width: 300,
        // Dynamic ceiling computed by the layout effect — covers the
        // case where neither above nor below has the full natural height.
        // Without this the rule list runs off the viewport edge.
        maxHeight: position?.maxHeight,
        // Hide on the first render before measurement to avoid a flash
        // at the wrong placement. The layout effect populates `position`
        // synchronously after the first paint.
        visibility: position ? 'visible' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden"
    >
      {/* Header — score disc mirrors the trigger so the breakdown
          visually ties back to what the user clicked. flex-shrink-0
          keeps it pinned when the body scrolls inside the maxHeight
          constraint. */}
      <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2.5 flex-shrink-0">
        <span
          className="inline-flex items-center justify-center rounded-full font-extrabold tabular-nums text-white shadow-sm"
          style={{
            width: 32,
            height: 32,
            fontSize: 13.5,
            background: fill.fill,
            lineHeight: 1,
          }}
          aria-hidden
        >
          {score}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Quality Score</span>
          <span className="text-[12px] font-bold text-[var(--text-primary)]">{fill.label} band</span>
        </div>
      </div>

      {/* Scrollable rule list. flex-1 + min-h-0 is the standard
          flex-overflow trick — without min-h-0 the child wins the height
          fight and the maxHeight ceiling is silently ignored. */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {applied.length === 0 && skipped.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-[var(--text-tertiary)] italic text-center">
            No rules to evaluate.
          </div>
        )}

        {applied.map(({ rule, points, detail }) => {
          const isPositive = points >= 0;
          return (
            <ContributionRow
              key={rule.id}
              ruleName={rule.name}
              detail={detail}
              points={points}
              variant={isPositive ? 'positive' : 'negative'}
            />
          );
        })}

        {skipped.length > 0 && (
          <>
            <div className="mx-3 my-1 border-t border-[var(--border-subtle)]" />
            <div className="px-3 pt-1 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Not yet matched
            </div>
            {skipped.map(({ rule }) => (
              <ContributionRow
                key={rule.id}
                ruleName={rule.name}
                detail={undefined}
                points={rule.points}
                variant="skipped"
              />
            ))}
          </>
        )}
      </div>

      {/* Footer — two parallel CTAs stacked. Same shape (text left, arrow
          right, full-width, identical padding and font-size) so they read
          as siblings. Hierarchy comes from color + weight: primary in
          brand color + bold, secondary in muted color + semibold. */}
      <div className="flex-shrink-0 border-t border-[var(--border-subtle)]">
        <Link
          href={`/contacts/${contactId}`}
          onClick={onClose}
          className="flex items-center justify-between px-3 py-2 text-[11.5px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] no-underline"
        >
          <span>Add missing information</span>
          <ArrowRight size={12} weight="bold" />
        </Link>
        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center justify-between px-3 py-2 text-[11.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] no-underline border-t border-[var(--border-subtle)]"
        >
          <span>Edit scoring rules</span>
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>
    </div>
  );
});

/**
 * One row in the breakdown list. Three visual variants:
 *   • positive — green check, primary text, green points
 *   • negative — red ✗, primary text, red points
 *   • skipped  — gray ✗, tertiary text, gray points-as-potential
 */
function ContributionRow({
  ruleName,
  detail,
  points,
  variant,
}: {
  ruleName: string;
  detail?: string;
  points: number;
  variant: 'positive' | 'negative' | 'skipped';
}) {
  const isSkipped = variant === 'skipped';
  const isPositive = variant === 'positive';
  const Icon = isPositive ? CheckCircle : XCircle;
  const iconColor = isSkipped
    ? 'var(--text-tertiary)'
    : isPositive ? 'var(--success)' : 'var(--danger)';
  const nameColor = isSkipped ? 'var(--text-tertiary)' : 'var(--text-primary)';
  const pointsColor = isSkipped
    ? 'var(--text-tertiary)'
    : isPositive ? 'var(--success)' : 'var(--danger)';
  const sign = points >= 0 ? '+' : '';

  return (
    <div className="px-3 py-1.5 flex items-start gap-2" style={{ opacity: isSkipped ? 0.7 : 1 }}>
      <Icon size={12} weight="fill" className="flex-shrink-0 mt-[2px]" style={{ color: iconColor }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] font-bold leading-tight" style={{ color: nameColor }}>
          {ruleName}
        </div>
        {detail && (
          <div className="text-[10.5px] leading-tight mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
            {detail}
          </div>
        )}
      </div>
      <span
        className="text-[11px] font-extrabold tabular-nums flex-shrink-0"
        style={{ color: pointsColor }}
      >
        {sign}{points}
      </span>
    </div>
  );
}
