/**
 * Document management types for the CRM.
 *
 * Documents can be attached to contacts, deals, or exist standalone.
 * The system supports any file type — the preview/thumbnail engine adapts
 * based on MIME type:
 *   - Images (jpg/png/gif/webp/svg) → inline thumbnail + lightbox
 *   - PDF → first-page thumbnail + inline viewer
 *   - Office docs → icon + metadata card (no inline preview in demo)
 *   - Other → icon + file info
 *
 * In a production system, files would upload to S3/Cloudflare R2 and
 * thumbnails would be generated server-side. For this portfolio demo,
 * we store file metadata + a local object URL for attached files, and
 * use seed data with placeholder thumbnails for demo state.
 */

export type DocumentCategory =
  | 'resume'
  | 'contract'
  | 'proposal'
  | 'invoice'
  | 'report'
  | 'presentation'
  | 'spreadsheet'
  | 'image'
  | 'correspondence'
  | 'legal'
  | 'other';

export const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string }[] = [
  { id: 'resume',         label: 'Resume' },
  { id: 'contract',       label: 'Contract' },
  { id: 'proposal',       label: 'Proposal' },
  { id: 'invoice',        label: 'Invoice' },
  { id: 'report',         label: 'Report' },
  { id: 'presentation',   label: 'Presentation' },
  { id: 'spreadsheet',    label: 'Spreadsheet' },
  { id: 'image',          label: 'Image' },
  { id: 'correspondence', label: 'Correspondence' },
  { id: 'legal',          label: 'Legal' },
  { id: 'other',          label: 'Other' },
];

/** File-type families for preview engine branching. */
export type FileFamily = 'image' | 'pdf' | 'office' | 'text' | 'archive' | 'video' | 'audio' | 'other';

export function getFileFamily(mimeType: string, fileName: string): FileFamily {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/') || fileName.match(/\.(mp4|mov|avi|wmv|m4v|webm)$/i)) return 'video';
  if (mimeType.startsWith('audio/') || fileName.match(/\.(mp3|wav|m4a|ogg|aac|wma)$/i)) return 'audio';
  if (
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('opendocument') ||
    mimeType === 'application/rtf' ||
    fileName.match(/\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf)$/i)
  ) return 'office';
  if (mimeType.startsWith('text/') || fileName.match(/\.(txt|csv|json|xml|yaml|yml|log)$/i)) return 'text';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar') || fileName.match(/\.(zip|tar|gz|rar|7z)$/i)) return 'archive';
  return 'other';
}

export interface CrmDocument {
  id: string;
  /** Display name (usually the original filename, but user can rename). */
  name: string;
  /** Original filename on disk. */
  fileName: string;
  /** MIME type (e.g., "application/pdf", "image/png"). */
  mimeType: string;
  /** File size in bytes. */
  size: number;
  /** File family derived from MIME + extension. */
  fileFamily: FileFamily;
  /** Document category (user-assigned classification). */
  category: DocumentCategory;
  /** Optional description / notes. */
  description?: string;
  /** Tags for filtering. */
  tags?: string[];

  // ---- Associations ----
  /** Contact ID this document is attached to (if any). */
  contactId?: string;
  /** Deal ID this document is attached to (if any). */
  dealId?: string;

  // ---- Dates ----
  uploadedAt: string;
  updatedAt: string;
  /** Optional expiration date (ISO string) for contracts, NDAs, etc. */
  expiresAt?: string;
  /** Who uploaded it. */
  uploadedBy: string;

  // ---- Preview ----
  /** Object URL for local files, or a placeholder URL for seed data.
   *  In production this would be a signed S3 URL. */
  previewUrl?: string;
  /** Thumbnail URL — for images this is the same as previewUrl (maybe
   *  resized); for PDFs it would be a rendered first-page image. */
  thumbnailUrl?: string;

  // ---- Text content extraction (for preview) ----
  /** Extracted plain-text content from the file (first ~2000 chars).
   *  Used to render a real content preview in cards for non-image/PDF files. */
  textContent?: string;

  // ---- Local file reference (for demo attach/remove) ----
  /** If the user attached a file via the file picker, this holds the
   *  browser File reference so we can generate object URLs. Not persisted. */
  _localFile?: File;
}

