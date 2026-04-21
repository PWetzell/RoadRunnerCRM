'use client';

import { useState } from 'react';
import { Deal } from '@/types/deal';
import { Contact, Person, Organization } from '@/types/contact';
import { IdentificationCard, Buildings, CalendarCheck } from '@phosphor-icons/react';
import { DEAL_SOURCES } from '@/types/deal';
import { fmtDate } from '@/lib/utils';
import { LeadCompleteness } from '@/lib/leadCompleteness';
import SectionCard, { FieldRow } from '@/components/detail/SectionCard';
import CardEditForm from '@/components/detail/CardEditForm';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { isEmail, isPhone, isUrl, isPositiveNumber, isDate, maxLength, oneOf } from '@/lib/validation';

interface Props {
  deal: Deal;
  person?: Contact;
  org?: Contact;
  completeness: LeadCompleteness;
}

type EditingCard = 'identity' | 'engagement' | null;

/**
 * Details tab — lead-type aware. Mirrors the editable-card pattern from the
 * Contacts detail page: each card has a pencil toggle, an inline edit form
 * with Cancel/Save, and writes back through the appropriate store.
 *
 * Writes:
 *   Person identity card  -> updateContact on the linked Person
 *   Company identity card -> updateContact on the linked Organization
 *   Engagement card       -> updateDeal (deal-level fields)
 */
