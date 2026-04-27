'use client';

import { useRouter } from 'next/navigation';
import { TypePickerCard } from './TypePickerCard';
import { ResumeUploadCard } from './ResumeUploadCard';

/**
 * The "What type of contact?" chooser — Person card, Company card, and
 * "or start from a resume" drop zone.
 *
 * Embedded in:
 *   - `/contacts/new` (full page)
 *   - the SlidePanel on `/contacts` when the user clicks "+ New Contact"
 *
 * Picks navigate to the dedicated full-page flow so duplicate detection,
 * AI enrichment, and validation all run in their own focused context.
 */
export function ContactTypeChooser({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  return (
    <div className="w-full max-w-[560px] mx-auto" data-tour="contact-type-chooser">
      <div className="mb-5">
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)]">Add New Contact</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">What type of contact would you like to add?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TypePickerCard type="person" onClick={() => router.push('/contacts/new/person')} />
        <TypePickerCard type="company" onClick={() => router.push('/contacts/new/company')} />
      </div>

      <div className="mt-5" data-tour="contact-type-resume">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 text-center">
          Or start from a resume
        </div>
        <ResumeUploadCard />
      </div>

      {onCancel && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
