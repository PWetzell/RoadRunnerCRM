'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DotsSix } from '@phosphor-icons/react';
import { File, FilePdf, FileDoc, FileText, FileZip, FileVideo, FileAudio, Image, X, Download, Trash, PencilSimple, Tag, Buildings, Handbag, Calendar, User } from '@phosphor-icons/react';
import { CrmDocument, formatFileSize, getFileExtension, FileFamily, getExtColor, getExtBgColor } from '@/types/document';
import { fmtDate } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';
import { useListStore, getListsForEntity } from '@/stores/list-store';
import SaveToListPicker from '@/components/lists/SaveToListPicker';
import FileTypePreview from './FileTypePreview';
import { useMemo } from 'react';
import { Star, Bookmark } from '@phosphor-icons/react';
import Link from 'next/link';

interface Props {
  doc: CrmDocument;
  onClose: () => void;
  onRemove: (id: string) => void;
}

const FAMILY_ICON: Record<FileFamily, typeof File> = {
  pdf: FilePdf, office: FileDoc, text: FileText, archive: FileZip, video: FileVideo, audio: FileAudio, image: Image, other: File,
};
const FAMILY_COLOR: Record<FileFamily, string> = {
  pdf: '#DC2626', office: '#1955A6', text: '#7C3AED', archive: '#475569', video: '#7C3AED', audio: '#D97706', image: '#0E7490', other: '#64748B',
};

/**
 * Slide-in preview panel for a selected document. Shows:
 *   - Large visual preview (image inline, PDF placeholder, icon for other)
 *   - File metadata (name, type, size, dates, category)
 *   - Description
 *   - Tags
 *   - Linked contact / deal
 *   - Actions (download, remove, edit name)
 *
 * In a production app the PDF preview would use pdf.js or a cloud viewer
 * (Google Docs Viewer). For the demo we show the file icon + metadata.
 * Images render inline at full resolution.
 */
