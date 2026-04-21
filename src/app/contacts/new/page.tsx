'use client';

import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { TypePickerCard } from '@/components/contact-flow/TypePickerCard';
import { ResumeUploadCard } from '@/components/contact-flow/ResumeUploadCard';

export default function NewContactTypePickerPage() {
  const router = useRouter();

  return (
    <>
      <Topbar title="Contacts" />
      <div className="flex-1 overflow-y-auto">
        {/* Breadcrumb */}
        <div className="px-6 pt-4 text-[13px] text-[var(--text-tertiary)]">
          <button onClick={() => router.push('/contacts')} className="text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer font-inherit">
            Contacts
          </button>
          <span> / Add New Contact</span>
        </div>

        {/* Centered card */}
        <div className="flex items-center justify-center px-6 py-10">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-sm p-8 w-full max-w-[560px]">
            <div className="mb-6">
              <h1 className="text-[22px] font-extrabold text-[var(--text-primary)]">Add New Contact</h1>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">What type of contact would you like to add?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TypePickerCard type="person" onClick={() => router.push('/contacts/new/person')} />
              <TypePickerCard type="company" onClick={() => router.push('/contacts/new/company')} />
            </div>

            {/* AI shortcut: upload a resume → pre-fills a new candidate. */}
            <div className="mt-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 text-center">
                Or start from a resume
              </div>
              <ResumeUploadCard />
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={() => router.push('/contacts')}
                className="px-5 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
