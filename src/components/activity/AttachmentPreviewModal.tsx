'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, DownloadSimple, FloppyDisk, FilePdf, FileDoc, FileText, FileZip, FileVideo, FileAudio, Image as ImageIcon, File as FileIcon } from '@phosphor-icons/react';
import { formatFileSize } from '@/types/document';

/**
 * Inline attachment previewer — opens any file family in a portal'd modal
 * without leaving the contact's Activity panel.
 *
 * Why an inline viewer instead of "Download to view":
 *   Paul's request 2026-04-27 — "need the ability to preview any file."
 *   Modern CRMs (HubSpot's email timeline, Front, Pipedrive) all preview
 *   inbound attachments in-place so reps can scan-and-decide without
 *   round-tripping through the OS file viewer.
 *
 * Render strategy by MIME:
 *   image/*           → <img> at object-url, fits-to-window with zoom-to-fit
 *   application/pdf   → <iframe> using the browser's built-in PDF viewer
 *                       (Chrome/Edge/Firefox/Safari all bundle one)
 *   text/* or json    → decoded UTF-8 in a <pre> with monospace + wrap
 *   video/*           → <video controls> at object-url
 *   audio/*           → <audio controls> at object-url
 *   else (office,zip) → fallback card with Download + Save-to-Documents
 *                       (Office docs need a server-side renderer; outside
 *                       the scope of this in-browser preview)
 *
 * Portal rule: per Paul's overlay-portal memo, this MUST render to
 * document.body with fixed positioning. Z-index alone is not enough —
 * EmailsPanel sits in a scrollable contact card with overflow:hidden
 * ancestors that would clip a non-portal'd modal.
 */

/**
 * Two render modes the modal can be opened in:
 *
 *   1. **Blob mode** — the parent already has the bytes. Used for image,
 *      PDF, text, video, audio, zip — formats the browser can render
 *      natively from a blob URL.
 *
 *   2. **Office-viewer mode** — the parent fetched a signed proxy URL
 *      from `/api/emails/.../preview-url` and passed the `view.officeapps.live.com`
 *      embed URL here. The modal renders that URL in an iframe and Microsoft's
 *      free Office Online viewer renders the document with Word/Excel/
 *      PowerPoint's actual engine. Pixel-perfect — Paul's bar 2026-04-27.
 *
 * Either field can be present; both can be present (e.g. a DOCX where we
 * fetched the URL for preview AND the bytes for Save/Download). The modal
 * picks the highest-fidelity render path available for the file kind.
 */
export interface PreviewableAttachment {
  filename: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  /** view.officeapps.live.com embed URL — preferred for Office formats. */
  viewerUrl?: string;
}

interface Props {
  attachment: PreviewableAttachment | null;
  onClose: () => void;
  onSave?: () => void;
  onDownload?: () => void;
  /** Disables the Save button (e.g. while a save is in-flight or already saved). */
  saveDisabled?: boolean;
  saveLabel?: string;
}

type Kind =
  | 'image' | 'pdf' | 'text' | 'video' | 'audio'
  | 'docx' | 'xlsx' | 'csv' | 'pptx' | 'zip' | 'rtf'
  | 'unknown';

function getKind(mimeType: string, filename: string): Kind {
  const m = (mimeType || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'text/csv' || m === 'application/csv') return 'csv';
  if (m.startsWith('text/') || m === 'application/json' || m === 'application/xml') return 'text';
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || m === 'application/vnd.ms-excel') return 'xlsx';
  if (m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'pptx';
  if (m === 'application/zip' || m === 'application/x-zip-compressed' || m === 'application/x-7z-compressed' || m === 'application/x-rar-compressed' || m === 'application/vnd.rar') return 'zip';
  if (m === 'application/rtf' || m === 'text/rtf') return 'rtf';
  // Heuristic fallback by extension when the server gave us a generic mime.
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico', 'heic'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'mov', 'webm', 'mkv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (ext === 'docx') return 'docx';
  if (['xlsx', 'xls', 'xlsm'].includes(ext)) return 'xlsx';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (['pptx', 'ppt'].includes(ext)) return 'pptx';
  if (['zip', '7z', 'rar', 'tar', 'gz', 'tgz'].includes(ext)) return 'zip';
  if (ext === 'rtf') return 'rtf';
  if (['txt', 'json', 'xml', 'log', 'md', 'yaml', 'yml', 'html', 'htm', 'js', 'ts', 'tsx', 'jsx', 'css', 'sql', 'sh', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'rb', 'php', 'env', 'ini', 'conf', 'toml'].includes(ext)) return 'text';
  return 'unknown';
}

