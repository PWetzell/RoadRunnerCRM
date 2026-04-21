'use client';

import { useState, useCallback } from 'react';
import { ContactWithEntries, AddressEntry, EmailEntry, PhoneEntry, WebsiteEntry, NameEntry, IdentifierEntry } from '@/types/contact';
import { useContactStore } from '@/stores/contact-store';
import { PencilSimple, X, CheckCircle, Warning, MapPin, EnvelopeSimple, Phone as PhoneIcon, Globe, Buildings, ShieldCheck, Fingerprint, Sparkle, IdentificationBadge, Factory, Hash, FloppyDisk, Trash, Plus, Check, Briefcase, Info, DotsSixVertical, PushPin, EyeSlash, Eye, UserPlus, UserMinus } from '@phosphor-icons/react';
import { fmtDate, uid, initials, getAvatarColor, ACME_COLORS } from '@/lib/utils';
import SectionCard, { FieldRow } from '@/components/detail/SectionCard';
import { ValidationRule, validate, isValid, isEmail, isPhone, isUrl, maxLength } from '@/lib/validation';
import { useUserStore } from '@/stores/user-store';

interface DetailsTabProps {
  contact: ContactWithEntries;
}

type EditingState = { section: string; entryId: string | null } | null;

export default function DetailsTab({ contact: c }: DetailsTabProps) {
  const updateContact = useContactStore((s) => s.updateContact);
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
  const isOrg = c.type === 'org';
  const currentAvatarColor = getAvatarColor(c.id, c.avatarColor);
  const overviewCards = c.overviewCards || [];

  const togglePin = (cardId: string) => {
    const current = c.overviewCards || [];
    const updated = current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : [...current, cardId];
    updateContact(c.id, { overviewCards: updated } as Partial<ContactWithEntries>);
  };

  const isPinned = (cardId: string) => overviewCards.includes(cardId);

  const startEdit = (section: string, entryId: string | null = null) => {
    setEditing({ section, entryId });
  };

  const cancelEdit = () => setEditing(null);

  const saveEntry = useCallback((section: string, entryId: string | null, data: Record<string, string>) => {
    const entries = { ...c.entries };
    const isNew = !entryId || entryId === 'new';

    if (section === 'identity') {
      const updates: Record<string, unknown> = {};
      if (data.name) updates.name = data.name;
      if (data.status) updates.status = data.status;
      updateContact(c.id, updates as Partial<ContactWithEntries>);
      setEditing(null);
      return;
    }

    if (section === 'general') {
      const updates: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => { if (v) updates[k] = v; });
      updateContact(c.id, updates as Partial<ContactWithEntries>);
      setEditing(null);
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
    updateContact(c.id, { entries: { ...entries, [key]: arr } } as Partial<ContactWithEntries>);
    setConfirmDelete(null);
    setEditing(null);
  }, [c, updateContact]);

  const isEditing = (section: string, entryId?: string) =>
    editing?.section === section && (entryId ? editing.entryId === entryId : true);

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-4 min-h-[100px] p-0.5 rounded-xl border-2 border-dashed border-transparent transition-all detail-column"
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
          isEditing={isEditing('identity')}
          onEdit={() => startEdit('identity')} onCancel={cancelEdit}>
          {isEditing('identity') ? (
            <EditForm fields={[
              { key: 'name', label: isOrg ? 'Company Name' : 'Full Name', value: c.name, required: true, maxLength: 120 },
              { key: 'status', label: 'Status', value: c.status, type: 'select', options: ['active', 'inactive'], required: true },
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
              <FieldRow label="Status" value={
                c.status === 'active'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]"><CheckCircle size={12} /> Active</span>
                  : 'Inactive'
              } />
              <FieldRow label="Last Updated" value={fmtDate(c.lastUpdated)} />
            </>
          )}
        </SectionCard>

        {/* Visibility & Access */}
        <SectionCard icon={<EyeSlash size={16} />} title="Visibility & Access" cardId="card-visibility"
          isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}>
          <VisibilityCard contact={c} />
        </SectionCard>

        {/* Names */}
        <SectionCard icon={isOrg ? <Buildings size={16} /> : <IdentificationBadge size={16} />}
          title={isOrg ? 'Company Names' : 'Names'} cardId="card-names"
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
              <AddButton label="Add Name" onClick={() => startEdit('names', 'new')} />
            </>
          )}
        </SectionCard>

        {/* Job Title (Person only) */}
        {!isOrg && (
          <SectionCard icon={<Briefcase size={16} />} title="Job Title" cardId="card-jobtitle" isPinned={isPinned('jobtitle')} onTogglePin={() => togglePin('jobtitle')}
            isEditing={isEditing('jobtitle')} onEdit={() => startEdit('jobtitle')} onCancel={cancelEdit}>
            {isEditing('jobtitle') ? (
              <EditForm fields={[
                { key: 'title', label: 'Title', value: 'title' in c ? c.title : '', maxLength: 120 },
                { key: 'department', label: 'Department', value: 'department' in c ? c.department : '', type: 'select', options: ['Executive', 'Finance', 'Operations', 'Technology', 'Compliance', 'Sales', 'Marketing', 'Legal', 'HR', 'Engineering', 'Product'] },
                { key: 'reportsTo', label: 'Reports To', value: '', maxLength: 120 },
              ]} onSave={(data) => {
                const updates: Record<string, unknown> = {};
                if (data.title) updates.title = data.title;
                if (data.department) updates.department = data.department;
                updateContact(c.id, updates as Partial<ContactWithEntries>);
                setEditing(null);
              }} onCancel={cancelEdit} />
            ) : (
              <>
                <FieldRow label="Title" value={'title' in c ? c.title : '—'} />
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
          isEditing={isEditing('addresses')} onEdit={() => {}} onCancel={cancelEdit} editable={false}
          incomplete={c.entries.addresses.length === 0}
          isPinned={isPinned('addresses')} onTogglePin={() => togglePin('addresses')}>
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
              {c.entries.addresses.length === 0 && <EmptyField />}
              <AddButton label="Add Address" onClick={() => startEdit('addresses', 'new')} />
            </>
          )}
        </SectionCard>

        {/* Emails */}
        <SectionCard icon={<EnvelopeSimple size={16} />} title="Emails" cardId="card-emails"
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
              {c.entries.emails.length === 0 && <EmptyField />}
              <AddButton label="Add Email" onClick={() => startEdit('emails', 'new')} />
            </>
          )}
        </SectionCard>

        {/* Phone */}
        <SectionCard icon={<PhoneIcon size={16} />} title="Phone" cardId="card-phones"
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
              {c.entries.phones.length === 0 && <EmptyField />}
              <AddButton label="Add Phone" onClick={() => startEdit('phones', 'new')} />
            </>
          )}
        </SectionCard>

        {/* Websites */}
        <SectionCard icon={<Globe size={16} />} title="Websites" cardId="card-websites"
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
              {c.entries.websites.length === 0 && <EmptyField />}
              <AddButton label="Add Website" onClick={() => startEdit('websites', 'new')} />
            </>
          )}
        </SectionCard>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col gap-4 min-h-[100px] p-0.5 rounded-xl border-2 border-dashed border-transparent transition-all detail-column"
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
        {/* General Info */}
        <SectionCard icon={<Hash size={16} />} title="General Information" cardId="card-general"
          isPinned={isPinned('general')} onTogglePin={() => togglePin('general')}
          isEditing={isEditing('general')} onEdit={() => startEdit('general')} onCancel={cancelEdit}>
          {isEditing('general') ? (
            <EditForm fields={isOrg ? [
              { key: 'industry', label: 'Industry', value: 'industry' in c ? c.industry : '', type: 'select', options: ['Financial Services', 'Data & Analytics', 'Investment Mgmt', 'Technology', 'Healthcare', 'Insurance', 'Legal', 'Real Estate'] },
              { key: 'employees', label: 'Employees', value: 'employees' in c ? c.employees : '', type: 'select', options: ['1-10', '11-25', '25-50', '50-100', '100-250', '250-500', '500-1000', '1000+'] },
              { key: 'hq', label: 'Headquarters', value: 'hq' in c ? c.hq : '', required: true, maxLength: 120 },
              { key: 'description', label: 'Description', value: 'description' in c ? c.description : '', type: 'textarea', maxLength: 500 },
            ] : [
              { key: 'orgName', label: 'Organization', value: 'orgName' in c ? c.orgName : '', maxLength: 120 },
              { key: 'email', label: 'Email', value: 'email' in c ? c.email : '', validate: 'email', placeholder: 'name@company.com' },
              { key: 'phone', label: 'Phone', value: 'phone' in c ? c.phone : '', validate: 'phone', placeholder: '+1 555 123 4567' },
            ]} onSave={(data) => saveEntry('general', null, data)} onCancel={cancelEdit} />
          ) : (
            <>
              {isOrg ? (
                <>
                  <FieldRow label="Industry" value={'industry' in c ? c.industry : '—'} />
                  <FieldRow label="Employees" value={'employees' in c ? c.employees : '—'} />
                  <FieldRow label="Headquarters" value={'hq' in c ? c.hq : '—'} />
                  <FieldRow label="Description" value={'description' in c ? c.description : '—'} small />
                </>
              ) : (
                <>
                  <FieldRow label="Organization" value={'orgName' in c ? c.orgName : '—'} />
                  <FieldRow label="Email" value={'email' in c ? c.email : '—'} />
                  <FieldRow label="Phone" value={'phone' in c ? c.phone : '—'} />
                  <FieldRow label="Last Updated" value={fmtDate(c.lastUpdated)} />
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* Industries (org) */}
        {isOrg && (
          <SectionCard icon={<Factory size={16} />} title="Industries" cardId="card-industries" isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}
            incomplete={c.entries.industries.length === 0}
            isPinned={isPinned('industries')} onTogglePin={() => togglePin('industries')}>
            {c.entries.industries.map((ind) => (
              <div key={ind.id} className="flex items-center gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-[13px] font-bold text-[var(--text-primary)] min-w-[50px]">{ind.code}</span>
                <span className="text-[13px] text-[var(--text-primary)]">{ind.name}</span>
                <button className="ml-auto text-[var(--brand-primary)]"><PencilSimple size={14} /></button>
              </div>
            ))}
            <AddButton label="Add Industry" onClick={() => {}} />
          </SectionCard>
        )}

        {/* Identification */}
        <SectionCard icon={<ShieldCheck size={16} />} title="Identification" cardId="card-identification" isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}
          incomplete={c.entries.identifiers.length === 0}
          isPinned={isPinned('identifiers')} onTogglePin={() => togglePin('identifiers')}>
          <div className="flex gap-4 py-1 border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-tertiary)] uppercase">
            <span className="flex-1">Type</span>
            <span className="flex-1">Authority</span>
            <span className="w-6" />
          </div>
          {c.entries.identifiers.map((id) => (
            <div key={id.id} className="flex items-center gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0">
              <span className="flex-1 text-[13px] font-semibold text-[var(--text-primary)]">{id.type}</span>
              <span className="flex-1 text-[13px] text-[var(--text-secondary)]">{id.authority}</span>
              <button className="text-[var(--brand-primary)]"><PencilSimple size={14} /></button>
            </div>
          ))}
          <AddButton label="Add Identifier" onClick={() => {}} />
        </SectionCard>

        {/* System IDs */}
        <SectionCard icon={<Fingerprint size={16} />} title="System Identifiers" cardId="card-sysids" isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}>
          <FieldRow label="Navigator ID" value={c.id} />
          <FieldRow label="CRM Record #" value={`CRM-${c.id.replace(/[^0-9]/g, '').padStart(6, '0')}`} />
        </SectionCard>

        {/* AI Health — hidden when user has disabled stale alerts or the master AI toggle */}
        {notifications.staleAlerts && (
          <SectionCard icon={<Sparkle size={16} weight="duotone" />} title="AI Record Health" cardId="card-aihealth" isEditing={false} onEdit={() => {}} onCancel={() => {}} editable={false}>
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
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

// SectionCard + FieldRow were moved to '@/components/detail/SectionCard'
// so Sales detail pages share the same visual + edit affordances as Contacts.

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

// ═══════════════════════════════════════════
// VISIBILITY & ACCESS CARD
// ═══════════════════════════════════════════

const AVAILABLE_USERS = ['Paul Wentzell', 'Janet Parker', 'Dexter Howell', 'Antonia Hopkins', 'Mercedes Paul', 'Tom Coffee'];

function VisibilityCard({ contact: c }: { contact: ContactWithEntries }) {
  const updateContact = useContactStore((s) => s.updateContact);
  const [showAddUser, setShowAddUser] = useState(false);

  const isPrivate = c.isPrivate ?? false;
  const visibleTo = c.visibleTo || [];
  const createdBy = c.createdBy || 'Unknown';

  const togglePrivate = () => {
    updateContact(c.id, { isPrivate: !isPrivate } as Partial<ContactWithEntries>);
  };

  const addUser = (name: string) => {
    if (!visibleTo.includes(name)) {
      updateContact(c.id, { visibleTo: [...visibleTo, name] } as Partial<ContactWithEntries>);
    }
    setShowAddUser(false);
  };

  const removeUser = (name: string) => {
    updateContact(c.id, { visibleTo: visibleTo.filter((u) => u !== name) } as Partial<ContactWithEntries>);
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

      {/* Created By */}
      <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] text-[var(--text-tertiary)]">Created by</span>
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{createdBy}</span>
      </div>

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

interface FieldConfig {
  key: string;
  label: string;
  value?: string;
  type?: 'text' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
  maxLength?: number;
  validate?: 'email' | 'phone' | 'url' | 'zip' | 'name';
  rules?: ValidationRule[];
  placeholder?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal';
  autoComplete?: string;
}

function buildRulesMap(fields: FieldConfig[]): Record<string, ValidationRule[]> {
  const map: Record<string, ValidationRule[]> = {};
  fields.forEach((f) => {
    const r: ValidationRule[] = [];
    const cleanLabel = f.label.replace(/\s*\(.*?\)/, '');
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

function inputTypeFor(f: FieldConfig): string {
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
  const rulesMap = buildRulesMap(fields);

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
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
            {f.label}{f.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
          </label>
          {f.type === 'select' ? (
            <select value={values[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} onBlur={() => handleBlur(f.key)}
              className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}>
              <option value="">Select</option>
              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea value={values[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} onBlur={() => handleBlur(f.key)} rows={3}
              placeholder={f.placeholder}
              className={`w-full px-2.5 py-2 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none resize-y`} />
          ) : (
            <input
              type={inputTypeFor(f)}
              inputMode={inputModeFor(f)}
              autoComplete={autoCompleteFor(f)}
              value={values[f.key]}
              onChange={(e) => handleChange(f.key, e.target.value)}
              onBlur={() => handleBlur(f.key)}
              placeholder={f.placeholder}
              className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
            />
          )}
          {errors[f.key] && (
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
              <Warning size={12} weight="fill" className="flex-shrink-0" /> {errors[f.key]}
            </div>
          )}
        </div>
      ))}
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

function EntryEditForm({ section, entryId, contact, fields, onSave, onCancel, onDelete }: {
  section: string; entryId: string | null; contact: ContactWithEntries; fields: FieldConfig[];
  onSave: (data: Record<string, string>) => void; onCancel: () => void; onDelete?: () => void;
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
      init[f.key] = existing ? String(existing[f.key] || '') : (f.value || '');
    });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const rulesMap = buildRulesMap(fields);

  const validateKey = (k: string, val: string): string | null => {
    if (!rulesMap[k]) return null;
    return validate({ [k]: rulesMap[k] }, { [k]: val })[k] ?? null;
  };

  const handleChange = (k: string, val: string) => {
    setValues({ ...values, [k]: val });
    if (touched.has(k)) {
      setErrors((e) => ({ ...e, [k]: validateKey(k, val) ?? undefined }));
    }
  };

  const handleBlur = (k: string) => {
    setTouched((t) => new Set(t).add(k));
    setErrors((e) => ({ ...e, [k]: validateKey(k, values[k] || '') ?? undefined }));
  };

  const handleSave = () => {
    const allErrors = validate(rulesMap, values);
    setErrors(allErrors);
    setTouched(new Set(fields.map((f) => f.key)));
    if (!isValid(allErrors)) return;
    onSave(values);
  };

  const inputBorder = (k: string) =>
    errors[k]
      ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
      : 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]';

  const hasAnyError = Object.values(errors).some(Boolean);

  const titleMap: Record<string, string> = { addresses: 'Edit Address', emails: 'Edit Email', phones: 'Edit Phone', websites: 'Edit Website', names: 'Edit Name', identifiers: 'Edit Identifier', industries: 'Edit Industry' };

  return (
    <div className="animate-[fieldSlideIn_0.25s_ease-out]">
      <p className="text-sm font-bold text-[var(--text-primary)] mb-3">{entryId === 'new' ? titleMap[section]?.replace('Edit', 'New') : titleMap[section]}</p>
      <div className="flex flex-col gap-2.5">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              {f.label}{f.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
            </label>
            {f.type === 'select' ? (
              <select value={values[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} onBlur={() => handleBlur(f.key)}
                className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}>
                <option value="">Select</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={inputTypeFor(f)}
                inputMode={inputModeFor(f)}
                autoComplete={autoCompleteFor(f)}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onBlur={() => handleBlur(f.key)}
                placeholder={f.placeholder}
                className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
              />
            )}
            {errors[f.key] && (
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
                <Warning size={12} weight="fill" className="flex-shrink-0" /> {errors[f.key]}
              </div>
            )}
          </div>
        ))}
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
    </div>
  );
}
