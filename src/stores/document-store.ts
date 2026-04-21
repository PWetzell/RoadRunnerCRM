'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CrmDocument, DocumentCategory, getFileFamily } from '@/types/document';
import { SEED_DOCUMENTS } from '@/lib/data/seed-documents';

export type DocView = 'grid' | 'card';
export type DocSortField = 'name' | 'category' | 'size' | 'uploadedAt' | 'updatedAt' | 'uploadedBy';

/**
 * Extract plain text from uploaded files for content preview.
 * - DOCX: unzips and parses word/document.xml to extract text nodes
 * - Text/CSV/MD: reads as UTF-8 text directly
 * - PPTX: unzips and parses slide XML for text
 * - Other: returns undefined (no extractable text)
 */
async function extractTextContent(file: File): Promise<string | undefined> {
  const name = file.name.toLowerCase();

  // Plain text files — read directly
  if (file.type.startsWith('text/') || name.match(/\.(txt|md|csv|json|xml|yaml|yml|log|rtf)$/)) {
    try {
      const text = await file.text();
      return text.slice(0, 2000);
    } catch { return undefined; }
  }

  // DOCX — it's a ZIP containing word/document.xml
  if (name.endsWith('.docx') || file.type.includes('word')) {
    try {
      const zip = await import('@zip.js/zip.js');
      const zipReader = new zip.ZipReader(new zip.BlobReader(file));
      const entries = await zipReader.getEntries();
      const docEntry = entries.find((e) => e.filename === 'word/document.xml');
      if (docEntry && 'getData' in docEntry) {
        const xml = await (docEntry as any).getData(new zip.TextWriter());
        const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        await zipReader.close();
        return text.slice(0, 2000);
      }
      await zipReader.close();
    } catch { /* zip parse failed — return undefined */ }
    return undefined;
  }

  // PPTX — ZIP containing ppt/slides/slide*.xml
  if (name.endsWith('.pptx') || file.type.includes('presentation')) {
    try {
      const zip = await import('@zip.js/zip.js');
      const zipReader = new zip.ZipReader(new zip.BlobReader(file));
      const entries = await zipReader.getEntries();
      const slideEntries = entries
        .filter((e) => e.filename.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => a.filename.localeCompare(b.filename));
      let allText = '';
      for (const entry of slideEntries.slice(0, 5)) {
        if ('getData' in entry) {
          const xml = await (entry as any).getData(new zip.TextWriter());
          const slideText = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          allText += slideText + '\n\n';
        }
      }
      await zipReader.close();
      return allText.trim().slice(0, 2000) || undefined;
    } catch { /* zip parse failed */ }
    return undefined;
  }

  // XLSX — ZIP containing xl/sharedStrings.xml
  if (name.endsWith('.xlsx') || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    try {
      const zip = await import('@zip.js/zip.js');
      const zipReader = new zip.ZipReader(new zip.BlobReader(file));
      const entries = await zipReader.getEntries();
      const ssEntry = entries.find((e) => e.filename === 'xl/sharedStrings.xml');
      if (ssEntry && 'getData' in ssEntry) {
        const xml = await (ssEntry as any).getData(new zip.TextWriter());
        const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        await zipReader.close();
        return text.slice(0, 2000);
      }
      await zipReader.close();
    } catch { /* zip parse failed */ }
    return undefined;
  }

  return undefined;
}

interface DocumentStore {
  documents: CrmDocument[];
  view: DocView;
  search: string;
  categoryFilter: DocumentCategory | 'all';
  sortField: DocSortField;
  sortDir: 'asc' | 'desc';
  /** Currently previewing (open in the preview panel). */
  previewId: string | null;

  setView: (v: DocView) => void;
  setSearch: (s: string) => void;
  setCategoryFilter: (c: DocumentCategory | 'all') => void;
  toggleSort: (field: DocSortField) => void;
  setPreviewId: (id: string | null) => void;

