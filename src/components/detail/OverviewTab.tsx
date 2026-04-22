'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Buildings, MapPin, MapTrifold, Factory, Plus, MagnifyingGlass, PushPin, Note as NoteIcon, CalendarBlank, Phone, ChatCircle, CaretDown, CaretRight, DotsThree, PencilSimple, Trash, X as XIcon, CheckCircle, IdentificationBadge, Hash, Globe, Briefcase, EnvelopeSimple, ShieldCheck, Funnel, Tag, UserCircle, Voicemail, ChatDots, Lightning, Storefront, FlagBanner, Handshake, MegaphoneSimple, Warning } from '@phosphor-icons/react';
import { ContactWithEntries } from '@/types/contact';
import { Note, NoteType } from '@/types/note';
import { useContactStore } from '@/stores/contact-store';
import { initials, getAvatarColor, fmtDate, uid } from '@/lib/utils';
import InlineNoteEditor from '@/components/activity/InlineNoteEditor';
import ActivityLog, { getLogAuthors, getLogFields } from '@/components/activity/ActivityLog';
import { AddRelationshipDialog } from '@/components/contact-flow/AddRelationshipDialog';
import { RELATIONSHIP_META, RelationshipKind, bidirectionalKindsFor } from '@/types/relationship';
import { ArrowSquareOut, LinkSimple } from '@phosphor-icons/react';
import { ActivityLogCategory } from '@/types/activity-log';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useGeocode } from '@/lib/geocoding/useGeocode';

const LOG_CATEGORIES: { id: ActivityLogCategory; label: string }[] = [
  { id: 'field', label: 'Field Changes' },
  { id: 'entry', label: 'Entries' },
  { id: 'relationship', label: 'Relationships' },
  { id: 'status', label: 'Status' },
  { id: 'note', label: 'Notes' },
];

interface OverviewTabProps {
  contact: ContactWithEntries;
}

