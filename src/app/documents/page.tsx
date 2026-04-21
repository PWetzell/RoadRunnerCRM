'use client';

import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import DocumentSearchBar from '@/components/documents/DocumentSearchBar';
import DocumentInsightsBar from '@/components/documents/DocumentInsightsBar';
import DocumentFilterBar from '@/components/documents/DocumentFilterBar';
import DocumentGrid from '@/components/documents/DocumentGrid';
import DocumentCardView from '@/components/documents/DocumentCardView';
import DocumentPreviewPanel from '@/components/documents/DocumentPreviewPanel';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';
import ListFilterChip from '@/components/lists/ListFilterChip';
import { useDocumentStore } from '@/stores/document-store';
import { useUserStore } from '@/stores/user-store';

export default function DocumentsPage() {
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const view = useDocumentStore((s) => s.view);
  const previewId = useDocumentStore((s) => s.previewId);
  const setPreviewId = useDocumentStore((s) => s.setPreviewId);
  const getDocument = useDocumentStore((s) => s.getDocument);
  const removeDocument = useDocumentStore((s) => s.removeDocument);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const previewDoc = previewId ? getDocument(previewId) : undefined;

  return (
    <>
      <Topbar title="Documents">
        <DocumentSearchBar />
      </Topbar>
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
            {aiEnabled && insightsBars?.documents && <DocumentInsightsBar />}
            <DocumentFilterBar onUpload={() => setUploadOpen(true)} />
            <div className="w-full">
              <ListFilterChip />
            </div>
          </div>
          <div data-tour="documents-grid" className="flex-1 overflow-auto px-5 pb-8">
            {view === 'grid' ? (
              <DocumentGrid
                onPreview={(id) => setPreviewId(id)}
                onRemove={(id) => setRemoveTarget(id)}
              />
            ) : (
              <DocumentCardView
                onPreview={(id) => setPreviewId(id)}
                onRemove={(id) => setRemoveTarget(id)}
              />
            )}
          </div>
        </div>

        {previewDoc && (
          <DocumentPreviewPanel
            doc={previewDoc}
            onClose={() => setPreviewId(null)}
            onRemove={(id) => { setPreviewId(null); setRemoveTarget(id); }}
          />
        )}
      </div>

      <UploadDocumentDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove document?"
        message="This cannot be undone. The file will be removed from the CRM."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => {
          if (removeTarget) {
            const doc = getDocument(removeTarget);
            removeDocument(removeTarget);
            toast.success('Document removed', {
              description: doc ? doc.name : 'File removed from CRM.',
            });
          }
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
