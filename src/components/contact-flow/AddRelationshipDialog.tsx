'use client';

import { useState, useMemo } from 'react';
import { X, MagnifyingGlass, User, Buildings, LinkSimple, Warning, TreeStructure, CaretDown, CaretRight } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { Relationship, RelationshipKind, RELATIONSHIP_META, bidirectionalKindsFor } from '@/types/relationship';
import { ContactWithEntries } from '@/types/contact';
import { initials, getAvatarColor, uid } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface Props {
  open: boolean;
  fromContact: ContactWithEntries;
  /** Optional: restrict the contact picker to a specific type */
  restrictToType?: 'person' | 'org';
  onClose: () => void;
}

export function AddRelationshipDialog({ open, fromContact, restrictToType, onClose }: Props) {
  const allContacts = useContactStore((s) => s.contacts);
  const allRelationships = useContactStore((s) => s.relationships);
  const addRelationship = useContactStore((s) => s.addRelationship);
  const deleteRelationship = useContactStore((s) => s.deleteRelationship);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContactWithEntries | null>(null);
  const [kindChoice, setKindChoice] = useState<{ kind: RelationshipKind; flipDirection: boolean } | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // List of contacts to display — show ALL by default, filter on search
  const candidates = useMemo(() => {
    let list = allContacts.filter((c) => c.id !== fromContact.id);
    if (restrictToType) list = list.filter((c) => c.type === restrictToType);
    if (search.trim().length >= 1) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        ('orgName' in c && c.orgName?.toLowerCase().includes(q)) ||
        ('industry' in c && c.industry?.toLowerCase().includes(q)) ||
        ('title' in c && c.title?.toLowerCase().includes(q))
      );
    }
    // Sort alphabetically
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [allContacts, fromContact.id, restrictToType, search]);

  // Existing relationships between fromContact and the picked contact
  const existingRelations = useMemo(() => {
    if (!selected) return [];
    return allRelationships.filter((r) =>
      (r.fromContactId === fromContact.id && r.toContactId === selected.id) ||
      (r.fromContactId === selected.id && r.toContactId === fromContact.id)
    );
  }, [selected, allRelationships, fromContact.id]);

  // Build a tree of the selected contact's network — group by parent org, then list people under it
  interface TreeNode { contact: ContactWithEntries; rel?: Relationship; isInverse?: boolean; label?: string; children: TreeNode[]; }
  const networkTree = useMemo<TreeNode[]>(() => {
    if (!selected) return [];

    const directLinks = allRelationships
      .filter((r) => r.fromContactId === selected.id || r.toContactId === selected.id)
      .map((rel) => {
        const isInverse = rel.toContactId === selected.id;
        const otherId = isInverse ? rel.fromContactId : rel.toContactId;
        const otherContact = allContacts.find((c) => c.id === otherId);
        if (!otherContact) return null;
        const meta = RELATIONSHIP_META[rel.kind];
        const label = isInverse ? meta.inverseLabel : meta.label;
        return { contact: otherContact, rel, isInverse, label };
      })
      .filter((x): x is { contact: ContactWithEntries; rel: Relationship; isInverse: boolean; label: string } => x !== null);

    // Group: orgs become parent nodes. People who are employees of an org in this set become its children.
    const orgs = directLinks.filter((l) => l.contact.type === 'org');
    const people = directLinks.filter((l) => l.contact.type === 'person');

    const tree: TreeNode[] = [];

    for (const orgLink of orgs) {
      const childPeople: TreeNode[] = [];
      // Find people from the network who are employees of this org
      for (const personLink of people) {
        const isEmployeeOfOrg = allRelationships.some((r) =>
          r.kind === 'employee-of' && r.fromContactId === personLink.contact.id && r.toContactId === orgLink.contact.id
        );
        if (isEmployeeOfOrg) {
          childPeople.push({ contact: personLink.contact, rel: personLink.rel, isInverse: personLink.isInverse, label: personLink.label, children: [] });
        }
      }
      tree.push({ contact: orgLink.contact, rel: orgLink.rel, isInverse: orgLink.isInverse, label: orgLink.label, children: childPeople });
    }

    // People who weren't placed under an org get added at the root level
    const placedPersonIds = new Set(tree.flatMap((t) => t.children.map((c) => c.contact.id)));
    for (const personLink of people) {
      if (!placedPersonIds.has(personLink.contact.id)) {
        tree.push({ contact: personLink.contact, rel: personLink.rel, isInverse: personLink.isInverse, label: personLink.label, children: [] });
      }
    }

    return tree;
  }, [selected, allRelationships, allContacts]);

  const totalNetworkCount = useMemo(() => {
    let count = 0;
    const walk = (nodes: TreeNode[]) => { for (const n of nodes) { count++; walk(n.children); } };
    walk(networkTree);
    return count;
  }, [networkTree]);

  const toggleCollapsed = (id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Available relationship kinds for the picked contact (both directions)
  const availableKinds = useMemo(() => {
    if (!selected) return [];
    return bidirectionalKindsFor(fromContact.type as 'person' | 'org', selected.type as 'person' | 'org');
  }, [fromContact, selected]);

  const groupedKinds = useMemo(() => {
    const groups: Record<string, { kind: RelationshipKind; flipDirection: boolean }[]> = {};
    for (const item of availableKinds) {
      const cat = RELATIONSHIP_META[item.kind].category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [availableKinds]);

  const reset = () => {
    setSearch(''); setSelected(null); setKindChoice(null); setNotes('');
  };

  const handleClose = () => { reset(); onClose(); };

  const canSave = selected !== null && kindChoice !== null;

  const handleSave = () => {
    if (!selected || !kindChoice) return;
    // If a relationship already exists between these two contacts, ask before replacing
    if (existingRelations.length > 0 && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    persistAndClose();
  };

  const persistAndClose = (replaceExisting = false) => {
    if (!selected || !kindChoice) return;
    if (replaceExisting) {
      for (const r of existingRelations) deleteRelationship(r.id);
    }
    const fromId = kindChoice.flipDirection ? selected.id : fromContact.id;
    const toId = kindChoice.flipDirection ? fromContact.id : selected.id;
    const rel: Relationship = {
      id: uid('rel'),
      fromContactId: fromId,
      toContactId: toId,
      kind: kindChoice.kind,
      notes: notes || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: 'Paul Wentzell',
    };
    addRelationship(rel);
    toast.success(`Linked ${selected.name} as ${RELATIONSHIP_META[kindChoice.kind]?.label || kindChoice.kind}`);
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-lg w-full max-w-[600px] max-h-[90vh] flex flex-col animate-[fadeUp_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <LinkSimple size={18} className="text-[var(--brand-primary)]" weight="bold" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add Relationship</h3>
          </div>
          <button onClick={handleClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        {/* From contact context */}
        <div className="px-5 py-3 bg-[var(--surface-raised)] border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
              style={{ background: getAvatarColor(fromContact.id, fromContact.avatarColor), borderRadius: fromContact.type === 'org' ? '6px' : '50%' }}
            >
              {initials(fromContact.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">From</div>
              <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{fromContact.name}</div>
            </div>
          </div>
        </div>

        {/* Step 1: Pick contact */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex-1 overflow-y-auto">
          <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            Linked Contact
          </label>
          {selected ? (
            <div>
              <div className="flex items-center gap-2.5 p-2 bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-[var(--radius-md)]">
                <div
                  className="w-8 h-8 flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                  style={{ background: getAvatarColor(selected.id, selected.avatarColor), borderRadius: selected.type === 'org' ? '6px' : '50%' }}
                >
                  {initials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{selected.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)] capitalize flex items-center gap-1">
                    {selected.type === 'org' ? <Buildings size={10} /> : <User size={10} />}
                    {selected.type}
                  </div>
                </div>
                <button
                  onClick={() => { setSelected(null); setKindChoice(null); }}
                  className="text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Existing relationships warning */}
              {existingRelations.length > 0 && (
                <div className="mt-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--warning-bg)] border border-[var(--warning)] flex items-start gap-2">
                  <Warning size={14} className="text-[var(--warning)] flex-shrink-0 mt-0.5" weight="fill" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[var(--warning)] mb-0.5">
                      Already linked ({existingRelations.length})
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {existingRelations.map((r) => {
                        const isInverse = r.toContactId === fromContact.id;
                        const meta = RELATIONSHIP_META[r.kind];
                        const lbl = isInverse ? meta.inverseLabel : meta.label;
                        return (
                          <div key={r.id} className="text-[11px] text-[var(--text-secondary)]">
                            • {selected.name} is currently linked as <strong className="text-[var(--warning)]">{lbl}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected contact's wider relationship tree (matches Org Summary indented style) */}
              {networkTree.length > 0 && (
                <div className="mt-2 p-3 rounded-[var(--radius-md)] bg-[var(--surface-raised)] border border-[var(--border)]">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                    <TreeStructure size={11} weight="bold" /> {selected.name}&apos;s connections ({totalNetworkCount})
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {networkTree.map((node) => (
                      <NetworkTreeRow
                        key={node.contact.id + (node.rel?.id || '')}
                        node={node}
                        depth={0}
                        collapsed={collapsedNodes}
                        onToggle={toggleCollapsed}
                        fromContactId={fromContact.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, company, title..."
                  className="w-full h-9 pl-8 pr-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-primary)]"
                  autoFocus
                />
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mb-2">
                {candidates.length === 0 ? 'No contacts found' : `${candidates.length} contact${candidates.length === 1 ? '' : 's'}`}
              </div>
              <div className="max-h-[260px] overflow-y-auto flex flex-col gap-1 -mx-2">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-raised)] cursor-pointer bg-transparent border-none text-left transition-colors"
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
                      style={{ background: getAvatarColor(c.id, c.avatarColor), borderRadius: c.type === 'org' ? '5px' : '50%' }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 truncate">
                        {c.type === 'org' ? <Buildings size={10} /> : <User size={10} />}
                        {c.type === 'org' && 'industry' in c && c.industry ? c.industry : ''}
                        {c.type === 'person' && 'title' in c && c.title ? c.title : ''}
                        {c.type === 'person' && 'orgName' in c && c.orgName ? ` · ${c.orgName}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Step 2: Pick relationship kind */}
        {selected && (
          <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
              Relationship Type — <span className="font-normal text-[var(--text-secondary)]">{selected.name} is the…</span>
            </label>
            {availableKinds.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)] italic">No relationship types available.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(groupedKinds).map(([category, items]) => (
                  <div key={category}>
                    <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{category.replace('-', ' ')}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {items.map((item) => (
                        <button
                          key={item.kind + (item.flipDirection ? '-flip' : '')}
                          onClick={() => setKindChoice(item)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-full border cursor-pointer transition-all ${
                            kindChoice?.kind === item.kind && kindChoice.flipDirection === item.flipDirection
                              ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                              : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--brand-primary)]'
                          }`}
                        >
                          {item.flipDirection ? RELATIONSHIP_META[item.kind].inverseLabel : RELATIONSHIP_META[item.kind].label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Optional notes */}
        {selected && kindChoice && (
          <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Met at industry conference 2025, working on Q3 partnership..."
              rows={2}
              className="w-full px-3 py-2 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] resize-none focus:border-[var(--brand-primary)]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 flex-shrink-0 border-t border-[var(--border)]">
          <div className="text-[11px] text-[var(--text-tertiary)] flex-1">
            {!selected && 'Pick a contact to link'}
            {selected && !kindChoice && (
              <span className="text-[var(--warning)] font-semibold">↑ Pick a relationship type above to continue</span>
            )}
            {selected && kindChoice && (
              <span className="text-[var(--success)] font-semibold">Ready to add</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleClose} className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
              title={!selected ? 'Pick a contact first' : !kindChoice ? 'Pick a relationship type first' : 'Add this relationship'}
            >
              Add Relationship
            </button>
          </div>
        </div>
      </div>

      {/* Replace-confirmation modal (overlays on top) */}
      {confirmReplace && selected && kindChoice && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/30">
          <div className="bg-[var(--surface-card)] border border-[var(--warning)] rounded-xl shadow-lg w-full max-w-[440px] p-5 animate-[fadeUp_0.15s_ease-out]">
            <div className="flex items-center gap-2 mb-2">
              <Warning size={18} className="text-[var(--warning)]" weight="fill" />
              <h4 className="text-base font-extrabold text-[var(--text-primary)]">Replace existing relationship?</h4>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] mb-3">
              {selected.name} is already linked to {fromContact.name} as:
            </p>
            <div className="bg-[var(--warning-bg)] border border-[var(--warning)] rounded-[var(--radius-sm)] px-3 py-2 mb-3">
              {existingRelations.map((r) => {
                const isInverse = r.toContactId === fromContact.id;
                const meta = RELATIONSHIP_META[r.kind];
                const lbl = isInverse ? meta.inverseLabel : meta.label;
                return (
                  <div key={r.id} className="text-[12px] text-[var(--warning)] font-semibold">• {lbl}</div>
                );
              })}
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] mb-4">
              You&apos;re trying to add: <strong className="text-[var(--brand-primary)]">{kindChoice.flipDirection ? RELATIONSHIP_META[kindChoice.kind].inverseLabel : RELATIONSHIP_META[kindChoice.kind].label}</strong>
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmReplace(false)}
                className="px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => persistAndClose(false)}
                className="px-3 py-1.5 text-[12px] font-bold text-[var(--text-primary)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
              >
                Add as additional
              </button>
              <button
                onClick={() => persistAndClose(true)}
                className="px-3 py-1.5 text-[12px] font-bold text-white bg-[var(--tag-warning-bg)] rounded-[var(--radius-sm)] cursor-pointer border-none"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Network tree row component ──
interface TreeNodeData { contact: ContactWithEntries; rel?: Relationship; isInverse?: boolean; label?: string; children: TreeNodeData[]; }

function NetworkTreeRow({ node, depth, collapsed, onToggle, fromContactId }: {
  node: TreeNodeData;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  fromContactId: string;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.contact.id);
  const isFromContactSelf = node.contact.id === fromContactId;

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--surface-card)] transition-colors"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {/* Caret slot */}
        <button
          onClick={hasChildren ? () => onToggle(node.contact.id) : undefined}
          className={`w-4 h-4 flex items-center justify-center bg-transparent border-none p-0 ${hasChildren ? 'cursor-pointer text-[var(--text-secondary)] hover:text-[var(--brand-primary)]' : 'cursor-default'}`}
          aria-label={hasChildren ? (isCollapsed ? 'Expand' : 'Collapse') : undefined}
        >
          {hasChildren && (isCollapsed ? <CaretRight size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />)}
        </button>

        {/* Avatar */}
        <div
          className="w-6 h-6 flex items-center justify-center text-[9px] font-extrabold text-white flex-shrink-0"
          style={{
            background: getAvatarColor(node.contact.id, node.contact.avatarColor),
            borderRadius: node.contact.type === 'org' ? '4px' : '50%',
          }}
        >
          {initials(node.contact.name)}
        </div>

        {/* Name + label */}
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
          <span className={`text-[12px] truncate ${isFromContactSelf ? 'font-extrabold text-[var(--brand-primary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
            {node.contact.name}
            {isFromContactSelf ? ' (this contact)' : ''}
          </span>
          {node.label && (
            <span className="text-[10px] text-[var(--brand-primary)] font-semibold flex-shrink-0">{node.label}</span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <>
          {node.children.map((child) => (
            <NetworkTreeRow
              key={child.contact.id + (child.rel?.id || '')}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              fromContactId={fromContactId}
            />
          ))}
        </>
      )}
    </>
  );
}