export default function DocumentPreviewPanel({ doc, onClose, onRemove }: Props) {
  const Icon = FAMILY_ICON[doc.fileFamily];
  const isDark = useIsDark();
  const color = getExtColor(doc.fileName, doc.fileFamily, isDark);
  const ext = getFileExtension(doc.fileName).toUpperCase();
  const isImage = doc.fileFamily === 'image';

  // Lists
  const lists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const pickerOpen = useListStore((s) => s.pickerOpen);
  const pickerEntityId = useListStore((s) => s.pickerEntityId);
  const openPicker = useListStore((s) => s.openPicker);
  const closePicker = useListStore((s) => s.closePicker);
  const toggleFavorite = useListStore((s) => s.toggleFavorite);
  const entityLists = useMemo(() => getListsForEntity(lists, memberships, doc.id, 'document'), [lists, memberships, doc.id]);
  const isInAnyList = entityLists.length > 0;
  const isFav = useMemo(
    () => memberships.some((m) => m.listId === 'list-docs-favorites' && m.entityId === doc.id),
    [memberships, doc.id],
  );
  const showPicker = pickerOpen && pickerEntityId === doc.id;

  // ---- Resizable preview/metadata split ----
  // Stored as the preview area height in pixels. Persists per-session in localStorage.
  const PANEL_STORAGE_KEY = 'roadrunner-doc-preview-height';
  const [previewHeight, setPreviewHeight] = useState<number>(() => {
    if (typeof window === 'undefined') return 360;
    const stored = Number(window.localStorage.getItem(PANEL_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 360;
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PANEL_STORAGE_KEY, String(previewHeight));
    }
  }, [previewHeight]);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: previewHeight };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = ev.clientY - dragState.current.startY;
      const panelHeight = panelRef.current?.offsetHeight ?? window.innerHeight;
      // Reserve ~170px for header + footer + metadata minimum
      const maxH = Math.max(200, panelHeight - 200);
      const next = Math.max(150, Math.min(maxH, dragState.current.startHeight + delta));
      setPreviewHeight(next);
    };
    const onUp = () => {
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [previewHeight]);

  return (
    <div ref={panelRef} className="w-[420px] h-full bg-[var(--surface-card)] border-l border-[var(--border)] flex flex-col shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <span className="text-[13px] font-extrabold text-[var(--text-primary)] flex-1 truncate">Preview</span>
        {/* Favorite — standalone star */}
        <button
          onClick={() => toggleFavorite(doc.id, 'document')}
          title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          aria-label={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          aria-pressed={isFav}
          className="bg-transparent border-none p-1 cursor-pointer flex items-center justify-center hover:bg-[var(--warning-bg)] rounded-[var(--radius-sm)]"
        >
          <Star
            size={16}
            weight={isFav ? 'fill' : 'regular'}
            className={isFav ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)] hover:text-[var(--warning)] transition-colors'}
          />
        </button>
        {/* Save to list — standalone bookmark */}
        <div className="relative inline-flex items-center">
          <button
            onClick={() => showPicker ? closePicker() : openPicker(doc.id, 'document')}
            title={isInAnyList ? `Save to list (in ${entityLists.length} list${entityLists.length === 1 ? '' : 's'})` : 'Save to list'}
            aria-label="Save to list"
            aria-expanded={showPicker}
            className="bg-transparent border-none p-1 cursor-pointer flex items-center justify-center hover:bg-[var(--surface-raised)] rounded-[var(--radius-sm)]"
          >
            <Bookmark
              size={16}
              weight={isInAnyList ? 'fill' : 'regular'}
              className={isInAnyList ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors'}
            />
          </button>
          {showPicker && (
            <SaveToListPicker entityId={doc.id} entityType="document" onClose={closePicker} />
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Preview area — renders actual inline content based on file type.
           Images: native <img>. PDFs: <iframe>/<object>. Text: <pre>.
           Office/other: icon + metadata + open-in-app CTA.
           Height is user-controlled via the draggable divider below. */}
      <div
        style={{ height: previewHeight }}
        className={`bg-[var(--surface-raised)] relative flex-shrink-0 ${
          (isImage && (doc.previewUrl || doc.thumbnailUrl)) || (doc.fileFamily === 'pdf' && doc.previewUrl)
            ? 'flex flex-col items-center justify-center overflow-hidden'
            : 'overflow-auto flex flex-col'
        }`}
      >
        {isImage && (doc.previewUrl || doc.thumbnailUrl) ? (
          // IMAGES — full inline preview
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.previewUrl || doc.thumbnailUrl}
            alt={doc.name}
            className="max-w-full max-h-full object-contain p-2"
          />
        ) : doc.fileFamily === 'pdf' && doc.previewUrl ? (
          // PDFs with a real file — render via iframe/object for inline viewing
          <object
            data={doc.previewUrl}
            type="application/pdf"
            className="w-full h-full min-h-[400px]"
          >
            <iframe
              src={doc.previewUrl}
              title={doc.name}
              className="w-full h-full min-h-[400px] border-none"
            />
          </object>
        ) : doc.fileFamily === 'text' && doc.previewUrl ? (
          // TEXT files with real content — render in a code block
          <TextPreview url={doc.previewUrl} />
        ) : doc.textContent ? (
          // SEED / content-only docs — render type-specific preview
          <FileTypePreview doc={doc} variant="panel" />
        ) : (
          // No preview content available — icon + metadata + open CTA
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 px-4">
            <Icon size={56} weight="duotone" style={{ color }} />
            <span className="text-[14px] font-bold" style={{ color }}>{ext} File</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{doc.fileName}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] text-center px-6">
              {doc.previewUrl
                ? 'This file type cannot be previewed inline. Download to open.'
                : 'Upload the file to enable preview and download.'}
            </span>
            {doc.previewUrl && (
              <a
                href={doc.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[var(--brand-primary)] no-underline hover:underline"
              >
                Open in default app →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Draggable divider — drag up to grow metadata, down to grow preview. */}
      <div
        onMouseDown={onDividerMouseDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize preview"
        className="group/divider flex-shrink-0 h-2 bg-[var(--border)] border-y border-[var(--border)] cursor-ns-resize hover:bg-[var(--brand-primary)]/20 active:bg-[var(--brand-primary)]/40 flex items-center justify-center transition-colors"
      >
        <DotsSix size={12} weight="bold" className="text-[var(--text-tertiary)] group-hover/divider:text-[var(--brand-primary)] rotate-90" />
      </div>

      {/* Metadata — fills remaining space, user-adjustable via divider above */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Name + actions */}
        <div>
          <div className="text-[15px] font-extrabold text-[var(--text-primary)] leading-tight mb-1">{doc.name}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">{doc.fileName}</div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white"
            style={{ background: color }}
          >
            {ext}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">{formatFileSize(doc.size)}</span>
          <span className="text-[11px] text-[var(--text-secondary)]">· {doc.category}</span>
        </div>

        {/* Description */}
        {doc.description && (
          <div className="bg-[var(--surface-raised)] rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Description</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{doc.description}</div>
          </div>
        )}

        {/* Meta rows */}
        <div className="flex flex-col gap-1.5">
          <MetaRow icon={<Calendar size={12} />} label="Uploaded" value={fmtDate(doc.uploadedAt)} />
          <MetaRow icon={<Calendar size={12} />} label="Updated" value={fmtDate(doc.updatedAt)} />
          <MetaRow icon={<User size={12} />} label="By" value={doc.uploadedBy} />
          {doc.contactId && (
            <MetaRow
              icon={<Buildings size={12} />}
              label="Contact"
              value={
                <Link href={`/contacts/${doc.contactId}`} className="text-[var(--brand-primary)] no-underline hover:underline">
                  {doc.contactId}
                </Link>
              }
            />
          )}
          {doc.dealId && (
            <MetaRow
              icon={<Handbag size={12} />}
              label="Deal"
              value={
                <Link href={`/sales/${doc.dealId}`} className="text-[var(--brand-primary)] no-underline hover:underline">
                  {doc.dealId}
                </Link>
              }
            />
          )}
        </div>

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {doc.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                <Tag size={9} weight="bold" /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="flex-shrink-0 border-t border-[var(--border)] p-3 flex items-center gap-2">
        <button
          onClick={() => onRemove(doc.id)}
          className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[11px] font-bold text-[var(--danger)] bg-transparent border border-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer hover:bg-[var(--danger-bg)]"
        >
          <Trash size={12} /> Remove
        </button>
        <div className="flex-1" />
        {doc.previewUrl && (
          <a
            href={doc.previewUrl}
            download={doc.fileName}
            className="inline-flex items-center gap-1.5 h-[32px] px-4 text-[11px] font-bold text-white bg-[var(--brand-primary)] border border-[var(--brand-primary)] rounded-[var(--radius-sm)] no-underline hover:opacity-90"
          >
            <Download size={12} weight="bold" /> Download
          </a>
        )}
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-[var(--text-tertiary)]">{icon}</span>
      <span className="text-[var(--text-tertiary)] w-[70px] flex-shrink-0">{label}</span>
      <span className="text-[var(--text-primary)] font-semibold">{value}</span>
    </div>
  );
}

/**
 * Fetches and renders a text file's content. Used for .txt, .md, .csv,
 * .json, .xml, .yaml, .log files. Shows in a monospace code block with
 * line numbers.
 */
function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((text) => setContent(text))
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return (
      <div className="text-[12px] text-[var(--text-tertiary)] p-4">
        Could not load file content.
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="text-[12px] text-[var(--text-tertiary)] p-4 animate-pulse">
        Loading preview…
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="w-full h-full overflow-auto p-0 text-left">
      <pre className="text-[11px] leading-relaxed font-mono text-[var(--text-primary)] m-0">
        <table className="border-collapse w-full">
          <tbody>
            {lines.slice(0, 200).map((line, i) => (
              <tr key={i} className="hover:bg-[var(--surface-card)]/50">
                <td className="text-[var(--text-tertiary)] text-right pr-3 pl-3 py-0 select-none w-[1%] whitespace-nowrap border-r border-[var(--border-subtle)]">
                  {i + 1}
                </td>
                <td className="pl-3 pr-3 py-0 whitespace-pre">{line || ' '}</td>
              </tr>
            ))}
            {lines.length > 200 && (
              <tr>
                <td colSpan={2} className="text-center text-[10px] text-[var(--text-tertiary)] py-2">
                  …{lines.length - 200} more lines (showing first 200)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </pre>
    </div>
  );
}