  addDocument: (doc: CrmDocument) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<CrmDocument>) => void;
  getDocument: (id: string) => CrmDocument | undefined;

  /** Attach a local file from the user's hard drive. Creates a CrmDocument
   *  with an object URL for preview. */
  attachFile: (file: File, meta: {
    category?: DocumentCategory;
    description?: string;
    contactId?: string;
    dealId?: string;
    uploadedBy?: string;
  }) => CrmDocument;

  /** Get filtered + sorted documents. */
  getFilteredDocuments: () => CrmDocument[];

  /** Get documents for a specific contact. */
  getDocumentsForContact: (contactId: string) => CrmDocument[];
  /** Get documents for a specific deal. */
  getDocumentsForDeal: (dealId: string) => CrmDocument[];
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: SEED_DOCUMENTS,
      view: 'grid',
      search: '',
      categoryFilter: 'all',
      sortField: 'uploadedAt',
      sortDir: 'desc',
      previewId: null,

      setView: (v) => set({ view: v }),
      setSearch: (s) => set({ search: s }),
      setCategoryFilter: (c) => set({ categoryFilter: c }),
      toggleSort: (field) => set((s) => ({
        sortField: field,
        sortDir: s.sortField === field && s.sortDir === 'asc' ? 'desc' : 'asc',
      })),
      setPreviewId: (id) => set({ previewId: id }),

      addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
      removeDocument: (id) => set((s) => ({
        documents: s.documents.filter((d) => d.id !== id),
        previewId: s.previewId === id ? null : s.previewId,
      })),
      updateDocument: (id, updates) => set((s) => ({
        documents: s.documents.map((d) => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : d),
      })),
      getDocument: (id) => get().documents.find((d) => d.id === id),

      attachFile: (file, meta) => {
        const today = new Date().toISOString().split('T')[0];
        const objectUrl = URL.createObjectURL(file);
        const doc: CrmDocument = {
          id: uid('doc'),
          name: file.name.replace(/\.[^.]+$/, ''),
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileFamily: getFileFamily(file.type || '', file.name),
          category: meta.category || 'other',
          description: meta.description,
          contactId: meta.contactId,
          dealId: meta.dealId,
          uploadedAt: today,
          updatedAt: today,
          uploadedBy: meta.uploadedBy || 'Current User',
          previewUrl: objectUrl,
          thumbnailUrl: file.type.startsWith('image/') ? objectUrl : undefined,
          _localFile: file,
        };
        set((s) => ({ documents: [doc, ...s.documents] }));

        // Convert to data URL in the background so the document survives
        // page navigation (object URLs expire when the page unloads).
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          set((s) => ({
            documents: s.documents.map((d) =>
              d.id === doc.id
                ? { ...d, previewUrl: dataUrl, thumbnailUrl: file.type.startsWith('image/') ? dataUrl : d.thumbnailUrl }
                : d
            ),
          }));
        };
        reader.readAsDataURL(file);

        // Extract text content for preview (office docs, text files, etc.)
        extractTextContent(file).then((textContent) => {
          if (textContent) {
            set((s) => ({
              documents: s.documents.map((d) =>
                d.id === doc.id ? { ...d, textContent } : d
              ),
            }));
          }
        });

        return doc;
      },

      getFilteredDocuments: () => {
        const { documents, search, categoryFilter, sortField, sortDir } = get();
        let list = [...documents];

        if (categoryFilter !== 'all') {
          list = list.filter((d) => d.category === categoryFilter);
        }

        if (search) {
          const q = search.toLowerCase();
          list = list.filter((d) =>
            d.name.toLowerCase().includes(q) ||
            d.fileName.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q) ||
            d.tags?.some((t) => t.toLowerCase().includes(q))
          );
        }

        list.sort((a, b) => {
          const aVal = a[sortField] ?? '';
          const bVal = b[sortField] ?? '';
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
          }
          const cmp = String(aVal).localeCompare(String(bVal));
          return sortDir === 'asc' ? cmp : -cmp;
        });

        return list;
      },

      getDocumentsForContact: (contactId) =>
        get().documents.filter((d) => d.contactId === contactId),

      getDocumentsForDeal: (dealId) =>
        get().documents.filter((d) => d.dealId === dealId),
    }),
    {
      name: 'roadrunner-documents',
      partialize: (s) => ({
        // Persist user-uploaded documents (strip non-serializable _localFile)
        documents: s.documents.map(({ _localFile, ...rest }) => rest),
        view: s.view,
        categoryFilter: s.categoryFilter,
        sortField: s.sortField,
        sortDir: s.sortDir,
      }),
      merge: (persisted, current) => {
        const state = { ...(current as DocumentStore), ...(persisted as Partial<DocumentStore>) };
        // Backfill textContent/category from seed data for seed docs missing it
        if (state.documents) {
          const seedMap = new Map(SEED_DOCUMENTS.map((d) => [d.id, d]));
          state.documents = state.documents.map((doc) => {
            const seed = seedMap.get(doc.id);
            if (seed) {
              return {
                ...doc,
                textContent: doc.textContent || seed.textContent,
                category: seed.category,
                fileName: seed.fileName,
                fileFamily: seed.fileFamily,
              };
            }
            return doc;
          });
        }
        return state;
      },
    },
  ),
);