/** Helpers */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/** Per-extension colors — each file type gets a unique color. */
const EXT_COLORS: Record<string, string> = {
  pdf:  '#DC2626',  // red
  doc:  '#1955A6',  // blue
  docx: '#1955A6',  // blue
  xls:  '#217346',  // green
  xlsx: '#217346',  // green
  csv:  '#217346',  // green
  ppt:  '#B45309',  // dark amber
  pptx: '#B45309',  // dark amber
  png:  '#0E7490',  // cyan
  jpg:  '#7C3AED',  // violet
  jpeg: '#7C3AED',  // violet
  gif:  '#D97706',  // amber
  svg:  '#059669',  // emerald
  bmp:  '#6D28D9',  // purple
  zip:  '#475569',  // slate
  tar:  '#475569',
  gz:   '#475569',
  rar:  '#475569',
  '7z': '#475569',
  txt:  '#6B7280',  // gray
  rtf:  '#9333EA',  // purple
  md:   '#6B7280',
  json: '#F59E0B',  // amber
  xml:  '#EA580C',  // orange
  mp4:  '#7C3AED',  // violet
  mov:  '#7C3AED',
  mp3:  '#D97706',  // amber
  wav:  '#D97706',
};

const FAMILY_FALLBACK_COLOR: Record<FileFamily, string> = {
  pdf: '#DC2626', office: '#1955A6', text: '#6B7280', archive: '#475569',
  video: '#7C3AED', audio: '#D97706', image: '#0E7490', other: '#64748B',
};

/**
 * Dark mode extension accent colors — bright enough for borders and text on dark
 * backgrounds. These are the LIGHT versions of each hue (used as border + text color).
 */
const EXT_DARK_ACCENT: Record<string, string> = {
  pdf:  '#F87171',  doc:  '#60A5FA',  docx: '#60A5FA',
  xls:  '#34D399',  xlsx: '#34D399',  csv:  '#34D399',
  ppt:  '#FBBF24',  pptx: '#FBBF24',
  png:  '#22D3EE',  jpg:  '#A78BFA',  jpeg: '#A78BFA',
  gif:  '#FBBF24',  svg:  '#34D399',  bmp:  '#A78BFA',
  zip:  '#94A3B8',  tar:  '#94A3B8',  gz:   '#94A3B8',  rar:  '#94A3B8',  '7z': '#94A3B8',
  txt:  '#9CA3AF',  rtf:  '#A78BFA',  md:   '#9CA3AF',
  json: '#FBBF24',  xml:  '#FB923C',
  mp4:  '#A78BFA',  mov:  '#A78BFA',  mp3:  '#FBBF24',  wav:  '#FBBF24',
};

/** Dark mode backgrounds — dark tints matching each accent hue. */
const EXT_DARK_BG: Record<string, string> = {
  pdf:  '#450A0A',  doc:  '#172554',  docx: '#172554',
  xls:  '#064E3B',  xlsx: '#064E3B',  csv:  '#064E3B',
  ppt:  '#451A03',  pptx: '#451A03',
  png:  '#164E63',  jpg:  '#2E1065',  jpeg: '#2E1065',
  gif:  '#451A03',  svg:  '#064E3B',  bmp:  '#2E1065',
  zip:  '#1E293B',  tar:  '#1E293B',  gz:   '#1E293B',  rar:  '#1E293B',  '7z': '#1E293B',
  txt:  '#1F2937',  rtf:  '#2E1065',  md:   '#1F2937',
  json: '#451A03',  xml:  '#431407',
  mp4:  '#2E1065',  mov:  '#2E1065',  mp3:  '#451A03',  wav:  '#451A03',
};

const FAMILY_DARK_ACCENT: Record<FileFamily, string> = {
  pdf: '#F87171', office: '#60A5FA', text: '#9CA3AF', archive: '#94A3B8',
  video: '#A78BFA', audio: '#FBBF24', image: '#22D3EE', other: '#94A3B8',
};

const FAMILY_DARK_BG: Record<FileFamily, string> = {
  pdf: '#450A0A', office: '#172554', text: '#1F2937', archive: '#1E293B',
  video: '#2E1065', audio: '#451A03', image: '#164E63', other: '#1E293B',
};

/** Get the accent color for a file extension (used for border, text, and icon). */
export function getExtColor(fileName: string, family: FileFamily, isDark = false): string {
  const ext = getFileExtension(fileName);
  if (isDark) return EXT_DARK_ACCENT[ext] || FAMILY_DARK_ACCENT[family] || '#94A3B8';
  return EXT_COLORS[ext] || FAMILY_FALLBACK_COLOR[family] || '#64748B';
}

/** Get the background color for a file type badge in dark mode. */
export function getExtBgColor(fileName: string, family: FileFamily): string {
  const ext = getFileExtension(fileName);
  return EXT_DARK_BG[ext] || FAMILY_DARK_BG[family] || '#1E293B';
}

/** Icon name (Phosphor) for each file family. */
export const FILE_FAMILY_ICONS: Record<FileFamily, string> = {
  image:   'Image',
  pdf:     'FilePdf',
  office:  'FileDoc',
  text:    'FileText',
  archive: 'FileZip',
  video:   'FileVideo',
  audio:   'FileAudio',
  other:   'File',
};
