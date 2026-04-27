/**
 * Canonical document-tag styling.
 *
 * Why this module exists:
 *   The DataGrid Tags column renders pills like `[📄 resume]` in blue and
 *   `[👤 candidate]` in purple — a deliberate visual system that makes
 *   scanning a busy list fast. Card view and the preview panel were
 *   falling back to a generic grey/hollow-diamond rendering, which broke
 *   the visual coherence Paul called out.
 *
 *   HubSpot, Attio, and Folk all use a single source of truth for tag
 *   color + icon so the same "signed" pill looks identical in the list
 *   grid, the card grid, and the detail sidebar. This file is that source
 *   of truth for documents.
 */

import {
  Tag, Star, Flag, Bookmark, Sparkle, CalendarBlank, User, Briefcase,
  CheckCircle, CurrencyDollar, Buildings, ShieldCheck, PaperPlaneTilt,
  Handshake, MagnifyingGlass, Target, ReadCvLogo, Article, ClipboardText,
  Notepad,
} from '@phosphor-icons/react';
import { PILL_COLORS } from '@/lib/pill-colors';

/** The stable palette order used to hash-bucket unknown tags. */
const TAG_PALETTE_KEYS = ['blue', 'green', 'red', 'violet', 'orange', 'cyan', 'pink', 'amber'] as const;
const TAG_PALETTE_DATA = TAG_PALETTE_KEYS.map((k) => PILL_COLORS[k]);

/** Explicit icon overrides for the tags the case-study data uses heavily. */
const TAG_ICON_MAP: Record<string, typeof Tag> = {
  monthly: CalendarBlank, weekly: CalendarBlank, quarterly: CalendarBlank,
  Q2: CalendarBlank, Q1: CalendarBlank, Q3: CalendarBlank, Q4: CalendarBlank,
  report: Article, forecast: Notepad, template: ClipboardText,
  resume: ReadCvLogo, candidate: User,
  signed: CheckCircle, active: CheckCircle, verified: ShieldCheck,
  paid: CurrencyDollar, closed: CurrencyDollar, fees: CurrencyDollar,
  sent: PaperPlaneTilt, slate: Briefcase,
  NDA: ShieldCheck, legal: ShieldCheck,
  JD: ClipboardText, hire: Briefcase,
  client: Buildings, partner: Handshake,
  search: MagnifyingGlass,
  prospect: Target, lead: Target,
};

/** Fallback icon pool for unknown tags — hash-picked for stability. */
const TAG_ICON_FALLBACKS = [Tag, Star, Flag, Bookmark, Sparkle];

/** Explicit color overrides (index into TAG_PALETTE_DATA). Keeps "resume"
 *  blue everywhere, "candidate" purple, "signed" green, etc. */
const TAG_COLOR_OVERRIDES: Record<string, number> = {
  resume: 0,      // blue
  candidate: 3,   // violet
  signed: 1,      // green
  active: 1,      // green
  paid: 4,        // orange
  closed: 2,      // red
  monthly: 5,     // cyan
  report: 7,      // amber
  slate: 6,       // pink
  sent: 5,        // cyan
};

/** Resolve a tag name to its palette entry (used with dc() for dark-mode). */
export function getTagPillData(tag: string) {
  const lower = tag.toLowerCase();
  if (TAG_COLOR_OVERRIDES[lower] !== undefined) return TAG_PALETTE_DATA[TAG_COLOR_OVERRIDES[lower]];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE_DATA[Math.abs(hash) % TAG_PALETTE_DATA.length];
}

/** Resolve a tag name to its Phosphor icon component. */
export function getTagIcon(tag: string): typeof Tag {
  const lower = tag.toLowerCase();
  if (TAG_ICON_MAP[tag]) return TAG_ICON_MAP[tag];
  if (TAG_ICON_MAP[lower]) return TAG_ICON_MAP[lower];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_ICON_FALLBACKS[Math.abs(hash) % TAG_ICON_FALLBACKS.length];
}
