'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Warning, X, ArrowClockwise, Plus, File as FileIcon, FilePdf, FileDoc,
  FileText, FileZip, FileVideo, FileAudio, Image, Calendar,
} from '@phosphor-icons/react';
import { CrmDocument, FileFamily, formatFileSize, getFileFamily } from '@/types/document';
import { fmtDate } from '@/lib/utils';

type Choice = 'replace' | 'keep-both' | 'cancel';

interface Props {
  /** The existing document that the new upload collides with. */
  existing: CrmDocument;
  /** The new file the user just picked. */
  incoming: File;
  /** The name we'd save the "Keep both" copy under (e.g. "resume (2).pdf").
   *  Pre-computed by document-store.suggestUniqueFileName so the dialog can
   *  show the user exactly what the new file will be called before they
   *  commit. */
  suggestedAlternateName: string;
  onChoose: (choice: Choice) => void;
}

const FAMILY_ICON: Record<FileFamily, typeof FileIcon> = {
  pdf: FilePdf, office: FileDoc, text: FileText, archive: FileZip,
  video: FileVideo, audio: FileAudio, image: Image, other: FileIcon,
};
const FAMILY_COLOR: Record<FileFamily, string> = {
  pdf: '#DC2626', office: '#1955A6', text: '#7C3AED', archive: '#475569',
  video: '#7C3AED', audio: '#D97706', image: '#0E7490', other: '#64748B',
};

/**
 * Collision prompt shown when the user uploads a file whose name matches a
 * file already attached to the same contact / deal.
 *
 * Mirrors HubSpot's "Replace existing / Upload as new / Cancel" pattern —
 * the safest default for a CRM where silently overwriting a signed offer
 * letter could cost a placement.
 *
 * Layout:
 *   [Warning icon] "A file with this name already exists"
 *   [Existing card]  vs  [Incoming card]   — side-by-side comparison
 *   [Replace existing] [Keep both]
 *   [Cancel]
 *
 * Portaled to document.body with a fixed backdrop per the overlay rule so
 * it renders above the upload modal that spawned it (that one is itself
 * portaled, so stacking with z-index alone isn't reliable).
 */
export default function ReplaceFileDialog({ existing, incoming, suggestedAlternateName, onChoose }: Props) {
  // Escape to cancel — standard affordance expected on all overlay dialogs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChoose('cancel');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onChoose]);

  if (typeof document === 'undefined') return null;

  const incomingFamily = getFileFamily(incoming.type || '', incoming.name);
  const ExistingIcon = FAMILY_ICON[existing.fileFamily];
  const IncomingIcon = FAMILY_ICON[incomingFamily];
  const today = new Date().toISOString().split('T')[0];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1100 }}
      onClick={() => onChoose('cancel')}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        role="alertdialog"
        aria-labelledby="replace-dialog-title"
        aria-describedby="replace-dialog-body"
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[560px] max-w-[95vw] shadow-[0_16px_48px_rgba(0,0,0,0.24)] animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Warning size={18} weight="fill" className="text-[var(--warning)] flex-shrink-0" />
          <span id="replace-dialog-title" className="text-[14px] font-extrabold text-[var(--text-primary)] flex-1">
            A file with this name already exists
          </span>
          <button
            onClick={() => onChoose('cancel')}
            title="Cancel"
            aria-label="Cancel"
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div id="replace-dialog-body" className="px-5 py-4 flex flex-col gap-4">
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed m-0">
            <strong className="text-[var(--text-primary)]">{existing.fileName}</strong> is already
            attached here. Do you want to replace the existing file, or keep both copies?
          </p>

          {/* Side-by-side comparison — makes "am I replacing the right one?"
               answerable at a glance. */}
          <div className="grid grid-cols-2 gap-3">
            <FileCard
              label="Existing"
              icon={<ExistingIcon size={24} weight="duotone" style={{ color: FAMILY_COLOR[existing.fileFamily] }} />}
              fileName={existing.fileName}
              meta={[
                formatFileSize(existing.size),
                `Uploaded ${fmtDate(existing.uploadedAt)}`,
              ]}
              accent="var(--border)"
            />
            <FileCard
              label="Incoming"
              icon={<IncomingIcon size={24} weight="duotone" style={{ color: FAMILY_COLOR[incomingFamily] }} />}
              fileName={incoming.name}
              meta={[
                formatFileSize(incoming.size),
                `Today, ${fmtDate(today)}`,
              ]}
              accent="var(--brand-primary)"
            />
          </div>

          {/* "Keep both" preview — tell the user what the duplicated copy
               will be named BEFORE they click, so there's no surprise. */}
          <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-raised)] rounded-[var(--radius-sm)] px-3 py-2">
            If you keep both, the new file will be saved as{' '}
            <strong className="text-[var(--text-primary)] font-bold">{suggestedAlternateName}</strong>.
            Tags, category, and description from the existing file are <em>not</em> copied.
          </div>
        </div>

        {/* Footer — primary action (Replace) on the right, secondary (Keep
             both) next to it, Cancel on the left. Matches HubSpot + the
             rest of our ConfirmDialog surfaces. */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-2">
          <button
            onClick={() => onChoose('cancel')}
            className="h-[34px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onChoose('keep-both')}
            className="inline-flex items-center gap-1.5 h-[34px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            <Plus size={13} weight="bold" /> Keep both
          </button>
          <button
            onClick={() => onChoose('replace')}
            autoFocus
            className="inline-flex items-center gap-1.5 h-[34px] px-5 text-[12px] font-bold text-white border border-[var(--brand-primary)] bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90"
          >
            <ArrowClockwise size={13} weight="bold" /> Replace existing
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FileCard({
  label, icon, fileName, meta, accent,
}: {
  label: string;
  icon: React.ReactNode;
  fileName: string;
  meta: string[];
  accent: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-[var(--radius-sm)] border bg-[var(--surface-raised)]"
      style={{ borderColor: accent }}
    >
      <div className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>
        {label}
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-[var(--text-primary)] leading-tight break-all">
            {fileName}
          </div>
          {meta.map((m, i) => (
            <div key={i} className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
              {i === 1 && <Calendar size={9} />}
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
