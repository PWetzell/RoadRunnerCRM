'use client';

import { useState, useRef } from 'react';
import { UploadSimple, X, File as FileIcon } from '@phosphor-icons/react';
import { useDocumentStore } from '@/stores/document-store';
import { CrmDocument, DOCUMENT_CATEGORIES, DocumentCategory, formatFileSize } from '@/types/document';
import { useUserStore } from '@/stores/user-store';
import { toast } from '@/lib/toast';
import ReplaceFileDialog from './ReplaceFileDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill association when uploading from a contact or deal detail page. */
  defaultContactId?: string;
  defaultDealId?: string;
}

/**
 * Modal dialog for uploading a document from the user's hard drive.
 * Supports any file type. The user picks a file, sets a category and
 * optional description, and clicks Upload. The file is stored in memory
 * (object URL) for the demo — no server round-trip.
 */
export default function UploadDocumentDialog({ open, onClose, defaultContactId, defaultDealId }: Props) {
  const attachFile = useDocumentStore((s) => s.attachFile);
  const findDuplicate = useDocumentStore((s) => s.findDuplicate);
  const replaceDocumentBytes = useDocumentStore((s) => s.replaceDocumentBytes);
  const suggestUniqueFileName = useDocumentStore((s) => s.suggestUniqueFileName);
  const updateDocument = useDocumentStore((s) => s.updateDocument);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const user = useUserStore((s) => s.user);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Collision dialog state — populated after handleUpload detects that a
  // file with the same name is already attached to this scope (contact/deal).
  const [collision, setCollision] = useState<{
    existing: CrmDocument;
    incoming: File;
    suggestedAlternateName: string;
  } | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setFile(null);
    setDescription('');
    setCategory('other');
    setCollision(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = () => {
    if (!file) return;

    // HubSpot-style collision check: scope is (contactId, dealId). Two
    // different candidates can legitimately both have a "resume.pdf"; the
    // same contact with two "resume.pdf" entries is what we flag.
    const existing = findDuplicate({
      fileName: file.name,
      contactId: defaultContactId,
      dealId: defaultDealId,
    });

    if (existing) {
      setCollision({
        existing,
        incoming: file,
        suggestedAlternateName: suggestUniqueFileName({
          fileName: file.name,
          contactId: defaultContactId,
          dealId: defaultDealId,
        }),
      });
      return; // Await user's choice in the ReplaceFileDialog.
    }

    // No collision — straight-through create.
    attachFile(file, {
      category,
      description: description.trim() || undefined,
      contactId: defaultContactId,
      dealId: defaultDealId,
      uploadedBy: user.name,
    });
    toast.success('Document uploaded', { description: file.name });
    resetForm();
    onClose();
  };

  // ── Collision resolution handlers ────────────────────────────────
  //
  // Three branches, all three produce undoable toasts. The undo handlers
  // capture the pre-change snapshot so we can revert precisely — including
  // the case where Replace wipes previewUrl (we restore the old doc object
  // wholesale, not just the bytes, so tags/category/description survive
  // the round trip).

  const handleReplace = () => {
    if (!collision) return;
    const { existing, incoming } = collision;
    // Snapshot BEFORE the mutation so Undo can restore the exact prior
    // state. replaceDocumentBytes also returns this, but capturing here
    // keeps the undo closure self-contained.
    const snapshot = { ...existing };
    replaceDocumentBytes(existing.id, incoming);
    // If the user edited category/description in the upload form before
    // hitting Upload, honour those edits on the replaced doc too — matches
    // what they'd expect from having filled the form out.
    const patch: Partial<CrmDocument> = {};
    if (category !== 'other' && category !== existing.category) patch.category = category;
    const trimmedDesc = description.trim();
    if (trimmedDesc && trimmedDesc !== existing.description) patch.description = trimmedDesc;
    if (Object.keys(patch).length > 0) updateDocument(existing.id, patch);

    toast.success('Replaced existing file', {
      description: incoming.name,
      action: {
        label: 'Undo',
        onClick: () => {
          // Remove the replaced record and restore the old doc wholesale.
          // We use removeDocument + addDocument rather than updateDocument
          // because the snapshot includes a previewUrl that's an object URL
          // from the prior session — replacing in-place via updateDocument
          // would work, but this is unambiguous and symmetric with the
          // Keep-both undo below.
          removeDocument(existing.id);
          addDocument(snapshot);
        },
      },
    });
    resetForm();
    onClose();
  };

  const handleKeepBoth = () => {
    if (!collision) return;
    const { incoming, suggestedAlternateName } = collision;
    const created = attachFile(incoming, {
      category,
      description: description.trim() || undefined,
      contactId: defaultContactId,
      dealId: defaultDealId,
      uploadedBy: user.name,
      fileNameOverride: suggestedAlternateName,
    });
    toast.success('Uploaded new copy', {
      description: suggestedAlternateName,
      action: {
        label: 'Undo',
        onClick: () => removeDocument(created.id),
      },
    });
    resetForm();
    onClose();
  };

  const handleCancelCollision = () => setCollision(null);

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[520px] max-w-[95vw] shadow-lg animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-[14px] font-extrabold text-[var(--text-primary)]">Upload Document</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-[var(--brand-primary)] bg-[var(--brand-bg)]'
                : file
                ? 'border-[var(--success)] bg-[var(--success-bg)]'
                : 'border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--surface-raised)]'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <FileIcon size={32} weight="duotone" className="text-[var(--success)]" />
                <div className="text-left">
                  <div className="text-[13px] font-bold text-[var(--text-primary)]">{file.name}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{formatFileSize(file.size)} · {file.type || 'unknown type'}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-2 text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadSimple size={32} weight="duotone" className="text-[var(--text-tertiary)]" />
                <div className="text-[13px] font-bold text-[var(--text-primary)]">Drop a file here or click to browse</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT, RTF, JPG, PNG, GIF, SVG, BMP, MP4, MOV, MP3, WAV, ZIP</div>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full h-[34px] px-2.5 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-primary)]"
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this document about?"
              rows={3}
              className="w-full px-2.5 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none resize-y focus:border-[var(--brand-primary)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-[34px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file}
            className={`h-[34px] px-5 text-[12px] font-bold text-white rounded-[var(--radius-sm)] border-none cursor-pointer ${
              file ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--text-tertiary)] cursor-not-allowed'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <UploadSimple size={14} weight="bold" /> Upload
            </span>
          </button>
        </div>
      </div>
    </div>

    {/* Collision prompt — renders on top of the upload modal when the
         picked file's name already exists in this scope. HubSpot pattern:
         Replace / Keep both / Cancel. Portaled to document.body internally. */}
    {collision && (
      <ReplaceFileDialog
        existing={collision.existing}
        incoming={collision.incoming}
        suggestedAlternateName={collision.suggestedAlternateName}
        onChoose={(choice) => {
          if (choice === 'replace') handleReplace();
          else if (choice === 'keep-both') handleKeepBoth();
          else handleCancelCollision();
        }}
      />
    )}
    </>
  );
}
