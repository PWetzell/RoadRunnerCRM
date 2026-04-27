'use client';

import { useState, useCallback, useEffect } from 'react';
import { ContactWithEntries, AddressEntry, EmailEntry, PhoneEntry, WebsiteEntry, NameEntry, IdentifierEntry } from '@/types/contact';
import { useContactStore } from '@/stores/contact-store';
import { PencilSimple, X, CheckCircle, Warning, MapPin, EnvelopeSimple, Phone as PhoneIcon, Globe, Buildings, ShieldCheck, Fingerprint, Sparkle, IdentificationBadge, Factory, Hash, FloppyDisk, Trash, Plus, Check, Briefcase, Info, DotsSixVertical, PushPin, EyeSlash, Eye, UserPlus, UserMinus, ArrowCounterClockwise } from '@phosphor-icons/react';
import { fmtDate, uid, initials, getAvatarColor, ACME_COLORS } from '@/lib/utils';
import SectionCard, { FieldRow } from '@/components/detail/SectionCard';
import { ValidationRule, validate, isValid, isEmail, isPhone, isUrl, maxLength } from '@/lib/validation';
import { validateIdentifier, placeholderForType, isStateScoped, isDateType, numberFieldLabel, US_STATES } from '@/lib/validation/identifiers';
import { getSectors, getChildren, getNodeByCode, getAncestors, formatCodeLabel } from '@/lib/data/naics';
import { getEntrySuggestions, type EntrySuggestion } from '@/lib/data/mock-ai/entry-suggestions';
import InlineAISuggestion, { INLINE_AI_THRESHOLD } from '@/components/ai/InlineAISuggestion';
import { useUserStore } from '@/stores/user-store';
import { toast } from '@/lib/toast';

const PIN_LABELS: Record<string, string> = {
  identity: 'Identity', visibility: 'Visibility & Access', names: 'Names',
  jobtitle: 'Job Title', skills: 'Skills', addresses: 'Addresses', emails: 'Emails',
  phones: 'Phone', websites: 'Websites', general: 'General Information',
  industries: 'Industries', identifiers: 'Identification',
};

// Labels for every card on the Details tab, keyed by cardId. Used by
// the "Hidden cards" restore bar so the user can turn a card back on
// by name. Includes non-pinnable cards (Visibility, System IDs, AI
// Health) because the hide/show control is independent of pin state.
const CARD_LABELS: Record<string, string> = {
  'card-identity': 'Identity',
  'card-visibility': 'Visibility & Access',
  'card-names': 'Names',
  'card-jobtitle': 'Job Title',
  'card-skills': 'Skills',
  'card-addresses': 'Addresses',
  'card-emails': 'Emails',
  'card-phones': 'Phone',
  'card-websites': 'Websites',
  'card-general': 'General Information',
  'card-industries': 'Industries',
  'card-identification': 'Identification',
  'card-sysids': 'System Identifiers',
  'card-aihealth': 'AI Record Health',
};

const SECTION_LABELS: Record<string, { singular: string }> = {
  identity: { singular: 'Identity' },
  general: { singular: 'General info' },
  addresses: { singular: 'Address' },
  emails: { singular: 'Email' },
  phones: { singular: 'Phone' },
  websites: { singular: 'Website' },
  names: { singular: 'Name' },
  identifiers: { singular: 'Identifier' },
  industries: { singular: 'Industry' },
  jobtitle: { singular: 'Job title' },
  skills: { singular: 'Skills' },
};

interface DetailsTabProps {
  contact: ContactWithEntries;
  scrollToCardId?: string | null;
  onScrolled?: () => void;
}

type EditingState = { section: string; entryId: string | null } | null;

