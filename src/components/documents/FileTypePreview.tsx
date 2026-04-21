'use client';

import { FileZip, Image } from '@phosphor-icons/react';
import { CrmDocument, getFileExtension } from '@/types/document';

interface Props {
  doc: CrmDocument;
  /** 'card' = thumbnail-sized (small fonts); 'panel' = full preview (readable fonts, scrollable). */
  variant?: 'card' | 'panel';
}

/**
 * Renders a file-type-specific text preview for documents that don't have a
 * real previewable file (seed data with textContent only). Used by both the
 * DocumentCard thumbnail and the larger DocumentPreviewPanel.
 *
 * Panel variant is scrollable with consistent padding; card variant is a
 * fixed-height thumbnail with tiny fonts.
 */
export default function FileTypePreview({ doc, variant = 'card' }: Props) {
  const ext = getFileExtension(doc.fileName).toLowerCase();
  const text = doc.textContent || '';
  const isPanel = variant === 'panel';

  // PPTX — slide-style: dark header bar, centered large text, slide aspect
  if (ext === 'pptx' || ext === 'ppt') {
    const lines = text.split('\n').filter(Boolean);
    const title = lines[0] || '';
    const subtitle = lines[1] || '';
    const bullets = lines.slice(2, isPanel ? 20 : 8);

    if (isPanel) {
      return (
        <div className="w-full min-h-full bg-[#1B2A4A] flex flex-col overflow-auto">
          <div className="h-2 bg-[#E97319] flex-shrink-0" />
          <div className="flex flex-col px-10 py-8">
            <div className="text-[22px] font-bold text-white leading-tight mb-3">{title}</div>
            {subtitle && (
              <div className="text-[13px] text-[#94A3B8] mb-4">{subtitle}</div>
            )}
            {bullets.map((b, i) => (
              <div key={i} className="text-[12px] leading-[1.7] text-[#CBD5E1]">
                • {b.replace(/^[•\-]\s*/, '')}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Card variant
    return (
      <div className="w-full h-full bg-[#1B2A4A] flex flex-col overflow-hidden">
        <div className="h-1 bg-[#E97319] flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-center px-4 py-2">
          <div className="text-[9px] font-bold text-white leading-tight mb-1 line-clamp-2">{title}</div>
          {subtitle && <div className="text-[7px] text-[#94A3B8] mb-2 line-clamp-1">{subtitle}</div>}
          {bullets.map((b, i) => (
            <div key={i} className="text-[6px] text-[#CBD5E1] leading-[1.6] line-clamp-1">
              • {b.replace(/^[•\-]\s*/, '')}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // XLSX / XLS / CSV — spreadsheet-style
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const lines = text.split('\n').filter(Boolean).slice(0, isPanel ? 40 : 10);
    return (
      <div className={`w-full bg-white flex flex-col ${isPanel ? 'min-h-full overflow-auto' : 'h-full overflow-hidden'}`}>
        <div className={`${isPanel ? 'h-7' : 'h-4'} bg-[#217346] flex items-center px-2 flex-shrink-0 sticky top-0`}>
          <span className={`${isPanel ? 'text-[10px]' : 'text-[6px]'} font-bold text-white`}>Sheet1</span>
        </div>
        <div className={`flex-1 ${isPanel ? 'py-2' : ''}`}>
          {lines.map((line, i) => {
            const cells = line.split('\t').length > 1 ? line.split('\t') : line.split(/\s{2,}/);
            return (
              <div
                key={i}
                className={`flex border-b border-[#E2E8F0] ${i === 0 ? 'bg-[#F1F5F9] font-bold' : ''}`}
              >
                <div className={`${isPanel ? 'w-8 text-[9px]' : 'w-4 text-[5px]'} flex-shrink-0 bg-[#F8FAFC] border-r border-[#E2E8F0] flex items-center justify-center text-[#94A3B8]`}>
                  {i + 1}
                </div>
                {cells.slice(0, isPanel ? 8 : 5).map((cell, j) => (
                  <div
                    key={j}
                    className={`flex-1 px-2 py-1 ${isPanel ? 'text-[10px]' : 'text-[5px]'} text-[#334155] truncate border-r border-[#F1F5F9]`}
                  >
                    {cell.trim()}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // DOCX / DOC — Word-style: white page with serif text
  if (ext === 'docx' || ext === 'doc') {
    return (
      <div className={`w-full bg-white ${isPanel ? 'min-h-full overflow-auto px-10 py-8' : 'h-full overflow-hidden px-3 py-2'}`}>
        <div className={`border-l-2 border-[#2B5797] ${isPanel ? 'pl-4' : 'pl-2'}`}>
          <p
            className={`${isPanel ? 'text-[13px]' : 'text-[6.5px]'} leading-[1.6] text-[#1E293B] whitespace-pre-wrap break-words m-0`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {text.slice(0, isPanel ? 5000 : 600)}
          </p>
        </div>
      </div>
    );
  }

  // ZIP / archive — file listing style
  if (ext === 'zip' || ext === 'tar' || ext === 'gz' || ext === 'rar' || ext === '7z') {
    const lines = text.split('\n').filter(Boolean).slice(0, isPanel ? 60 : 12);
    return (
      <div className={`w-full bg-[#F8FAFC] flex flex-col ${isPanel ? 'min-h-full overflow-auto' : 'h-full overflow-hidden'}`}>
        <div className={`${isPanel ? 'h-9' : 'h-5'} bg-[#475569] flex items-center px-3 gap-2 flex-shrink-0 sticky top-0`}>
          <FileZip size={isPanel ? 14 : 8} weight="bold" className="text-white" />
          <span className={`${isPanel ? 'text-[11px]' : 'text-[6px]'} font-bold text-white truncate`}>{doc.fileName}</span>
        </div>
        <div className={`${isPanel ? 'px-6 py-4' : 'px-2 py-1'}`}>
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${isPanel ? 'text-[11px] leading-[1.8]' : 'text-[6px] leading-[1.5]'} text-[#475569] truncate font-mono`}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PDF — document page style
  if (ext === 'pdf') {
    return (
      <div className={`w-full bg-white ${isPanel ? 'min-h-full overflow-auto px-10 py-8' : 'h-full overflow-hidden px-3 py-2'}`}>
        <p className={`${isPanel ? 'text-[13px]' : 'text-[6.5px]'} leading-[1.6] text-[#1E293B] whitespace-pre-wrap break-words m-0`}>
          {text.slice(0, isPanel ? 5000 : 600)}
        </p>
      </div>
    );
  }

  // Image with text content (no real image file) — muted card
  if (doc.fileFamily === 'image') {
    return (
      <div className={`w-full bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF] flex items-center justify-center overflow-hidden ${isPanel ? 'min-h-full py-16 px-8' : 'h-full p-3'}`}>
        <div className="text-center">
          <Image size={isPanel ? 72 : 28} weight="duotone" className="text-[#0E7490] mx-auto mb-2" />
          <p className={`${isPanel ? 'text-[14px]' : 'text-[7px]'} text-[#0E7490] font-semibold line-clamp-3`}>{doc.name}</p>
          {isPanel && doc.description && (
            <p className="text-[12px] text-[#0E7490]/80 mt-3 max-w-sm mx-auto leading-relaxed">{doc.description}</p>
          )}
        </div>
      </div>
    );
  }

  // Generic fallback — plain text
  return (
    <div className={`w-full bg-white ${isPanel ? 'min-h-full overflow-auto p-8' : 'h-full overflow-hidden p-3'}`}>
      <p className={`${isPanel ? 'text-[13px]' : 'text-[7px]'} leading-[1.5] text-[#334155] font-sans whitespace-pre-wrap break-words m-0`}>
        {text.slice(0, isPanel ? 5000 : 500)}
      </p>
    </div>
  );
}
