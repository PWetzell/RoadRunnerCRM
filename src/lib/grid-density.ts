/**
 * Row-density presets for data grids across the app.
 *
 * Applied as CSS variables on the grid root container so cell renderers
 * (e.g. avatars in `contacts/DataGrid.tsx`) can scale without prop drilling.
 *
 * Comfortable is the default — it matches Salesforce Lightning's default
 * ~38px row height. Spacious preserves the original look. Compact is the
 * tightest, suitable for scanning 30+ rows at once.
 */

export type GridDensity = 'compact' | 'comfortable' | 'spacious';

export interface DensityConfig {
  /** Vertical padding on body cells (px) */
  rowPy: number;
  /** Vertical padding on header cells (px) */
  headerPy: number;
  /** Body cell font size (px) */
  font: number;
  /** Header font size (px) */
  headerFont: number;
  /** Avatar / initials chip size (px) — used by cell renderers that display people/org avatars */
  avatar: number;
  /** Chip / pill font size (px) — used by status/type pills inside cells */
  chipFont: number;
}

export const DENSITY: Record<GridDensity, DensityConfig> = {
  compact: { rowPy: 4, headerPy: 6, font: 11, headerFont: 10, avatar: 22, chipFont: 9 },
  comfortable: { rowPy: 6, headerPy: 8, font: 12, headerFont: 11, avatar: 28, chipFont: 10 },
  spacious: { rowPy: 10, headerPy: 10, font: 13, headerFont: 11, avatar: 32, chipFont: 10 },
};

/**
 * Build the style object (CSS custom properties) to apply on the grid root.
 * Cell renderers can read `var(--grid-avatar)`, `var(--grid-chip-font)`, etc.
 */
export function densityStyle(density: GridDensity): React.CSSProperties {
  const d = DENSITY[density];
  return {
    // Cast so TS accepts custom properties on CSSProperties
    ['--grid-row-py' as string]: `${d.rowPy}px`,
    ['--grid-header-py' as string]: `${d.headerPy}px`,
    ['--grid-font' as string]: `${d.font}px`,
    ['--grid-header-font' as string]: `${d.headerFont}px`,
    ['--grid-avatar' as string]: `${d.avatar}px`,
    ['--grid-chip-font' as string]: `${d.chipFont}px`,
  } as React.CSSProperties;
}

export const DENSITY_LABELS: Record<GridDensity, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};

export const DENSITY_HINTS: Record<GridDensity, string> = {
  compact: 'Tightest rows — scan 30+ at a glance',
  comfortable: 'Balanced rows — everyday default',
  spacious: 'Relaxed rows — reduced eye strain',
};
