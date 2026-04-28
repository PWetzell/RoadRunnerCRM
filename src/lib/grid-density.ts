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
  /** Horizontal padding on body cells (px) — replaces the previously
   *  hardcoded `px-3` so compact mode can tighten cell whitespace too. */
  rowPx: number;
  /** Vertical padding on header cells (px) */
  headerPy: number;
  /** Body cell font size (px) */
  font: number;
  /** Line-height multiplier on cell content. Default browser line-height
   *  is ~1.5 which pads rows beyond what padding controls. Compact uses
   *  1.0 (text-flush), Comfortable 1.2, Spacious 1.4. */
  lineHeight: number;
  /** Header font size (px) */
  headerFont: number;
  /** Avatar / initials chip size (px) — used by cell renderers that display people/org avatars */
  avatar: number;
  /** Initials font inside the avatar circle (px). Scales with avatar
   *  size — at 12px avatars, 11px text would overflow the circle, so
   *  we drop the initials font proportionally. */
  avatarFont: number;
  /** Chip / pill font size (px) — used by status/type pills inside cells */
  chipFont: number;
}

// Calibrated 2026-04-28 to target row heights of ~12 / 24 / 36 px.
// Compact is now spreadsheet-tight: tiny avatars, minimal padding,
// near-flush text. Comfortable is the balanced default. Spacious gives
// reading-breathing-room without sprawling.
//
// Note: actual rendered height is max(text, avatar, chip). Compact's
// 12px target is approximated — the smallest chip pill renders at ~14px
// regardless of density, which pins the floor. Visible compact rows
// land around 14–16px in practice.
// Targets ~20 / 24 / 28 px row heights:
//   • Compact — spreadsheet-tight (CSS row cap at 20px in globals.css)
//   • Comfortable — half-step between compact and spacious (~24px)
//   • Spacious — values from the prior comfortable preset (~28px)
// Per Paul 2026-04-28: the old comfortable was the "right" everyday
// density, so it became the new spacious; comfortable now lives
// between compact and that, giving users a real middle option.
export const DENSITY: Record<GridDensity, DensityConfig> = {
  compact:     { rowPy: 1, rowPx: 4,  headerPy: 1, font: 9,  lineHeight: 1.1,  headerFont: 9,    avatar: 14, avatarFont: 7,   chipFont: 8   },
  comfortable: { rowPy: 2, rowPx: 6,  headerPy: 3, font: 10, lineHeight: 1.15, headerFont: 9.5,  avatar: 17, avatarFont: 8.5, chipFont: 8.5 },
  spacious:    { rowPy: 4, rowPx: 8,  headerPy: 5, font: 11, lineHeight: 1.2,  headerFont: 10,   avatar: 20, avatarFont: 10,  chipFont: 9   },
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
    ['--grid-row-px' as string]: `${d.rowPx}px`,
    ['--grid-header-py' as string]: `${d.headerPy}px`,
    ['--grid-font' as string]: `${d.font}px`,
    ['--grid-line-height' as string]: `${d.lineHeight}`,
    ['--grid-header-font' as string]: `${d.headerFont}px`,
    ['--grid-avatar' as string]: `${d.avatar}px`,
    ['--grid-avatar-font' as string]: `${d.avatarFont}px`,
    ['--grid-chip-font' as string]: `${d.chipFont}px`,
  } as React.CSSProperties;
}

export const DENSITY_LABELS: Record<GridDensity, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};

export const DENSITY_HINTS: Record<GridDensity, string> = {
  compact: 'Tightest rows',
  comfortable: 'Balanced rows — middle ground',
  spacious: 'Relaxed rows — everyday default',
};

/**
 * Card-view density preset. Mirrors GridDensity so the same user-store
 * setting (`gridDensity`) drives both the data grid and card views.
 * Applied as CSS custom properties on the card-view root — individual
 * cards read `var(--card-p)`, `var(--card-avatar)`, etc.
 */
