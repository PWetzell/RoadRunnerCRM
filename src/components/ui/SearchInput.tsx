'use client';

import { forwardRef, useRef, useImperativeHandle } from 'react';
import { MagnifyingGlass, X as XIcon } from '@phosphor-icons/react';

/**
 * Shared search input with a built-in "clear X" affordance.
 *
 * Why this exists: every search field across the app — `/bulk`, `/sequences`,
 * `/contacts`, the data-grid column header filters, etc. — needed the same
 * thing: a tiny ✕ on the right that wipes the value with one click instead
 * of forcing the user to highlight + delete. Centralizing it here means we
 * write the keyboard-handling, sizing, and a11y conventions once and reuse.
 *
 * Industry parallel: macOS Finder search, Gmail search, GitHub search bars,
 * HubSpot/Salesforce/Linear filter chips — every modern tool ships this.
 *
 * Three sizes:
 *   • `md` (default) — page-level search bars (h-9, prominent border)
 *   • `sm` — secondary searches inside panels (h-8)
 *   • `xs` — tight column-header filters in TanStack tables (h-6)
 *
 * Press Escape while focused to clear without reaching for the ✕.
 */

export type SearchInputSize = 'xs' | 'sm' | 'md';

export interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** ARIA label — defaults to the placeholder if omitted. */
  ariaLabel?: string;
  size?: SearchInputSize;
  className?: string;
  /** Called when the field becomes empty — either via typing or clear-X.
   *  Useful for resetting paginated views. */
  onClear?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Stops keydown bubbling — handy inside dropdowns / row contexts where
   *  Enter shouldn't trigger the parent's keyboard handler. */
  stopKeyPropagation?: boolean;
}

const SIZE_STYLES: Record<SearchInputSize, {
  height: string;
  text: string;
  icon: number;
  pl: string; // padding-left (room for the magnifier)
  pr: string; // padding-right (room for the ✕ when present)
  prEmpty: string; // padding-right when empty (no ✕)
  border: string;
  iconLeft: string;
  clearRight: string;
  clearBtnSize: string;
}> = {
  xs: {
    height: 'h-6',
    text: 'text-[11px]',
    icon: 11,
    pl: 'pl-6',
    pr: 'pr-6',
    prEmpty: 'pr-2',
    border: 'border',
    iconLeft: 'left-1.5',
    clearRight: 'right-1',
    clearBtnSize: 'w-4 h-4',
  },
  sm: {
    height: 'h-8',
    text: 'text-[12.5px]',
    icon: 12,
    pl: 'pl-7',
    pr: 'pr-7',
    prEmpty: 'pr-2.5',
    border: 'border',
    iconLeft: 'left-2',
    clearRight: 'right-1',
    clearBtnSize: 'w-5 h-5',
  },
  md: {
    height: 'h-9',
    text: 'text-[13px]',
    icon: 14,
    pl: 'pl-8',
    pr: 'pr-9',
    prEmpty: 'pr-3',
    border: 'border-2',
    iconLeft: 'left-2.5',
    clearRight: 'right-1.5',
    clearBtnSize: 'w-6 h-6',
  },
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    placeholder = 'Search…',
    ariaLabel,
    size = 'md',
    className = '',
    onClear,
    autoFocus,
    disabled,
    stopKeyPropagation,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Forward the inner ref so callers can focus() the input directly.
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const hasValue = value.length > 0;
  const s = SIZE_STYLES[size];

  const clear = () => {
    onChange('');
    onClear?.();
    // Return focus to the input — matches the macOS Finder search UX.
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <MagnifyingGlass
        size={s.icon}
        weight="bold"
        className={`absolute ${s.iconLeft} top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none`}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && hasValue) {
            e.preventDefault();
            clear();
          }
          if (stopKeyPropagation) e.stopPropagation();
        }}
        className={`
          w-full ${s.height} ${s.pl} ${hasValue ? s.pr : s.prEmpty} ${s.text}
          bg-[var(--surface-raised)] ${s.border} border-[var(--text-tertiary)]
          rounded-md text-[var(--text-primary)] outline-none
          placeholder:text-[var(--text-secondary)]
          focus:border-[var(--brand-primary)] focus:bg-[var(--surface-card)]
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors
        `.replace(/\s+/g, ' ').trim()}
      />
      {hasValue && !disabled && (
        <button
          type="button"
          onClick={clear}
          tabIndex={-1}
          aria-label="Clear search"
          title="Clear (Esc)"
          className={`
            absolute ${s.clearRight} top-1/2 -translate-y-1/2 ${s.clearBtnSize}
            inline-flex items-center justify-center rounded-full
            text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
            hover:bg-[var(--surface-card)] bg-transparent border-none cursor-pointer
            transition-colors
          `.replace(/\s+/g, ' ').trim()}
        >
          <XIcon size={Math.max(9, s.icon - 3)} weight="bold" />
        </button>
      )}
    </div>
  );
});

export default SearchInput;
