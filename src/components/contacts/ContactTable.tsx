'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowsDownUp, Buildings, User, Warning, CheckCircle, Sparkle, PencilSimple, Trash } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { Contact, ContactWithEntries } from '@/types/contact';
import { initials, fmtDate, getAvatarColor } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';

export default function ContactTable() {
  const router = useRouter();
  const contacts = useContactStore((s) => s.contacts);
  const filter = useContactStore((s) => s.filter);
  const search = useContactStore((s) => s.search);
  const sortField = useContactStore((s) => s.sortField);
  const sortDir = useContactStore((s) => s.sortDir);
  const toggleSort = useContactStore((s) => s.toggleSort);
  const deleteContact = useContactStore((s) => s.deleteContact);
  const addContact = useContactStore((s) => s.addContact);
  const [deleteTarget, setDeleteTarget] = useState<ContactWithEntries | null>(null);

  const filteredContacts = useMemo(() => {
    let list = [...contacts];
    if (filter !== 'all') list = list.filter((c) => c.type === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        ('industry' in c ? (c.industry || '').toLowerCase().includes(q) : false) ||
        ('title' in c ? (c.title || '').toLowerCase().includes(q) : false) ||
        ('orgName' in c ? (c.orgName || '').toLowerCase().includes(q) : false)
      );
    }
    if (sortField) {
      list.sort((a, b) => {
        const aVal = String((a as unknown as Record<string, unknown>)[sortField] || '');
        const bVal = String((b as unknown as Record<string, unknown>)[sortField] || '');
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [contacts, filter, search, sortField, sortDir]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th
              className="px-3.5 py-2.5 text-left text-[11px] font-extrabold tracking-wider uppercase text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)] whitespace-nowrap cursor-pointer hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)]"
              onClick={() => toggleSort('name')}
            >
              <span className="flex items-center gap-1">Name <ArrowsDownUp size={13} /></span>
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-extrabold tracking-wider uppercase text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)]">Type</th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-extrabold tracking-wider uppercase text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)]">Industry / Title</th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-extrabold tracking-wider uppercase text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)]">Location / Org</th>
            <th
              className="px-3.5 py-2.5 text-left text-[11px] font-extrabold tracking-wider uppercase text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)] cursor-pointer hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)]"
              onClick={() => toggleSort('lastUpdated')}
            >
              <span className="flex items-center gap-1">Updated <ArrowsDownUp size={13} /></span>
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-extrabold tracking-wider uppercase text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)]">AI Status</th>
            <th className="px-3.5 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--border)] w-[72px]"></th>
          </tr>
        </thead>
        <tbody>
          {filteredContacts.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onClick={() => router.push(`/contacts/${c.id}`)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </tbody>
      </table>
      {filteredContacts.length === 0 && (
        <div className="py-14 text-center text-[var(--text-tertiary)]">
          <div className="text-sm font-bold text-[var(--text-secondary)] mt-3">No contacts found</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Try adjusting your search or filter.</div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Contact"
        message={deleteTarget ? (
          <>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            <br />
            <span className="text-xs text-[var(--text-tertiary)] mt-1 block">
              This will permanently remove this {deleteTarget.type === 'org' ? 'organization' : 'person'} and all associated data.
            </span>
          </>
        ) : ''}
        confirmLabel="Delete Contact"
        onConfirm={() => {
          if (deleteTarget) {
            const snapshot = deleteTarget;
            deleteContact(snapshot.id);
            toast.success('Contact deleted', {
              description: snapshot.name,
              action: { label: 'Undo', onClick: () => addContact(snapshot) },
            });
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ContactRow({ contact: c, onClick, onDelete }: { contact: ContactWithEntries; onClick: () => void; onDelete: () => void }) {
  const col3 = c.type === 'org' ? ('industry' in c ? c.industry || '—' : '—') : ('title' in c ? c.title || '—' : '—');
  const col4 = c.type === 'org' ? ('hq' in c ? c.hq || '—' : '—') : ('orgName' in c ? c.orgName || '—' : '—');

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-[var(--surface-raised)] group"
    >
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
            style={{
              background: getAvatarColor(c.id, c.avatarColor),
              borderRadius: c.type === 'org' ? 'var(--radius-md)' : 'var(--radius-full)',
            }}
          >
            {initials(c.name)}
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">{c.name}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">
              {c.type === 'org' ? ('employees' in c ? `${c.employees} employees` : '') : ('title' in c ? c.title : '')}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)]">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
          c.type === 'org' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--brand-bg)] text-[var(--brand-primary)]'
        }`}>
          {c.type === 'org' ? <Buildings size={12} /> : <User size={12} />}
          {c.type === 'org' ? 'Org' : 'Person'}
        </span>
      </td>
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)]">{col3}</td>
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)]">{col4}</td>
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">{fmtDate(c.lastUpdated)}</td>
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)]">
        {c.stale ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
            <Warning size={12} /> Incomplete
          </span>
        ) : c.aiStatus === 'new' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <Sparkle size={12} weight="duotone" /> AI Added
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
            <CheckCircle size={12} /> Current
          </span>
        )}
      </td>
      <td className="px-3.5 py-3 border-b border-[var(--border-subtle)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--brand-primary)] transition-all">
            <PencilSimple size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-all"
          >
            <Trash size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
