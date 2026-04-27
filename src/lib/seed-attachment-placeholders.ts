'use client';

/**
 * Seed-attachment placeholder generators.
 *
 * Context:
 *   Seed emails in the demo flow reference `gmailAttachmentId: 'seed-att-*'`
 *   identifiers that don't exist in any real Gmail inbox. Hitting the Gmail
 *   proxy for them returns 502, which is what surfaced the "Couldn't fetch
 *   attachment" / "Download failed" toasts.
 *
 * Strategy:
 *   Rather than serve a single static placeholder (every PDF opens to the
 *   same generic page), we synthesize real, valid files client-side per
 *   declared mimeType, rendering the actual filename and contact name
 *   into the content. This is HubSpot/Salesforce sandbox-grade fidelity —
 *   each "Resume-Kuznetsova.pdf" opens to a document titled
 *   "Resume-Kuznetsova.pdf" with Anastasia's name on it, not a generic
 *   stub shared across every seed.
 *
 * Type coverage:
 *   - application/pdf             → jsPDF-generated valid PDF
 *   - ...wordprocessingml (.docx) → @zip.js-assembled minimal valid DOCX
 *   - ...spreadsheetml (.xlsx)    → @zip.js-assembled minimal valid XLSX
 *   - everything else             → text/plain fallback
 *
 * All three office formats are real Zip/OOXML — every download opens
 * cleanly in Acrobat / Word / Excel / Preview / LibreOffice with no
 * "damaged file" warning.
 */

import { jsPDF } from 'jspdf';
import { ZipWriter, BlobWriter, TextReader } from '@zip.js/zip.js';
import type { EmailAttachment } from '@/types/email-attachment';
import { formatFileSize } from '@/types/document';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface PlaceholderContext {
  /** Contact this attachment was rendered under — used in the title block. */
  contactName?: string;
  /** Sender name if we want to attribute the doc in the demo header. */
  senderName?: string;
  /** Subject line for extra context in the footer. */
  subject?: string | null;
}

/**
 * Primary entrypoint. Returns a valid, openable blob for any seed attachment
 * — a real PDF for PDFs, real DOCX for Word docs, real XLSX for spreadsheets,
 * and a plain-text note for everything else.
 */
export async function buildSeedPlaceholderBlob(
  att: EmailAttachment,
  ctx: PlaceholderContext = {},
): Promise<Blob> {
  const mime = (att.mimeType || '').toLowerCase();
  if (mime === 'application/pdf' || att.filename.toLowerCase().endsWith('.pdf')) {
    return buildPdfBlob(att, ctx);
  }
  if (mime === DOCX_MIME || att.filename.toLowerCase().endsWith('.docx')) {
    return buildDocxBlob(att, ctx);
  }
  if (mime === XLSX_MIME || att.filename.toLowerCase().endsWith('.xlsx')) {
    return buildXlsxBlob(att, ctx);
  }
  return buildTextBlob(att, ctx);
}

// ─────────────────────────────────────────────────────────────────────
// PDF — jsPDF
// ─────────────────────────────────────────────────────────────────────
/**
 * Build a real PDF blob with the filename rendered as the title, the
 * contact/sender surfaced as subtitle, and the attachment metadata +
 * a "Demo Attachment" note in the body. Output is always valid so
 * Acrobat / Preview / Chrome's PDF viewer open it without complaint.
 */
