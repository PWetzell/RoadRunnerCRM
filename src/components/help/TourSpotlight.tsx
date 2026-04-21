'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** CSS selector or data-tour value to highlight. */
  target: string;
  /** Content to show in the tooltip next to the spotlight. */
  children: React.ReactNode;
  /** Which side of the target to place the tooltip. */
  placement?: 'bottom' | 'top' | 'right' | 'left';
  /** Called when the user clicks the backdrop (outside the target). */
  onBackdropClick?: () => void;
  /** If true, click the target element when the step is shown. */
  clickTarget?: boolean;
}

/**
 * Full-screen spotlight overlay that highlights a specific UI element.
 * The backdrop is semi-transparent dark; the target element shows through
 * a "cutout" via CSS clip-path / box-shadow. A tooltip (the children prop)
 * is positioned near the target.
 *
 * Used by the guided walkthrough system — each step specifies a target
 * selector, and TourSpotlight scrolls to it, highlights it, and shows
 * the step content beside it.
 */
export default function TourSpotlight({ target, children, placement = 'bottom', onBackdropClick, clickTarget }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let foundEl: HTMLElement | null = null;

    function findTarget(): HTMLElement | null {
      let el: HTMLElement | null = null;
      el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement;
      if (!el) el = document.querySelector(`[data-card-id="${target}"]`) as HTMLElement;
      if (!el) el = document.querySelector(target) as HTMLElement;
      return el;
    }

    function positionSpotlight(el: HTMLElement) {
      if (cancelled) return;
      foundEl = el;

      // Force hidden-on-hover elements to be visible during the tour
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';

      // Click the target if requested (e.g., open a settings popover)
      if (clickTarget) {
        el.click();
      }

      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });

      const r = el.getBoundingClientRect();
      setRect(r);

      const PAD = 12;
      const tooltipW = 340;
      const tooltipH = 200;
      let top = 0;
      let left = 0;

      switch (placement) {
        case 'bottom':
          top = r.bottom + PAD;
          left = Math.max(PAD, Math.min(r.left, window.innerWidth - tooltipW - PAD));
          break;
        case 'top':
          top = r.top - tooltipH - PAD;
          left = Math.max(PAD, Math.min(r.left, window.innerWidth - tooltipW - PAD));
          break;
        case 'right':
          top = r.top;
          left = r.right + PAD;
          break;
        case 'left':
          top = r.top;
          left = r.left - tooltipW - PAD;
          break;
      }

      if (top + tooltipH > window.innerHeight - PAD) {
        top = window.innerHeight - tooltipH - PAD;
      }
      if (top < PAD) top = PAD;

      setTooltipStyle({ position: 'fixed', top, left, width: tooltipW, zIndex: 10002 });
    }

    // Retry up to 10 times with 200ms intervals to find the target
    // (covers race conditions when navigating to a new page)
    function tryFind(attempt: number) {
      if (cancelled) return;
      const el = findTarget();
      if (el) {
        positionSpotlight(el);
      } else if (attempt < 10) {
        setTimeout(() => tryFind(attempt + 1), 200);
      }
    }

    tryFind(0);

    // Re-measure on scroll/resize
    const update = () => {
      if (!foundEl) return;
      const r = foundEl.getBoundingClientRect();
      setRect(r);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      // Restore forced styles
      if (foundEl) {
        foundEl.style.opacity = '';
        foundEl.style.pointerEvents = '';
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target, placement]);

  if (!rect || typeof document === 'undefined') return null;

  const PAD = 8;
  // Cutout coordinates for the box-shadow approach
  const cutout = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 12,
  };

  return createPortal(
    <>
      {/* Dark backdrop with cutout via box-shadow */}
      <div
        onClick={onBackdropClick}
        className="fixed inset-0 z-[10000] cursor-pointer"
        style={{
          background: 'transparent',
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.55)`,
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%,
            0% ${cutout.top}px,
            ${cutout.left}px ${cutout.top}px,
            ${cutout.left}px ${cutout.top + cutout.height}px,
            ${cutout.left + cutout.width}px ${cutout.top + cutout.height}px,
            ${cutout.left + cutout.width}px ${cutout.top}px,
            0% ${cutout.top}px
          )`,
        }}
      />

      {/* Highlight ring around the target */}
      <div
        className="fixed z-[10001] pointer-events-none rounded-xl"
        style={{
          top: cutout.top,
          left: cutout.left,
          width: cutout.width,
          height: cutout.height,
          border: '2px solid var(--brand-primary)',
          boxShadow: '0 0 0 4px var(--brand-bg), 0 4px 24px rgba(0,0,0,0.3)',
        }}
      />

      {/* Tooltip / step content */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-[var(--surface-card)] border border-[var(--brand-primary)] rounded-xl shadow-xl animate-[fadeUp_0.2s_ease-out]"
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