export interface CardDensityConfig {
  /** Card inner padding (px) */
  padding: number;
  /** Avatar / icon chip size (px) */
  avatar: number;
  /** Contact/entity name font size (px) */
  nameFont: number;
  /** Subtitle / secondary text font size (px) */
  subFont: number;
  /** Status/tag chip font size (px) */
  chipFont: number;
  /** Gap between cards in the grid (px) */
  gap: number;
  /** Minimum column width for the auto-fill grid (px) */
  minCardWidth: number;
}

// Same shift as DENSITY: the previous "comfortable" became the new
// "spacious" (the everyday default), and "comfortable" is now a proper
// middle-ground between compact and that.
export const CARD_DENSITY: Record<GridDensity, CardDensityConfig> = {
  compact:     { padding: 8,  avatar: 36, nameFont: 12, subFont: 10,   chipFont: 8,   gap: 6,  minCardWidth: 180 },
  comfortable: { padding: 10, avatar: 42, nameFont: 13, subFont: 10.5, chipFont: 8.5, gap: 9,  minCardWidth: 210 },
  spacious:    { padding: 12, avatar: 48, nameFont: 14, subFont: 11,   chipFont: 9,   gap: 12, minCardWidth: 240 },
};

export function cardDensityStyle(density: GridDensity): React.CSSProperties {
  const d = CARD_DENSITY[density];
  return {
    ['--card-p' as string]: `${d.padding}px`,
    ['--card-avatar' as string]: `${d.avatar}px`,
    ['--card-name-font' as string]: `${d.nameFont}px`,
    ['--card-sub-font' as string]: `${d.subFont}px`,
    ['--card-chip-font' as string]: `${d.chipFont}px`,
    ['--card-gap' as string]: `${d.gap}px`,
    ['--card-col-width' as string]: `${d.minCardWidth}px`,
  } as React.CSSProperties;
}

/**
 * Detail-view density preset. Mirrors GridDensity so the same user-store
 * setting (`gridDensity`) drives grid, card, AND detail views. Applied as
 * CSS custom properties on the detail page root — the page wrapper, the
 * overview/details tab grids, and each Card read the vars directly.
 */
export interface DetailDensityConfig {
  /** Outer scroll-area horizontal padding (px) — keeps columns from sprawling on wide screens */
  pagePx: number;
  /** Outer scroll-area vertical padding (px) */
  pagePy: number;
  /** Gap between the two tab columns (px) */
  sectionGap: number;
  /** Gap between stacked cards in a column (px) */
  stackGap: number;
  /** Card inner horizontal padding (px) */
  cardPx: number;
  /** Card inner vertical padding (px) */
  cardPy: number;
  /** DetailHeader vertical padding (px) */
  headerPy: number;
}

// Same shift: previous "comfortable" became the new "spacious"
// (the everyday default for detail-page reading), and "comfortable"
// is now a true middle-ground.
export const DETAIL_DENSITY: Record<GridDensity, DetailDensityConfig> = {
  compact:     { pagePx: 160, pagePy: 10, sectionGap: 10, stackGap: 8,  cardPx: 12, cardPy: 8,  headerPy: 8  },
  comfortable: { pagePx: 112, pagePy: 15, sectionGap: 13, stackGap: 12, cardPx: 14, cardPy: 10, headerPy: 10 },
  spacious:    { pagePx: 64,  pagePy: 20, sectionGap: 16, stackGap: 16, cardPx: 16, cardPy: 12, headerPy: 12 },
};

export function detailDensityStyle(density: GridDensity): React.CSSProperties {
  const d = DETAIL_DENSITY[density];
  return {
    ['--detail-px' as string]: `${d.pagePx}px`,
    ['--detail-py' as string]: `${d.pagePy}px`,
    ['--detail-section-gap' as string]: `${d.sectionGap}px`,
    ['--detail-stack-gap' as string]: `${d.stackGap}px`,
    ['--detail-card-px' as string]: `${d.cardPx}px`,
    ['--detail-card-py' as string]: `${d.cardPy}px`,
    ['--detail-header-py' as string]: `${d.headerPy}px`,
  } as React.CSSProperties;
}
