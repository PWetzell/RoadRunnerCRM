export const initials = (name: string): string =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

/**
 * Formats a date string as "Apr 27, 2026".
 *
 * Critical detail: `new Date("2026-04-27")` parses bare YYYY-MM-DD strings
 * as **UTC midnight**, per the ECMAScript spec. The browser then renders
 * that moment in the user's local timezone — so anyone west of UTC sees
 * the date roll back a day (UTC midnight Apr 27 = 8 PM Apr 26 EDT).
 *
 * Every contact in the grid was showing yesterday's date because of this
 * one parsing rule. We now detect bare YYYY-MM-DD and pin it to local
 * midnight, so the displayed day matches what the server stamped.
 *
 * Full ISO timestamps (with `T...Z`) are still parsed normally — those
 * carry their own timezone and `toLocaleDateString` handles them correctly.
 */
export const fmtDate = (d: string): string => {
  if (!d) return '';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(d);
  const date = dateOnly ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const uid = (prefix: string): string =>
  `${prefix}-${Date.now()}`;

// Avatar palette — 14 distinct hues, all WCAG AA on white text (>= 4.5:1).
// One color per hue family — no near-duplicates. Previously had navy
// + dark cyan + emerald-800 + dark pink (#9D174D) all looking like
// "dark blue-green" or "dark red" at small avatar sizes, which made
// adjacent rows blur together. New palette: 12 distinct hues each
// from a different family, all WCAG AA against white text.
const AVATAR_COLORS = [
  '#1D4ED8', // blue-700
  '#0E7490', // cyan-700
  '#0F766E', // teal-700
  '#047857', // emerald-700
  '#6D28D9', // violet-700
  '#C026D3', // fuchsia-600
  '#BE185D', // pink-700
  '#DC2626', // red-600
  '#C2410C', // orange-700
  '#B45309', // amber-700
  '#4F46E5', // indigo-600
  '#475569', // slate-600
];

export const getAvatarColor = (id: string, customColor?: string): string => {
  if (customColor) return customColor;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Full Acme Design System color palette for avatar picker
export const ACME_COLORS = [
  // Brand
  { hex: '#1955A6', name: 'Brand Primary' },
  { hex: '#0B2F5C', name: 'Brand Dark' },
  { hex: '#A8C4E4', name: 'Brand Light' },
  // Status
  { hex: '#059669', name: 'Success' },
  { hex: '#DC2626', name: 'Danger' },
  { hex: '#D97706', name: 'Warning' },
  { hex: '#1FA4B6', name: 'Info / AI' },
  // Pink
  { hex: '#D96FA8', name: 'Pink' },
  { hex: '#44AE7C', name: 'Teal' },
  // Cyan
  { hex: '#3BAFC4', name: 'Cyan' },
  { hex: '#247A8A', name: 'Cyan Dark' },
  // Purple
  { hex: '#A255FF', name: 'Purple' },
  { hex: '#6A0FB8', name: 'Purple Dark' },
  // Neutrals
  { hex: '#475569', name: 'Slate' },
  { hex: '#1E293B', name: 'Dark Slate' },
  { hex: '#94A3B8', name: 'Gray' },
];

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