export default function DetailsTab({ contact: c, scrollToCardId, onScrolled }: DetailsTabProps) {
  const updateContact = useContactStore((s) => s.updateContact);
  // Used by suggestion engine for cross-contact inferences (e.g. resolving
  // a person's employer → the org's address as a high-confidence Worksite
  // suggestion). Without this the person address pool falls back to
  // generic, low-confidence guesses.
  const allContacts = useContactStore((s) => s.contacts);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const rawNotifications = useUserStore((s) => s.notifications);
  // AI-gated sub-toggles are AND-ed with the master AI switch
  const notifications = {
    ...rawNotifications,
    staleAlerts: aiEnabled && rawNotifications.staleAlerts,
    aiSuggestions: aiEnabled && rawNotifications.aiSuggestions,
  };
  const [editing, setEditing] = useState<EditingState>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ section: string; entryId: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (!scrollToCardId) return;
    const el = document.querySelector(`[data-card-id="${scrollToCardId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement).classList.add('ring-2', 'ring-[var(--brand-primary)]');
      setTimeout(() => (el as HTMLElement).classList.remove('ring-2', 'ring-[var(--brand-primary)]'), 1600);
    }
    onScrolled?.();
  }, [scrollToCardId, onScrolled]);
  const isOrg = c.type === 'org';
  const currentAvatarColor = getAvatarColor(c.id, c.avatarColor);
  const overviewCards = c.overviewCards || [];

  const togglePin = (cardId: string) => {
    const current = c.overviewCards || [];
    const wasPinned = current.includes(cardId);
    const updated = wasPinned ? current.filter((id) => id !== cardId) : [...current, cardId];
    updateContact(c.id, { overviewCards: updated } as Partial<ContactWithEntries>);
    const label = PIN_LABELS[cardId] || cardId;
    if (wasPinned) {
      toast.info(`Unpinned “${label}” from Overview`, {
        action: {
          label: 'Undo',
          onClick: () => updateContact(c.id, { overviewCards: current } as Partial<ContactWithEntries>),
        },
      });
    } else {
      toast.success(`Pinned “${label}” to Overview`, {
        action: {
          label: 'Undo',
          onClick: () => updateContact(c.id, { overviewCards: current } as Partial<ContactWithEntries>),
        },
      });
    }
  };

  const isPinned = (cardId: string) => overviewCards.includes(cardId);

  // Hide / restore — per-contact so the user can tailor the Details
  // layout for each record. HubSpot's "Customize left sidebar" and
  // Pipedrive's "Customize this view" do similar. Hiding is independent
  // of pinning (the pin button controls Overview presence; hide wipes
  // the card from both Details and Overview).
  const hiddenCards = c.hiddenCards || [];
  const isCardHidden = (cardId: string) => hiddenCards.includes(cardId);

  const hideCard = (cardId: string) => {
    const current = c.hiddenCards || [];
    if (current.includes(cardId)) return;
    const next = [...current, cardId];
    updateContact(c.id, { hiddenCards: next } as Partial<ContactWithEntries>);
    const label = CARD_LABELS[cardId] || cardId;
    toast.info(`Hid “${label}”`, {
      action: {
        label: 'Undo',
        onClick: () => updateContact(c.id, { hiddenCards: current } as Partial<ContactWithEntries>),
      },
    });
  };

  const restoreCard = (cardId: string) => {
    const current = c.hiddenCards || [];
    const next = current.filter((id) => id !== cardId);
    updateContact(c.id, { hiddenCards: next } as Partial<ContactWithEntries>);
    const label = CARD_LABELS[cardId] || cardId;
    toast.success(`Restored “${label}”`);
  };

  /**
   * Dismiss an inline AI suggestion. Persists the suggestion id in the
   * contact's `dismissedSuggestions` list so it doesn't reappear after
   * page reload. Idempotent — re-dismissing the same id is a no-op. We
   * also surface an Undo so an accidental click is recoverable.
   */
  const dismissSuggestion = (suggestionId: string, label: string) => {
    const current = c.dismissedSuggestions || [];
    if (current.includes(suggestionId)) return;
    updateContact(c.id, {
      dismissedSuggestions: [...current, suggestionId],
    } as Partial<ContactWithEntries>);
    toast.info(`Dismissed ${label.toLowerCase()} suggestion`, {
      action: {
        label: 'Undo',
        onClick: () =>
          updateContact(c.id, {
            dismissedSuggestions: current,
          } as Partial<ContactWithEntries>),
      },
    });
  };

  /**
   * Returns ALL inline-eligible suggestions for a section (above threshold
   * + not dismissed), sorted by confidence descending. Multi-suggestion
   * sections (Addresses, Phones) need this so e.g. Digital Prospectors'
   * Exeter HQ + Boston Branch BOTH render as separate one-click chips
   * stacked in the empty state. Single-suggestion sections (Names,
   * Websites) still get a single chip — nothing changes for them, the
   * .map just iterates over a length-1 array.
   *
   * Capped at 3 inline chips per section so the empty state doesn't
   * become a wall of suggestions. Anything beyond 3 stays in the AI tab.
   */
  const inlineSuggestionsFor = (section: string): EntrySuggestion[] => {
    const suggestions = getEntrySuggestions(section, c, allContacts);
    const dismissed = new Set(c.dismissedSuggestions || []);
    return suggestions
      .filter((s) => s.confidence >= INLINE_AI_THRESHOLD && !dismissed.has(s.id))
      .slice(0, 3);
  };

  /**
   * Counts how many AI suggestions were previously dismissed for this
   * section. Suggestion ids are stable and shaped `ai-<section>-<contactId>-<slug>`
   * so a startsWith match against `ai-<section>-<contactId>-` is enough
   * to scope to the current card.
   *
   * Drives the per-card "↻ Restore N hidden" footer link — Paul wanted to
   * be able to come back to a contact weeks later and recall the
   * suggestions he'd ignored, in case the underlying data has matured
   * (e.g. a previously low-confidence guess is now corroborated by
   * another source). Mirrors HubSpot's "View dismissed insights" toggle
   * and Salesforce Einstein's "Show dismissed" affordance.
   */
  const hiddenSuggestionCount = (section: string): number => {
    const prefix = `ai-${section}-${c.id}-`;
    return (c.dismissedSuggestions || []).filter((id) => id.startsWith(prefix)).length;
  };

  /**
   * Restore every dismissed suggestion for this section by stripping the
   * matching ids from `dismissedSuggestions`. The suggestion engine's
   * output is unchanged — those candidates were always being emitted,
   * they were just being filtered out of the inline render by the
   * dismissed-set check in `inlineSuggestionsFor`. Removing the ids
   * brings them back into rotation immediately on the next render.
   *
   * Toast surfaces an Undo so an accidental restore is recoverable.
   */
  const restoreHiddenForSection = (section: string) => {
    const prefix = `ai-${section}-${c.id}-`;
    const current = c.dismissedSuggestions || [];
    const next = current.filter((id) => !id.startsWith(prefix));
    const restored = current.length - next.length;
    if (restored === 0) return;
    updateContact(c.id, { dismissedSuggestions: next } as Partial<ContactWithEntries>);
    toast.success(`Restored ${restored} hidden suggestion${restored === 1 ? '' : 's'}`, {
      action: {
        label: 'Undo',
        onClick: () =>
          updateContact(c.id, { dismissedSuggestions: current } as Partial<ContactWithEntries>),
      },
    });
  };

  /**
   * Tiny footer link rendered at the bottom of each suggestion-eligible
   * card when there are any hidden suggestions for that section. Stays
   * subtle (small + tertiary text) so it doesn't compete with live
   * suggestion chips above it.
   */
  const renderHiddenSuggestionsLink = (section: string) => {
    const n = hiddenSuggestionCount(section);
    if (n === 0) return null;
    return (
      <button
        type="button"
        onClick={() => restoreHiddenForSection(section)}
        title="Bring back AI suggestions you previously dismissed"
        className="self-start inline-flex items-center gap-1 px-1 py-0.5 mt-1 text-[10px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer transition-colors"
      >
        <ArrowCounterClockwise size={11} weight="bold" />
        Restore {n} hidden suggestion{n === 1 ? '' : 's'}
      </button>
    );
  };

  const startEdit = (section: string, entryId: string | null = null) => {
    setEditing({ section, entryId });
    const cardId = section === 'identifiers' ? 'card-identification' : `card-${section}`;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-card-id="${cardId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEntry = useCallback((section: string, entryId: string | null, data: Record<string, string>) => {
    const entries = { ...c.entries };
    const isNew = !entryId || entryId === 'new';
    const label = SECTION_LABELS[section]?.singular || section;

    if (section === 'identity') {
      const updates: Record<string, unknown> = {};
      if (data.name) updates.name = data.name;
      if (data.status) updates.status = data.status;
      updateContact(c.id, updates as Partial<ContactWithEntries>);
      setEditing(null);
      toast.success(`${label} updated`);
      return;
    }

    if (section === 'general') {
      const updates: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => { if (v) updates[k] = v; });
      updateContact(c.id, updates as Partial<ContactWithEntries>);
      setEditing(null);
      toast.success(`${label} updated`);
      return;
    }

    // Multi-entry sections
    const sectionMap: Record<string, keyof typeof entries> = {
      addresses: 'addresses', emails: 'emails', phones: 'phones',
      websites: 'websites', names: 'names', identifiers: 'identifiers',
      industries: 'industries',
    };

    const key = sectionMap[section];
    if (!key) { setEditing(null); return; }

    const arr = [...(entries[key] as unknown[])] as Record<string, unknown>[];

    // For person Names, compose the display `value` from parts (prefix/first/middle/last/suffix).
    const payload: Record<string, unknown> = { ...data };
    if (section === 'names' && !isOrg) {
      const parts = [data.prefix, data.firstName, data.middleName, data.lastName, data.suffix]
        .map((p) => (p || '').trim())
        .filter(Boolean);
      if (parts.length) payload.value = parts.join(' ');
    }

    if (isNew) {
      arr.push({ id: uid(section.substring(0, 3)), ...payload, primary: false });
    } else {
      const idx = arr.findIndex((e) => e.id === entryId);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...payload };
    }

    updateContact(c.id, { entries: { ...entries, [key]: arr } } as Partial<ContactWithEntries>);
    setEditing(null);
    toast.success(isNew ? `${label} added` : `${label} updated`);
  }, [c, updateContact, isOrg]);

  const deleteEntry = useCallback((section: string, entryId: string) => {
    const entries = { ...c.entries };
    const sectionMap: Record<string, keyof typeof entries> = {
      addresses: 'addresses', emails: 'emails', phones: 'phones',
      websites: 'websites', names: 'names', identifiers: 'identifiers',
      industries: 'industries',
    };
    const key = sectionMap[section];
    if (!key) return;
    const arr = (entries[key] as unknown[]).filter((e: any) => e.id !== entryId);
    const label = SECTION_LABELS[section]?.singular || section;
    updateContact(c.id, { entries: { ...entries, [key]: arr } } as Partial<ContactWithEntries>);
    setConfirmDelete(null);
    setEditing(null);
    toast.success(`${label} deleted`);
  }, [c, updateContact]);

  const isEditing = (section: string, entryId?: string) =>
    editing?.section === section && (entryId ? editing.entryId === entryId : true);

  return (
    <div>
      {hiddenCards.length > 0 && (
        <HiddenCardsBar
          hiddenIds={hiddenCards}
          onRestore={restoreCard}
          onRestoreAll={() => {
            const prev = c.hiddenCards || [];
            updateContact(c.id, { hiddenCards: [] } as Partial<ContactWithEntries>);
            toast.success(`Restored ${prev.length} card${prev.length === 1 ? '' : 's'}`, {
              action: {
                label: 'Undo',
                onClick: () => updateContact(c.id, { hiddenCards: prev } as Partial<ContactWithEntries>),
              },
            });
          }}
        />
      )}
    <div className="grid grid-cols-2" style={{ gap: 'var(--detail-section-gap, 20px)' }}>
      {/* LEFT COLUMN */}
      <div className="flex flex-col min-h-[100px] p-0.5 rounded-xl border-2 border-dashed border-transparent transition-all detail-column"
        style={{ gap: 'var(--detail-stack-gap, 16px)' }}
        data-column="left"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.add('drop-zone-highlight');
          // Auto-scroll
          const scrollParent = e.currentTarget.closest('.overflow-y-auto');
          if (scrollParent) {
            const rect = scrollParent.getBoundingClientRect();
            if (e.clientY < rect.top + 60) scrollParent.scrollTop -= 8;
            if (e.clientY > rect.bottom - 60) scrollParent.scrollTop += 8;
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            e.currentTarget.classList.remove('drop-zone-highlight');
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drop-zone-highlight');
          const draggedId = e.dataTransfer.getData('text/plain');
          const draggedEl = document.querySelector(`[data-card-id="${draggedId}"]`);
          if (draggedEl) {
            // Find closest card to drop position
            const cards = Array.from(e.currentTarget.querySelectorAll('.section-card'));
            const insertBefore = cards.find((card) => {
              const rect = card.getBoundingClientRect();
              return e.clientY < rect.top + rect.height / 2;
            });
            if (insertBefore) {
              e.currentTarget.insertBefore(draggedEl, insertBefore);
            } else {
              e.currentTarget.appendChild(draggedEl);
            }
            draggedEl.classList.add('card-just-dropped');
            setTimeout(() => draggedEl.classList.remove('card-just-dropped'), 300);
          }
        }}
      >
        {/* Identity */}
        <SectionCard icon={<Buildings size={16} />} title="Identity" cardId="card-identity"
          hidden={isCardHidden('card-identity')} onHide={() => hideCard('card-identity')}
          isEditing={isEditing('identity')}
          onEdit={() => startEdit('identity')} onCancel={cancelEdit}>
          {isEditing('identity') ? (
            <EditForm fields={[
              { key: 'name', label: isOrg ? 'Company Name' : 'Full Name', value: c.name, required: true, maxLength: 120 },
            ]} onSave={(data) => saveEntry('identity', null, data)} onCancel={cancelEdit} />
          ) : (
            <>
              {/* Avatar with color picker */}
              <div className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)]">
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-12 h-12 flex items-center justify-center text-base font-extrabold text-white cursor-pointer border-2 border-transparent hover:border-[var(--brand-primary)] transition-all"
                    style={{
                      background: currentAvatarColor,
                      borderRadius: isOrg ? 'var(--radius-lg)' : 'var(--radius-full)',
                    }}
                    title="Click to change color"
                  >
                    {initials(c.name)}
                  </button>

                  {/* Color Picker Dropdown */}
                  {showColorPicker && (
                    <div className="absolute top-14 left-0 z-50 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-lg p-3 w-[240px] animate-[fadeUp_0.2s_ease-out]">
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Avatar Color</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {ACME_COLORS.map((color) => (
                          <button
                            key={color.hex}
                            onClick={() => {
                              updateContact(c.id, { avatarColor: color.hex } as Partial<ContactWithEntries>);
                              setShowColorPicker(false);
                              toast.info(`Avatar color set to ${color.name}`);
                            }}
                            className={`w-8 h-8 rounded-lg cursor-pointer transition-all hover:scale-110 hover:shadow-md border-2 ${
                              currentAvatarColor === color.hex ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'
                            }`}
                            style={{ background: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          updateContact(c.id, { avatarColor: undefined } as Partial<ContactWithEntries>);
                          setShowColorPicker(false);
                          toast.info('Avatar color reset');
                        }}
                        className="mt-2 text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors bg-transparent border-none cursor-pointer"
                      >
                        Reset to default
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{c.name}</div>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer mt-0.5"
                  >
                    Change avatar color
                  </button>
                </div>
              </div>

              <FieldRow label="Name" value={c.name} />
              <FieldRow label="Last Updated" value={fmtDate(c.lastUpdated)} />
              {/* Record creator. Lives on the Identity card (not Visibility &
                  Access) because it's record audit metadata — nothing to do
                  with who set the privacy toggle. Matches HubSpot/Salesforce/
                  Attio convention of grouping audit fields with identity. */}
              <FieldRow label="Created By" value={c.createdBy || 'Unknown'} />
            </>
          )}
        </SectionCard>

        {/* Visibility & Access */}
        <SectionCard icon={<EyeSlash size={16} />} title="Visibility & Access" cardId="card-visibility"
          hidden={isCardHidden('card-visibility')} onHide={() => hideCard('card-visibility')}
          isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}>
          <VisibilityCard contact={c} />
        </SectionCard>

        {/* Names */}
        <SectionCard icon={isOrg ? <Buildings size={16} /> : <IdentificationBadge size={16} />}
          title={isOrg ? 'Company Names' : 'Names'} cardId="card-names"
          hidden={isCardHidden('card-names')} onHide={() => hideCard('card-names')}
          isEditing={isEditing('names')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          isPinned={isPinned('names')} onTogglePin={() => togglePin('names')}>
          {isEditing('names') ? (
            <EntryEditForm
              section="names" entryId={editing!.entryId} contact={c}
              fields={isOrg ? [
                { key: 'value', label: 'Company Name', required: true, maxLength: 120 },
                { key: 'type', label: 'Name Type', type: 'select', options: ['Primary · Legal', 'Full', 'Doing Business As', 'Abbreviated', 'Former Name', 'Trade Name'], required: true },
              ] : [
                { key: 'prefix', label: 'Prefix (Optional)', type: 'select', options: ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Mx.', 'Dr.', 'Prof.', 'Rev.', 'Hon.', 'Sir', 'Dame'] },
                { key: 'firstName', label: 'First Name', required: true, maxLength: 60, validate: 'name' },
                { key: 'middleName', label: 'Middle Name (Optional)', maxLength: 60, validate: 'name' },
                { key: 'lastName', label: 'Last Name', required: true, maxLength: 60, validate: 'name' },
                { key: 'suffix', label: 'Suffix (Optional)', type: 'select', options: ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'PhD', 'MD', 'DDS', 'Esq.', 'CPA', 'RN', 'MBA'] },
                { key: 'type', label: 'Name Type', type: 'select', options: ['Primary · Legal', 'Given', 'Nick', 'Preferred', 'Maiden', 'Former'], required: true },
              ]}
              onSave={(data) => saveEntry('names', editing!.entryId, data)}
              onCancel={cancelEdit}
              onDelete={editing!.entryId ? () => setConfirmDelete({ section: 'names', entryId: editing!.entryId! }) : undefined}
            />
          ) : (
            <>
              {c.entries.names.map((n) => (
                <EntryRow key={n.id} type={n.type} value={n.value} isPrimary={n.primary}
                  onEdit={() => startEdit('names', n.id)} />
              ))}
              {/* Empty-state inline AI: when the contact has a display
                  name (c.name) but no Names entry yet, offer a one-click
                  split into prefix/first/middle/last/suffix. Confidence
                  99 — we're not guessing, we're echoing the user's own
                  input back in a structured form. */}
              {c.entries.names.length === 0 && (() => {
                const leads = inlineSuggestionsFor('names');
                if (leads.length === 0) return null;
                return (
                  <div className="flex flex-col gap-1.5">
                    {leads.map((lead) => (
                      <InlineAISuggestion
                        key={lead.id}
                        suggestion={lead}
                        label="Name"
                        onAccept={() => saveEntry('names', 'new', lead.fieldValues)}
                        onEdit={() => startEdit('names', 'new')}
                        onIgnore={() => dismissSuggestion(lead.id, 'Name')}
                      />
                    ))}
                  </div>
                );
              })()}
              <AddButton label="Add Name" onClick={() => startEdit('names', 'new')} />
              {renderHiddenSuggestionsLink('names')}
            </>
          )}
        </SectionCard>

        {/* Job Title (Person only) */}
        {!isOrg && (
          <SectionCard icon={<Briefcase size={16} />} title="Job Title" cardId="card-jobtitle" isPinned={isPinned('jobtitle')} onTogglePin={() => togglePin('jobtitle')}
            hidden={isCardHidden('card-jobtitle')} onHide={() => hideCard('card-jobtitle')}
            // Job Title is incomplete if EITHER the title or the
            // organization is missing. Organization (orgName) lives
            // here now — moved out of the deleted General Information
            // person variant, since HubSpot/Salesforce/Pipedrive/Attio
            // all group employer + role together. Hiding this card
            // therefore opts out of BOTH required-field checks.
            incomplete={(!('title' in c) || !c.title) || (!('orgName' in c) || !c.orgName)}
            isEditing={isEditing('jobtitle')} onEdit={() => startEdit('jobtitle')} onCancel={cancelEdit}>
            {isEditing('jobtitle') ? (
              <EditForm fields={[
                { key: 'title', label: 'Title', value: 'title' in c ? c.title : '', maxLength: 120 },
                { key: 'orgName', label: 'Organization', value: 'orgName' in c ? c.orgName : '', maxLength: 120 },
                { key: 'department', label: 'Department', value: 'department' in c ? c.department : '', type: 'select', options: ['Executive', 'Finance', 'Operations', 'Technology', 'Compliance', 'Sales', 'Marketing', 'Legal', 'HR', 'Engineering', 'Product'] },
                { key: 'reportsTo', label: 'Reports To', value: '', maxLength: 120 },
              ]} onSave={(data) => {
                const updates: Record<string, unknown> = {};
                if (data.title) updates.title = data.title;
                if (data.orgName) updates.orgName = data.orgName;
                if (data.department) updates.department = data.department;
                updateContact(c.id, updates as Partial<ContactWithEntries>);
                setEditing(null);
                toast.success('Job title updated');
              }} onCancel={cancelEdit} />
            ) : (
              <>
                <FieldRow label="Title" value={'title' in c ? c.title : '—'} />
                <FieldRow label="Organization" value={'orgName' in c ? c.orgName : '—'} />
                <FieldRow label="Department" value={'department' in c ? c.department : '—'} />
                <FieldRow label="Reports To" value="Not specified" />
              </>
            )}
          </SectionCard>
        )}

        {/* Skills (Person only — typically populated from resume parsing) */}
        {!isOrg && 'skills' in c && Array.isArray(c.skills) && c.skills.length > 0 && (
          <SectionCard
            icon={<Sparkle size={16} weight="duotone" />}
            title="Skills"
            cardId="card-skills"
            isEditing={false}
            onEdit={() => {}}
            onCancel={() => {}}
            editable={false}
            isPinned={isPinned('skills')}
            onTogglePin={() => togglePin('skills')}
            hidden={isCardHidden('card-skills')}
            onHide={() => hideCard('card-skills')}
          >
            <div className="flex flex-wrap gap-1.5 py-1">
              {c.skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-2 italic">
              Extracted from resume. Skills power candidate search + match scoring.
            </p>
          </SectionCard>
        )}

        {/* Addresses */}
        <SectionCard icon={<MapPin size={16} />} title="Addresses" cardId="card-addresses"
          hidden={isCardHidden('card-addresses')} onHide={() => hideCard('card-addresses')}
          isEditing={isEditing('addresses')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          incomplete={c.entries.addresses.length === 0}>
          {isEditing('addresses') ? (
            <EntryEditForm
              section="addresses" entryId={editing!.entryId} contact={c}
              fields={[
                { key: 'type', label: 'Type', type: 'select', options: ['Branch', 'Agency', 'Department', 'Division', 'Wharehouse', 'Worksite', 'Home', 'Mailing'], required: true },
                { key: 'value', label: 'Address', required: true, maxLength: 200, autoComplete: 'street-address' },
                { key: 'city', label: 'City', required: true, maxLength: 80, autoComplete: 'address-level2' },
                { key: 'state', label: 'State', type: 'select', options: ['NH', 'MA', 'ME', 'VT', 'CT', 'RI', 'NY', 'CA', 'TX', 'FL', 'IL', 'WA'], required: true },
                { key: 'zip', label: 'Zip Code', required: true, validate: 'zip', inputMode: 'numeric', autoComplete: 'postal-code', placeholder: '12345' },
              ]}
              onSave={(data) => saveEntry('addresses', editing!.entryId, data)}
              onCancel={cancelEdit}
              onDelete={editing!.entryId && editing!.entryId !== 'new' ? () => setConfirmDelete({ section: 'addresses', entryId: editing!.entryId! }) : undefined}
            />
          ) : (
            <>
              {c.entries.addresses.map((a) => (
                <EntryRow key={a.id} type={a.type} value={`${a.value}\n${a.city}, ${a.state} ${a.zip}`} isPrimary={a.primary}
                  onEdit={() => startEdit('addresses', a.id)} />
              ))}
              {c.entries.addresses.length === 0 && (() => {
                const leads = inlineSuggestionsFor('addresses');
                if (leads.length === 0) return <EmptyField />;
                return (
                  <div className="flex flex-col gap-1.5">
                    {leads.map((lead) => (
                      <InlineAISuggestion
                        key={lead.id}
                        suggestion={lead}
                        label="Address"
                        onAccept={() => saveEntry('addresses', 'new', lead.fieldValues)}
                        onEdit={() => startEdit('addresses', 'new')}
                        onIgnore={() => dismissSuggestion(lead.id, 'Address')}
                      />
                    ))}
                  </div>
                );
              })()}
              <AddButton label="Add Address" onClick={() => startEdit('addresses', 'new')} />
              {renderHiddenSuggestionsLink('addresses')}
            </>
          )}
        </SectionCard>

        {/* Emails */}
        <SectionCard icon={<EnvelopeSimple size={16} />} title="Emails" cardId="card-emails"
          hidden={isCardHidden('card-emails')} onHide={() => hideCard('card-emails')}
          isEditing={isEditing('emails')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          incomplete={c.entries.emails.length === 0}
          isPinned={isPinned('emails')} onTogglePin={() => togglePin('emails')}>
          {isEditing('emails') ? (
            <EntryEditForm
              section="emails" entryId={editing!.entryId} contact={c}
              fields={[
                { key: 'value', label: 'Email Address', required: true, validate: 'email', maxLength: 120, placeholder: 'name@company.com' },
                { key: 'type', label: 'Email Type', type: 'select', options: ['Work', 'Personal', 'Support', 'Billing', 'Other'], required: true },
              ]}
              onSave={(data) => saveEntry('emails', editing!.entryId, data)}
              onCancel={cancelEdit}
              onDelete={editing!.entryId && editing!.entryId !== 'new' ? () => setConfirmDelete({ section: 'emails', entryId: editing!.entryId! }) : undefined}
            />
          ) : (
            <>
              {c.entries.emails.map((e) => (
                <EntryRow key={e.id} type={e.type} value={e.value} isPrimary={e.primary}
                  onEdit={() => startEdit('emails', e.id)} />
              ))}
              {c.entries.emails.length === 0 && (() => {
                const leads = inlineSuggestionsFor('emails');
                if (leads.length === 0) return <EmptyField />;
                return (
                  <div className="flex flex-col gap-1.5">
                    {leads.map((lead) => (
                      <InlineAISuggestion
                        key={lead.id}
                        suggestion={lead}
                        label="Email"
                        onAccept={() => saveEntry('emails', 'new', lead.fieldValues)}
                        onEdit={() => startEdit('emails', 'new')}
                        onIgnore={() => dismissSuggestion(lead.id, 'Email')}
                      />
                    ))}
                  </div>
                );
              })()}
              <AddButton label="Add Email" onClick={() => startEdit('emails', 'new')} />
              {renderHiddenSuggestionsLink('emails')}
            </>
          )}
        </SectionCard>

        {/* Phone */}
        <SectionCard icon={<PhoneIcon size={16} />} title="Phone" cardId="card-phones"
          hidden={isCardHidden('card-phones')} onHide={() => hideCard('card-phones')}
          isEditing={isEditing('phones')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          incomplete={c.entries.phones.length === 0}
          isPinned={isPinned('phones')} onTogglePin={() => togglePin('phones')}>
          {isEditing('phones') ? (
            <EntryEditForm
              section="phones" entryId={editing!.entryId} contact={c}
              fields={[
                { key: 'value', label: 'Phone Number', required: true, validate: 'phone', placeholder: '+1 555 123 4567' },
                { key: 'type', label: 'Phone Type', type: 'select', options: ['Office', 'Mobile', 'Home', 'Fax', 'Other'], required: true },
              ]}
              onSave={(data) => saveEntry('phones', editing!.entryId, data)}
              onCancel={cancelEdit}
              onDelete={editing!.entryId && editing!.entryId !== 'new' ? () => setConfirmDelete({ section: 'phones', entryId: editing!.entryId! }) : undefined}
            />
          ) : (
            <>
              {c.entries.phones.map((p) => (
                <EntryRow key={p.id} type={p.type} value={p.value} isPrimary={p.primary}
                  onEdit={() => startEdit('phones', p.id)} />
              ))}
              {c.entries.phones.length === 0 && (() => {
                // Multi-suggestion: when we have enrichment data for the
                // contact's company (e.g. Holly @ Digital Prospectors),
                // surface every published phone — Exeter HQ main, Boston
                // Branch main, fax, etc. — as separate one-click chips.
                // For persons w/o enrichment, the engine returns nothing
                // above-threshold (mobile guesses max out at 80%) and we
                // fall through to the EmptyField placeholder.
                const leads = inlineSuggestionsFor('phones');
                if (leads.length === 0) return <EmptyField />;
                return (
                  <div className="flex flex-col gap-1.5">
                    {leads.map((lead) => (
                      <InlineAISuggestion
                        key={lead.id}
                        suggestion={lead}
                        label="Phone"
                        onAccept={() => saveEntry('phones', 'new', lead.fieldValues)}
                        onEdit={() => startEdit('phones', 'new')}
                        onIgnore={() => dismissSuggestion(lead.id, 'Phone')}
                      />
                    ))}
                  </div>
                );
              })()}
              <AddButton label="Add Phone" onClick={() => startEdit('phones', 'new')} />
              {renderHiddenSuggestionsLink('phones')}
            </>
          )}
        </SectionCard>

        {/* Websites */}
        <SectionCard icon={<Globe size={16} />} title="Websites" cardId="card-websites"
          hidden={isCardHidden('card-websites')} onHide={() => hideCard('card-websites')}
          isEditing={isEditing('websites')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          incomplete={c.entries.websites.length === 0}
          isPinned={isPinned('websites')} onTogglePin={() => togglePin('websites')}>
          {isEditing('websites') ? (
            <EntryEditForm
              section="websites" entryId={editing!.entryId} contact={c}
              fields={[
                { key: 'value', label: 'URL', required: true, validate: 'url', maxLength: 200, placeholder: 'example.com' },
                { key: 'type', label: 'Website Type', type: 'select', options: ['Primary', 'LinkedIn', 'Careers', 'Blog', 'Social', 'Other'], required: true },
              ]}
              onSave={(data) => saveEntry('websites', editing!.entryId, data)}
              onCancel={cancelEdit}
              onDelete={editing!.entryId && editing!.entryId !== 'new' ? () => setConfirmDelete({ section: 'websites', entryId: editing!.entryId! }) : undefined}
            />
          ) : (
            <>
              {c.entries.websites.map((w) => (
                <EntryRow key={w.id} type={w.type} value={w.value} isPrimary={w.primary}
                  onEdit={() => startEdit('websites', w.id)} />
              ))}
              {/* Empty-state with inline AI: when there are no websites yet
                  AND the suggestion engine has a high-confidence candidate
                  (e.g. company domain pulled from the contact's work email),
                  show a one-click "+ Add" chip right there. Avoids forcing
                  the user to click "Add Website" → switch to the AI tab to
                  discover something we already knew. */}
              {c.entries.websites.length === 0 && (() => {
                const leads = inlineSuggestionsFor('websites');
                if (leads.length === 0) return <EmptyField />;
                return (
                  <div className="flex flex-col gap-1.5">
                    {leads.map((lead) => (
                      <InlineAISuggestion
                        key={lead.id}
                        suggestion={lead}
                        label="Website"
                        onAccept={() => saveEntry('websites', 'new', lead.fieldValues)}
                        onEdit={() => startEdit('websites', 'new')}
                        onIgnore={() => dismissSuggestion(lead.id, 'Website')}
                      />
                    ))}
                  </div>
                );
              })()}
              <AddButton label="Add Website" onClick={() => startEdit('websites', 'new')} />
              {renderHiddenSuggestionsLink('websites')}
            </>
          )}
        </SectionCard>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col min-h-[100px] p-0.5 rounded-xl border-2 border-dashed border-transparent transition-all detail-column"
        style={{ gap: 'var(--detail-stack-gap, 16px)' }}
        data-column="right"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.add('drop-zone-highlight');
          // Auto-scroll
          const scrollParent = e.currentTarget.closest('.overflow-y-auto');
          if (scrollParent) {
            const rect = scrollParent.getBoundingClientRect();
            if (e.clientY < rect.top + 60) scrollParent.scrollTop -= 8;
            if (e.clientY > rect.bottom - 60) scrollParent.scrollTop += 8;
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            e.currentTarget.classList.remove('drop-zone-highlight');
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drop-zone-highlight');
          const draggedId = e.dataTransfer.getData('text/plain');
          const draggedEl = document.querySelector(`[data-card-id="${draggedId}"]`);
          if (draggedEl) {
            const cards = Array.from(e.currentTarget.querySelectorAll('.section-card'));
            const insertBefore = cards.find((card) => {
              const rect = card.getBoundingClientRect();
              return e.clientY < rect.top + rect.height / 2;
            });
            if (insertBefore) {
              e.currentTarget.insertBefore(draggedEl, insertBefore);
            } else {
              e.currentTarget.appendChild(draggedEl);
            }
            draggedEl.classList.add('card-just-dropped');
            setTimeout(() => draggedEl.classList.remove('card-just-dropped'), 300);
          }
        }}
      >
        {/* General Information — ORG ONLY. Previously also rendered for
            persons with Organization / Email / Phone / Last Updated, but
            those fields all duplicate dedicated cards (orgName moved to
            Job Title; Email + Phone live in their own multi-entry
            cards; Last Updated lives on Identity). The person variant
            existed because the legacy single-field schema (Person.email,
            Person.phone) predated the multi-entry refactor — keeping it
            in the UI just confused the completeness check and gave
            users a redundant card to maintain. For orgs, the card still
            holds Industry / Employees / HQ / Description which DO
            belong here. */}
        {isOrg && (
          <SectionCard icon={<Hash size={16} />} title="General Information" cardId="card-general"
            hidden={isCardHidden('card-general')} onHide={() => hideCard('card-general')}
            isPinned={isPinned('general')} onTogglePin={() => togglePin('general')}
            isEditing={isEditing('general')} onEdit={() => startEdit('general')} onCancel={cancelEdit}>
            {isEditing('general') ? (
              <EditForm fields={[
                { key: 'industry', label: 'Industry', value: 'industry' in c ? c.industry : '', type: 'select', options: ['Financial Services', 'Data & Analytics', 'Investment Mgmt', 'Technology', 'Healthcare', 'Insurance', 'Legal', 'Real Estate'] },
                { key: 'employees', label: 'Employees', value: 'employees' in c ? c.employees : '', type: 'select', options: ['1-10', '11-25', '25-50', '50-100', '100-250', '250-500', '500-1000', '1000+'] },
                { key: 'hq', label: 'Headquarters', value: 'hq' in c ? c.hq : '', required: true, maxLength: 120 },
                { key: 'description', label: 'Description', value: 'description' in c ? c.description : '', type: 'textarea', maxLength: 500 },
              ]} onSave={(data) => saveEntry('general', null, data)} onCancel={cancelEdit} />
            ) : (
              <>
                <FieldRow label="Industry" value={'industry' in c ? c.industry : '—'} />
                <FieldRow label="Employees" value={'employees' in c ? c.employees : '—'} />
                <FieldRow label="Headquarters" value={'hq' in c ? c.hq : '—'} />
                <FieldRow label="Description" value={'description' in c ? c.description : '—'} small />
              </>
            )}
          </SectionCard>
        )}

        {/* Industries (org) */}
        {isOrg && (
          <SectionCard icon={<Factory size={16} />} title="Industries" cardId="card-industries"
            hidden={isCardHidden('card-industries')} onHide={() => hideCard('card-industries')}
            isEditing={isEditing('industries')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
            incomplete={c.entries.industries.length === 0}
            isPinned={isPinned('industries')} onTogglePin={() => togglePin('industries')}>
            {isEditing('industries') ? (
              <EntryEditForm
                section="industries" entryId={editing!.entryId} contact={c}
                initialValues={(() => {
                  // Derive the full 4-level chain from the stored leaf code so
                  // editing pre-fills every dropdown, not just the leaf.
                  if (!editing!.entryId || editing!.entryId === 'new') return undefined;
                  const row = c.entries.industries.find((i) => i.id === editing!.entryId);
                  if (!row) return undefined;
                  const chain = getAncestors(row.code);
                  return {
                    sector: chain[0]?.code || '',
                    subsector: chain[1]?.code || '',
                    industryGroup: chain[2]?.code || '',
                    industry: chain[3]?.code || row.code,
                  };
                })()}
                fields={[
                  { key: 'sector', label: 'Sector', type: 'select', required: true,
                    options: getSectors().map((n) => ({ value: n.code, label: formatCodeLabel(n) })) },
                  { key: 'subsector', label: 'Subsector', type: 'select', required: true,
                    options: (v) => getChildren(v.sector).map((n) => ({ value: n.code, label: formatCodeLabel(n) })) },
                  { key: 'industryGroup', label: 'Industry Group', type: 'select', required: true,
                    options: (v) => getChildren(v.subsector).map((n) => ({ value: n.code, label: formatCodeLabel(n) })) },
                  { key: 'industry', label: 'Industry', type: 'select', required: true,
                    options: (v) => getChildren(v.industryGroup).map((n) => ({ value: n.code, label: formatCodeLabel(n) })) },
                ]}
                deriveFields={(changedKey, vals) => {
                  // When a parent changes, clear any child that's no longer reachable.
                  const updates: Record<string, string> = {};
                  if (changedKey === 'sector') {
                    updates.subsector = '';
                    updates.industryGroup = '';
                    updates.industry = '';
                  } else if (changedKey === 'subsector') {
                    updates.industryGroup = '';
                    updates.industry = '';
                  } else if (changedKey === 'industryGroup') {
                    updates.industry = '';
                  }
                  return updates;
                }}
                onSave={(data) => {
                  // Persist only the leaf {code, name} — everything else derives
                  // from the taxonomy on next edit.
                  const leaf = getNodeByCode(data.industry);
                  if (!leaf) return;
                  saveEntry('industries', editing!.entryId, { code: leaf.code, name: leaf.name });
                }}
                onCancel={cancelEdit}
                onDelete={editing!.entryId && editing!.entryId !== 'new' ? () => setConfirmDelete({ section: 'industries', entryId: editing!.entryId! }) : undefined}
              />
            ) : (
              <>
                <div className="flex gap-4 py-1 border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-tertiary)] uppercase">
                  <span className="w-[18px]">Primary</span>
                  <span className="min-w-[50px]">Sector</span>
                  <span className="flex-1">Industry Group</span>
                  <span className="w-6" />
                </div>
                {c.entries.industries.map((ind) => (
                  <div key={ind.id} className="flex items-center gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0">
                    {ind.primary ? <CheckCircle size={18} weight="fill" className="text-[var(--success)] flex-shrink-0" /> : <div className="w-[18px] flex-shrink-0" />}
                    <span className="text-[13px] font-bold text-[var(--text-primary)] min-w-[50px]">{ind.code}</span>
                    <span className="flex-1 text-[13px] text-[var(--text-primary)] truncate">{ind.name}</span>
                    <button onClick={() => startEdit('industries', ind.id)} className="text-[var(--brand-primary)] bg-transparent border-none cursor-pointer p-1">
                      <PencilSimple size={14} />
                    </button>
                  </div>
                ))}
                <AddButton label="Add Industry" onClick={() => startEdit('industries', 'new')} />
              </>
            )}
          </SectionCard>
        )}

        {/* Identification */}
        <SectionCard icon={<ShieldCheck size={16} />} title="Identification" cardId="card-identification"
          hidden={isCardHidden('card-identification')} onHide={() => hideCard('card-identification')}
          isEditing={isEditing('identifiers')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          incomplete={c.entries.identifiers.length === 0}
          isPinned={isPinned('identifiers')} onTogglePin={() => togglePin('identifiers')}>
          {isEditing('identifiers') ? (
            <EntryEditForm
              section="identifiers" entryId={editing!.entryId} contact={c}
              fields={[
                { key: 'type', label: 'ID Type', type: 'select',
                  options: (isOrg ? ORG_IDENTIFIER_TYPES : PERSON_IDENTIFIER_TYPES).map((t) => t.type),
                  required: true },
                { key: 'state', label: 'State', type: 'select',
                  options: US_STATES.map((s) => s.code),
                  required: true,
                  showWhen: (vals) => isStateScoped(vals.type) },
                { key: 'value',
                  label: (vals) => numberFieldLabel(vals.type),
                  type: (vals) => (isDateType(vals.type) ? 'date' : 'text'),
                  required: true,
                  maxLength: 40,
                  placeholder: (vals) => placeholderForType(vals.type, vals.state) },
                { key: 'authority', label: 'Authorizing Authority', maxLength: 80, placeholder: 'e.g. Internal Revenue Service (IRS)' },
              ]}
              deriveFields={(changedKey, vals) => {
                if (changedKey !== 'type') return {};
                const updates: Record<string, string> = {};
                // Auto-fill authority from type catalog
                const auto = authorityForType(isOrg, vals.type);
                const currentAuth = vals.authority || '';
                const allAuthorities = [...ORG_IDENTIFIER_TYPES, ...PERSON_IDENTIFIER_TYPES]
                  .map((t) => t.authority).filter(Boolean);
                const shouldOverwrite = !currentAuth || allAuthorities.includes(currentAuth);
                if (auto && shouldOverwrite) updates.authority = auto;
                // Clear stale state when the new type isn't state-scoped
                if (!isStateScoped(vals.type) && vals.state) updates.state = '';
                return updates;
              }}
              crossFieldValidate={(vals) => ({
                value: validateIdentifier(vals.type, vals.value, vals.state) || undefined,
              })}
              onSave={(data) => saveEntry('identifiers', editing!.entryId, data)}
              onCancel={cancelEdit}
              onDelete={editing!.entryId && editing!.entryId !== 'new' ? () => setConfirmDelete({ section: 'identifiers', entryId: editing!.entryId! }) : undefined}
            />
          ) : (
            <>
              <div className="flex gap-4 py-1 border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-tertiary)] uppercase">
                <span className="flex-1">Type</span>
                <span className="flex-1">Authority</span>
                <span className="w-6" />
              </div>
              {c.entries.identifiers.map((id) => (
                <div key={id.id} className="flex items-center gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{id.type}</div>
                    {id.value && <div className="text-[11px] text-[var(--text-tertiary)] truncate">{id.value}</div>}
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)] truncate">{id.authority}</span>
                  <button onClick={() => startEdit('identifiers', id.id)} className="text-[var(--brand-primary)] bg-transparent border-none cursor-pointer p-1">
                    <PencilSimple size={14} />
                  </button>
                </div>
              ))}
              <AddButton label="Add Identifier" onClick={() => startEdit('identifiers', 'new')} />
            </>
          )}
        </SectionCard>

        {/* System IDs */}
        <SectionCard icon={<Fingerprint size={16} />} title="System Identifiers" cardId="card-sysids"
          hidden={isCardHidden('card-sysids')} onHide={() => hideCard('card-sysids')}
          isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}>
          <FieldRow label="Navigator ID" value={c.id} />
          <FieldRow label="CRM Record #" value={`CRM-${c.id.replace(/[^0-9]/g, '').padStart(6, '0')}`} />
        </SectionCard>

        {/* AI Health — hidden when user has disabled stale alerts or the master AI toggle */}
        {notifications.staleAlerts && (
          <SectionCard icon={<Sparkle size={16} weight="duotone" />} title="AI Record Health" cardId="card-aihealth"
            hidden={isCardHidden('card-aihealth')} onHide={() => hideCard('card-aihealth')}
            isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}>
            <div className={`p-2.5 rounded-[var(--radius-md)] text-xs font-semibold leading-relaxed ${
              c.stale ? 'bg-[var(--warning-bg)] text-[var(--warning)]' : 'bg-[var(--success-bg)] text-[var(--success)]'
            }`}>
              {c.stale ? <><Warning size={14} className="inline mr-1" /> {c.staleReason}</> : <><CheckCircle size={14} className="inline mr-1" /> Record appears current and accurate</>}
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-2">Last AI scan: {fmtDate(c.lastUpdated)}</p>
          </SectionCard>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 w-[400px] shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Remove Entry?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)]">Cancel</button>
              <button onClick={() => deleteEntry(confirmDelete.section, confirmDelete.entryId)} className="px-4 py-2 text-sm font-bold text-white bg-[var(--danger)] rounded-[var(--radius-sm)] flex items-center gap-1">
                <Trash size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

// SectionCard + FieldRow were moved to '@/components/detail/SectionCard'
// so Sales detail pages share the same visual + edit affordances as Contacts.

/**
 * Summary bar that sits above the two-column card grid when any cards
 * are hidden. Click the chip to open a dropdown listing every hidden
 * card with a one-click "Show" action. "Show all" restores everything
 * in a single batch. Matches the HubSpot "X hidden sections" /
 * Pipedrive "Customize this view" affordance — the user always has a
 * visible path back.
 */
function HiddenCardsBar({
  hiddenIds,
  onRestore,
  onRestoreAll,
}: {
  hiddenIds: string[];
  onRestore: (cardId: string) => void;
  onRestoreAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
      >
        <Eye size={12} weight="regular" />
        {hiddenIds.length} hidden card{hiddenIds.length === 1 ? '' : 's'}
        <span className="text-[var(--text-tertiary)]">·</span>
        <span className="text-[var(--brand-primary)]">{open ? 'Hide list' : 'Show list'}</span>
      </button>
      {hiddenIds.length > 1 && (
        <button
          type="button"
          onClick={onRestoreAll}
          className="text-[11.5px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"
        >
          Show all
        </button>
      )}
      {open && (
        <div className="flex flex-wrap items-center gap-1.5">
          {hiddenIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onRestore(id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--surface-card)] text-[var(--text-secondary)] border border-dashed border-[var(--border)] cursor-pointer hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
              title={`Show “${CARD_LABELS[id] || id}”`}
            >
              <Plus size={10} weight="bold" />
              {CARD_LABELS[id] || id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryRow({ type, value, isPrimary, onEdit }: { type: string; value: string; isPrimary: boolean; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-[var(--border-subtle)] last:border-0">
      {isPrimary ? <CheckCircle size={18} weight="fill" className="text-[var(--success)] flex-shrink-0" /> : <div className="w-[18px] flex-shrink-0" />}
      <div className="flex-1">
        <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{type}</div>
        <div className="text-[13px] text-[var(--text-primary)] font-semibold whitespace-pre-wrap">{value}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-[var(--brand-primary)] bg-transparent border-none cursor-pointer p-1">
        <PencilSimple size={14} />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 pt-2 text-xs font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer">
      <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
        <Plus size={10} weight="bold" className="text-white" />
      </span>
      {label}
    </button>
  );
}

function EmptyField() {
  return null;
}

// InlineAISuggestion has been moved to '@/components/ai/InlineAISuggestion'
// so the same chip can render on both the Details tab AND the Overview
// Address card without duplicating the markup or threshold constant.

// ═══════════════════════════════════════════
// VISIBILITY & ACCESS CARD
// ═══════════════════════════════════════════

const AVAILABLE_USERS = ['Paul Wentzell', 'Janet Parker', 'Dexter Howell', 'Antonia Hopkins', 'Mercedes Paul', 'Tom Coffee'];

function VisibilityCard({ contact: c }: { contact: ContactWithEntries }) {
  const updateContact = useContactStore((s) => s.updateContact);
  const [showAddUser, setShowAddUser] = useState(false);

  const isPrivate = c.isPrivate ?? false;
  const visibleTo = c.visibleTo || [];

  const togglePrivate = () => {
    updateContact(c.id, { isPrivate: !isPrivate } as Partial<ContactWithEntries>);
    toast.info(!isPrivate ? 'Contact set to Private' : 'Contact set to Public');
  };

  const addUser = (name: string) => {
    if (!visibleTo.includes(name)) {
      updateContact(c.id, { visibleTo: [...visibleTo, name] } as Partial<ContactWithEntries>);
      toast.success(`${name} granted access`);
    }
    setShowAddUser(false);
  };

  const removeUser = (name: string) => {
    updateContact(c.id, { visibleTo: visibleTo.filter((u) => u !== name) } as Partial<ContactWithEntries>);
    toast.info(`${name} removed from access list`);
  };

  const availableToAdd = AVAILABLE_USERS.filter((u) => !visibleTo.includes(u));

  return (
    <div>
      {/* Private toggle */}
      <div className="flex items-center justify-between py-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {isPrivate ? <EyeSlash size={16} className="text-[var(--danger)]" /> : <Eye size={16} className="text-[var(--success)]" />}
          <div>
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{isPrivate ? 'Private' : 'Public'}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              {isPrivate ? 'Only visible to specified users' : 'Visible to all team members'}
            </div>
          </div>
        </div>
        <button
          onClick={togglePrivate}
          className={`relative w-10 h-5 rounded-full cursor-pointer transition-all border-none ${
            isPrivate ? 'bg-[var(--danger)]' : 'bg-[var(--border-strong)]'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            isPrivate ? 'left-[22px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* "Created by" was here previously but it's record audit metadata,
          not visibility/access metadata — the placement made it read like
          "created by [whoever set the access]" which was never the
          intent. Moved to the Identity card next to Last Updated. */}

      {/* Assigned To */}
      {c.assignedTo && (
        <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
          <span className="text-[11px] text-[var(--text-tertiary)]">Assigned to</span>
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">{c.assignedTo}</span>
        </div>
      )}

      {/* Visible To list (only when private) */}
      {isPrivate && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Visible To</span>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                <Plus size={10} weight="bold" className="text-white" />
              </span>
              Add User
            </button>
          </div>

          {visibleTo.length === 0 && (
            <p className="text-[11px] text-[var(--text-tertiary)] py-1">No users specified — only creator can view</p>
          )}

          {visibleTo.map((user) => (
            <div key={user} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[9px] font-extrabold text-white">
                  {user.split(' ').map((n) => n[0]).join('')}
                </div>
                <span className="text-[12px] text-[var(--text-primary)]">{user}</span>
              </div>
              <button
                onClick={() => removeUser(user)}
                className="text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer p-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add user dropdown */}
          {showAddUser && availableToAdd.length > 0 && (
            <div className="mt-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-1 animate-[fadeUp_0.15s_ease-out]">
              {availableToAdd.map((user) => (
                <button
                  key={user}
                  onClick={() => addUser(user)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-card)] rounded bg-transparent border-none cursor-pointer text-left"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[8px] font-extrabold text-white">
                    {user.split(' ').map((n) => n[0]).join('')}
                  </div>
                  {user}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// EDIT FORMS
// ═══════════════════════════════════════════

// ── Identifier type catalogs ───────────────────────────────────────
// Maps each identifier type to its default authority. User can still
// override the authority text after it auto-populates from the type pick.
const ORG_IDENTIFIER_TYPES: { type: string; authority: string }[] = [
  { type: 'State Business ID', authority: '' },
  { type: 'Dun & Bradstreet Number (D&B)', authority: 'Dun & Bradstreet' },
  { type: 'Federal Tax ID (EIN)', authority: 'Internal Revenue Service (IRS)' },
  { type: 'Federal Security', authority: 'Bureau of Diplomatic Security (DSS)' },
  { type: 'Federal Vendor ID (DUNS)', authority: 'System for Award Management (SAM)' },
  { type: 'Legacy', authority: '' },
  { type: 'Membership ID', authority: '' },
  { type: 'Organization ID', authority: '' },
  { type: 'Social Security Number (SSN)', authority: 'Social Security Administration (SSA)' },
  { type: 'State Organization ID', authority: '' },
  { type: 'State Vendor ID', authority: '' },
  { type: 'Taxpayer Identification Number (TIN)', authority: 'Internal Revenue Service (IRS)' },
];

const PERSON_IDENTIFIER_TYPES: { type: string; authority: string }[] = [
  { type: 'Birth Certificate', authority: '' },
  { type: "Driver's License", authority: '' },
  { type: 'Federal Security', authority: 'Bureau of Diplomatic Security (DSS)' },
  { type: 'Legacy', authority: '' },
  { type: 'Membership', authority: '' },
  { type: 'Organization', authority: '' },
  { type: 'Residence', authority: '' },
  { type: 'Security Access', authority: '' },
  { type: 'Birthday', authority: '' },
  { type: 'Passport', authority: 'US Department of State - Bureau of Consular Affairs' },
  { type: 'Military', authority: 'Department of Defense' },
  { type: 'Public Assistance', authority: 'Supplemental Nutrition Assistance Program (SNAP)' },
  { type: 'Social Security Number', authority: 'Social Security Administration (SSA)' },
  { type: 'Social Security Number (Last 4 Digits)', authority: 'Social Security Administration (SSA)' },
  { type: 'State ID Only', authority: '' },
  { type: 'Student — High School', authority: '' },
  { type: 'Student — College', authority: '' },
  { type: 'Union', authority: '' },
];

function authorityForType(isOrg: boolean, type: string): string {
  const catalog = isOrg ? ORG_IDENTIFIER_TYPES : PERSON_IDENTIFIER_TYPES;
  return catalog.find((t) => t.type === type)?.authority || '';
}

interface FieldOption { value: string; label: string }

interface FieldConfig {
  key: string;
  label: string | ((values: Record<string, string>) => string);
  value?: string;
  type?: 'text' | 'select' | 'textarea' | 'date' | ((values: Record<string, string>) => 'text' | 'select' | 'textarea' | 'date');
  options?: Array<string | FieldOption> | ((values: Record<string, string>) => Array<string | FieldOption>);
  required?: boolean;
  maxLength?: number;
  validate?: 'email' | 'phone' | 'url' | 'zip' | 'name';
  rules?: ValidationRule[];
  placeholder?: string | ((values: Record<string, string>) => string);
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal';
  autoComplete?: string;
  showWhen?: (values: Record<string, string>) => boolean;
}

function resolveOptions(f: FieldConfig, values: Record<string, string>): FieldOption[] {
  const raw = typeof f.options === 'function' ? f.options(values) : (f.options || []);
  return raw.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

function resolveLabel(f: FieldConfig, values: Record<string, string>): string {
  return typeof f.label === 'function' ? f.label(values) : f.label;
}

function resolveFieldType(f: FieldConfig, values: Record<string, string>): 'text' | 'select' | 'textarea' | 'date' | undefined {
  return typeof f.type === 'function' ? f.type(values) : f.type;
}

function buildRulesMap(fields: FieldConfig[], values: Record<string, string>): Record<string, ValidationRule[]> {
  const map: Record<string, ValidationRule[]> = {};
  fields.forEach((f) => {
    const r: ValidationRule[] = [];
    const cleanLabel = resolveLabel(f, values).replace(/\s*\(.*?\)/, '');
    if (f.required) r.push((v) => (!v.trim() ? `${cleanLabel} is required` : null));
    if (f.maxLength) r.push(maxLength(cleanLabel, f.maxLength));
    if (f.validate === 'email') r.push(isEmail());
    if (f.validate === 'phone') r.push(isPhone());
    if (f.validate === 'url') r.push(isUrl());
    if (f.validate === 'zip') {
      r.push((v) => (!v || /^\d{5}(-\d{4})?$/.test(v) ? null : 'Must be a 5- or 9-digit ZIP'));
    }
    if (f.validate === 'name') {
      r.push((v) => (!v || /^[A-Za-z\s'\-\.]+$/.test(v) ? null : 'Only letters, spaces, apostrophes, hyphens, periods'));
    }
    if (f.rules) r.push(...f.rules);
    if (r.length) map[f.key] = r;
  });
  return map;
}

function inputTypeFor(f: FieldConfig, values: Record<string, string>): string {
  if (resolveFieldType(f, values) === 'date') return 'date';
  if (f.validate === 'email') return 'email';
  if (f.validate === 'phone') return 'tel';
  if (f.validate === 'url') return 'url';
  return 'text';
}

function autoCompleteFor(f: FieldConfig): string | undefined {
  if (f.autoComplete) return f.autoComplete;
  if (f.validate === 'email') return 'email';
  if (f.validate === 'phone') return 'tel';
  return undefined;
}

function inputModeFor(f: FieldConfig): FieldConfig['inputMode'] | undefined {
  if (f.inputMode) return f.inputMode;
  if (f.validate === 'email') return 'email';
  if (f.validate === 'phone') return 'tel';
  if (f.validate === 'url') return 'url';
  return undefined;
}

function EditForm({ fields, onSave, onCancel }: { fields: FieldConfig[]; onSave: (data: Record<string, string>) => void; onCancel: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = f.value || ''; });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const rulesMap = buildRulesMap(fields, values);

  const validateKey = (key: string, val: string): string | null => {
    if (!rulesMap[key]) return null;
    return validate({ [key]: rulesMap[key] }, { [key]: val })[key] ?? null;
  };

  const handleChange = (key: string, val: string) => {
    setValues({ ...values, [key]: val });
    if (touched.has(key)) {
      setErrors((e) => ({ ...e, [key]: validateKey(key, val) ?? undefined }));
    }
  };

  const handleBlur = (key: string) => {
    setTouched((t) => new Set(t).add(key));
    setErrors((e) => ({ ...e, [key]: validateKey(key, values[key] || '') ?? undefined }));
  };

  const handleSave = () => {
    const allErrors = validate(rulesMap, values);
    setErrors(allErrors);
    setTouched(new Set(fields.map((f) => f.key)));
    if (!isValid(allErrors)) return;
    onSave(values);
  };

  const inputBorder = (key: string) =>
    errors[key]
      ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
      : 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]';

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <div className="flex flex-col gap-2.5 animate-[fieldSlideIn_0.25s_ease-out]">
      {fields.map((f) => {
        const resolvedType = resolveFieldType(f, values);
        const resolvedLabel = resolveLabel(f, values);
        return (
          <div key={f.key}>
            <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              {resolvedLabel}{f.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
            </label>
            {resolvedType === 'select' ? (
              <select value={values[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} onBlur={() => handleBlur(f.key)}
                className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}>
                <option value="">Select</option>
                {resolveOptions(f, values).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : resolvedType === 'textarea' ? (
              <textarea value={values[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} onBlur={() => handleBlur(f.key)} rows={3}
                placeholder={typeof f.placeholder === 'function' ? f.placeholder(values) : f.placeholder}
                className={`w-full px-2.5 py-2 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none resize-y`} />
            ) : (
              <input
                type={inputTypeFor(f, values)}
                inputMode={inputModeFor(f)}
                autoComplete={autoCompleteFor(f)}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onBlur={() => handleBlur(f.key)}
                placeholder={typeof f.placeholder === 'function' ? f.placeholder(values) : f.placeholder}
                className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
              />
            )}
            {errors[f.key] && (
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
                <Warning size={12} weight="fill" className="flex-shrink-0" /> {errors[f.key]}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer">
          <X size={14} /> Cancel
        </button>
        <button onClick={handleSave} disabled={hasAnyError}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] disabled:opacity-50 disabled:cursor-not-allowed">
          <FloppyDisk size={14} /> Save
        </button>
      </div>
    </div>
  );
}

function EntryEditForm({ section, entryId, contact, fields, onSave, onCancel, onDelete, deriveFields, crossFieldValidate, initialValues }: {
  section: string; entryId: string | null; contact: ContactWithEntries; fields: FieldConfig[];
  onSave: (data: Record<string, string>) => void; onCancel: () => void; onDelete?: () => void;
  deriveFields?: (changedKey: string, values: Record<string, string>) => Record<string, string>;
  crossFieldValidate?: (values: Record<string, string>) => Record<string, string | undefined>;
  initialValues?: Record<string, string>;
}) {
  // Find existing entry data to pre-populate
  const entries = contact.entries;
  const sectionMap: Record<string, string> = { addresses: 'addresses', emails: 'emails', phones: 'phones', websites: 'websites', names: 'names', identifiers: 'identifiers', industries: 'industries' };
  const key = sectionMap[section] as keyof typeof entries;
  const arr = key ? (entries[key] as unknown[]) : [];
  const existing = entryId && entryId !== 'new' ? (arr as Record<string, unknown>[]).find((e) => e.id === entryId) : null;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      if (initialValues && initialValues[f.key] !== undefined) {
        init[f.key] = initialValues[f.key];
      } else {
        init[f.key] = existing ? String(existing[f.key] || '') : (f.value || '');
      }
    });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  // Only validate fields the user can actually see — hidden `showWhen` fields
  // must not block Save with required-rule errors the user can't address.
  const visibleFields = fields.filter((f) => !f.showWhen || f.showWhen(values));
  const rulesMap = buildRulesMap(visibleFields, values);

  const validateKey = (k: string, val: string): string | null => {
    if (!rulesMap[k]) return null;
    return validate({ [k]: rulesMap[k] }, { [k]: val })[k] ?? null;
  };

  /**
   * Merge cross-field errors (e.g. "this DL doesn't match the selected state")
   * into the per-field error map. Only overrides a key when the per-field rule
   * passed — standard required/format errors still win.
   */
  const mergeCrossFieldErrors = (
    base: Record<string, string | undefined>,
    vals: Record<string, string>
  ): Record<string, string | undefined> => {
    if (!crossFieldValidate) return base;
    const cross = crossFieldValidate(vals);
    const merged = { ...base };
    Object.entries(cross).forEach(([k, msg]) => {
      if (!merged[k] && msg) merged[k] = msg;
    });
    return merged;
  };

  const handleChange = (k: string, val: string) => {
    const nextBase = { ...values, [k]: val };
    const next = deriveFields ? { ...nextBase, ...deriveFields(k, nextBase) } : nextBase;
    setValues(next);
    if (touched.has(k)) {
      setErrors((e) => {
        const updated = { ...e, [k]: validateKey(k, val) ?? undefined };
        return mergeCrossFieldErrors(updated, next);
      });
    }
  };

  const handleBlur = (k: string) => {
    setTouched((t) => new Set(t).add(k));
    setErrors((e) => {
      const updated = { ...e, [k]: validateKey(k, values[k] || '') ?? undefined };
      return mergeCrossFieldErrors(updated, values);
    });
  };

  const handleSave = () => {
    const allErrors = validate(rulesMap, values);
    const merged = mergeCrossFieldErrors(allErrors, values);
    setErrors(merged);
    setTouched(new Set(visibleFields.map((f) => f.key)));
    // Only consider errors for visible fields — a hidden `showWhen` field
    // (e.g. the State picker when type isn't state-scoped) must not block Save.
    const visibleHasError = visibleFields.some((f) => !!merged[f.key]);
    if (visibleHasError) return;
    onSave(values);
  };

  const resolvePlaceholder = (f: FieldConfig): string | undefined => {
    if (typeof f.placeholder === 'function') return f.placeholder(values);
    return f.placeholder;
  };

  const inputBorder = (k: string) =>
    errors[k]
      ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
      : 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]';

  const hasAnyError = visibleFields.some((f) => !!errors[f.key]);

  const titleMap: Record<string, string> = { addresses: 'Edit Address', emails: 'Edit Email', phones: 'Edit Phone', websites: 'Edit Website', names: 'Edit Name', identifiers: 'Edit Identifier', industries: 'Edit Industry' };

  const aiSupported = entryId === 'new' && (section === 'addresses' || section === 'emails' || section === 'phones' || section === 'websites');
  const suggestions = aiSupported ? getEntrySuggestions(section, contact) : [];
  const hasSuggestions = suggestions.length > 0;
  const [entryMode, setEntryMode] = useState<'ai' | 'own'>(hasSuggestions ? 'ai' : 'own');
  const [appliedSuggestion, setAppliedSuggestion] = useState<EntrySuggestion | null>(null);

  const applySuggestion = (s: EntrySuggestion) => {
    const next: Record<string, string> = { ...values, ...s.fieldValues };
    setValues(next);
    setTouched(new Set(Object.keys(s.fieldValues)));
    setErrors({});
    setAppliedSuggestion(s);
    toast.info(`Filled from ${s.sourceLabel}`, { description: 'Review and edit any field before saving.' });
  };

  return (
    <div className="animate-[fieldSlideIn_0.25s_ease-out]">
      <p className="text-sm font-bold text-[var(--text-primary)] mb-3">{entryId === 'new' ? titleMap[section]?.replace('Edit', 'New') : titleMap[section]}</p>
      {hasSuggestions && (
        <div className="mb-3 flex items-center gap-0.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full p-0.5 w-fit">
          <button
            type="button"
            onClick={() => { setEntryMode('ai'); }}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors ${entryMode === 'ai' ? 'bg-[var(--ai)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}
          >
            <Sparkle size={11} weight="duotone" /> AI Suggestions
          </button>
          <button
            type="button"
            onClick={() => { setEntryMode('own'); setAppliedSuggestion(null); }}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors ${entryMode === 'own' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}
          >
            <PencilSimple size={11} weight="bold" /> Enter My Own
          </button>
        </div>
      )}
      {hasSuggestions && entryMode === 'ai' && !appliedSuggestion && (
        <div className="mb-3 bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] p-2.5">
          <p className="text-[10px] text-[var(--text-secondary)] mb-2 italic">Pick a suggestion to auto-fill the form — you can still tweak any field before saving.</p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applySuggestion(s)}
                className="flex items-start gap-2 p-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer text-left hover:border-[var(--ai)] hover:shadow-sm transition-all"
              >
                <Sparkle size={14} weight="duotone" className="text-[var(--ai)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] truncate">{s.primaryLabel}</div>
                  {s.secondaryLabel && <div className="text-[10px] text-[var(--text-secondary)]">{s.secondaryLabel}</div>}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">{s.sourceLabel}</span>
                    <span className={`text-[9px] font-bold ${s.confidence >= 90 ? 'text-[var(--success)]' : s.confidence >= 75 ? 'text-[var(--brand-primary)]' : 'text-[var(--warning)]'}`}>{s.confidence}% confidence</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {hasSuggestions && entryMode === 'ai' && appliedSuggestion && (
        <div className="mb-3 bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] p-2.5 flex items-start gap-2">
          <Sparkle size={14} weight="duotone" className="text-[var(--ai)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-[var(--ai-dark)]">Filled from {appliedSuggestion.sourceLabel}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Review and edit any field below, then Save.</div>
          </div>
          <button
            type="button"
            onClick={() => setAppliedSuggestion(null)}
            className="text-[10px] font-bold text-[var(--ai)] bg-transparent border-none cursor-pointer hover:underline whitespace-nowrap"
          >
            Pick different
          </button>
        </div>
      )}
      {(!hasSuggestions || entryMode === 'own' || (entryMode === 'ai' && appliedSuggestion)) && (
      <div className="flex flex-col gap-2.5">
        {visibleFields.map((f) => {
          const resolvedType = resolveFieldType(f, values);
          const resolvedLabel = resolveLabel(f, values);
          return (
            <div key={f.key}>
              <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                {resolvedLabel}{f.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
              </label>
              {resolvedType === 'select' ? (
                <select value={values[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} onBlur={() => handleBlur(f.key)}
                  className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}>
                  <option value="">Select</option>
                  {resolveOptions(f, values).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={inputTypeFor(f, values)}
                  inputMode={inputModeFor(f)}
                  autoComplete={autoCompleteFor(f)}
                  value={values[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  onBlur={() => handleBlur(f.key)}
                  placeholder={resolvePlaceholder(f)}
                  className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
                />
              )}
              {errors[f.key] && (
                <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
                  <Warning size={12} weight="fill" className="flex-shrink-0" /> {errors[f.key]}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-between items-center pt-1">
          {onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer">
              <Trash size={14} /> Remove
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer">
              <X size={14} /> Cancel
            </button>
            <button onClick={handleSave} disabled={hasAnyError}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <FloppyDisk size={14} /> Save
            </button>
          </div>
        </div>
      </div>
      )}
      {hasSuggestions && entryMode === 'ai' && !appliedSuggestion && (
        <div className="flex justify-end pt-1">
          <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer">
            <X size={14} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
