'use client';

import { useState, useRef } from 'react';
import { UploadSimple, X, File as FileIcon } from '@phosphor-icons/react';
import { useDocumentStore } from '@/stores/document-store';
import { DOCUMENT_CATEGORIES, DocumentCategory, formatFileSize } from '@/types/document';
import { useUserStore } from '@/stores/user-store';
import { toast } from '@/lib/toast';

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
  const user = useUserStore((s) => s.user);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = () => {
    if (!file) return;
    const name = file.name;
    attachFile(file, {
      category,
      description: description.trim() || undefined,
      contactId: defaultContactId,
      dealId: defaultDealId,
      uploadedBy: user.name,
    });
    toast.success('Document uploaded', { description: name });
    setFile(null);
    setDescription('');
    setCategory('other');
    onClose();
  };

  return (
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
  );
}
