'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DotsSix } from '@phosphor-icons/react';
import { File, FilePdf, FileDoc, FileText, FileZip, FileVideo, FileAudio, Image, X, Download, Trash, PencilSimple, Tag, Buildings, Handbag, Calendar, User, ArrowsLeftRight, MagnifyingGlass, FolderSimple, Check } from '@phosphor-icons/react';
import { getTagPillData, getTagIcon } from '@/lib/document-tag-style';
import { dc } from '@/lib/pill-colors';
import { CrmDocument, formatFileSize, getFileExtension, FileFamily, getExtColor, getExtBgColor } from '@/types/document';
import { fmtDate } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';
import { useListStore, getListsForEntity } from '@/stores/list-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import SaveToListPicker from '@/components/lists/SaveToListPicker';
import FileTypePreview from './FileTypePreview';
import { useMemo } from 'react';
import { Star, Bookmark } from '@phosphor-icons/react';
import Link from 'next/link';
import { buildSeedPlaceholderBlob } from '@/lib/seed-attachment-placeholders';
import { toast } from '@/lib/toast';
import type { Contact } from '@/types/contact';

interface Props {
  doc: CrmDocument;
  onClose: () => void;
  onRemove: (id: string) => void;
  /** When rendered inside a contact's Documents tab, pass that contact's id
   *  here so the panel can suppress the redundant "Location: {thisContact}"
   *  meta row. The Move button stays visible either way — reassigning a
   *  misfiled doc is a legitimate action from any surface. */
  ambientContactId?: string;
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
export default function DocumentPreviewPanel({ doc, onClose, onRemove, ambientContactId }: Props) {
  const Icon = FAMILY_ICON[doc.fileFamily];
  const isDark = useIsDark();
  const color = getExtColor(doc.fileName, doc.fileFamily, isDark);
  const ext = getFileExtension(doc.fileName).toUpperCase();
  const isImage = doc.fileFamily === 'image';

  // ── Contact resolution ────────────────────────────────────────────
  // The preview used to render `doc.contactId` verbatim (e.g. "per-49",
  // "org-5"), which is only meaningful to the seed-data author. Every
  // mainstream CRM (HubSpot/Salesforce/Pipedrive) shows the human-readable
  // record name with a deep link. We mirror that here.
  const contacts = useContactStore((s) => s.contacts);
  const linkedContact = useMemo(
    () => (doc.contactId ? contacts.find((c) => c.id === doc.contactId) : undefined),
    [contacts, doc.contactId],
  );

  // ── Mutations ─────────────────────────────────────────────────────
  const updateDocument = useDocumentStore((s) => s.updateDocument);

  // ── Move popover state ────────────────────────────────────────────
  const [moveOpen, setMoveOpen] = useState(false);
  const moveBtnRef = useRef<HTMLButtonElement | null>(null);
  const [moveAnchor, setMoveAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    if (!moveOpen) return;
    const measure = () => {
      const rect = moveBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Popover rises above the button (actions sit at panel bottom).
      // We anchor by the button's left edge and give it a comfy width.
      const width = 320;
      const top = rect.top - 8; // 8px gap; popover renders with transform: translateY(-100%)
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      setMoveAnchor({ top, left, width });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [moveOpen]);

  // ── PDF inline-preview URL ────────────────────────────────────────
  // Chromium-based browsers (Chrome, Edge, Opera) block PDFs served from
  // `data:` URLs inside <object>/<iframe> for security reasons — that's why
  // seed-saved PDFs showed the "We can't open this file / Refresh" chrome.
  // Firefox/Safari tolerate it, but to get consistent rendering we convert
  // any data URL to a short-lived blob URL on mount.
  //
  // Additionally: for seed docs that were never saved from email (i.e. have
  // no previewUrl at all) but are declared as PDFs, we synthesize a real
  // placeholder PDF here so the preview pane actually shows something
  // useful instead of a generic icon-only fallback.
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    async function prepare() {
      if (doc.fileFamily !== 'pdf') {
        setPdfBlobUrl(null);
        return;
      }

      // Case 1 — already a blob:/http: URL, use as-is (no conversion needed).
      if (doc.previewUrl && !doc.previewUrl.startsWith('data:')) {
        setPdfBlobUrl(doc.previewUrl);
        return;
      }

      // Case 2 — data URL stored by the save-to-documents flow. Chromium
      // refuses to render these in embedded viewers, so reconstitute as
      // a blob URL.
      if (doc.previewUrl && doc.previewUrl.startsWith('data:')) {
        try {
          const resp = await fetch(doc.previewUrl);
          const blob = await resp.blob();
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          revokedUrl = url;
          setPdfBlobUrl(url);
          return;
        } catch {
          setPdfBlobUrl(null);
          return;
        }
      }

      // Case 3 — seed PDF with no previewUrl. Synthesize a real PDF on
      // the fly so the preview shows the contact name + filename + a
      // recognisable demo layout.
      try {
        const blob = await buildSeedPlaceholderBlob(
          { filename: doc.fileName, mimeType: doc.mimeType, size: doc.size },
          { contactName: linkedContact?.name, subject: doc.description ?? null },
        );
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        setPdfBlobUrl(url);
      } catch {
        setPdfBlobUrl(null);
      }
    }

    prepare();
    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
    // Recompute when the doc identity or its preview-relevant fields change.
  }, [doc.id, doc.previewUrl, doc.fileFamily, doc.fileName, doc.mimeType, doc.size, doc.description, linkedContact?.name]);