export default function OverviewTab({ contact: c }: OverviewTabProps) {
  const router = useRouter();
  const contacts = useContactStore((s) => s.contacts);
  const notes = useContactStore((s) => s.notes);
  const allRelationships = useContactStore((s) => s.relationships);
  const deleteRelationship = useContactStore((s) => s.deleteRelationship);
  const updateRelationship = useContactStore((s) => s.updateRelationship);
  const addNote = useContactStore((s) => s.addNote);
  const updateNote = useContactStore((s) => s.updateNote);
  const deleteNote = useContactStore((s) => s.deleteNote);
  const togglePinNote = useContactStore((s) => s.togglePinNote);
  const updateContact = useContactStore((s) => s.updateContact);

  // Relationships state
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  const [openRelMenuId, setOpenRelMenuId] = useState<string | null>(null);
  const [confirmDeleteRel, setConfirmDeleteRel] = useState<string | null>(null);
  const [editingRel, setEditingRel] = useState<{ relId: string; otherContact: ContactWithEntries; currentKind: RelationshipKind } | null>(null);

  const isOrg = c.type === 'org';
  const people = isOrg ? contacts.filter((p) => p.type === 'person' && 'orgId' in p && p.orgId === c.id) : [];
  const org = !isOrg && 'orgId' in c && c.orgId ? contacts.find((o) => o.id === c.orgId) : null;

  const primaryAddr = c.entries.addresses.find((a) => a.primary) || c.entries.addresses[0] || null;
  const fullAddress = primaryAddr
    ? [primaryAddr.value, primaryAddr.city, primaryAddr.state, primaryAddr.zip].filter(Boolean).join(', ')
    : null;
  const coords = useGeocode(fullAddress);
  const primaryIndustry = isOrg && 'entries' in c
    ? c.entries.industries.find((i) => i.primary) || c.entries.industries[0] || null
    : null;

  // Relationships involving this contact (resolved with the other contact + inverse flag)
  const resolvedRels = useMemo(() => {
    const list = allRelationships.filter((r) => r.fromContactId === c.id || r.toContactId === c.id);
    return list
      .map((rel) => {
        const isInverse = rel.toContactId === c.id;
        const otherId = isInverse ? rel.fromContactId : rel.toContactId;
        const otherContact = contacts.find((x) => x.id === otherId);
        if (!otherContact) return null;
        return { rel, otherContact, isInverse };
      })
      .filter((x): x is { rel: typeof allRelationships[number]; otherContact: ContactWithEntries; isInverse: boolean } => x !== null);
  }, [allRelationships, c.id, contacts]);

  // Build relationships as a tree: orgs with employees nested underneath
  interface RelTreeNode { rel: typeof allRelationships[number]; otherContact: ContactWithEntries; isInverse: boolean; label: string; children: RelTreeNode[]; }
  const relationshipTree = useMemo<RelTreeNode[]>(() => {
    const orgRels = resolvedRels.filter((r) => r.otherContact.type === 'org');
    const personRels = resolvedRels.filter((r) => r.otherContact.type === 'person');

    const tree: RelTreeNode[] = [];
    const placedPersonIds = new Set<string>();

    for (const orgR of orgRels) {
      const meta = RELATIONSHIP_META[orgR.rel.kind];
      const label = orgR.isInverse ? meta.inverseLabel : meta.label;
      const childPeople: RelTreeNode[] = [];
      // People from current contact's relationships who are also employees of this org
      for (const personR of personRels) {
        const personIsAtThisOrg = allRelationships.some((rr) =>
          rr.kind === 'employee-of' && rr.fromContactId === personR.otherContact.id && rr.toContactId === orgR.otherContact.id
        );
        if (personIsAtThisOrg) {
          const pmeta = RELATIONSHIP_META[personR.rel.kind];
          const plabel = personR.isInverse ? pmeta.inverseLabel : pmeta.label;
          childPeople.push({ rel: personR.rel, otherContact: personR.otherContact, isInverse: personR.isInverse, label: plabel, children: [] });
          placedPersonIds.add(personR.otherContact.id);
        }
      }
      tree.push({ rel: orgR.rel, otherContact: orgR.otherContact, isInverse: orgR.isInverse, label, children: childPeople });
    }

    // People not under any org
    for (const personR of personRels) {
      if (placedPersonIds.has(personR.otherContact.id)) continue;
      const pmeta = RELATIONSHIP_META[personR.rel.kind];
      const plabel = personR.isInverse ? pmeta.inverseLabel : pmeta.label;
      tree.push({ rel: personR.rel, otherContact: personR.otherContact, isInverse: personR.isInverse, label: plabel, children: [] });
    }

    return tree;
  }, [resolvedRels, allRelationships]);

  const [collapsedOrgs, setCollapsedOrgs] = useState<Set<string>>(new Set());
  const toggleOrgCollapsed = (id: string) => {
    setCollapsedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  // Root collapse state for the current contact node
  const [rootCollapsed, setRootCollapsed] = useState(false);

  // Notes for this contact + related people
  const relatedIds = people.map((p) => p.id);
  const contactNotes = useMemo(() => {
    const allIds = [c.id, ...relatedIds];
    return notes.filter((n) => allIds.includes(n.contactId));
  }, [notes, c.id, relatedIds]);

  const [activityTab, setActivityTab] = useState<'notes' | 'log'>('notes');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteEditor, setNoteEditor] = useState<{ open: boolean; mode: 'add' | 'edit'; note?: Note }>({ open: false, mode: 'add' });
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter state
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<NoteType[]>([]);
  const [filterAuthors, setFilterAuthors] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);

  // Activity Log filter state
  const [logSearch, setLogSearch] = useState('');
  const [logCategories, setLogCategories] = useState<ActivityLogCategory[]>([]);
  const [logFields, setLogFields] = useState<string[]>([]);
  const [logAuthors, setLogAuthors] = useState<string[]>([]);
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logActiveDropdown, setLogActiveDropdown] = useState<string | null>(null);

  const ALL_LOG_CHIPS = ['event_type', 'field_type', 'log_date', 'log_daterange', 'log_author'] as const;
  const [visibleLogChips, setVisibleLogChips] = useState<string[]>([...ALL_LOG_CHIPS]);
  const hiddenLogChips = ALL_LOG_CHIPS.filter((c) => !visibleLogChips.includes(c));
  const [showAddLogFilterMenu, setShowAddLogFilterMenu] = useState(false);

  const logChipLabel = (id: string) => {
    if (id === 'event_type') return 'Event Type';
    if (id === 'field_type') return 'Field';
    if (id === 'log_date') return 'Created Date';
    if (id === 'log_daterange') return 'Date Range';
    if (id === 'log_author') return 'Author';
    return id;
  };

  const hideLogChip = (id: string) => {
    setVisibleLogChips((prev) => prev.filter((c) => c !== id));
    setLogActiveDropdown(null);
    if (id === 'event_type') setLogCategories([]);
    if (id === 'field_type') setLogFields([]);
    if (id === 'log_date') setLogDateFrom('');
    if (id === 'log_daterange') { setLogDateFrom(''); setLogDateTo(''); }
    if (id === 'log_author') setLogAuthors([]);
  };

  const showLogChip = (id: string) => {
    setVisibleLogChips((prev) => [...prev, id]);
    setShowAddLogFilterMenu(false);
  };

  const uniqueLogAuthors = useMemo(() => getLogAuthors(c.id, people.map((p) => p.id)), [c.id, people]);
  const uniqueLogFields = useMemo(() => getLogFields(c.id, people.map((p) => p.id)), [c.id, people]);

  const hasActiveLogFilters = logCategories.length > 0 || logFields.length > 0 || logAuthors.length > 0 || logDateFrom || logDateTo;

  // Track which filter chips are visible in the bar
  const ALL_FILTER_CHIPS = ['tags', 'date', 'daterange', 'type', 'author'] as const;
  const [visibleChips, setVisibleChips] = useState<string[]>([...ALL_FILTER_CHIPS]);
  const hiddenChips = ALL_FILTER_CHIPS.filter((c) => !visibleChips.includes(c));
  const [showAddFilterMenu, setShowAddFilterMenu] = useState(false);

  const chipLabel = (id: string) => {
    if (id === 'tags') return 'Tags';
    if (id === 'date') return 'Created Date';
    if (id === 'daterange') return 'Date Range';
    if (id === 'type') return 'Type';
    if (id === 'author') return 'Author';
    return id;
  };

  const hideChip = (id: string) => {
    setVisibleChips((prev) => prev.filter((c) => c !== id));
    setActiveFilterDropdown(null);
    // Clear the filter when hiding
    if (id === 'tags') setFilterTags([]);
    if (id === 'date') setFilterDateFrom('');
    if (id === 'daterange') { setFilterDateFrom(''); setFilterDateTo(''); }
    if (id === 'type') setFilterTypes([]);
    if (id === 'author') setFilterAuthors([]);
  };

  const showChip = (id: string) => {
    setVisibleChips((prev) => [...prev, id]);
    setShowAddFilterMenu(false);
  };

  // Derive unique authors from notes
  const uniqueAuthors = useMemo(() => {
    const map = new Map<string, { name: string; initials: string; color: string }>();
    contactNotes.forEach((n) => {
      if (!map.has(n.author)) map.set(n.author, { name: n.author, initials: n.authorInitials, color: n.authorColor });
    });
    return Array.from(map.values());
  }, [contactNotes]);

  // Strip HTML for text search
  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

  const hasActiveFilters = filterTags.length > 0 || filterTypes.length > 0 || filterAuthors.length > 0 || filterDateFrom || filterDateTo;

  const filteredNotes = useMemo(() => {
    let result = contactNotes;

    // Text search (3+ chars)
    if (noteSearch && noteSearch.length >= 3) {
      const q = noteSearch.toLowerCase();
      result = result.filter((n) => stripHtml(n.body).toLowerCase().includes(q) || n.author.toLowerCase().includes(q));
    }

    // Tag filter
    if (filterTags.length > 0) {
      result = result.filter((n) => filterTags.some((t) => (n.tags || []).includes(t as any)));
    }

    // Type filter
    if (filterTypes.length > 0) {
      result = result.filter((n) => n.noteType && filterTypes.includes(n.noteType));
    }

    // Author filter
    if (filterAuthors.length > 0) {
      result = result.filter((n) => filterAuthors.includes(n.author));
    }

    // Date range filter (parse createdAt string)
    if (filterDateFrom || filterDateTo) {
      result = result.filter((n) => {
        const d = new Date(n.createdAt);
        if (isNaN(d.getTime())) return true; // keep notes with unparseable dates
        if (filterDateFrom && d < new Date(filterDateFrom)) return false;
        if (filterDateTo) {
          const to = new Date(filterDateTo);
          to.setHours(23, 59, 59);
          if (d > to) return false;
        }
        return true;
      });
    }

    return result;
  }, [contactNotes, noteSearch, filterTags, filterTypes, filterAuthors, filterDateFrom, filterDateTo]);

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const regularNotes = filteredNotes.filter((n) => !n.pinned);

  const clearAllFilters = () => {
    setFilterTags([]);
    setFilterTypes([]);
    setFilterAuthors([]);
    setFilterDateFrom('');
    setFilterDateTo('');
    setNoteSearch('');
  };

  const handleSaveNote = (html: string, plainText: string) => {
    if (noteEditor.mode === 'add') {
      addNote({
        id: uid('note'),
        contactId: c.id,
        author: 'Paul Wentzell',
        authorInitials: 'PW',
        authorColor: '#1955A6',
        location: 'Admin',
        body: html,
        pinned: false,
        tags: [],
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
      });
    } else if (noteEditor.note) {
      updateNote(noteEditor.note.id, { body: html });
    }
    setNoteEditor({ open: false, mode: 'add' });
  };

  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-4">
        {/* Org Summary — includes hierarchy + all relationships */}
        <Card icon={<Buildings size={16} />} title="Org Summary" action={
          <button
            onClick={() => setShowAddRelationship(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
          >
            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
              <Plus size={10} weight="bold" className="text-white" />
            </span>
            Add Relationship
          </button>
        }>
          {/* Current contact node with root caret to collapse the entire tree */}
          <OrgNode
            name={c.name}
            role={isOrg ? 'industry' in c && c.industry ? c.industry : 'Company' : 'title' in c && c.title ? c.title : 'Contact'}
            color={getAvatarColor(c.id, c.avatarColor)}
            isSquare={isOrg}
            isActive
            hasCaret={relationshipTree.length > 0}
            isCollapsed={rootCollapsed}
            onToggleCaret={relationshipTree.length > 0 ? () => setRootCollapsed(!rootCollapsed) : undefined}
          />

          {/* Relationships as a tree — orgs with children indented, caret to expand/collapse */}
          {!rootCollapsed && (
            <div className="ml-5">
              {relationshipTree.map((node) => (
                <RelationshipTreeNode
                  key={node.rel.id}
                  node={node}
                  depth={0}
                  collapsed={collapsedOrgs}
                  onToggleCollapsed={toggleOrgCollapsed}
                  openMenuId={openRelMenuId}
                  onToggleMenu={(id) => setOpenRelMenuId(openRelMenuId === id ? null : id)}
                  onOpen={(otherId) => { router.push(`/contacts/${otherId}`); setOpenRelMenuId(null); }}
                  onRemove={(relId) => { setConfirmDeleteRel(relId); setOpenRelMenuId(null); }}
                  onEdit={(relId) => {
                    const r = allRelationships.find((x) => x.id === relId);
                    if (!r) return;
                    const otherId = r.fromContactId === c.id ? r.toContactId : r.fromContactId;
                    const other = contacts.find((x) => x.id === otherId);
                    if (!other) return;
                    setEditingRel({ relId, otherContact: other, currentKind: r.kind });
                    setOpenRelMenuId(null);
                  }}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Add Relationship Dialog */}
        <AddRelationshipDialog
          open={showAddRelationship}
          fromContact={c}
          onClose={() => setShowAddRelationship(false)}
        />

        {/* Confirm remove relationship */}
        <ConfirmDialog
          open={!!confirmDeleteRel}
          title="Remove Relationship"
          message={<>Remove this relationship? This won&apos;t delete either contact, just the link between them.</>}
          confirmLabel="Remove"
          confirmVariant="danger"
          onConfirm={() => { if (confirmDeleteRel) { deleteRelationship(confirmDeleteRel); setConfirmDeleteRel(null); } }}
          onCancel={() => setConfirmDeleteRel(null)}
        />

        {/* Edit relationship type */}
        {editingRel && (
          <EditRelationshipTypeDialog
            currentContact={c}
            otherContact={editingRel.otherContact}
            currentKind={editingRel.currentKind}
            onCancel={() => setEditingRel(null)}
            onSave={(newKind, flipDirection) => {
              const updates: { kind: RelationshipKind; fromContactId?: string; toContactId?: string } = { kind: newKind };
              if (flipDirection) {
                updates.fromContactId = editingRel.otherContact.id;
                updates.toContactId = c.id;
              } else {
                updates.fromContactId = c.id;
                updates.toContactId = editingRel.otherContact.id;
              }
              updateRelationship(editingRel.relId, updates);
              setEditingRel(null);
            }}
          />
        )}

        {/* Address */}
        <Card icon={<MapPin size={16} />} title="Address" incomplete={!primaryAddr}>
          {primaryAddr ? (
            <>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-1">{primaryAddr.type || 'Mailing'}</p>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                {primaryAddr.value}<br />
                {primaryAddr.city}, {primaryAddr.state} {primaryAddr.zip}
              </p>
            </>
          ) : (
            <p className="text-[12px] text-[var(--text-tertiary)] italic">No address on file</p>
          )}
        </Card>

        {/* Map */}
        <Card icon={<MapTrifold size={16} />} title="Map" incomplete={!primaryAddr}>
          <div className="h-[180px] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center">
            {!primaryAddr && (
              <span className="text-[11px] text-[var(--text-tertiary)]">Add an address to show a map</span>
            )}
            {primaryAddr && coords === undefined && (
              <span className="text-[11px] text-[var(--text-tertiary)]">Locating…</span>
            )}
            {primaryAddr && coords === null && (
              <span className="text-[11px] text-[var(--text-tertiary)]">Map unavailable for this address</span>
            )}
            {primaryAddr && coords && (
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${(coords.lng - 0.01).toFixed(6)}%2C${(coords.lat - 0.005).toFixed(6)}%2C${(coords.lng + 0.01).toFixed(6)}%2C${(coords.lat + 0.005).toFixed(6)}&layer=mapnik&marker=${coords.lat.toFixed(6)}%2C${coords.lng.toFixed(6)}`}
                className="block"
              />
            )}
          </div>
          {primaryAddr && coords && (
            <div className="flex justify-between items-center mt-2.5">
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)]">GPS Coordinates</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Lat: <strong>{coords.lat.toFixed(6)}</strong> · Lng: <strong>{coords.lng.toFixed(6)}</strong></p>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)]"
              >
                Copy
              </button>
            </div>
          )}
        </Card>

        {isOrg && (
          <Card icon={<Factory size={16} />} title="Industries" incomplete={!primaryIndustry}>
            {primaryIndustry ? (
              <p className="text-[13px] text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">{primaryIndustry.code}</strong> · {primaryIndustry.name}
              </p>
            ) : (
              <p className="text-[12px] text-[var(--text-tertiary)] italic">No industry set</p>
            )}
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN — Activity */}
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl min-h-[400px] sticky top-0 flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <div className="p-4 border-b border-[var(--border)] flex-shrink-0 bg-[var(--surface-card)] rounded-t-xl z-10">
          <div className="flex items-center gap-2 mb-3">
            <CalendarBlank size={18} className="text-[var(--text-primary)]" />
            <span className="text-[15px] font-bold text-[var(--text-primary)]">Activity</span>
          </div>
          <div className="flex gap-4 mb-3">
            <button
              onClick={() => setActivityTab('notes')}
              className={`text-[13px] font-bold pb-1 bg-transparent border-x-0 border-t-0 cursor-pointer ${
                activityTab === 'notes'
                  ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]'
                  : 'text-[var(--text-tertiary)] border-b-2 border-transparent'
              }`}
            >Notes</button>
            <button
              onClick={() => setActivityTab('log')}
              className={`text-[13px] font-bold pb-1 bg-transparent border-x-0 border-t-0 cursor-pointer ${
                activityTab === 'log'
                  ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]'
                  : 'text-[var(--text-tertiary)] border-b-2 border-transparent'
              }`}
            >Activity Log</button>
          </div>
          {activityTab === 'notes' && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setNoteEditor({ open: true, mode: 'add' })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)] bg-transparent border border-[var(--border)] rounded-[var(--radius-md)] cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                <Plus size={10} weight="bold" className="text-white" />
              </span>
              Add Note
            </button>
            <div className="flex-1 relative">
              <MagnifyingGlass size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Filter by text"
                className="w-full h-8 pl-7 pr-3 text-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>
          )}

          {activityTab === 'notes' && <>
          {/* Filter Chips Row */}
          <div className="flex gap-2 items-center mt-3 flex-wrap">
            {visibleChips.includes('tags') && (
              <FilterChip
                label="Tags"
                count={filterTags.length}
                isOpen={activeFilterDropdown === 'tags'}
                onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'tags' ? null : 'tags')}
                onHide={() => hideChip('tags')}
              >
                <FilterDropdown onClose={() => setActiveFilterDropdown(null)}>
                  <TagsFilterContent
                    selectedTags={filterTags}
                    onToggleTag={(tag) => setFilterTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    onClear={() => setFilterTags([])}
                    onApply={() => setActiveFilterDropdown(null)}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleChips.includes('date') && (
              <FilterChip
                label="Created Date"
                count={filterDateFrom ? 1 : 0}
                isOpen={activeFilterDropdown === 'date'}
                onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'date' ? null : 'date')}
                onHide={() => hideChip('date')}
              >
                <FilterDropdown onClose={() => setActiveFilterDropdown(null)}>
                  <DateFilterContent
                    label="Created Date"
                    value={filterDateFrom}
                    onChange={setFilterDateFrom}
                    onClear={() => { setFilterDateFrom(''); setActiveFilterDropdown(null); }}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleChips.includes('daterange') && (
              <FilterChip
                label="Date Range"
                count={filterDateFrom && filterDateTo ? 1 : 0}
                isOpen={activeFilterDropdown === 'daterange'}
                onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'daterange' ? null : 'daterange')}
                onHide={() => hideChip('daterange')}
              >
                <FilterDropdown onClose={() => setActiveFilterDropdown(null)}>
                  <DateRangeFilterContent
                    dateFrom={filterDateFrom} dateTo={filterDateTo}
                    onDateFromChange={setFilterDateFrom} onDateToChange={setFilterDateTo}
                    onClear={() => { setFilterDateFrom(''); setFilterDateTo(''); setActiveFilterDropdown(null); }}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleChips.includes('type') && (
              <FilterChip
                label="Type"
                count={filterTypes.length}
                isOpen={activeFilterDropdown === 'type'}
                onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'type' ? null : 'type')}
                onHide={() => hideChip('type')}
              >
                <FilterDropdown onClose={() => setActiveFilterDropdown(null)}>
                  <TypeFilterContent
                    selectedTypes={filterTypes}
                    onToggleType={(t) => setFilterTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                    onClear={() => setFilterTypes([])}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleChips.includes('author') && (
              <FilterChip
                label="Author"
                count={filterAuthors.length}
                isOpen={activeFilterDropdown === 'author'}
                onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'author' ? null : 'author')}
                onHide={() => hideChip('author')}
              >
                <FilterDropdown onClose={() => setActiveFilterDropdown(null)}>
                  <AuthorFilterContent
                    authors={uniqueAuthors}
                    selectedAuthors={filterAuthors}
                    onToggleAuthor={(a) => setFilterAuthors((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}
                    onClear={() => setFilterAuthors([])}
                    onApply={() => setActiveFilterDropdown(null)}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {/* + Add Filter — shows hidden chips */}
            <AddFilterMenu
              isOpen={showAddFilterMenu}
              onToggle={() => setShowAddFilterMenu(!showAddFilterMenu)}
              onClose={() => setShowAddFilterMenu(false)}
              hiddenChips={hiddenChips}
              chipLabel={chipLabel}
              onShowChip={showChip}
            />
          </div>
          </>}

          {/* Activity Log search + filters */}
          {activityTab === 'log' && <>
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <MagnifyingGlass size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search activity"
                className="w-full h-8 pl-7 pr-3 text-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>

          {/* Log Filter Chips */}
          <div className="flex gap-2 items-center mt-3 flex-wrap">
            {visibleLogChips.includes('event_type') && (
              <FilterChip
                label="Event Type"
                count={logCategories.length}
                isOpen={logActiveDropdown === 'event_type'}
                onToggle={() => setLogActiveDropdown(logActiveDropdown === 'event_type' ? null : 'event_type')}
                onHide={() => hideLogChip('event_type')}
              >
                <FilterDropdown onClose={() => setLogActiveDropdown(null)}>
                  <EventTypeFilterContent
                    selectedCategories={logCategories}
                    onToggle={(cat) => setLogCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])}
                    onClear={() => setLogCategories([])}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleLogChips.includes('field_type') && (
              <FilterChip
                label="Field"
                count={logFields.length}
                isOpen={logActiveDropdown === 'field_type'}
                onToggle={() => setLogActiveDropdown(logActiveDropdown === 'field_type' ? null : 'field_type')}
                onHide={() => hideLogChip('field_type')}
              >
                <FilterDropdown onClose={() => setLogActiveDropdown(null)}>
                  <FieldTypeFilterContent
                    fields={uniqueLogFields}
                    selectedFields={logFields}
                    onToggle={(f) => setLogFields((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])}
                    onClear={() => setLogFields([])}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleLogChips.includes('log_date') && (
              <FilterChip
                label="Created Date"
                count={logDateFrom ? 1 : 0}
                isOpen={logActiveDropdown === 'log_date'}
                onToggle={() => setLogActiveDropdown(logActiveDropdown === 'log_date' ? null : 'log_date')}
                onHide={() => hideLogChip('log_date')}
              >
                <FilterDropdown onClose={() => setLogActiveDropdown(null)}>
                  <DateFilterContent
                    label="Created Date"
                    value={logDateFrom}
                    onChange={setLogDateFrom}
                    onClear={() => { setLogDateFrom(''); setLogActiveDropdown(null); }}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleLogChips.includes('log_daterange') && (
              <FilterChip
                label="Date Range"
                count={logDateFrom && logDateTo ? 1 : 0}
                isOpen={logActiveDropdown === 'log_daterange'}
                onToggle={() => setLogActiveDropdown(logActiveDropdown === 'log_daterange' ? null : 'log_daterange')}
                onHide={() => hideLogChip('log_daterange')}
              >
                <FilterDropdown onClose={() => setLogActiveDropdown(null)}>
                  <DateRangeFilterContent
                    dateFrom={logDateFrom} dateTo={logDateTo}
                    onDateFromChange={setLogDateFrom} onDateToChange={setLogDateTo}
                    onClear={() => { setLogDateFrom(''); setLogDateTo(''); setLogActiveDropdown(null); }}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            {visibleLogChips.includes('log_author') && (
              <FilterChip
                label="Author"
                count={logAuthors.length}
                isOpen={logActiveDropdown === 'log_author'}
                onToggle={() => setLogActiveDropdown(logActiveDropdown === 'log_author' ? null : 'log_author')}
                onHide={() => hideLogChip('log_author')}
              >
                <FilterDropdown onClose={() => setLogActiveDropdown(null)}>
                  <AuthorFilterContent
                    authors={uniqueLogAuthors}
                    selectedAuthors={logAuthors}
                    onToggleAuthor={(a) => setLogAuthors((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}
                    onClear={() => setLogAuthors([])}
                    onApply={() => setLogActiveDropdown(null)}
                  />
                </FilterDropdown>
              </FilterChip>
            )}

            <AddFilterMenu
              isOpen={showAddLogFilterMenu}
              onToggle={() => setShowAddLogFilterMenu(!showAddLogFilterMenu)}
              onClose={() => setShowAddLogFilterMenu(false)}
              hiddenChips={hiddenLogChips}
              chipLabel={logChipLabel}
              onShowChip={showLogChip}
            />
          </div>
          </>}
        </div>

        {/* Tab Content */}
        {activityTab === 'notes' ? (
        <div className="flex-1 overflow-y-auto">
        {/* Inline Note Editor */}
        {noteEditor.open && (
          <InlineNoteEditor
            mode={noteEditor.mode}
            initialContent={noteEditor.note?.body || ''}
            authorName={noteEditor.note?.author}
            authorInitials={noteEditor.note?.authorInitials}
            authorColor={noteEditor.note?.authorColor}
            createdAt={noteEditor.note?.createdAt}
            onSave={handleSaveNote}
            onCancel={() => setNoteEditor({ open: false, mode: 'add' })}
            onDelete={noteEditor.note ? () => { setDeleteTarget(noteEditor.note!); setNoteEditor({ open: false, mode: 'add' }); } : undefined}
          />
        )}

        {pinnedNotes.length > 0 && (
          <>
            <div className="px-4 pt-2">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1"><PushPin size={14} /> Pinned</span>
            </div>
            {pinnedNotes.map((n) => (
              <NoteCard key={n.id} note={n}
                menuOpen={openMenuId === n.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === n.id ? null : n.id)}
                onEdit={() => { setNoteEditor({ open: true, mode: 'edit', note: n }); setOpenMenuId(null); }}
                onDelete={() => { setDeleteTarget(n); setOpenMenuId(null); }}
                onTogglePin={() => { togglePinNote(n.id); setOpenMenuId(null); }}
                searchQuery={noteSearch}
              />
            ))}
          </>
        )}

        {/* Regular Notes */}
        {regularNotes.length > 0 && (
          <>
            <div className="px-4 pt-2">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1"><NoteIcon size={14} /> Notes</span>
            </div>
            {regularNotes.map((n) => (
              <NoteCard key={n.id} note={n}
                menuOpen={openMenuId === n.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === n.id ? null : n.id)}
                onEdit={() => { setNoteEditor({ open: true, mode: 'edit', note: n }); setOpenMenuId(null); }}
                onDelete={() => { setDeleteTarget(n); setOpenMenuId(null); }}
                onTogglePin={() => { togglePinNote(n.id); setOpenMenuId(null); }}
                searchQuery={noteSearch}
              />
            ))}
          </>
        )}

        {filteredNotes.length === 0 && (
          <div className="p-10 text-center text-[var(--text-tertiary)]">
            <NoteIcon size={32} className="mx-auto mb-2" />
            <p className="font-semibold">{hasActiveFilters || noteSearch ? 'No matching notes' : 'No notes yet'}</p>
            {(hasActiveFilters || noteSearch) && (
              <button onClick={clearAllFilters} className="mt-2 text-xs font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer">
                Clear filters
              </button>
            )}
          </div>
        )}
        </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ActivityLog
              contactId={c.id}
              relatedIds={people.map((p) => p.id)}
              search={logSearch}
              categoryFilter={logCategories}
              fieldFilter={logFields}
              authorFilter={logAuthors}
              dateFrom={logDateFrom}
              dateTo={logDateTo}
            />
          </div>
        )}
      </div>

      {/* Note Editor Modal removed — editor is now inline inside the Activity card */}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Note"
        message={deleteTarget ? <>Are you sure you want to delete this note by <strong>{deleteTarget.author}</strong>?</> : ''}
        confirmLabel="Delete Note"
        onConfirm={() => { if (deleteTarget) { deleteNote(deleteTarget.id); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Helper Components ──

function Card({ icon, title, action, incomplete, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; incomplete?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          {icon} {title}
          {incomplete && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
              <Warning size={11} /> Incomplete
            </span>
          )}
        </span>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function OrgNode({ name, role, color, isSquare, isActive, onClick, menuOpen, onToggleMenu, onOpen, onRemove, onEdit, hasCaret, isCollapsed, onToggleCaret }: {
  name: string; role: string; color: string;
  isSquare?: boolean; isActive?: boolean;
  onClick?: () => void;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onOpen?: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
  hasCaret?: boolean;
  isCollapsed?: boolean;
  onToggleCaret?: () => void;
}) {
  const showMenu = !!onToggleMenu;
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-md)] my-0.5 relative ${isActive ? 'bg-[var(--brand-bg)] border border-[var(--brand-primary)]' : 'hover:bg-[var(--surface-raised)]'}`}
    >
      {/* Caret slot — always shown for orgs (interactive only if has children) */}
      {hasCaret !== undefined && (
        hasCaret ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCaret?.(); }}
            disabled={!onToggleCaret}
            className={`w-4 h-4 flex items-center justify-center bg-transparent border-none p-0 ${onToggleCaret ? 'cursor-pointer text-[var(--text-secondary)] hover:text-[var(--brand-primary)]' : 'cursor-default text-[var(--border-strong)]'}`}
            aria-label={onToggleCaret ? (isCollapsed ? 'Expand' : 'Collapse') : 'No connections'}
            title={onToggleCaret ? '' : 'No other connections at this org'}
          >
            {isCollapsed ? <CaretRight size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
          </button>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )
      )}

      <div
        onClick={onClick}
        className={`flex items-center gap-2.5 flex-1 min-w-0 ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="w-7 h-7 flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
          style={{ background: color, borderRadius: isSquare ? '6px' : 'var(--radius-full)' }}>
          {initials(name)}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{name}</div>
          <div className="text-[11px] text-[var(--brand-primary)] font-semibold truncate">{role}</div>
        </div>
      </div>

      {showMenu && (
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMenu?.(); }}
            aria-label="Relationship actions"
            className="text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-1 hover:text-[var(--brand-primary)] transition-colors flex items-center justify-center"
          >
            <DotsThree size={18} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[60] w-36 py-1 animate-[fadeUp_0.15s_ease-out]">
              {onOpen && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left"
                >
                  <ArrowSquareOut size={12} /> Open contact
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left"
                >
                  <PencilSimple size={12} /> Edit type
                </button>
              )}
              {onRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer text-left"
                >
                  <Trash size={12} /> Remove
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RelTreeNodeData { rel: { id: string }; otherContact: ContactWithEntries; isInverse: boolean; label: string; children: RelTreeNodeData[]; }

function RelationshipTreeNode({ node, depth, collapsed, onToggleCollapsed, openMenuId, onToggleMenu, onOpen, onRemove, onEdit }: {
  node: RelTreeNodeData;
  depth: number;
  collapsed: Set<string>;
  onToggleCollapsed: (id: string) => void;
  openMenuId: string | null;
  onToggleMenu: (id: string) => void;
  onOpen: (id: string) => void;
  onRemove: (relId: string) => void;
  onEdit: (relId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.otherContact.id);
  const router = useRouter();
  return (
    <>
      <div style={{ paddingLeft: `${depth * 16}px` }}>
        <OrgNode
          name={node.otherContact.name}
          role={node.label}
          color={getAvatarColor(node.otherContact.id, node.otherContact.avatarColor)}
          isSquare={node.otherContact.type === 'org'}
          onClick={() => router.push(`/contacts/${node.otherContact.id}`)}
          hasCaret={node.otherContact.type === 'org'}
          isCollapsed={isCollapsed}
          onToggleCaret={hasChildren ? () => onToggleCollapsed(node.otherContact.id) : undefined}
          menuOpen={openMenuId === node.rel.id}
          onToggleMenu={() => onToggleMenu(node.rel.id)}
          onOpen={() => onOpen(node.otherContact.id)}
          onRemove={() => onRemove(node.rel.id)}
          onEdit={() => onEdit(node.rel.id)}
        />
      </div>
      {hasChildren && !isCollapsed && (
        <>
          {node.children.map((child) => (
            <RelationshipTreeNode
              key={child.rel.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggleCollapsed={onToggleCollapsed}
              openMenuId={openMenuId}
              onToggleMenu={onToggleMenu}
              onOpen={onOpen}
              onRemove={onRemove}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </>
  );
}

// ── Filter Components ──

const NOTE_TYPES: NoteType[] = ['Sales', 'Support', 'General', 'Follow-up', 'Meeting', 'Call Log'];

function FilterChip({ label, count, isOpen, onToggle, onHide, children }: {
  label: string; count: number; isOpen: boolean; onToggle: () => void; onHide: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all ${
        count > 0
          ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
          : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--brand-primary)]'
      }`}>
        <button onClick={onToggle} className="bg-transparent border-none p-0 cursor-pointer font-inherit text-inherit text-[11px] font-semibold">
          {label}{count > 0 ? `: (${count})` : ''}
        </button>
        <button
          onClick={onHide}
          className="bg-transparent border-none p-0 cursor-pointer text-inherit hover:text-[var(--danger)] flex items-center"
        >
          <XIcon size={10} />
        </button>
      </div>
      {isOpen && children}
    </div>
  );
}

function FilterDropdown({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-9 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-[220px] animate-[fadeUp_0.15s_ease-out]">
      {children}
    </div>
  );
}

function TagsFilterContent({ selectedTags, onToggleTag, onClear, onApply }: {
  selectedTags: string[]; onToggleTag: (t: string) => void; onClear: () => void; onApply: () => void;
}) {
  const [search, setSearch] = useState('');
  const allTags = TAG_CATEGORIES.flatMap((c) => c.tags);
  const filtered = allTags.filter((t) => !search || t.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="p-2.5 border-b border-[var(--border)]">
        <div className="relative">
          <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by text"
            className="w-full h-7 pl-6 pr-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" autoFocus />
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-1.5">
        <label className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
          <input type="checkbox" checked={selectedTags.length === 0} onChange={onClear} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" /> All
        </label>
        {filtered.map((tag) => (
          <label key={tag} className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
            <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => onToggleTag(tag)} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" />
            {tag}
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-2.5 py-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
        <button onClick={onApply} className="px-3 py-1 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer border-none">
          Apply
        </button>
      </div>
    </div>
  );
}

function TypeFilterContent({ selectedTypes, onToggleType, onClear }: {
  selectedTypes: NoteType[]; onToggleType: (t: NoteType) => void; onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = NOTE_TYPES.filter((t) => !search || t.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="p-2.5 border-b border-[var(--border)]">
        <div className="relative">
          <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by text"
            className="w-full h-7 pl-6 pr-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" autoFocus />
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-1.5">
        <label className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
          <input type="checkbox" checked={selectedTypes.length === 0} onChange={onClear} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" /> All
        </label>
        {filtered.map((t) => (
          <label key={t} className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
            <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => onToggleType(t)} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" />
            {t}
          </label>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-2.5 py-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
      </div>
    </div>
  );
}

function FieldTypeFilterContent({ fields, selectedFields, onToggle, onClear }: {
  fields: string[]; selectedFields: string[]; onToggle: (f: string) => void; onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = fields.filter((f) => !search || f.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="p-2.5 border-b border-[var(--border)]">
        <div className="relative">
          <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by text"
            className="w-full h-7 pl-6 pr-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" autoFocus />
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-1.5">
        <label className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
          <input type="checkbox" checked={selectedFields.length === 0} onChange={onClear} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" /> All
        </label>
        {filtered.map((f) => (
          <label key={f} className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
            <input type="checkbox" checked={selectedFields.includes(f)} onChange={() => onToggle(f)} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" />
            {f}
          </label>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-2.5 py-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
      </div>
    </div>
  );
}

function EventTypeFilterContent({ selectedCategories, onToggle, onClear }: {
  selectedCategories: ActivityLogCategory[]; onToggle: (c: ActivityLogCategory) => void; onClear: () => void;
}) {
  return (
    <div>
      <div className="max-h-[200px] overflow-y-auto p-1.5">
        <label className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
          <input type="checkbox" checked={selectedCategories.length === 0} onChange={onClear} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" /> All
        </label>
        {LOG_CATEGORIES.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
            <input type="checkbox" checked={selectedCategories.includes(cat.id)} onChange={() => onToggle(cat.id)} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" />
            {cat.label}
          </label>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-2.5 py-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
      </div>
    </div>
  );
}

function AuthorFilterContent({ authors, selectedAuthors, onToggleAuthor, onClear, onApply }: {
  authors: { name: string; initials: string; color: string }[];
  selectedAuthors: string[]; onToggleAuthor: (a: string) => void; onClear: () => void; onApply: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = authors.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ minWidth: '240px' }}>
      <div className="p-2.5 border-b border-[var(--border)]">
        <div className="relative">
          <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by text"
            className="w-full h-7 pl-6 pr-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" autoFocus />
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-1.5">
        <label className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
          <input type="checkbox" checked={selectedAuthors.length === 0} onChange={onClear} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" /> All
        </label>
        {filtered.map((a) => (
          <label key={a.name} className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
            <input type="checkbox" checked={selectedAuthors.includes(a.name)} onChange={() => onToggleAuthor(a.name)} className="w-3.5 h-3.5 accent-[var(--brand-primary)]" />
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white flex-shrink-0" style={{ background: a.color }}>
              {a.initials}
            </div>
            {a.name}
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-2.5 py-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
        <button onClick={onApply} className="px-3 py-1 text-[11px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer border-none">
          Apply
        </button>
      </div>
    </div>
  );
}

function DateFilterContent({ label, value, onChange, onClear }: {
  label: string; value: string; onChange: (v: string) => void; onClear: () => void;
}) {
  return (
    <div className="p-3" style={{ minWidth: '200px' }}>
      <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{label}</div>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 text-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
      <div className="mt-2.5 border-t border-[var(--border)] pt-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
      </div>
    </div>
  );
}

function DateRangeFilterContent({ dateFrom, dateTo, onDateFromChange, onDateToChange, onClear }: {
  dateFrom: string; dateTo: string; onDateFromChange: (v: string) => void; onDateToChange: (v: string) => void; onClear: () => void;
}) {
  return (
    <div className="p-3" style={{ minWidth: '220px' }}>
      <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Date Range</div>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <div className="text-[10px] text-[var(--text-tertiary)] mb-1">Date From</div>
          <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full h-8 px-2 text-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-[var(--text-tertiary)] mb-1">Date To</div>
          <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)}
            className="w-full h-8 px-2 text-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
        </div>
      </div>
      <div className="mt-2.5 border-t border-[var(--border)] pt-2">
        <button onClick={onClear} className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:text-[var(--danger)] flex items-center gap-1">
          <XIcon size={10} /> Clear
        </button>
      </div>
    </div>
  );
}

function AddFilterMenu({ isOpen, onToggle, onClose, hiddenChips, chipLabel, onShowChip }: {
  isOpen: boolean; onToggle: () => void; onClose: () => void;
  hiddenChips: readonly string[]; chipLabel: (id: string) => string; onShowChip: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const allVisible = hiddenChips.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        disabled={allVisible}
        className={`flex items-center gap-1.5 text-[11px] font-bold bg-transparent border-none ${
          allVisible
            ? 'text-[var(--text-tertiary)] cursor-default opacity-50'
            : 'text-[var(--brand-primary)] cursor-pointer'
        }`}
      >
        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          allVisible ? 'bg-[var(--text-tertiary)]' : 'bg-[var(--brand-primary)]'
        }`}>
          <Plus size={10} weight="bold" className="text-white" />
        </span>
        Add Filter
      </button>
      {isOpen && (
        <div className="absolute left-0 top-7 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-[160px] py-1 animate-[fadeUp_0.15s_ease-out]">
          {hiddenChips.length > 0 ? (
            hiddenChips.map((id) => (
              <button
                key={id}
                onClick={() => onShowChip(id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left"
              >
                {chipLabel(id)}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)]">All filters visible</div>
          )}
        </div>
      )}
    </div>
  );
}

// Tag categories for the picker
const TAG_CATEGORIES = [
  { name: 'CRM', color: '#1955A6', tags: ['Investigate', 'Trade Show', 'Cold Call', 'Contact Morning', 'High Priority'] },
  { name: 'Sales', color: '#DC2626', tags: ['Small Business', 'Large Business', 'Enterprise'] },
  { name: 'Notes', color: '#059669', tags: ['Phone Call', 'Instant Messaged', 'Left Message'] },
];

function NoteCard({ note: n, menuOpen, onToggleMenu, onEdit, onDelete, onTogglePin, searchQuery }: {
  note: Note; menuOpen: boolean; onToggleMenu: () => void;
  onEdit: () => void; onDelete: () => void; onTogglePin: () => void; searchQuery?: string;
}) {
  const updateNote = useContactStore((s) => s.updateNote);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isHtml = n.body.includes('<');
  const rawBody = isHtml ? n.body : n.body.replace(/\n/g, '<br>');
  const isLong = n.body.length > 200;

  // Highlight search matches with WCAG-compliant background (#FEF08A — yellow-200, 7:1 contrast with black text)
  const displayBody = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return rawBody;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'gi');
    // Only highlight text outside of HTML tags
    return rawBody.replace(/(<[^>]+>)|([^<]+)/g, (match: string, tag: string, text: string) => {
      if (tag) return tag;
      return text.replace(re, '<mark style="background:#FEF08A;color:#1C1917;padding:1px 2px;border-radius:2px">$1</mark>');
    });
  }, [rawBody, searchQuery]);

  const toggleTag = (tag: string) => {
    const current = n.tags || [];
    const updated = current.includes(tag as any) ? current.filter((t) => t !== tag) : [...current, tag as any];
    updateNote(n.id, { tags: updated });
  };

  const getTagColor = (tag: string) => {
    if (tag.includes('Phone')) return { bg: 'var(--brand-bg)', text: 'var(--brand-primary)', border: 'var(--brand-primary)' };
    if (tag.includes('Instant')) return { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning)' };
    if (tag.includes('Left')) return { bg: 'var(--ai-bg)', text: 'var(--ai-dark)', border: 'var(--ai-border)' };
    if (tag.includes('Investigate') || tag.includes('Trade') || tag.includes('Cold') || tag.includes('Contact') || tag.includes('High')) return { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)' };
    if (tag.includes('Small') || tag.includes('Large') || tag.includes('Enterprise')) return { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)' };
    return { bg: 'var(--surface-raised)', text: 'var(--text-secondary)', border: 'var(--border)' };
  };

  const getTagIcon = (tag: string) => {
    if (tag.includes('Phone')) return <Phone size={11} weight="bold" />;
    if (tag.includes('Instant')) return <ChatDots size={11} weight="bold" />;
    if (tag.includes('Left')) return <Voicemail size={11} weight="bold" />;
    if (tag.includes('Email')) return <EnvelopeSimple size={11} weight="bold" />;
    if (tag.includes('Meeting')) return <Handshake size={11} weight="bold" />;
    if (tag.includes('Investigate')) return <MagnifyingGlass size={11} weight="bold" />;
    if (tag.includes('Trade')) return <Storefront size={11} weight="bold" />;
    if (tag.includes('Cold')) return <Phone size={11} weight="bold" />;
    if (tag.includes('High')) return <FlagBanner size={11} weight="bold" />;
    if (tag.includes('Small') || tag.includes('Large') || tag.includes('Enterprise')) return <Buildings size={11} weight="bold" />;
    return <Tag size={11} weight="bold" />;
  };

  return (
    <div className="px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors group relative">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0" style={{ background: n.authorColor }}>
          {n.authorInitials}
        </div>
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{n.author}</span>
        <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-raised)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-secondary)]">
          {n.location}
        </span>

        {/* 3-dot menu */}
        <div className="ml-auto relative">
          <button onClick={onToggleMenu} className="text-[var(--text-tertiary)] cursor-pointer bg-transparent border-none p-1 rounded hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors">
            <DotsThree size={20} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 w-36 py-1 animate-[fadeUp_0.15s_ease-out]">
              <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left">
                <PencilSimple size={14} /> Edit
              </button>
              <button onClick={onTogglePin} className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left">
                <PushPin size={14} /> {n.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border-none cursor-pointer text-left">
                <Trash size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="ml-[42px] text-[11px] text-[var(--text-tertiary)] flex items-center gap-1 mb-2">
        <CalendarBlank size={13} className="text-[var(--success)]" /> {n.createdAt}
      </div>

      {/* Render HTML body with formatting */}
      <div
        className={`ml-[42px] text-[13px] text-[var(--text-secondary)] leading-relaxed note-body ${!expanded && isLong ? 'line-clamp-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: expanded || !isLong ? displayBody : displayBody.substring(0, 250) + '...' }}
      />

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-[42px] mt-1 text-xs font-bold text-[var(--brand-primary)] flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
        >
          <CaretDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}

      {/* Tags */}
      <div className="ml-[42px] mt-2 flex gap-1.5 flex-wrap items-center">
        {(n.tags || []).map((tag) => {
          const colors = getTagColor(tag);
          return (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
              {getTagIcon(tag)} {tag}
              <button onClick={() => toggleTag(tag)} className="bg-transparent border-none cursor-pointer p-0 flex" style={{ color: colors.text }}>
                <XIcon size={10} />
              </button>
            </span>
          );
        })}

        {/* Add Tags button + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTagPicker(!showTagPicker)}
            className="text-[11px] text-[var(--brand-primary)] cursor-pointer flex items-center gap-1.5 bg-transparent border-none transition-colors font-bold"
          >
            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
              <Plus size={10} weight="bold" className="text-white" />
            </span>
            Add Tags
          </button>

          {showTagPicker && (
            <div className="absolute left-0 bottom-7 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 w-[200px] animate-[fadeUp_0.15s_ease-out]">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Add Tags</span>
                  <button onClick={() => { setShowTagPicker(false); setTagSearch(''); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-0.5">
                    <XIcon size={12} />
                  </button>
                </div>
                <div className="relative mb-2">
                  <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Filter by text"
                    className="w-full h-7 pl-6 pr-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                    autoFocus
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {TAG_CATEGORIES.map((cat) => {
                    const filteredTags = cat.tags.filter((t) => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()));
                    if (filteredTags.length === 0) return null;
                    return (
                      <div key={cat.name}>
                        <div className="text-[10px] font-bold uppercase tracking-wider px-1 py-1 flex items-center gap-1" style={{ color: cat.color }}>
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} /> {cat.name}
                        </div>
                        {filteredTags.map((tag) => (
                          <label key={tag} className="flex items-center gap-2 px-1 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(n.tags || []).includes(tag as any)}
                              onChange={() => toggleTag(tag)}
                              className="w-3.5 h-3.5 rounded accent-[var(--brand-primary)]"
                            />
                            {tag}
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-[var(--border)] px-2 py-1.5">
                <button
                  onClick={() => { setShowTagPicker(false); setTagSearch(''); }}
                  className="text-[11px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1 bg-transparent border-none cursor-pointer hover:text-[var(--danger)]"
                >
                  <XIcon size={12} /> Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditRelationshipTypeDialog({ currentContact, otherContact, currentKind, onCancel, onSave }: {
  currentContact: ContactWithEntries;
  otherContact: ContactWithEntries;
  currentKind: RelationshipKind;
  onCancel: () => void;
  onSave: (newKind: RelationshipKind, flipDirection: boolean) => void;
}) {
  const options = useMemo(
    () => bidirectionalKindsFor(currentContact.type, otherContact.type),
    [currentContact.type, otherContact.type]
  );
  const [selected, setSelected] = useState<RelationshipKind>(currentKind);
  const selectedOption = options.find((o) => o.kind === selected);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-[fadeUp_0.15s_ease-out]"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl w-[440px] max-w-[92vw] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Change relationship type</h3>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            How is <span className="font-semibold text-[var(--text-primary)]">{otherContact.name}</span> related to <span className="font-semibold text-[var(--text-primary)]">{currentContact.name}</span>?
          </p>
        </div>
        <div className="px-5 py-3 overflow-y-auto flex-1">
          <div className="flex flex-col gap-1">
            {options.map(({ kind }) => {
              const meta = RELATIONSHIP_META[kind];
              const active = selected === kind;
              return (
                <label
                  key={kind}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer border transition-colors ${
                    active
                      ? 'bg-[var(--brand-bg)] border-[var(--brand-primary)]'
                      : 'bg-transparent border-transparent hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="rel-kind"
                    checked={active}
                    onChange={() => setSelected(kind)}
                    className="accent-[var(--brand-primary)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]">{meta.label}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] capitalize">{meta.category.replace('-', ' ')}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)]"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedOption && onSave(selectedOption.kind, selectedOption.flipDirection)}
            disabled={!selectedOption || selected === currentKind}
            className="px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
