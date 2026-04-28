'use client';

import { File, FilePdf, FileDoc, FileText, FileZip, FileVideo, FileAudio, Image, Eye, Trash, Tag } from '@phosphor-icons/react';
import { CrmDocument, formatFileSize, getFileExtension, FileFamily, getExtColor, getExtBgColor } from '@/types/document';
import { fmtDate } from '@/lib/utils';
import InlineCardSettings, { useCardStyleVars, useCardHeaderColor } from '@/components/ui/InlineCardSettings';
import { useIsDark } from '@/hooks/useIsDark';
import FileTypePreview from './FileTypePreview';
import { getTagPillData, getTagIcon } from '@/lib/document-tag-style';
import { dc } from '@/lib/pill-colors';
import FavoriteCell from '@/components/lists/FavoriteCell';

interface Props {
  doc: CrmDocument;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}

const FAMILY_ICON: Record<FileFamily, typeof File> = {
  pdf: FilePdf,
  office: FileDoc,
  text: FileText,
  archive: FileZip,
  video: FileVideo,
  audio: FileAudio,
  image: Image,
  other: File,
};

const FAMILY_COLOR: Record<FileFamily, string> = {
  pdf: '#DC2626',
  office: '#1955A6',
  text: '#7C3AED',
  archive: '#475569',
  video: '#7C3AED',
  audio: '#D97706',
  image: '#0E7490',
  other: '#64748B',
};

/**
 * A single document rendered as a thumbnail card for the card/grid view.
 * Shows a colored header band, file-type icon or thumbnail, name, meta.
 */
export default function DocumentCard({ doc, onPreview, onRemove }: Props) {
  const Icon = FAMILY_ICON[doc.fileFamily];
  const isDark = useIsDark();
  const color = getExtColor(doc.fileName, doc.fileFamily, isDark);
  const ext = getFileExtension(doc.fileName).toUpperCase();
  const isImage = doc.fileFamily === 'image';

  const cardKey = `doc-card-${doc.id}`;
  const cssVars = useCardStyleVars(cardKey);
  const accent = useCardHeaderColor(cardKey);

  return (
    <div
      className="group/icard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer flex flex-col"
      style={cssVars}
      onClick={() => onPreview(doc.id)}
    >
      {accent && <div className="h-1 flex-shrink-0" style={{ background: accent }} />}
      <div className="absolute top-0.5 right-8 z-10">
        <FavoriteCell entityId={doc.id} entityType="document" />
      </div>
      <InlineCardSettings cardId={cardKey} title={doc.name} defaultIconName="File" />
      {/* Thumbnail area — renders real previews when possible:
           Images: <img> from previewUrl or thumbnailUrl
           PDFs: <object> embed (shows first page) when previewUrl exists
           Others: file-type icon */}
      <div className="relative h-[160px] bg-[var(--surface-raised)] flex items-center justify-center overflow-hidden">
        {isImage && (doc.previewUrl || doc.thumbnailUrl) && (doc.previewUrl?.startsWith('data:') || doc.previewUrl?.startsWith('blob:') || doc.thumbnailUrl?.startsWith('data:') || doc.thumbnailUrl?.startsWith('blob:')) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doc.previewUrl || doc.thumbnailUrl || ''} alt={doc.name} className="w-full h-full object-cover" />
        ) : doc.fileFamily === 'pdf' && doc.previewUrl && (doc.previewUrl.startsWith('data:') || doc.previewUrl.startsWith('blob:')) ? (
          <div className="w-full h-full overflow-hidden bg-white" style={{ clipPath: 'inset(2px 10px 0 2px)', borderRadius: 'inherit' }}>
            <iframe
              src={`${doc.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              title={doc.name}
              className="pointer-events-none origin-top-left"
              style={{ width: '300%', height: '300%', transform: 'scale(0.34)', border: 'none', margin: '-2px 0 0 -2px' }}
              tabIndex={-1}
            />
          </div>
        ) : doc.textContent ? (
          <FileTypePreview doc={doc} />
        ) : (
          // Fallback: icon + extension label
          <div className="flex flex-col items-center gap-1">
            <Icon size={44} weight="duotone" style={{ color }} />
            <span className="text-[11px] font-bold" style={{ color }}>{ext}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(doc.id); }}
              className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[var(--brand-primary)] shadow-sm"
              title="Preview"
            >
              <Eye size={16} weight="bold" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(doc.id); }}
              className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[var(--danger)] shadow-sm"
              title="Remove"
            >
              <Trash size={16} weight="bold" />
            </button>
          </div>
        </div>

      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="text-[calc(12px*var(--content-scale,1))] font-bold text-[var(--widget-primary-text)] line-clamp-2 leading-tight">
          {doc.name}
        </div>
        <div className="text-[calc(10px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] flex items-center gap-1.5">
          <span>{formatFileSize(doc.size)}</span>
          <span>·</span>
          <span>{fmtDate(doc.uploadedAt)}</span>
        </div>
        {/* Extension badge + tags */}
        <div className="flex items-center gap-1 flex-wrap mt-auto">
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: isDark ? getExtBgColor(doc.fileName, doc.fileFamily) : `color-mix(in srgb, ${color} 12%, white)`, color, border: `1px solid ${color}` }}>{ext}</span>
          {doc.tags && doc.tags.length > 0 && doc.tags.slice(0, 3).map((t) => {
            // Canonical tag pill — shared with list grid + preview panel so
            // "resume" stays blue + CV icon and "candidate" stays violet
            // everywhere. Source: @/lib/document-tag-style.
            const pill = dc(getTagPillData(t), isDark);
            const TagIcon = getTagIcon(t);
            return (
              <span
                key={t}
                title={t}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border"
                style={{ background: pill.bg, color: pill.color, borderColor: pill.color }}
              >
                <TagIcon size={8} weight="fill" className="flex-shrink-0" />
                {t}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** File-type-specific preview thumbnails that visually match the document format. */
