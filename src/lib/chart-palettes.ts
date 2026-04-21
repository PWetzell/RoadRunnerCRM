/**
 * Chart color palettes for dashboard widgets.
 *
 * Each palette is a series of hex colors used in order as slices/bars are
 * drawn. When a widget's `config.chartPalette` is set, the widget uses
 * these colors instead of the entity-native color (e.g. stage color).
 *
 * Designed for:
 *   - WCAG-passing contrast against both light and dark widget backgrounds
 *   - Adjacent-slice distinguishability (no hue collisions in a row)
 *   - Light + dark mode friendliness (each palette shifted to read on both)
 */

export type ChartPaletteId =
  | 'default'     // use the entity-native color (deal stage, source, etc.)
  | 'brand'       // the app's primary blue in a sequential scale
  | 'ocean'       // cool blues → teals → greens
  | 'sunset'      // warm oranges → pinks → purples
  | 'forest'      // greens + earth tones
  | 'vibrant'     // high-saturation rainbow
  | 'monochrome'  // grayscale, for print + accessibility
  | 'pastel';     // soft, low-saturation version of vibrant

export interface ChartPalette {
  id: ChartPaletteId;
  label: string;
  /** Ordered color list — index N of the dataset uses colors[N % length]. */
  colors: string[];
  /** Dark-mode color list — auto-falls back to `colors` if omitted. */
  darkColors?: string[];
}

export const CHART_PALETTES: ChartPalette[] = [
  {
    id: 'default',
    label: 'Default',
    // When 'default' is active, widgets should use the entity's native color
    // (e.g. `DEAL_STAGES[i].color`) — this array is only used as a fallback.
    colors: ['#1E293B', '#0B2F5C', '#5B21B6', '#0E7490', '#9D174D', '#065F46', '#991B1B'],
    darkColors: ['#CBD5E1', '#93C5FD', '#C4B5FD', '#67E8F9', '#F9A8D4', '#6EE7B7', '#FCA5A5'],
  },
  {
    id: 'brand',
    label: 'Brand',
    // App brand blue in a sequential scale from dark → light
    colors: ['#0B2F5C', '#1955A6', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
    darkColors: ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#1955A6', '#0B2F5C'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    colors: ['#0B2F5C', '#1E40AF', '#0E7490', '#0891B2', '#0D9488', '#059669', '#047857'],
    darkColors: ['#93C5FD', '#60A5FA', '#67E8F9', '#5EEAD4', '#6EE7B7', '#86EFAC', '#4ADE80'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    colors: ['#9D2235', '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#BE185D', '#9333EA'],
    darkColors: ['#FCA5A5', '#F87171', '#FB923C', '#FBBF24', '#FACC15', '#F9A8D4', '#D8B4FE'],
  },
  {
    id: 'forest',
    label: 'Forest',
    colors: ['#14532D', '#166534', '#15803D', '#65A30D', '#CA8A04', '#A16207', '#78350F'],
    darkColors: ['#BBF7D0', '#86EFAC', '#4ADE80', '#BEF264', '#FDE047', '#FCD34D', '#FED7AA'],
  },
  {
    id: 'vibrant',
    label: 'Vibrant',
    colors: ['#E11D48', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'],
    // vibrant reads the same light + dark — hues are saturated enough
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    colors: ['#1E293B', '#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'],
    darkColors: ['#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155'],
  },
  {
    id: 'pastel',
    label: 'Pastel',
    colors: ['#FDA4AF', '#FDE68A', '#A7F3D0', '#A5F3FC', '#BFDBFE', '#DDD6FE', '#FBCFE8'],
    // pastel looks the same in both themes
  },
];

export const PALETTE_META: Record<ChartPaletteId, ChartPalette> = CHART_PALETTES.reduce(
  (acc, p) => { acc[p.id] = p; return acc; },
  {} as Record<ChartPaletteId, ChartPalette>,
);

/**
 * Resolve the color at `index` of the given palette. Wraps around if the
 * dataset is longer than the palette.
 *
 * Pass `isDark` to pick the dark-mode variant when available.
 */
export function paletteColor(paletteId: ChartPaletteId, index: number, isDark: boolean): string {
  const p = PALETTE_META[paletteId] || PALETTE_META.default;
  const colors = (isDark && p.darkColors) ? p.darkColors : p.colors;
  return colors[index % colors.length];
}
