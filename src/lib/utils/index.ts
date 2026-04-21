export const initials = (name: string): string =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export const fmtDate = (d: string): string =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const uid = (prefix: string): string =>
  `${prefix}-${Date.now()}`;

// Avatar palette — 14 distinct hues, all WCAG AA on white text (>= 4.5:1).
// No yellows (insufficient contrast). Wide spectrum so adjacent contacts/deals
// don't repeat colors.
const AVATAR_COLORS = [
  '#1955A6', // brand blue
  '#0B2F5C', // navy
  '#247A8A', // dark cyan
  '#0E7490', // cyan-700
  '#047857', // emerald-700
  '#065F46', // emerald-800
  '#6A0FB8', // deep purple
  '#7C3AED', // violet-600
  '#BE185D', // pink-700
  '#9D174D', // pink-800
  '#DC2626', // red-600
  '#C2410C', // orange-700
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
