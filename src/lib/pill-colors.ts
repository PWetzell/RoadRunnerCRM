/**
 * Picks the right color + bg from a meta object that has both light and dark variants.
 * Works with DEAL_STAGES, PRIORITY_META, COMM_META, RECRUITING_STAGES, etc.
 */
export function dc(meta: { color: string; bg: string; darkColor?: string; darkBg?: string }, isDark: boolean) {
  return isDark && meta.darkColor && meta.darkBg
    ? { color: meta.darkColor, bg: meta.darkBg }
    : { color: meta.color, bg: meta.bg };
}

/**
 * Dark-mode-aware pill/tag color system.
 *
 * Light mode: dark text on light pastel background (original design).
 * Dark mode: light text on dark tinted background (WCAG AA compliant).
 *
 * Each color pair has a light and dark variant. Components call
 * `pillStyle()` or `pillClass()` with a color key to get the right
 * colors for the current theme.
 */

export interface PillColorPair {
  color: string;       // text color (light mode)
  bg: string;          // background (light mode)
  darkColor: string;   // text color (dark mode)
  darkBg: string;      // background (dark mode)
}

/**
 * Master palette — 8 semantic color pairs used across all tags, pills,
 * and badges. Each pair meets WCAG AA (4.5:1) in both light and dark modes.
 */
export const PILL_COLORS: Record<string, PillColorPair> = {
  slate:   { color: '#1E293B', bg: '#E2E8F0', darkColor: '#CBD5E1', darkBg: '#1E293B' },
  blue:    { color: '#1E40AF', bg: '#DBEAFE', darkColor: '#93C5FD', darkBg: '#172554' },
  violet:  { color: '#5B21B6', bg: '#EDE9FE', darkColor: '#C4B5FD', darkBg: '#2E1065' },
  cyan:    { color: '#0E7490', bg: '#CFFAFE', darkColor: '#67E8F9', darkBg: '#164E63' },
  pink:    { color: '#9D174D', bg: '#FCE7F3', darkColor: '#F9A8D4', darkBg: '#500724' },
  green:   { color: '#065F46', bg: '#D1FAE5', darkColor: '#6EE7B7', darkBg: '#064E3B' },
  red:     { color: '#991B1B', bg: '#FEE2E2', darkColor: '#FCA5A5', darkBg: '#450A0A' },
  orange:  { color: '#9A3412', bg: '#FFEDD5', darkColor: '#FDBA74', darkBg: '#431407' },
  amber:   { color: '#92400E', bg: '#FEF3C7', darkColor: '#FCD34D', darkBg: '#451A03' },
};

/** Get pill style object for inline rendering. */
export function pillStyle(pair: PillColorPair, isDark: boolean): React.CSSProperties {
  return isDark
    ? { color: pair.darkColor, background: pair.darkBg, borderColor: pair.darkColor }
    : { color: pair.color, background: pair.bg, borderColor: pair.color };
}

/** Get pill Tailwind-compatible class string (for tags rendered with classes). */
export function pillClasses(pair: PillColorPair, isDark: boolean): string {
  if (isDark) {
    return `text-[${pair.darkColor}] bg-[${pair.darkBg}] border border-[${pair.darkColor}]`;
  }
  return `text-[${pair.color}] bg-[${pair.bg}] border border-[${pair.color}]`;
}

/**
 * File type badge colors — used for the small extension badges (PDF, DOCX, etc.)
 * In light mode: colored background with white text.
 * In dark mode: darker version of the same color with white text.
 */
export const EXT_DARK_COLORS: Record<string, string> = {
  pdf:  '#991B1B',
  doc:  '#1E3A5F',
  docx: '#1E3A5F',
  xls:  '#14532D',
  xlsx: '#14532D',
  csv:  '#14532D',
  ppt:  '#78350F',
  pptx: '#78350F',
  png:  '#164E63',
  jpg:  '#4C1D95',
  jpeg: '#4C1D95',
  gif:  '#78350F',
  svg:  '#064E3B',
  bmp:  '#4C1D95',
  zip:  '#1E293B',
  tar:  '#1E293B',
  gz:   '#1E293B',
  rar:  '#1E293B',
  '7z': '#1E293B',
  txt:  '#1F2937',
  rtf:  '#4C1D95',
  md:   '#1F2937',
  json: '#78350F',
  xml:  '#7C2D12',
  mp4:  '#4C1D95',
  mov:  '#4C1D95',
  mp3:  '#78350F',
  wav:  '#78350F',
};

export const FAMILY_DARK_FALLBACK: Record<string, string> = {
  pdf: '#991B1B', office: '#1E3A5F', text: '#1F2937', archive: '#1E293B',
  video: '#4C1D95', audio: '#78350F', image: '#164E63', other: '#1E293B',
};
