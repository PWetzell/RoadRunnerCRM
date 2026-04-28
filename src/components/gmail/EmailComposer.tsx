'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X as XIcon, PaperPlaneTilt, Minus, Sparkle, Stop, Paperclip,
  MagnifyingGlass, FileText, Check,
} from '@phosphor-icons/react';
import { useToastStore } from '@/stores/toast-store';
import { splitDraft } from '@/lib/ai/email-prompts';
import { useDocumentStore } from '@/stores/document-store';
import { useUserStore } from '@/stores/user-store';
import { useContactStore } from '@/stores/contact-store';
import {
  useTemplateStore,
  applyTemplateVariables,
  buildTemplateContext,
  type EmailTemplate,
} from '@/stores/template-store';
import { formatFileSize, getExtColor, type CrmDocument } from '@/types/document';

/**
 * Floating email composer — Gmail/HubSpot-style bottom-right card. Sends via
 * POST /api/gmail/send which:
 *   • actually dispatches the message through the user's Gmail account (shows
 *     up in their real Sent folder)
 *   • persists a row in `email_messages` + `email_contact_matches` so the
 *     Activity tab on the originating contact refreshes immediately.
 *
 * Props:
 *   open        — show/hide the card
 *   onClose     — parent closes it
 *   onSent      — parent can refresh timelines after a successful send
 *   contactId   — hint used so the matcher never misses the contact the user
 *                 composed from (e.g. typos or address-differs-from-contact)
 *   initialTo   — pre-filled recipient (typically contact.email)
 *   initialSubject / initialBody — optional seeds (used by reply flows later)
 */
export interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  contactId?: string;
  recipientName?: string;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export default function EmailComposer({
  open,
  onClose,
  onSent,
  contactId,
  recipientName,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}: EmailComposerProps) {
  const pushToast = useToastStore((s) => s.push);
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  /**
   * Attached Roadrunner Documents. We keep the full CrmDocument so the chip
   * UI can show file-family color and size without a re-lookup, and so the
   * send handler can read the bytes (data URL or _localFile) and ship them
   * to the API. Documents from other contacts are allowed — the picker
   * surfaces this-contact's docs first, then all docs (Gmail's own "Insert
   * files" also has no contact-scoping at all).
   */
  const [attachedDocs, setAttachedDocs] = useState<CrmDocument[]>([]);
  const [attachPickerOpen, setAttachPickerOpen] = useState(false);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  // Template-picker state. Templates live in their own Zustand store
  // (persisted to localStorage so user-saved drafts survive reloads),
  // and the picker is an inline panel above the body field — same
  // pattern as the AI Draft panel right below it. Variables get
  // substituted at apply-time using the current contact + signed-in
  // user, so the user sees the merged result immediately rather than
  // {{firstName}} placeholders mid-edit.
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const templates = useTemplateStore((s) => s.templates);
  const seedDefaultsIfEmpty = useTemplateStore((s) => s.seedDefaultsIfEmpty);
  const trackTemplateUsage = useTemplateStore((s) => s.trackUsage);
  const user = useUserStore((s) => s.user);
  const allContacts = useContactStore((s) => s.contacts);
  // Seed once per app lifetime when the composer first opens — avoids
  // shipping defaults that overwrite user-edited templates on reload.
  useEffect(() => {
    if (open) seedDefaultsIfEmpty();
  }, [open, seedDefaultsIfEmpty]);

  const applyTemplate = (tmpl: EmailTemplate) => {
    const c = contactId ? allContacts.find((x) => x.id === contactId) : null;
    const ctx = buildTemplateContext({
      contactName: c?.name ?? recipientName,
      contactType: c?.type,
      orgName: c && 'orgName' in c ? c.orgName : undefined,
      title: c && 'title' in c ? c.title : undefined,
      email: to || initialTo,
      userName: user?.name,
      userEmail: user?.email,
    });
    setSubject(applyTemplateVariables(tmpl.subject, ctx));
    setBody(applyTemplateVariables(tmpl.body, ctx));
    setTemplatePickerOpen(false);
    trackTemplateUsage(tmpl.id);
    pushToast({
      severity: 'success',
      title: `Template "${tmpl.name}" applied`,
      duration: 1800,
    });
  };

  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody);
      setCc('');
      setShowCc(false);
      setMinimized(false);
      setAiOpen(false);
      setAiInstruction('');
      setAiError(null);
      setAttachedDocs([]);
      setAttachPickerOpen(false);
    }
  }, [open, initialTo, initialSubject, initialBody]);

  useEffect(() => () => aiAbortRef.current?.abort(), []);

  const addAttachment = (doc: CrmDocument) => {
    setAttachedDocs((prev) => (prev.some((d) => d.id === doc.id) ? prev : [...prev, doc]));
  };
  const removeAttachment = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };
  const totalAttachmentBytes = attachedDocs.reduce((n, d) => n + (d.size || 0), 0);

  if (!open) return null;

  const canSend = to.trim().includes('@') && subject.trim().length > 0 && !sending;

  const runAiDraft = async () => {
    if (!to.trim().includes('@') && !contactId) {
      setAiError('Add a recipient email to draft with AI.');
      return;
    }
    if (aiStreaming) return;
    setAiError(null);
    setAiStreaming(true);

    const ac = new AbortController();
    aiAbortRef.current = ac;

    let accumulated = '';
    let lastApplied = { subject: '', body: '' };

    try {
      const res = await fetch('/api/ai/email/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contactId,
          instruction: aiInstruction,
          recipientEmail: to.trim(),
          recipientName,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setAiError(data.message || 'AI draft failed. Try again.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let evt: { type: string; text?: string; message?: string };
          try { evt = JSON.parse(payload); } catch { continue; }
          if (evt.type === 'delta' && evt.text) {
            accumulated += evt.text;
            const split = splitDraft(accumulated);
            if (split.subject && split.subject !== lastApplied.subject) {
              setSubject(split.subject);
              lastApplied.subject = split.subject;
            }
            if (split.body !== lastApplied.body) {
              setBody(split.body);
              lastApplied.body = split.body;
            }
          } else if (evt.type === 'error') {
            setAiError(evt.message || 'AI draft failed.');
          }
        }
      }

      const finalSplit = splitDraft(accumulated);
      if (finalSplit.subject) setSubject(finalSplit.subject);
      if (finalSplit.body) setBody(finalSplit.body);
      setAiOpen(false);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setAiError((err as Error).message || 'AI draft failed.');
    } finally {
      setAiStreaming(false);
      aiAbortRef.current = null;
    }
  };

  const cancelAi = () => {
    aiAbortRef.current?.abort();
    setAiStreaming(false);
  };

  /**
   * Read a CrmDocument's bytes as standard base64. Prefers the in-memory
   * `_localFile` (FileReader) because that's always fresh; falls back to
   * the persisted data URL (which the store writes after the file is
   * attached). Seed documents without either have no attachable bytes and
   * are filtered out at send time with a toast.
   */
  const readDocAsBase64 = (doc: CrmDocument): Promise<string | null> => {
    return new Promise((resolve) => {
      if (doc._localFile) {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const comma = res.indexOf(',');
          resolve(comma >= 0 ? res.slice(comma + 1) : null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(doc._localFile);
        return;
      }
      const url = doc.previewUrl;
      if (url && url.startsWith('data:')) {
        const comma = url.indexOf(',');
        resolve(comma >= 0 ? url.slice(comma + 1) : null);
        return;
      }
      // Seed docs with http(s) previewUrl aren't real files the user owns —
      // fetch would just return the placeholder SVG/HTML, which is rarely
      // what the user wants to attach. Skip them.
      resolve(null);
    });
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      // Materialize attachments first so a failed read (missing bytes on a
      // seed doc) doesn't silently drop files — we surface it as a toast
      // and let the user remove or replace before retrying.
      const readied = await Promise.all(
        attachedDocs.map(async (d) => ({
          doc: d,
          dataBase64: await readDocAsBase64(d),
        })),
      );
      const unreadable = readied.filter((r) => !r.dataBase64).map((r) => r.doc.name);
      if (unreadable.length > 0) {
        pushToast({
          severity: 'error',
          title: `Can't attach ${unreadable.length === 1 ? unreadable[0] : `${unreadable.length} files`}`,
          description: 'These files have no stored bytes (seed demo docs). Remove them or re-upload.',
        });
        return;
      }
      const payloadAttachments = readied.map((r) => ({
        filename: r.doc.fileName || r.doc.name,
        mimeType: r.doc.mimeType,
        size: r.doc.size,
        documentId: r.doc.id,
        dataBase64: r.dataBase64!,
      }));

      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim(),
          bodyText: body,
          contactId,
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errMsg =
          data.error === 'no_gmail_connection' ? 'Connect Gmail first to send.' :
          data.error === 'attachments_too_large' ? 'Attachments exceed 20MB. Remove one and retry.' :
          'Send failed.';
        pushToast({ severity: 'error', title: errMsg });
        return;
      }
      const attachedCount = payloadAttachments.length;
      pushToast({
        severity: 'success',
        title: 'Email sent',
        description: attachedCount > 0
          ? `Delivered to ${to.trim()} with ${attachedCount} ${attachedCount === 1 ? 'attachment' : 'attachments'}.`
          : `Delivered to ${to.trim()}.`,
      });
      onSent?.();
      onClose();
    } catch {
      pushToast({ severity: 'error', title: 'Send failed' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] bg-[var(--surface-card)] border border-[var(--border)] rounded-t-lg shadow-[0_16px_40px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col"
      style={{ width: 540, maxWidth: 'calc(100vw - 32px)', height: minimized ? 44 : 520, maxHeight: 'calc(100vh - 32px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--brand-primary)] text-white">
        <div className="text-[12.5px] font-bold truncate">
          {subject.trim() || 'New Message'}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(!minimized)}
            aria-label="Minimize"
            className="w-6 h-6 inline-flex items-center justify-center bg-transparent border-none text-white cursor-pointer hover:bg-white/15 rounded"
          >
            <Minus size={12} weight="bold" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 inline-flex items-center justify-center bg-transparent border-none text-white cursor-pointer hover:bg-white/15 rounded"
          >
            <XIcon size={12} weight="bold" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Fields */}
          <div className="flex flex-col flex-1 min-h-0">
            <FieldRow label="To">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] py-1 px-0 placeholder:text-[var(--text-tertiary)]"
              />
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-[11px] font-bold text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
                >
                  Cc
                </button>
              )}
            </FieldRow>
            {showCc && (
              <FieldRow label="Cc">
                <input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] py-1 px-0 placeholder:text-[var(--text-tertiary)]"
                />
              </FieldRow>
            )}
            <FieldRow label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] py-1 px-0 placeholder:text-[var(--text-tertiary)]"
              />
            </FieldRow>

            {templatePickerOpen && (
              <div className="px-3.5 py-2.5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText size={12} weight="fill" className="text-[var(--text-secondary)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Templates</span>
                  <button
                    onClick={() => setTemplatePickerOpen(false)}
                    className="ml-auto text-[10.5px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                {templates.length === 0 ? (
                  <p className="text-[11.5px] text-[var(--text-tertiary)] py-1">
                    No templates yet. Default templates will load on first use.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                    {/* Sort by usageCount desc — most-used templates surface
                        to the top. Same UX as HubSpot/Outreach. */}
                    {[...templates]
                      .sort((a, b) => {
                        const ua = a.usageCount ?? 0;
                        const ub = b.usageCount ?? 0;
                        if (ub !== ua) return ub - ua;
                        return a.name.localeCompare(b.name);
                      })
                      .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        title={`Apply "${t.name}" — replaces current subject and body${(t.usageCount ?? 0) > 0 ? ` · used ${t.usageCount} time${t.usageCount === 1 ? '' : 's'}` : ''}`}
                        className="text-left px-2 py-1.5 rounded-md bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-bg)] cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                            {t.name}
                          </div>
                          <div className="text-[10.5px] text-[var(--text-tertiary)] truncate">
                            {t.subject || '(no subject)'}
                          </div>
                        </div>
                        {(t.usageCount ?? 0) > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
                            {t.usageCount}×
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 italic">
                  Variables like <code className="font-mono">{'{{firstName}}'}</code>,
                  <code className="font-mono"> {'{{company}}'}</code>,
                  <code className="font-mono"> {'{{senderName}}'}</code> auto-fill from the contact and your account.
                </p>
              </div>
            )}

            {aiOpen && (
              <div className="px-3.5 py-2.5 border-b border-[var(--border)] bg-[var(--brand-bg)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkle size={12} weight="fill" className="text-[var(--brand-primary)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">Draft with AI</span>
                  <button
                    onClick={() => setAiOpen(false)}
                    className="ml-auto text-[10.5px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder={`e.g. "follow up on yesterday's intro call, propose Tue or Wed 2pm"`}
                  rows={2}
                  disabled={aiStreaming}
                  className="w-full resize-none text-[12.5px] text-[var(--text-primary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md px-2.5 py-1.5 outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-60"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  {!aiStreaming ? (
                    <button
                      onClick={runAiDraft}
                      disabled={!to.trim().includes('@') && !contactId}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold border-none ${
                        to.trim().includes('@') || contactId
                          ? 'bg-[var(--brand-primary)] text-white cursor-pointer hover:opacity-90'
                          : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] cursor-not-allowed'
                      }`}
                    >
                      <Sparkle size={11} weight="fill" /> Generate
                    </button>
                  ) : (
                    <button
                      onClick={cancelAi}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] cursor-pointer"
                    >
                      <Stop size={11} weight="fill" /> Stop
                    </button>
                  )}
                  {aiStreaming && (
                    <span className="text-[11px] text-[var(--brand-primary)]">Writing…</span>
                  )}
                  {aiError && (
                    <span className="text-[11px] text-[var(--danger,#c43d3d)]">{aiError}</span>
                  )}
                </div>
              </div>
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              className="flex-1 min-h-0 border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] px-3.5 py-3 resize-none placeholder:text-[var(--text-tertiary)] leading-relaxed"
            />

            {attachedDocs.length > 0 && (
              <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--surface-card)] flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mr-1">
                  <Paperclip size={10} weight="bold" className="inline -mt-0.5 mr-0.5" />
                  {attachedDocs.length} · {formatFileSize(totalAttachmentBytes)}
                </span>
                {attachedDocs.map((d) => (
                  <AttachmentChip key={d.id} doc={d} onRemove={() => removeAttachment(d.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)] bg-[var(--surface-raised)]">
            <div className="flex items-center gap-2">
              <button
                onClick={send}
                disabled={!canSend}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold ${
                  canSend
                    ? 'bg-[var(--brand-primary)] text-white cursor-pointer hover:opacity-90'
                    : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]'
                }`}
              >
                <PaperPlaneTilt size={12} weight="fill" />
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                ref={attachButtonRef}
                onClick={() => setAttachPickerOpen((v) => !v)}
                title="Attach a document from Roadrunner"
                aria-expanded={attachPickerOpen}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-bold bg-transparent border cursor-pointer hover:bg-[var(--brand-bg)] ${
                  attachPickerOpen
                    ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <Paperclip size={11} weight="bold" /> Attach
                {attachedDocs.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9.5px] font-bold bg-[var(--brand-primary)] text-white">
                    {attachedDocs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setTemplatePickerOpen((v) => !v); setAiOpen(false); }}
                title="Insert a saved template (variables auto-fill)"
                aria-expanded={templatePickerOpen}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-bold bg-transparent border cursor-pointer hover:bg-[var(--brand-bg)] ${
                  templatePickerOpen
                    ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <FileText size={11} weight="bold" /> Templates
                {templates.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9.5px] font-bold bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {templates.length}
                  </span>
                )}
              </button>
              <button
                data-tour="ai-draft-single"
                onClick={() => { setAiOpen(true); setTemplatePickerOpen(false); }}
                title={contactId ? 'Draft with AI' : 'Open from a contact to use AI'}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-bold bg-transparent text-[var(--brand-primary)] border border-[var(--brand-primary)] cursor-pointer hover:bg-[var(--brand-bg)]"
              >
                <Sparkle size={11} weight="fill" /> Draft with AI
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
            >
              Discard
            </button>
          </div>

          {attachPickerOpen && (
            <DocumentsPickerPopover
              anchor={attachButtonRef.current}
              contactId={contactId}
              alreadyAttachedIds={new Set(attachedDocs.map((d) => d.id))}
              onPick={addAttachment}
              onClose={() => setAttachPickerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Chip for a single attached document. Shows the extension accent color as
 * the left border so PDFs/images/docs visually distinguish at a glance —
 * same treatment used across the Documents table.
 */
function AttachmentChip({ doc, onRemove }: { doc: CrmDocument; onRemove: () => void }) {
  const color = getExtColor(doc.fileName, doc.fileFamily);
  return (
    <span
      className="inline-flex items-center gap-1 pl-1.5 pr-0.5 py-[2px] rounded-md text-[11px] font-semibold bg-[var(--surface-raised)] text-[var(--text-primary)] border"
      style={{ borderColor: color }}
      title={`${doc.fileName} · ${formatFileSize(doc.size)}`}
    >
      <FileText size={10} weight="bold" style={{ color }} />
      <span className="max-w-[160px] truncate">{doc.fileName || doc.name}</span>
      <span className="text-[9.5px] text-[var(--text-tertiary)]">{formatFileSize(doc.size)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${doc.name}`}
        className="ml-0.5 w-4 h-4 rounded-sm flex items-center justify-center cursor-pointer bg-transparent border-none text-[var(--text-tertiary)] hover:bg-[var(--surface-card)] hover:text-[var(--danger,#b42318)]"
      >
        <XIcon size={9} weight="bold" />
      </button>
    </span>
  );
}

/**
 * Portalled picker popover listing Roadrunner documents to attach. The list
 * is sorted so this-contact's documents float to the top (the ones the user
 * most likely wants to attach), followed by recent documents from the whole
 * library. Matches Gmail's "Insert from Drive" UX: surface relevant docs
 * first, searchable, multi-select, no leaving the composer.
 *
 * Rendering into document.body is the project-wide overlay rule — keeps the
 * picker above the composer card and outside any ancestor overflow clip.
 */
function DocumentsPickerPopover({ anchor, contactId, alreadyAttachedIds, onPick, onClose }: {
  anchor: HTMLElement | null;
  contactId?: string;
  alreadyAttachedIds: Set<string>;
  onPick: (doc: CrmDocument) => void;
  onClose: () => void;
}) {
  const allDocs = useDocumentStore((s) => s.documents);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const compute = () => {
      const r = anchor.getBoundingClientRect();
      // Anchor the popover above the Attach button, opening upward, so it
      // doesn't collide with the composer footer's Send button below.
      const panelHeight = 340;
      setPos({
        top: Math.max(8, r.top - panelHeight - 6),
        left: r.left,
      });
    };
    compute();
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [anchor]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)
          && anchor && !anchor.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  const { contactDocs, otherDocs } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (d: CrmDocument) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.fileName.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q);
    const forContact = allDocs.filter((d) => d.contactId === contactId && matches(d));
    const rest = allDocs.filter((d) => d.contactId !== contactId && matches(d));
    return { contactDocs: forContact, otherDocs: rest };
  }, [allDocs, contactId, search]);

  if (typeof document === 'undefined' || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      style={{ top: pos.top, left: pos.left, zIndex: 9999, width: 360, maxHeight: 340 }}
      className="fixed bg-[var(--surface-card)] border border-[var(--border)] rounded-md shadow-[0_18px_46px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden"
      role="dialog"
      aria-label="Attach documents"
    >
      <div className="px-2.5 py-2 border-b border-[var(--border)]">
        <div className="relative">
          <MagnifyingGlass
            size={12}
            weight="bold"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
          />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-7 pr-2 py-1.5 rounded-md text-[11.5px] bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {contactDocs.length === 0 && otherDocs.length === 0 && (
          <div className="px-3 py-6 text-center text-[11.5px] text-[var(--text-tertiary)]">
            {search ? `No documents match "${search}".` : 'No documents yet. Upload files from the Documents tab.'}
          </div>
        )}
        {contactDocs.length > 0 && (
          <DocGroup
            label="This contact"
            docs={contactDocs}
            alreadyAttachedIds={alreadyAttachedIds}
            onPick={onPick}
          />
        )}
        {otherDocs.length > 0 && (
          <DocGroup
            label={contactDocs.length > 0 ? 'All documents' : 'Documents'}
            docs={otherDocs}
            alreadyAttachedIds={alreadyAttachedIds}
            onPick={onPick}
          />
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-[var(--border)] bg-[var(--surface-raised)] text-[10.5px] text-[var(--text-tertiary)]">
        Click to attach · Click again to remove from the chips below
      </div>
    </div>,
    document.body,
  );
}

function DocGroup({ label, docs, alreadyAttachedIds, onPick }: {
  label: string;
  docs: CrmDocument[];
  alreadyAttachedIds: Set<string>;
  onPick: (doc: CrmDocument) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </div>
      {docs.map((d) => {
        const attached = alreadyAttachedIds.has(d.id);
        const color = getExtColor(d.fileName, d.fileFamily);
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onPick(d)}
            disabled={attached}
            className={`flex items-center gap-2 px-3 py-1.5 text-left bg-transparent border-none cursor-pointer hover:bg-[var(--surface-raised)] disabled:cursor-default disabled:opacity-70`}
          >
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <FileText size={12} weight="bold" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-semibold text-[var(--text-primary)] truncate">
                {d.name}
              </span>
              <span className="block text-[10.5px] text-[var(--text-tertiary)] truncate">
                {d.fileName} · {formatFileSize(d.size)}
              </span>
            </span>
            {attached && (
              <Check size={12} weight="bold" className="text-[var(--brand-primary)] flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 border-b border-[var(--border)]">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] w-12 flex-shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}