function buildPdfBlob(att: EmailAttachment, ctx: PlaceholderContext): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;

  // Header strip — light grey "ROADRUNNER CRM · DEMO ATTACHMENT" band.
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageWidth, 48, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(110, 120, 135);
  doc.text('ROADRUNNER CRM  ·  DEMO ATTACHMENT', margin, 30);

  // Title block — filename is the H1. Keep it under the content width via
  // jsPDF's built-in splitTextToSize so long filenames wrap cleanly.
  let y = 96;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(22, 28, 40);
  const titleLines = doc.splitTextToSize(att.filename, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 26 + 6;

  // Subtitle — contact + sender attribution so the doc feels linked.
  if (ctx.contactName || ctx.senderName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(90, 100, 115);
    const parts: string[] = [];
    if (ctx.contactName) parts.push(`Contact: ${ctx.contactName}`);
    if (ctx.senderName && ctx.senderName !== ctx.contactName) parts.push(`From: ${ctx.senderName}`);
    doc.text(parts.join('   ·   '), margin, y);
    y += 22;
  }

  // Separator rule.
  y += 10;
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  // Body — human copy explaining what this file is.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 80);
  const body = [
    'This is a demo placeholder generated by Roadrunner CRM for the case-study seed data.',
    'No real file bytes are stored for seed contacts — the metadata (filename, declared',
    'size, MIME type, sender, subject) is what the UI uses to demonstrate the',
    'Save-to-Documents and Download flows end-to-end.',
    '',
    'In a production environment with Gmail sync connected, this placeholder is replaced',
    'with the actual file bytes Gmail delivered with the email.',
  ];
  for (const line of body) {
    if (line === '') { y += 12; continue; }
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14;
  }

  // File-details card.
  y += 18;
  doc.setFillColor(249, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 110, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(85, 95, 110);
  doc.text('FILE DETAILS', margin + 16, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(35, 45, 60);
  const labelX = margin + 16;
  const valueX = margin + 120;
  const rows: [string, string][] = [
    ['Filename', att.filename],
    ['MIME type', att.mimeType || '—'],
    ['Declared size', att.size ? formatFileSize(att.size) : '—'],
    ['Subject', ctx.subject || '—'],
  ];
  let rowY = y + 44;
  for (const [label, value] of rows) {
    doc.setTextColor(120, 130, 145);
    doc.text(label, labelX, rowY);
    doc.setTextColor(35, 45, 60);
    const valueLines = doc.splitTextToSize(value, contentWidth - (valueX - margin) - 16);
    doc.text(valueLines, valueX, rowY);
    rowY += Math.max(valueLines.length, 1) * 14 + 2;
  }

  // Footer — tiny attribution so reviewers know what they're looking at.
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(150, 158, 170);
  doc.text(
    'Roadrunner CRM — HR/recruiting case study · demo attachment',
    margin,
    doc.internal.pageSize.getHeight() - 32,
  );

  return doc.output('blob');
}

// ─────────────────────────────────────────────────────────────────────
// DOCX — minimal valid OOXML via @zip.js
// ─────────────────────────────────────────────────────────────────────
/**
 * Assemble a real .docx blob by zipping the four minimum required OOXML
 * parts. Opens cleanly in Word, Pages, Google Docs, LibreOffice.
 */
async function buildDocxBlob(att: EmailAttachment, ctx: PlaceholderContext): Promise<Blob> {
  const title = escapeXml(att.filename);
  const contactLine = ctx.contactName ? `Contact: ${escapeXml(ctx.contactName)}` : '';
  const senderLine = ctx.senderName ? `From: ${escapeXml(ctx.senderName)}` : '';
  const subjectLine = ctx.subject ? `Subject: ${escapeXml(ctx.subject)}` : '';
  const sizeLine = `Declared size: ${att.size ? formatFileSize(att.size) : '—'}`;
  const typeLine = `MIME type: ${escapeXml(att.mimeType || '—')}`;

  const paragraphs = [
    para(title, { bold: true, size: 32 }),
    para('ROADRUNNER CRM — DEMO ATTACHMENT', { size: 18, color: '8896A8' }),
    para(''),
    ...(contactLine ? [para(contactLine)] : []),
    ...(senderLine ? [para(senderLine)] : []),
    ...(subjectLine ? [para(subjectLine)] : []),
    para(typeLine),
    para(sizeLine),
    para(''),
    para(
      'This is a demo placeholder generated by Roadrunner CRM for the case-study seed data. ' +
      'No real file bytes are stored for seed contacts — the metadata (filename, declared size, ' +
      'MIME type, sender, subject) is what the UI uses to demonstrate the Save-to-Documents and ' +
      'Download flows end-to-end.',
    ),
    para(''),
    para(
      'In a production environment with Gmail sync connected, this placeholder is replaced with ' +
      'the actual file bytes Gmail delivered with the email.',
    ),
  ].join('\n  ');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
  ${paragraphs}
  <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return assembleZip([
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: relsXml },
    { path: 'word/document.xml', content: documentXml },
  ], DOCX_MIME);
}

// ─────────────────────────────────────────────────────────────────────
// XLSX — minimal valid OOXML via @zip.js
// ─────────────────────────────────────────────────────────────────────
/**
 * Assemble a real .xlsx blob with a single sheet showing the attachment
 * metadata. Opens cleanly in Excel, Numbers, Google Sheets, LibreOffice.
 */
async function buildXlsxBlob(att: EmailAttachment, ctx: PlaceholderContext): Promise<Blob> {
  const rows: [string, string][] = [
    ['Filename', att.filename],
    ['MIME type', att.mimeType || '—'],
    ['Declared size', att.size ? formatFileSize(att.size) : '—'],
    ['Contact', ctx.contactName || '—'],
    ['From', ctx.senderName || '—'],
    ['Subject', ctx.subject || '—'],
    ['', ''],
    ['Note', 'Demo placeholder — Roadrunner CRM case-study seed.'],
    ['', 'No real file bytes are stored for seed contacts.'],
  ];
  const sheetRows = rows
    .map(([k, v], i) => {
      const rowNum = i + 1;
      return `    <row r="${rowNum}">
      <c r="A${rowNum}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(k)}</t></is></c>
      <c r="B${rowNum}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>
    </row>`;
    })
    .join('\n');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
${sheetRows}
  </sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Details" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  return assembleZip([
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: rootRelsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { path: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ], XLSX_MIME);
}