function getFamilyIcon(mimeType: string, filename: string) {
  const kind = getKind(mimeType, filename);
  if (kind === 'image') return ImageIcon;
  if (kind === 'pdf') return FilePdf;
  if (kind === 'video') return FileVideo;
  if (kind === 'audio') return FileAudio;
  if (kind === 'text' || kind === 'csv') return FileText;
  if (kind === 'docx' || kind === 'rtf') return FileDoc;
  if (kind === 'xlsx') return FileDoc;
  if (kind === 'pptx') return FileDoc;
  if (kind === 'zip') return FileZip;
  return FileIcon;
}

export default function AttachmentPreviewModal({
  attachment,
  onClose,
  onSave,
  onDownload,
  saveDisabled,
  saveLabel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Object URL is created when an attachment with bytes is present and
  // revoked on close/swap so we don't leak. Image/PDF/video/audio source
  // from this. In Office-viewer mode, attachment.blob may be undefined
  // (parent only fetched the viewerUrl) — that's fine; the iframe path
  // doesn't need a blob URL.
  const objectUrl = useMemo(() => {
    if (!attachment?.blob) return null;
    return URL.createObjectURL(attachment.blob);
  }, [attachment]);
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Unified parse state for every format that needs decoding before
  // render (text, docx, xlsx, csv, pptx, zip, rtf). Image/PDF/video/audio
  // don't need parsing — they stream directly from objectUrl.
  //
  // Why one state instead of one-per-format: every parse follows the
  // same lifecycle (idle → loading → success/error), and the modal can
  // only render one attachment at a time, so a single discriminated
  // union keeps the render logic readable and the cancellation correct.
  type ParseState =
    | { stage: 'idle' }
    | { stage: 'loading' }
    | { stage: 'xlsx'; sheets: Array<{ name: string; html: string }> }
    | { stage: 'csv'; html: string }
    | { stage: 'pptx'; slides: Array<{ index: number; title: string; bullets: string[] }> }
    | { stage: 'zip'; entries: Array<{ name: string; size: number; isDir: boolean }> }
    | { stage: 'rtf'; text: string }
    | { stage: 'text'; text: string }
    | { stage: 'error'; message: string };
  const [parsed, setParsed] = useState<ParseState>({ stage: 'idle' });

  useEffect(() => {
    if (!attachment) { setParsed({ stage: 'idle' }); return; }
    // Capture blob into a const so TypeScript narrows it through the
    // async closure below (control-flow narrowing doesn't propagate
    // across function boundaries).
    const blob = attachment.blob;
    if (!blob) { setParsed({ stage: 'idle' }); return; }
    // If the parent supplied an Office Online viewer URL, the iframe
    // handles render — no in-browser parse needed regardless of kind.
    if (attachment.viewerUrl) { setParsed({ stage: 'idle' }); return; }
    const kind = getKind(attachment.mimeType, attachment.filename);
    // Stream-rendered formats don't need parsing. DOCX is also handled
    // separately below — docx-preview renders imperatively into a ref'd
    // container so it can keep images, embedded fonts, and Word's page
    // layout intact (mammoth flattened all of that to plaintext-ish HTML
    // and Paul's screenshot 2026-04-27 showed why that's not acceptable —
    // headers, logos, accent colors, and column layout all disappeared).
    if (['image', 'pdf', 'video', 'audio', 'docx', 'unknown'].includes(kind)) {
      setParsed({ stage: 'idle' });
      return;
    }
    setParsed({ stage: 'loading' });
    let cancelled = false;
    (async () => {
      try {
        if (kind === 'text') {
          const text = await blob.text();
          if (!cancelled) setParsed({ stage: 'text', text });
          return;
        }
        if (kind === 'rtf') {
          // Strip RTF control words / groups for a readable plaintext
          // preview. Faithful RTF rendering needs a real parser; for a
          // CRM attachment glance, plaintext-with-line-breaks is enough
          // to decide "is this the doc I want?" Same approach Apple's
          // Quick Look uses for inline RTF in its sidebar peek.
          const raw = await blob.text();
          const text = raw
            .replace(/\\par[d]?/g, '\n')
            .replace(/\\line/g, '\n')
            .replace(/\{\\\*?[^{}]+\}/g, '')
            .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
            .replace(/[{}]/g, '')
            .replace(/\r\n|\r/g, '\n')
            .trim();
          if (!cancelled) setParsed({ stage: 'rtf', text });
          return;
        }
        if (kind === 'csv') {
          // Treat CSV as a one-sheet spreadsheet — sheetjs parses both
          // formats with the same API. Render as a styled HTML table
          // (Excel-online style) so users can scan rows/columns at a
          // glance. Same UX as Google Sheets' inline preview in Drive.
          const xlsx = await import('xlsx');
          const buf = await blob.arrayBuffer();
          const wb = xlsx.read(buf, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const html = xlsx.utils.sheet_to_html(wb.Sheets[sheetName], { editable: false });
          if (!cancelled) setParsed({ stage: 'csv', html });
          return;
        }
        if (kind === 'xlsx') {
          // Multi-sheet workbook — render each sheet as a tab. SheetJS
          // bundles ~700KB; we lazy-load it so users who never preview
          // a spreadsheet don't pay that cost on initial page load.
          const xlsx = await import('xlsx');
          const buf = await blob.arrayBuffer();
          const wb = xlsx.read(buf, { type: 'array' });
          const sheets = wb.SheetNames.map((name) => ({
            name,
            html: xlsx.utils.sheet_to_html(wb.Sheets[name], { editable: false }),
          }));
          if (!cancelled) setParsed({ stage: 'xlsx', sheets });
          return;
        }
        if (kind === 'pptx') {
          // PPTX is a zip of XML — no pure-browser library renders it
          // pixel-perfect. Pragmatic approach: extract title + body
          // text from each slide's XML and render as a stack of slide
          // cards. Loses layout/images but preserves the *content* —
          // which is what reps actually scan for ("does this deck
          // mention pricing?"). Same pattern Slack uses for inline
          // PPTX previews in DMs.
          const { ZipReader, BlobReader, TextWriter } = await import('@zip.js/zip.js');
          const reader = new ZipReader(new BlobReader(blob));
          const entries = await reader.getEntries();
          const slideEntries = entries
            .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.filename))
            .sort((a, b) => {
              const an = parseInt(a.filename.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
              const bn = parseInt(b.filename.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
              return an - bn;
            });
          const slides: Array<{ index: number; title: string; bullets: string[] }> = [];
          for (let i = 0; i < slideEntries.length; i++) {
            const entry = slideEntries[i];
            // zip.js Entry is a union — DirectoryEntry has no getData.
            // We already filtered to slideN.xml paths so this should
            // never hit a directory, but TypeScript can't narrow that
            // from the regex match. Defensive type guard.
            if (entry.directory || typeof entry.getData !== 'function') continue;
            const xml: string = await entry.getData(new TextWriter());
            // Each <a:p> is a paragraph; <a:t> tags hold the actual
            // text runs. Joining the t's per p preserves the line
            // grouping the slide author intended.
            const paragraphs: string[] = [];
            const pMatches = xml.match(/<a:p[\s\S]*?<\/a:p>/g) || [];
            for (const pXml of pMatches) {
              const tMatches: string[] = pXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
              const text = tMatches
                .map((t: string) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"))
                .join('')
                .trim();
              if (text) paragraphs.push(text);
            }
            slides.push({
              index: i + 1,
              title: paragraphs[0] || `Slide ${i + 1}`,
              bullets: paragraphs.slice(1),
            });
          }
          await reader.close();
          if (!cancelled) setParsed({ stage: 'pptx', slides });
          return;
        }
        if (kind === 'zip') {
          // Show file listing — same affordance OSes give in their
          // built-in archive previews. No extraction (we'd need to
          // pick which file to extract, opening UX questions out of
          // scope for an inline modal).
          const { ZipReader, BlobReader } = await import('@zip.js/zip.js');
          const reader = new ZipReader(new BlobReader(blob));
          const entries = await reader.getEntries();
          const list = entries.map((e) => ({
            name: e.filename,
            size: e.uncompressedSize ?? 0,
            isDir: !!e.directory,
          }));
          await reader.close();
          if (!cancelled) setParsed({ stage: 'zip', entries: list });
          return;
        }
      } catch (e) {
        if (!cancelled) {
          setParsed({ stage: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [attachment]);

  // Track which sheet/slide the user is viewing.
  const [activeSheet, setActiveSheet] = useState(0);
  useEffect(() => { setActiveSheet(0); }, [attachment]);

  // High-fidelity DOCX render via docx-preview.
  //
  // Why a separate render path (vs. the unified `parsed` state above):
  //   docx-preview renders *imperatively* into a DOM container — it
  //   walks the OOXML, builds <section>/<p>/<img> nodes with inline
  //   styles for fonts, colors, page sizing, columns, and embedded
  //   images, then appends them to the container we hand it. There's
  //   no HTML-string output to put in `parsed`; the API is "give me a
  //   div ref and a blob, I'll fill the div."
  //
  // Why not mammoth.js (the previous approach):
  //   Mammoth flattens DOCX to *semantic* HTML — paragraphs, headings,
  //   lists. It explicitly drops layout, fonts, accent colors, and
  //   embedded images by default. Paul's resume DOCX has a Digital
  //   Prospectors logo, "love your job" wordmark, blue accent headings,
  //   and a 2-column header — mammoth's output had none of that. His
  //   feedback 2026-04-27: "your preview is far from accurate!!!!!!"
  //
  // docx-preview is what Slack and Notion use for inline DOCX rendering.
  // It's ~200KB lazy-loaded — same bundle-cost regime as mammoth was.
  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  type DocxState =
    | { stage: 'idle' }
    | { stage: 'loading' }
    | { stage: 'ready' }
    | { stage: 'error'; message: string };
  const [docxState, setDocxState] = useState<DocxState>({ stage: 'idle' });

  useEffect(() => {
    if (!attachment) { setDocxState({ stage: 'idle' }); return; }
    // Office-viewer mode wins — skip the docx-preview fallback.
    if (attachment.viewerUrl) { setDocxState({ stage: 'idle' }); return; }
    // Narrow blob into a const so TS keeps it non-undefined inside the
    // async closure below.
    const blob = attachment.blob;
    if (!blob) { setDocxState({ stage: 'idle' }); return; }
    const kind = getKind(attachment.mimeType, attachment.filename);
    if (kind !== 'docx') { setDocxState({ stage: 'idle' }); return; }
    setDocxState({ stage: 'loading' });
    let cancelled = false;
    (async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        // The container is conditionally rendered when kind==='docx', so
        // by the time this effect fires (post-commit) the ref will be
        // attached. If for any reason it isn't, surface a clean error
        // rather than crashing.
        const container = docxContainerRef.current;
        if (!container) {
          if (!cancelled) setDocxState({ stage: 'error', message: 'preview container not ready' });
          return;
        }
        // Clear any previous render (when the user switches between
        // multiple DOCX attachments without closing the modal).
        container.innerHTML = '';
        await renderAsync(blob, container, undefined, {
          // Render a wrapper that simulates Word's "Print Layout" view —
          // pages on a gray canvas. Looks instantly familiar to anyone
          // who's opened Word.
          inWrapper: true,
          // Honor the document's actual page width/height (don't squish
          // letter-sized pages into a narrow modal column — let the
          // user scroll horizontally if needed).
          ignoreWidth: false,
          ignoreHeight: false,
          // Embedded fonts come through, accent colors come through.
          ignoreFonts: false,
          ignoreLastRenderedPageBreak: true,
          // Render headers/footers (this is where "Digital Prospectors"
          // logos typically live in resume templates).
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          // Inline-base64 images instead of blob: URLs — survives modal
          // teardown without dangling object URLs to revoke.
          useBase64URL: true,
          // Break content into pages so the document looks paginated
          // like the source.
          breakPages: true,
          // Default class prefix.
          className: 'docx',
        });
        if (!cancelled) setDocxState({ stage: 'ready' });
      } catch (e) {
        if (!cancelled) {
          setDocxState({ stage: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [attachment]);

  // Esc-to-close keyboard behavior — standard modal affordance.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attachment]);

  if (!mounted || !attachment) return null;

  const kind = getKind(attachment.mimeType, attachment.filename);
  const Icon = getFamilyIcon(attachment.mimeType, attachment.filename);

  const node = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${attachment.filename}`}
    >
      <div
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <Icon size={22} weight="bold" className="text-[var(--text-secondary)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-[var(--text-primary)] truncate" title={attachment.filename}>
              {attachment.filename}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              {attachment.mimeType || 'unknown type'}
              {attachment.size > 0 && <> · {formatFileSize(attachment.size)}</>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-bold border border-[var(--border)] text-[var(--text-secondary)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:opacity-60 disabled:cursor-default"
                title="Save to Documents"
              >
                <FloppyDisk size={12} weight="bold" />
                {saveLabel || 'Save to Documents'}
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-bold border border-[var(--border)] text-[var(--text-secondary)] bg-transparent cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                title="Download to your computer"
              >
                <DownloadSimple size={12} weight="bold" />
                Download
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-tertiary)] cursor-pointer hover:bg-[var(--surface-hover)]"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-[var(--surface-canvas)]">
          {/* Office Online embed — wins over every in-browser path when
              the parent supplied a viewerUrl. Word/Excel/PowerPoint's
              actual rendering engine, served by Microsoft, embedded in
              an iframe. Pixel-perfect: logos, fonts, headers/footers,
              column layout, accent colors, page sizing all preserved.
              When viewerUrl is set, every fallback path below is gated
              off so we never double-render. */}
          {attachment.viewerUrl ? (
            <iframe
              src={attachment.viewerUrl}
              title={attachment.filename}
              className="w-full h-[78vh] border-0 bg-white"
              // Office viewer needs scripts + same-origin to its CDN to
              // load fonts and the renderer. Forms + popups handle
              // download and "open in app" affordances.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (<>
          {kind === 'image' && objectUrl && (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={objectUrl}
                alt={attachment.filename}
                className="max-w-full max-h-[78vh] object-contain rounded"
              />
            </div>
          )}
          {kind === 'pdf' && objectUrl && (
            <iframe
              src={objectUrl}
              title={attachment.filename}
              className="w-full h-[78vh] border-0 bg-white"
            />
          )}
          {kind === 'video' && objectUrl && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <video
                src={objectUrl}
                controls
                className="max-w-full max-h-[78vh] rounded"
              />
            </div>
          )}
          {kind === 'audio' && objectUrl && (
            <div className="w-full flex items-center justify-center p-8">
              <audio src={objectUrl} controls className="w-full max-w-[600px]" />
            </div>
          )}
          {/* Shared shimmer-style loader for any parsed format. The parse
              libraries (mammoth, sheetjs, zip.js) all chunk-load on first
              use, so the wait is real for the first preview of a session. */}
          {parsed.stage === 'loading' && (
            <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--brand-primary)] animate-spin" />
              <div className="text-[12px] text-[var(--text-tertiary)]">Rendering preview…</div>
            </div>
          )}
          {parsed.stage === 'error' && (
            <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Icon size={56} weight="bold" className="text-[var(--text-tertiary)]" />
              <div className="text-[14px] font-bold text-[var(--text-primary)]">
                Couldn&rsquo;t render this file
              </div>
              <div className="text-[12px] text-[var(--text-tertiary)] max-w-[480px] break-words">
                {parsed.message}
              </div>
              <div className="text-[12px] text-[var(--text-tertiary)] max-w-[420px]">
                Try Download to open it in its native app.
              </div>
            </div>
          )}

          {/* Plaintext / source / config — monospace with wrap. */}
          {parsed.stage === 'text' && (
            <div className="p-4">
              <pre className="text-[12px] leading-[1.6] whitespace-pre-wrap break-words font-mono text-[var(--text-primary)]">
                {parsed.text}
              </pre>
            </div>
          )}

          {/* RTF — we strip control words and render as plain text. Faithful
              RTF rendering needs a real parser; for a CRM glance this is enough. */}
          {parsed.stage === 'rtf' && (
            <div className="p-6 bg-white">
              <pre className="text-[14px] leading-[1.7] whitespace-pre-wrap break-words text-[#1a1a1a] max-w-[820px] mx-auto" style={{ fontFamily: 'Calibri, "Segoe UI", system-ui, sans-serif' }}>
                {parsed.text}
              </pre>
            </div>
          )}

          {/* DOCX — high-fidelity render via docx-preview. The library
              draws Word "Print Layout" pages onto a gray canvas with
              embedded fonts, images, accent colors, headers/footers,
              and column layout intact. The container is always
              rendered when kind==='docx' so the ref attaches; the
              loading/error overlays sit on top of (or in place of) it. */}
          {kind === 'docx' && (
            <div className="bg-[#525659] min-h-[78vh] relative">
              {/* docx-preview's default styles handle nearly everything,
                  but we add a small wrapper rule for the gray-canvas look
                  and to keep pages centered with a comfortable gap. */}
              <style>{`
                .docx-host .docx-wrapper { background: transparent; padding: 24px 0; }
                .docx-host .docx-wrapper > section.docx { box-shadow: 0 4px 16px rgba(0,0,0,0.35); margin: 0 auto 24px auto; background: white; }
                .docx-host { color: #1a1a1a; }
              `}</style>
              <div ref={docxContainerRef} className="docx-host" />
              {docxState.stage === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#525659]">
                  <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <div className="text-[12px] text-white/80">Rendering document…</div>
                </div>
              )}
              {docxState.stage === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center bg-[#525659]">
                  <Icon size={56} weight="bold" className="text-white/60" />
                  <div className="text-[14px] font-bold text-white">
                    Couldn&rsquo;t render this document
                  </div>
                  <div className="text-[12px] text-white/70 max-w-[480px] break-words">
                    {docxState.message}
                  </div>
                  <div className="text-[12px] text-white/60 max-w-[420px]">
                    Try Download to open it in Word.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CSV — sheet_to_html gives us a styled <table>; we just need
              to wrap it with consistent borders/padding. */}
          {parsed.stage === 'csv' && (
            <div className="p-4 bg-white">
              <style>{`
                .sheet-preview table { border-collapse: collapse; font-size: 12px; }
                .sheet-preview td, .sheet-preview th { border: 1px solid #e5e5e5; padding: 4px 8px; white-space: nowrap; }
                .sheet-preview tr:first-child td { background: #f5f5f5; font-weight: 600; }
              `}</style>
              <div
                className="sheet-preview overflow-auto text-[#1a1a1a]"
                dangerouslySetInnerHTML={{ __html: parsed.html }}
              />
            </div>
          )}

          {/* XLSX — multi-sheet workbook; tabs let the user switch sheets
              without re-opening the file. Same UX as Google Sheets'
              inline preview in Drive. */}
          {parsed.stage === 'xlsx' && parsed.sheets.length > 0 && (
            <div className="bg-white">
              <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-canvas)] sticky top-0 z-10 overflow-x-auto">
                {parsed.sheets.map((sh, idx) => (
                  <button
                    key={sh.name}
                    type="button"
                    onClick={() => setActiveSheet(idx)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-bold cursor-pointer whitespace-nowrap ${
                      idx === activeSheet
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {sh.name}
                  </button>
                ))}
              </div>
              <div className="p-4">
                <style>{`
                  .sheet-preview table { border-collapse: collapse; font-size: 12px; }
                  .sheet-preview td, .sheet-preview th { border: 1px solid #e5e5e5; padding: 4px 8px; white-space: nowrap; }
                  .sheet-preview tr:first-child td { background: #f5f5f5; font-weight: 600; }
                `}</style>
                <div
                  className="sheet-preview overflow-auto text-[#1a1a1a]"
                  dangerouslySetInnerHTML={{ __html: parsed.sheets[activeSheet]?.html || '' }}
                />
              </div>
            </div>
          )}

          {/* PPTX — slide cards with extracted title + bullets. Loses
              layout/images but preserves the *content* — same pragmatic
              tradeoff Slack makes for inline PPTX previews in DMs. */}
          {parsed.stage === 'pptx' && (
            <div className="p-4 space-y-3">
              {parsed.slides.length === 0 ? (
                <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">
                  No slide text could be extracted from this presentation.
                </div>
              ) : (
                parsed.slides.map((slide) => (
                  <div
                    key={slide.index}
                    className="bg-white border border-[var(--border)] rounded-lg p-6 shadow-sm"
                    style={{ aspectRatio: '16 / 9', minHeight: 200 }}
                  >
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)] mb-2">
                      Slide {slide.index}
                    </div>
                    <div className="text-[18px] font-bold text-[#1a1a1a] mb-3 leading-[1.3]">
                      {slide.title}
                    </div>
                    {slide.bullets.length > 0 && (
                      <ul className="space-y-2 list-disc list-inside text-[13px] text-[#333] leading-[1.6]">
                        {slide.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ZIP / archive — file listing only (matches OS quick-look). */}
          {parsed.stage === 'zip' && (
            <div className="p-4">
              <div className="text-[11px] font-bold text-[var(--text-tertiary)] mb-2 uppercase tracking-wide">
                {parsed.entries.length} item{parsed.entries.length === 1 ? '' : 's'} in archive
              </div>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                {parsed.entries.length === 0 ? (
                  <div className="p-4 text-[13px] text-[var(--text-tertiary)] text-center">
                    Archive is empty.
                  </div>
                ) : (
                  parsed.entries.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] ${
                        i % 2 === 0 ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface-canvas)]'
                      }`}
                    >
                      {entry.isDir ? (
                        <FileZip size={16} weight="bold" className="text-[var(--text-tertiary)] flex-shrink-0" />
                      ) : (
                        <FileIcon size={16} weight="bold" className="text-[var(--text-tertiary)] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 truncate text-[var(--text-primary)]" title={entry.name}>
                        {entry.name}
                      </div>
                      <div className="flex-shrink-0 text-[11px] text-[var(--text-tertiary)] tabular-nums">
                        {entry.isDir ? '—' : formatFileSize(entry.size)}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-3 text-center">
                Download the archive to extract files.
              </div>
            </div>
          )}

          {/* Last-resort fallback — only formats we explicitly can't parse. */}
          {kind === 'unknown' && (
            <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Icon size={56} weight="bold" className="text-[var(--text-tertiary)]" />
              <div className="text-[14px] font-bold text-[var(--text-primary)]">
                Preview isn&rsquo;t available for this file type
              </div>
              <div className="text-[12px] text-[var(--text-tertiary)] max-w-[420px]">
                Download the file to open it in its native app, or save it to Documents
                to keep it with this contact.
              </div>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
