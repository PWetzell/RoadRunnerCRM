'use client';

import { Sparkle, Warning } from '@phosphor-icons/react';
import { useDocumentStore } from '@/stores/document-store';

export default function DocumentInsightsBar() {
  const documents = useDocumentStore((s) => s.documents);
  const pdfCount = documents.filter((d) => d.fileFamily === 'pdf').length;
  const imageCount = documents.filter((d) => d.fileFamily === 'image').length;
  const uncategorized = documents.filter((d) => d.category === 'other').length;

  return (
    <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-2.5 py-1.5 flex items-center gap-2 rounded-lg w-full h-[32px] overflow-hidden">
      <div className="w-[18px] h-[18px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={11} weight="duotone" className="text-white" />
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">Documents</strong>
        <span> · {documents.length} files</span>
      </div>
      <div className="flex gap-1 flex-wrap ml-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
          {pdfCount} PDFs
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
          {imageCount} images
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${uncategorized > 0 ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]' : 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]'}`}>
          <Warning size={10} /> {uncategorized > 0 ? `${uncategorized} uncategorized` : 'All categorized'}
        </span>
      </div>
    </div>
  );
}
