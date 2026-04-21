'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  /** Duration in ms. Default 600. */
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Animated number counter. On mount (or when value changes), counts up
 * from 0 to the target. Handles formatted strings like "$269K", "12",
 * "50%", "$88K" — extracts the numeric portion, animates it, then
 * re-assembles with the prefix/suffix.
 */
export default function AnimatedCounter({ value, duration = 600, className, style }: Props) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Extract numeric portion
    const match = value.match(/^([^0-9-]*)(-?[\d,.]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const prefix = match[1]; // "$" or ""
    const numStr = match[2].replace(/,/g, '');
    const suffix = match[3]; // "K", "%", "d", " deals", etc.
    const target = parseFloat(numStr);

    if (isNaN(target) || target === 0) {
      setDisplay(value);
      return;
    }

    const isFloat = numStr.includes('.');
    const decimalPlaces = isFloat ? (numStr.split('.')[1]?.length || 0) : 0;
    const hasCommas = match[2].includes(',');

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      let formatted: string;
      if (isFloat) {
        formatted = current.toFixed(decimalPlaces);
      } else {
        formatted = Math.round(current).toString();
      }

      if (hasCommas) {
        formatted = Number(formatted).toLocaleString();
      }

      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value); // Ensure exact final value
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className} style={style}>{display}</span>;
}
