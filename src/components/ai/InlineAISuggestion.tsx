'use client';

import { Sparkle, X } from '@phosphor-icons/react';
import type { EntrySuggestion } from '@/lib/data/mock-ai/entry-suggestions';

/**
 * Confidence floor for surfacing an InlineAISuggestion chip in an empty
 * field. Anything below this stays in the "AI" tab inside the edit form.
 *
 * 85 was chosen so we surface:
 *   • Names from the contact's display name (99 — trivial split)
 *   • Org names → Primary · Legal (99)
 *   • Websites from a corporate email domain (96)
 *   • Org websites from name slug (93)
 *   • Org main phone numbers (92)
 *   • Person work emails using the Hunter "first.last@orgDomain" pattern (91)
 *   • Person work addresses pulled from their employer record (95)
 *   • Org addresses from SEC EDGAR (94)
 *
 * Person work-phone guesses (max 80), low-confidence person-address pool
 * entries (62/55), and bare LinkedIn slug guesses (85 line) stay below
 * the line — those are real guesses, not inferences from data we already
 * have, and surfacing them inline would feel like spam.
 */
export const INLINE_AI_THRESHOLD = 85;

/**
 * Inline one-click suggestion chip rendered inside empty entry cards
 * (Names / Addresses / Emails / Phones / Websites). Three actions:
 *   • [+ Add]   accept verbatim — calls saveEntry directly, no modal
 *   • [Edit]    escape hatch — opens the edit form pre-filled
 *   • [×]       dismiss — persists per-contact so the chip doesn't
 *                reappear on next reload (HubSpot/Attio/Folk pattern)
 *
 * Lives in /components/ai/ so it can be reused outside the Details tab —
 * the Overview Address card uses the same chip so users can accept the
 * suggestion + see the map preview without bouncing to Details first.
 */
export default function InlineAISuggestion({
  suggestion,
  onAccept,
  onEdit,
  onIgnore,
  label,
}: {
  suggestion: EntrySuggestion;
  onAccept: () => void;
  onEdit: () => void;
  onIgnore?: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-[var(--brand-bg)] border border-dashed border-[var(--brand-primary)]">
      <Sparkle size={12} weight="fill" className="text-[var(--brand-primary)] flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-[var(--text-primary)] truncate">{suggestion.primaryLabel}</div>
        <div className="text-[10px] text-[var(--text-secondary)] truncate">
          {suggestion.secondaryLabel || suggestion.sourceLabel} · {suggestion.confidence}% match
        </div>
      </div>
      <button
        onClick={onAccept}
        title={`Add ${label}`}
        className="text-[11px] font-bold px-2 py-1 rounded border border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white hover:opacity-90 cursor-pointer"
      >
        + Add
      </button>
      <button
        onClick={onEdit}
        title="Edit before adding"
        className="text-[11px] font-semibold px-2 py-1 rounded border border-[var(--brand-primary)] bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] cursor-pointer"
      >
        Edit
      </button>
      {onIgnore && (
        <button
          onClick={onIgnore}
          title="Don't suggest this again"
          aria-label="Ignore suggestion"
          className="w-6 h-6 inline-flex items-center justify-center rounded border border-[var(--border)] bg-white text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:border-[var(--danger)] cursor-pointer"
        >
          <X size={11} weight="bold" />
        </button>
      )}
    </div>
  );
}
