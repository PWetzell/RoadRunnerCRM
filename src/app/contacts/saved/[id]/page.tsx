'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { SuccessScreen } from '@/components/contact-flow/SuccessScreen';
import { useContactStore } from '@/stores/contact-store';
import { fmtDate } from '@/lib/utils';

export default function ContactSavedPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enriched?: string; fields?: string; confidence?: string; sources?: string }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const router = useRouter();
  const contact = useContactStore((s) => s.getContact(id));

  if (!contact) {
    if (typeof window !== 'undefined') router.push('/contacts');
    return null;
  }

  const isCompany = contact.type === 'org';
  const primaryEmail = contact.entries?.emails?.find((e) => e.primary)?.value || '';
  const primaryPhone = contact.entries?.phones?.find((p) => p.primary)?.value || '';

  const summary = isCompany
    ? [
        { label: 'Company', value: contact.name },
        { label: 'Industry', value: 'industry' in contact && contact.industry ? contact.industry : '—' },
        { label: 'Website', value: 'website' in contact && contact.website ? contact.website : '—' },
        { label: 'Headquarters', value: 'hq' in contact && contact.hq ? contact.hq : '—' },
        { label: 'Size', value: 'employees' in contact && contact.employees ? `${contact.employees} employees` : '—' },
      ]
    : [
        { label: 'Name', value: contact.name },
        { label: 'Email', value: primaryEmail || '—' },
        { label: 'Title', value: 'title' in contact && contact.title ? contact.title : '—' },
        { label: 'Company', value: 'orgName' in contact && contact.orgName ? contact.orgName : '—' },
        { label: 'Phone', value: primaryPhone || '—' },
      ];

  const enrichmentSummary = sp.enriched === '1'
    ? {
        fieldsAccepted: sp.fields || '—',
        avgConfidence: sp.confidence || '—',
        dataSources: sp.sources || '—',
        qualityLabel: (parseInt(sp.confidence || '0') >= 90 ? 'Excellent' : parseInt(sp.confidence || '0') >= 80 ? 'Good' : 'Fair'),
      }
    : undefined;

  return (
    <>
      <Topbar title="Contacts" />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4 text-[13px] text-[var(--text-tertiary)]">
          <button onClick={() => router.push('/contacts')} className="text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer font-inherit">
            Contacts
          </button>
          <span> / {isCompany ? 'Company Saved' : 'Contact Saved'}</span>
        </div>

        <SuccessScreen
          title={isCompany ? 'Company Saved Successfully!' : 'Contact Saved Successfully!'}
          subtitle={`${contact.name} has been added ${isCompany ? 'with AI-enriched data.' : 'to your contacts.'}`}
          summary={summary}
          contactId={contact.id}
          contactType={isCompany ? 'company' : 'person'}
          variant={isCompany ? 'company' : 'person'}
          qualityScore={isCompany ? parseInt(sp.confidence || '0') || 95 : undefined}
          enrichmentSummary={enrichmentSummary}
        />
      </div>
    </>
  );
}