export default function SalesDetailsTab({ deal, person, org, completeness }: Props) {
  const updateDeal = useSalesStore((s) => s.updateDeal);
  const updateContact = useContactStore((s) => s.updateContact);

  const [editing, setEditing] = useState<EditingCard>(null);
  const isPerson = deal.type === 'person';
  const missingSet = new Set(completeness.fields.filter((f) => !f.filled).map((f) => f.id));

  const personData = person && person.type === 'person' ? (person as Person) : undefined;
  const orgData = org && org.type === 'org' ? (org as Organization) : undefined;

  function savePerson(v: Record<string, string>) {
    if (!personData) return;
    updateContact(personData.id, {
      name: v.name || personData.name,
      title: v.title || undefined,
      department: v.department || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
      orgName: v.orgName || undefined,
    });
    setEditing(null);
  }

  function saveCompany(v: Record<string, string>) {
    if (!orgData) return;
    updateContact(orgData.id, {
      name: v.name || orgData.name,
      industry: v.industry || undefined,
      employees: v.employees || undefined,
      hq: v.hq || undefined,
      website: v.website || undefined,
      description: v.description || undefined,
    });
    setEditing(null);
  }

  function saveEngagement(v: Record<string, string>) {
    updateDeal(deal.id, {
      name: v.name || deal.name,
      amount: v.amount ? Number(v.amount) : deal.amount,
      expectedCloseDate: v.expectedCloseDate || undefined,
      targetStartDate: v.targetStartDate || undefined,
      source: (v.source as Deal['source']) || deal.source,
      owner: v.owner || '',
      initiative: v.initiative || undefined,
    });
    setEditing(null);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Identity card — person or company based on lead type */}
      {isPerson ? (
        <SectionCard
          icon={<IdentificationCard size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Person"
          isEditing={editing === 'identity'}
          onEdit={() => setEditing('identity')}
          onCancel={() => setEditing(null)}
          editable={Boolean(personData)}
          incomplete={!personData || missingSet.has('title') || missingSet.has('email') || missingSet.has('phone')}
          cardId="sales-details-person"
        >
          {!personData ? (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">
              No person linked. Link a contact from the Overview tab.
            </div>
          ) : editing === 'identity' ? (
            <CardEditForm
              onCancel={() => setEditing(null)}
              onSave={savePerson}
              fields={[
                { key: 'name', label: 'Name', value: personData.name, full: true, required: true, rules: [maxLength('Name', 120)] },
                { key: 'title', label: 'Title', value: personData.title, placeholder: 'e.g. VP of Engineering', rules: [maxLength('Title', 120)] },
                { key: 'department', label: 'Department', value: personData.department, rules: [maxLength('Department', 80)] },
                { key: 'email', label: 'Email', value: personData.email, placeholder: 'name@company.com', rules: [isEmail()] },
                { key: 'phone', label: 'Phone', value: personData.phone, placeholder: '+1 555 123 4567', rules: [isPhone()] },
                { key: 'orgName', label: 'Current Company', value: personData.orgName, placeholder: 'Leave blank if between roles', full: true, rules: [maxLength('Current Company', 120)] },
              ]}
            />
          ) : (
            <>
              <FieldRow label="Name" value={personData.name} />
              <FieldRow label="Title" value={personData.title} />
              <FieldRow label="Department" value={personData.department} />
              <FieldRow label="Email" value={personData.email} />
              <FieldRow label="Phone" value={personData.phone} />
              <FieldRow label="Current Company" value={personData.orgName} />
            </>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          icon={<Buildings size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Company"
          isEditing={editing === 'identity'}
          onEdit={() => setEditing('identity')}
          onCancel={() => setEditing(null)}
          editable={Boolean(orgData)}
          incomplete={!orgData || missingSet.has('industry') || missingSet.has('hq')}
          cardId="sales-details-company"
        >
          {!orgData ? (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">
              No company linked to this lead yet.
            </div>
          ) : editing === 'identity' ? (
            <CardEditForm
              onCancel={() => setEditing(null)}
              onSave={saveCompany}
              fields={[
                { key: 'name', label: 'Name', value: orgData.name, full: true, required: true, rules: [maxLength('Name', 120)] },
                { key: 'industry', label: 'Industry', value: orgData.industry, placeholder: 'e.g. SaaS, Fintech', rules: [maxLength('Industry', 80)] },
                { key: 'employees', label: 'Employees', value: orgData.employees, placeholder: '50-100', rules: [oneOf('Employees', ['1-10','11-25','25-50','50-100','100-250','250-500','500-1000','1000+'])] },
                { key: 'hq', label: 'HQ', value: orgData.hq, placeholder: 'City, State', required: true, rules: [maxLength('HQ', 120)] },
                { key: 'website', label: 'Website', value: orgData.website, placeholder: 'example.com', rules: [isUrl()] },
                { key: 'description', label: 'Description', type: 'textarea', value: orgData.description, full: true, placeholder: 'Short description of what this company does', rules: [maxLength('Description', 500)] },
              ]}
            />
          ) : (
            <>
              <FieldRow label="Name" value={orgData.name} />
              <FieldRow label="Industry" value={orgData.industry} />
              <FieldRow label="Employees" value={orgData.employees} />
              <FieldRow label="HQ" value={orgData.hq} />
              <FieldRow label="Website" value={orgData.website} />
              <FieldRow label="Description" value={orgData.description} small />
            </>
          )}
        </SectionCard>
      )}

      {/* Engagement card — deal-level fields, always editable */}
      <SectionCard
        icon={<CalendarCheck size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
        title="Engagement"
        isEditing={editing === 'engagement'}
        onEdit={() => setEditing('engagement')}
        onCancel={() => setEditing(null)}
        incomplete={!deal.amount || !deal.expectedCloseDate || !deal.owner || !deal.source}
        cardId="sales-details-engagement"
      >
        {editing === 'engagement' ? (
          <CardEditForm
            onCancel={() => setEditing(null)}
            onSave={saveEngagement}
            fields={[
              { key: 'name', label: 'Deal title', value: deal.name, full: true, required: true, rules: [maxLength('Deal title', 120)] },
              { key: 'amount', label: 'Deal amount', type: 'number', value: deal.amount || '', placeholder: '0', required: true, rules: [isPositiveNumber()] },
              { key: 'expectedCloseDate', label: 'Expected close', type: 'date', value: deal.expectedCloseDate, required: true, rules: [isDate()] },
              { key: 'targetStartDate', label: 'Target start', type: 'date', value: deal.targetStartDate, rules: [isDate()] },
              { key: 'source', label: 'Source', type: 'select', value: deal.source, options: [...DEAL_SOURCES] },
              { key: 'owner', label: 'Owner', value: deal.owner, placeholder: 'Assignee name', required: true, rules: [maxLength('Owner', 60)] },
              ...(!isPerson
                ? [{ key: 'initiative' as const, label: 'Initiative', type: 'textarea' as const, value: deal.initiative, full: true, placeholder: 'What project or hire is driving this deal?', rules: [maxLength('Initiative', 500)] }]
                : []),
            ]}
          />
        ) : (
          <>
            <FieldRow label="Deal title" value={deal.name} />
            <FieldRow label="Deal amount" value={deal.amount ? `$${deal.amount.toLocaleString()}` : undefined} />
            <FieldRow label="Expected close" value={deal.expectedCloseDate ? fmtDate(deal.expectedCloseDate) : undefined} />
            <FieldRow label="Target start" value={deal.targetStartDate ? fmtDate(deal.targetStartDate) : undefined} />
            <FieldRow label="Source" value={deal.source} />
            <FieldRow label="Owner" value={deal.owner} />
            {!isPerson && <FieldRow label="Initiative" value={deal.initiative} small />}
          </>
        )}
      </SectionCard>
    </div>
  );
}
