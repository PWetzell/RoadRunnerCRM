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

  /** Find an existing document whose fileName matches `fileName` under the
   *  same contact (or the same deal, or — when neither is set — in the
   *  library root). Returns undefined if no collision. Case-insensitive so
   *  "Resume.pdf" and "resume.pdf" are treated as the same file.
   *
   *  HubSpot scopes this check to the record the user is uploading under,
   *  not globally across the library. We do the same: two different
   *  candidates can legitimately both have a "resume.pdf" attached, and
   *  flagging those as collisions would produce useless prompts. */
  findDuplicate: (args: { fileName: string; contactId?: string; dealId?: string }) => CrmDocument | undefined;

  /** Swap the bytes of an existing document in place. Preserves id, name,
   *  category, description, tags, favorites, and list memberships — only
   *  the file bytes + size + mimeType + fileFamily + updatedAt change.
   *
   *  This is the HubSpot "Replace file" pattern. Returns a snapshot of the
   *  pre-replace document so the caller can wire an Undo toast. */
  replaceDocumentBytes: (id: string, file: File) => CrmDocument | undefined;

  /** Produce a filename that doesn't collide with any existing doc in the
   *  same scope. Strategy: "name.ext" → "name (2).ext" → "name (3).ext" …
   *  Matches Dropbox/Finder behaviour. */
  suggestUniqueFileName: (args: { fileName: string; contactId?: string; dealId?: string }) => string;

  /** Attach a local file from the user's hard drive. Creates a CrmDocument
   *  with an object URL for preview. */
  attachFile: (file: File, meta: {
    category?: DocumentCategory;
    description?: string;
    contactId?: string;
    dealId?: string;
    uploadedBy?: string;
    /** Override the filename used on the resulting CrmDocument. Used by the
     *  "Keep both" path of the replace dialog to save as "resume (2).pdf"
     *  without mutating the user's original File object (which some file
     *  pickers return as frozen). */
    fileNameOverride?: string;
  }) => CrmDocument;

  /** Get filtered + sorted documents. */
  getFilteredDocuments: () => CrmDocument[];

  /** Get documents for a specific contact. */
  getDocumentsForContact: (contactId: string) => CrmDocument[];
  /** Get documents for a specific deal. */
  getDocumentsForDeal: (dealId: string) => CrmDocument[];

  /** Replace documents with the demo seed dataset. */
  seedDemoData: () => void;
  /** Wipe documents. Called on real sign-in and sign-out so the demo
   *  workspace's seeded files don't bleed into real accounts. */
  clearAll: () => void;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      // Empty by default — demo whitelist gets seeded via AuthGate.
      documents: [],
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

      findDuplicate: ({ fileName, contactId, dealId }) => {
        const target = fileName.trim().toLowerCase();
        return get().documents.find((d) =>
          d.fileName.trim().toLowerCase() === target &&
          (d.contactId ?? undefined) === (contactId ?? undefined) &&
          (d.dealId ?? undefined) === (dealId ?? undefined),
        );
      },

      suggestUniqueFileName: ({ fileName, contactId, dealId }) => {
        const docs = get().documents.filter((d) =>
          (d.contactId ?? undefined) === (contactId ?? undefined) &&
          (d.dealId ?? undefined) === (dealId ?? undefined),
        );
        const taken = new Set(docs.map((d) => d.fileName.trim().toLowerCase()));
        if (!taken.has(fileName.trim().toLowerCase())) return fileName;

        // Split into "stem" and ".ext" so "resume.pdf" → "resume (2).pdf"
        // and dotfiles like ".gitignore" don't get split at the wrong spot.
        const dot = fileName.lastIndexOf('.');
        const hasExt = dot > 0; // a leading dot isn't treated as extension
        const stem = hasExt ? fileName.slice(0, dot) : fileName;
        const ext = hasExt ? fileName.slice(dot) : '';

        // Strip an existing " (N)" so "resume (2).pdf" doesn't become
        // "resume (2) (2).pdf" on the third collision.
        const stemBase = stem.replace(/\s\(\d+\)$/, '');

        for (let i = 2; i < 1000; i++) {
          const candidate = `${stemBase} (${i})${ext}`;
          if (!taken.has(candidate.trim().toLowerCase())) return candidate;
        }
        // Extremely unlikely fallback — append a short unique tag.
        return `${stemBase} (${Math.random().toString(36).slice(2, 6)})${ext}`;
      },

      replaceDocumentBytes: (id, file) => {
        const existing = get().documents.find((d) => d.id === id);
        if (!existing) return undefined;

        const today = new Date().toISOString().split('T')[0];
        const objectUrl = URL.createObjectURL(file);
        const nextMime = file.type || existing.mimeType;
        const nextFamily = getFileFamily(nextMime, file.name);

        // Replace the bytes + byte-derived fields. Preserve everything the
        // user curated: display name, category, description, tags, and the
        // id itself (so favorites / list memberships stay attached).
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  fileName: file.name, // reflect the new on-disk name
                  mimeType: nextMime,
                  size: file.size,
                  fileFamily: nextFamily,
                  updatedAt: today,
                  previewUrl: objectUrl,
                  thumbnailUrl: nextMime.startsWith('image/') ? objectUrl : undefined,
                  textContent: undefined, // invalidate stale extracted text
                  _localFile: file,
                }
              : d
          ),
        }));

        // Convert to a data URL so the replaced doc survives reload — same
        // pattern as attachFile. Also re-extract textContent from the new
        // bytes for the in-panel preview.
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          set((s) => ({
            documents: s.documents.map((d) =>
              d.id === id
                ? { ...d, previewUrl: dataUrl, thumbnailUrl: nextMime.startsWith('image/') ? dataUrl : d.thumbnailUrl }
                : d
            ),
          }));
        };
        reader.readAsDataURL(file);

        extractTextContent(file).then((textContent) => {
          if (textContent) {
            set((s) => ({
              documents: s.documents.map((d) =>
                d.id === id ? { ...d, textContent } : d
              ),
            }));
          }
        });

        return existing;
      },

      attachFile: (file, meta) => {
        const today = new Date().toISOString().split('T')[0];
        const objectUrl = URL.createObjectURL(file);
        // The "Keep both" branch of the replace dialog passes a suffixed
        // name here ("resume (2).pdf") so the new record is distinct from
        // the existing one without mutating the File object itself.
        const effectiveFileName = meta.fileNameOverride || file.name;
        const doc: CrmDocument = {
          id: uid('doc'),
          name: effectiveFileName.replace(/\.[^.]+$/, ''),
          fileName: effectiveFileName,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileFamily: getFileFamily(file.type || '', effectiveFileName),
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

      // Only seed when empty — preserves user-uploaded documents across
      // page loads. Wholesale replace was wiping uploads on refresh. Same
      // rationale as list-store seedDemoData.
      seedDemoData: () => set((s) => {
        if (s.documents.length > 0) return s;
        return { documents: SEED_DOCUMENTS };
      }),
      clearAll: () => set({ documents: [] }),
    }),
    {
      // Bumped from v2 → v3 to invalidate stale localStorage copies still
      // containing the seeded SEED_DOCUMENTS dataset.
      name: 'roadrunner-documents-v3',
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
