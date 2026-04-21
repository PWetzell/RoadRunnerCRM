'use client';

import { File, Warning } from '@phosphor-icons/react';
import { useDocumentStore } from '@/stores/document-store';

export default function DocumentInsightsBar() {
  const documents = useDocumentStore((s) => s.documents);
  const pdfCount = documents.filter((d) => d.fileFamily === 'pdf').length;
  const imageCount = documents.filter((d) => d.fileFamily === 'image').length;
  const uncategorized = documents.filter((d) => d.category === 'other').length;

  return (
    <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
      <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <File size={13} weight="duotone" className="text-white" />
      </div>
      <div className="text-[13px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">Documents</strong>
        <span> · {documents.length} files</span>
      </div>
      <div className="flex gap-1.5 flex-wrap ml-1">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
          {pdfCount} PDFs
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
          {imageCount} images
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${uncategorized > 0 ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]' : 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]'}`}>
          <Warning size={12} weight="fill" /> {uncategorized > 0 ? `${uncategorized} uncategorized` : 'All categorized'}
        </span>
      </div>
    </div>
  );
}