  // ── Download handler ──────────────────────────────────────────────
  // Unlike the old anchor-only approach, this works for every doc in the
  // library — including seed docs without a stored previewUrl. If no real
  // bytes exist we synthesize a valid PDF/DOCX/XLSX on the fly using the
  // same placeholder pipeline the email attachment flow uses, so the
  // downloaded file opens cleanly in native viewers.
  const handleDownload = useCallback(async () => {
    try {
      let href: string | null = null;
      let cleanup: (() => void) | null = null;

      // Prefer the already-resolved PDF blob URL (if we prepared one for the
      // inline preview) — saves a second blob creation round-trip. Fall back
      // to the raw previewUrl, then finally to a freshly synthesized blob.
      if (doc.fileFamily === 'pdf' && pdfBlobUrl) {
        href = pdfBlobUrl;
      } else if (doc.previewUrl) {
        href = doc.previewUrl;
      } else {
        const blob = await buildSeedPlaceholderBlob(
          { filename: doc.fileName, mimeType: doc.mimeType, size: doc.size },
          { contactName: linkedContact?.name, subject: doc.description ?? null },
        );
        href = URL.createObjectURL(blob);
        cleanup = () => URL.revokeObjectURL(href as string);
      }

      const a = document.createElement('a');
      a.href = href;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (cleanup) setTimeout(cleanup, 4000);

      toast.success('Download started', { description: doc.fileName });
    } catch (e) {
      toast.error('Download failed', {
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }, [doc, linkedContact, pdfBlobUrl]);

  // ── Move handler ──────────────────────────────────────────────────
  const handleMove = useCallback((target: Contact | null) => {
    const prevContactId = doc.contactId;
    const newContactId = target?.id;
    if (prevContactId === newContactId) {
      setMoveOpen(false);
      return;
    }
    updateDocument(doc.id, { contactId: newContactId });
    setMoveOpen(false);
    toast.success(
      target ? `Moved to ${target.name}` : 'Moved to Library (unassigned)',
      {
        description: doc.fileName,
        action: {
          label: 'Undo',
          onClick: () => updateDocument(doc.id, { contactId: prevContactId }),
        },
      },
    );
  }, [doc.contactId, doc.id, doc.fileName, updateDocument]);

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
          (isImage && (doc.previewUrl || doc.thumbnailUrl)) || (doc.fileFamily === 'pdf' && pdfBlobUrl)
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
        ) : doc.fileFamily === 'pdf' && pdfBlobUrl ? (
          // PDFs — render via iframe/object using a blob URL. Data URLs are
          // converted upstream in the prepare() effect because Chromium
          // blocks data:-URL PDFs in embedded viewers.
          <object
            data={pdfBlobUrl}
            type="application/pdf"
            className="w-full h-full min-h-[400px]"
          >
            <iframe
              src={pdfBlobUrl}
              title={doc.name}
              className="w-full h-full min-h-[400px] border-none"
            />
          </object>
        ) : doc.fileFamily === 'pdf' ? (
          // PDF but the blob URL hasn't resolved yet (first render or fetch
          // in flight). Show a skeleton-ish placeholder instead of jumping
          // to the icon fallback, which would flash on every open.
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 px-4">
            <FilePdf size={56} weight="duotone" style={{ color }} />
            <span className="text-[11px] text-[var(--text-tertiary)] animate-pulse">Preparing preview…</span>
          </div>
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

        {/* File-type pill + size. Category is intentionally omitted — it
             duplicates the tag pills rendered below ("resume", "candidate",
             etc.), which are the canonical surface for that information. */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white"
            style={{ background: color }}
          >
            {ext}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">{formatFileSize(doc.size)}</span>
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
          {/* Suppress the Location row when we're already inside the
               contact's own Documents tab — the parent page header already
               names the contact, so repeating it is noise. Still shown for
               the global /documents library, orphan docs, and deals. */}
          {ambientContactId !== doc.contactId && (
            <MetaRow
              icon={linkedContact?.type === 'person' ? <User size={12} /> : <Buildings size={12} />}
              label="Location"
              value={
                linkedContact ? (
                  // Deep-link to the contact's Documents tab AND open this
                  // specific document's preview on arrival. Clicking Location
                  // from the global /documents library should land the user
                  // exactly where the file lives, not the overview page —
                  // fewer clicks to verify or act on the file in context.
                  <Link
                    href={`/contacts/${linkedContact.id}?tab=documents&docId=${doc.id}`}
                    className="text-[var(--brand-primary)] no-underline hover:underline"
                  >
                    {linkedContact.name}
                  </Link>
                ) : doc.contactId ? (
                  // contactId references a contact that no longer exists —
                  // surface the raw id so the mismatch is visible rather
                  // than silently hiding the orphan.
                  <span className="text-[var(--text-tertiary)] italic">
                    Unknown contact ({doc.contactId})
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">Library (unassigned)</span>
                )
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

        {/* Tags — canonical pill style (icon + color coded by tag name).
             Source of truth: @/lib/document-tag-style. Keeps "resume" blue
             with a CV icon and "candidate" violet with a person icon
             everywhere it renders (list grid, card grid, preview panel). */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {doc.tags.map((t) => {
              const pill = dc(getTagPillData(t), isDark);
              const TagIcon = getTagIcon(t);
              return (
                <span
                  key={t}
                  title={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{ background: pill.bg, color: pill.color, borderColor: pill.color }}
                >
                  <TagIcon size={10} weight="fill" className="flex-shrink-0" />
                  {t}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="flex-shrink-0 border-t border-[var(--border)] p-3 flex items-center gap-2">
        <button
          onClick={() => onRemove(doc.id)}
          title="Remove document"
          className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[11px] font-bold text-[var(--danger)] bg-transparent border border-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer hover:bg-[var(--danger-bg)]"
        >
          <Trash size={12} /> Remove
        </button>
        <button
          ref={moveBtnRef}
          onClick={() => setMoveOpen((v) => !v)}
          title="Move to another contact"
          aria-haspopup="dialog"
          aria-expanded={moveOpen}
          className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[11px] font-bold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
        >
          <ArrowsLeftRight size={12} /> Move
        </button>
        <div className="flex-1" />
        <button
          onClick={handleDownload}
          title="Download document"
          className="inline-flex items-center gap-1.5 h-[32px] px-4 text-[11px] font-bold text-white bg-[var(--brand-primary)] border border-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90"
        >
          <Download size={12} weight="bold" /> Download
        </button>
      </div>

      {/* Move popover — portaled to body with fixed positioning per the
           overlay rule (never rely on z-index bumps inside ancestors). */}
      {moveOpen && moveAnchor && typeof document !== 'undefined' && createPortal(
        <MoveContactPopover
          anchor={moveAnchor}
          currentContactId={doc.contactId}
          onClose={() => setMoveOpen(false)}
          onSelect={handleMove}
        />,
        document.body,
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Move-to-contact popover
// ─────────────────────────────────────────────────────────────────────
/**
 * Popover that lists every contact with a typeahead filter, highlighting
 * the document's current owner. Selecting a row re-assigns the document
 * via useDocumentStore.updateDocument. Also offers an "Unassign" row so
 * the user can drop the doc into the library without a parent record.
 *
 * Positioned via absolute coordinates computed by the parent (fixed) so
 * it survives nested overflow:hidden ancestors on the preview panel.
 */
function MoveContactPopover({
  anchor,
  currentContactId,
  onClose,
  onSelect,
}: {
  anchor: { top: number; left: number; width: number };
  currentContactId?: string;
  onClose: () => void;
  onSelect: (c: Contact | null) => void;
}) {
  const contacts = useContactStore((s) => s.contacts);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Click outside + Esc to close
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? contacts.filter((c) => c.name.toLowerCase().includes(q))
      : contacts;
    // Pin current owner to the top so the user can see what they're moving
    // away from. Cap to 100 rows for perf on large orgs.
    const pinned = list.filter((c) => c.id === currentContactId);
    const rest = list.filter((c) => c.id !== currentContactId);
    return [...pinned, ...rest].slice(0, 100);
  }, [contacts, query, currentContactId]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Move document to contact"
      style={{
        position: 'fixed',
        top: anchor.top,
        left: anchor.left,
        width: anchor.width,
        transform: 'translateY(-100%)',
        zIndex: 1000,
      }}
      className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] flex flex-col max-h-[360px] animate-[fadeUp_0.15s_ease-out]"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
        <ArrowsLeftRight size={14} weight="bold" className="text-[var(--brand-primary)]" />
        <span className="text-[12px] font-extrabold text-[var(--text-primary)] flex-1">
          Move to contact
        </span>
        <button
          onClick={onClose}
          title="Close"
          className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2 bg-[var(--surface-raised)]">
        <MagnifyingGlass size={12} weight="bold" className="text-[var(--text-tertiary)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts…"
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {/* Unassign option — top-pinned utility row */}
      <button
        onClick={() => onSelect(null)}
        className="flex-shrink-0 w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none border-b border-[var(--border-subtle)] cursor-pointer"
      >
        <FolderSimple size={14} className="text-[var(--text-tertiary)]" />
        <span className="flex-1">Library (unassigned)</span>
        {!currentContactId && <Check size={12} weight="bold" className="text-[var(--brand-primary)]" />}
      </button>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[var(--text-tertiary)]">
            No contacts match &ldquo;{query}&rdquo;
          </div>
        ) : (
          filtered.map((c) => {
            const isCurrent = c.id === currentContactId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] bg-transparent border-none cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--brand-bg)] text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {c.type === 'person' ? (
                  <User size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                ) : (
                  <Buildings size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                )}
                <span className="flex-1 truncate font-semibold">{c.name}</span>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">
                    Current
                  </span>
                )}
              </button>
            );
          })
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