// ─────────────────────────────────────────────────────────────────────
// Fallback
// ─────────────────────────────────────────────────────────────────────
function buildTextBlob(att: EmailAttachment, ctx: PlaceholderContext): Blob {
  const body = [
    att.filename,
    '─────────────────────────────────────────────',
    '',
    'This is a demo attachment from the Roadrunner CRM case-study seed.',
    'No real file bytes are stored for seed contacts.',
    '',
    `Filename:      ${att.filename}`,
    `MIME type:     ${att.mimeType || '—'}`,
    `Declared size: ${att.size ? formatFileSize(att.size) : '—'}`,
    ctx.contactName ? `Contact:       ${ctx.contactName}` : '',
    ctx.senderName ? `From:          ${ctx.senderName}` : '',
    ctx.subject ? `Subject:       ${ctx.subject}` : '',
  ].filter(Boolean).join('\n');
  return new Blob([body], { type: att.mimeType || 'text/plain' });
}

// ─────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────
/** XML-escape the five predefined entities. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Tiny DOCX paragraph builder. `size` is half-points (so 32 = 16pt). `color`
 * is RRGGBB hex without the leading #.
 */
function para(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string } = {},
): string {
  const rPr: string[] = [];
  if (opts.bold) rPr.push('<w:b/>');
  if (opts.size) rPr.push(`<w:sz w:val="${opts.size}"/>`);
  if (opts.color) rPr.push(`<w:color w:val="${opts.color}"/>`);
  const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';
  const safeText = escapeXml(text);
  return `<w:p><w:r>${rPrXml}<w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`;
}

/**
 * Zip the given parts into a single blob tagged with the target mime type.
 * Uses @zip.js/zip.js which is already in the bundle.
 */
async function assembleZip(
  parts: { path: string; content: string }[],
  mime: string,
): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter(mime));
  for (const p of parts) {
    await writer.add(p.path, new TextReader(p.content));
  }
  return writer.close();
}
