'use client';

import { useState } from 'react';
import { useDocumentStore } from '@/stores/document-store';
import { CrmDocument } from '@/types/document';
import DocumentCard from '@/components/documents/DocumentCard';
import DocumentPreviewPanel from '@/components/documents/DocumentPreviewPanel';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Rows, SquaresFour, File, FilePdf, FileDoc, FileText, FileZip, FileVideo, FileAudio, Image, Eye, Trash } from '@phosphor-icons/react';
import { formatFileSize, getFileExtension, FileFamily, getExtColor, getExtBgColor } from '@/types/document';
import { fmtDate } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';

interface Props {
  /** Filter documents to this contact ID. */
  contactId?: string;
  /** Filter documents to this deal ID. */
  dealId?: string;
}

const FAMILY_ICON: Record<FileFamily, typeof File> = {
  pdf: FilePdf, office: FileDoc, text: FileText, archive: FileZip, video: FileVideo, audio: FileAudio, image: Image, other: File,
};
const FAMILY_COLOR: Record<FileFamily, string> = {
  pdf: '#DC2626', office: '#1955A6', text: '#7C3AED', archive: '#475569', video: '#7C3AED', audio: '#D97706', image: '#0E7490', other: '#64748B',
};

/**
 * Reusable documents sub-tab for contact and sales detail pages.
 * Shows documents linked to a specific contact or deal, with grid/card
 * toggle, upload button, preview panel, and remove confirmation.
 */
export default function DocumentsTab({ contactId, dealId }: Props) {
  const allDocs = useDocumentStore((s) => s.documents);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const isDark = useIsDark();

  const [view, setView] = useState<'grid' | 'card'>('card');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const docs = allDocs.filter((d) => {
    if (contactId && d.contactId === contactId) return true;
    if (dealId && d.dealId === dealId) return true;
    return false;
  });

  const previewDoc = previewId ? docs.find((d) => d.id === previewId) : undefined;

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
            <button
              onClick={() => setView('card')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer border-none transition-colors ${view === 'card' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}
            >
              <SquaresFour size={12} weight="bold" /> Card
            </button>
            <button
              onClick={() => setView('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer border-none transition-colors ${view === 'grid' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}
            >
              <Rows size={12} weight="bold" /> List
            </button>
          </div>

          <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'}
          </span>

          <button
            onClick={() => setUploadOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-primary)] text-white text-[12px] font-bold border-none cursor-pointer hover:opacity-90"
          >
            <Plus size={14} weight="bold" /> Upload
          </button>
        </div>

        {/* Content */}
        {docs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
            <File size={48} weight="duotone" className="text-[var(--text-tertiary)]" />
            <div className="text-[13px] font-bold text-[var(--text-secondary)]">No documents attached</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">Upload a document to get started.</div>
            <button
              onClick={() => setUploadOpen(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--brand-primary)] text-white text-[12px] font-bold border-none cursor-pointer hover:opacity-90"
            >
              <Plus size={14} weight="bold" /> Upload Document
            </button>
          </div>
        ) : view === 'card' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {docs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPreview={(id) => setPreviewId(id)}
                onRemove={(id) => setRemoveTarget(id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)]">Name</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)] w-[80px]">Type</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)] w-[110px]">Category</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)] w-[90px]">Size</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-raised)] border-b border-[var(--border)] w-[100px]">Date</th>
                  <th className="px-3 py-2 bg-[var(--surface-raised)] border-b border-[var(--border)] w-[70px]" />
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const Icon = FAMILY_ICON[doc.fileFamily];
                  const color = getExtColor(doc.fileName, doc.fileFamily, isDark);
                  const ext = getFileExtension(doc.fileName).toUpperCase();
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setPreviewId(doc.id)}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] cursor-pointer transition-colors group"
                    >
                      <td className="px-3 py-2 text-left align-middle">
                        <div className="flex items-center gap-2">
                          <Icon size={16} weight="duotone" style={{ color }} />
                          <span className="text-[12px] font-bold text-[var(--text-primary)] truncate">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-left align-middle">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: isDark ? getExtBgColor(doc.fileName, doc.fileFamily) : `color-mix(in srgb, ${color} 12%, white)`, color, border: `1px solid ${color}` }}>{ext}</span>
                      </td>
                      <td className="px-3 py-2 text-left align-middle text-[11px] text-[var(--text-secondary)] capitalize">{doc.category}</td>
                      <td className="px-3 py-2 text-left align-middle text-[11px] text-[var(--text-secondary)]">{formatFileSize(doc.size)}</td>
                      <td className="px-3 py-2 text-left align-middle text-[11px] text-[var(--text-secondary)]">{fmtDate(doc.uploadedAt)}</td>
                      <td className="px-3 py-2 text-left align-middle">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); setPreviewId(doc.id); }} className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer">
                            <Eye size={12} weight="bold" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setRemoveTarget(doc.id); }} className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer">
                            <Trash size={12} weight="bold" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side preview */}
      {previewDoc && (
        <DocumentPreviewPanel
          doc={previewDoc}
          onClose={() => setPreviewId(null)}
          onRemove={(id) => { setPreviewId(null); setRemoveTarget(id); }}
        />
      )}

      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultContactId={contactId}
        defaultDealId={dealId}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove document?"
        message="This document will be removed from this record."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => { if (removeTarget) removeDocument(removeTarget); setRemoveTarget(null); }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
