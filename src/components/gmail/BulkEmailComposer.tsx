'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X as XIcon, PaperPlaneTilt, Plus, FileText, MagnifyingGlass, Users, Envelope, CheckCircle, Warning, Trash, Sparkle, StopCircle,
} from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useListStore } from '@/stores/list-store';
import { useTemplateStore, applyTemplateVariables, buildTemplateContext, type EmailTemplate } from '@/stores/template-store';
import { useUserStore } from '@/stores/user-store';
import { useToastStore } from '@/stores/toast-store';
import { useBulkBatchStore } from '@/stores/bulk-batch-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import { splitDraft } from '@/lib/ai/email-prompts';
import SearchInput from '@/components/ui/SearchInput';
import type { ContactWithEntries } from '@/types/contact';

/**
 * Bulk email composer — sends a personalized message to many recipients
 * at once. Each recipient is either a CRM contact (variables auto-fill
 * from the contact record) or an ad-hoc custom email address (variables
 * fall back to the address itself).
 *
 * Implementation choice: instead of a new bulk-send API, this loops
 * client-side and POSTs to the existing `/api/gmail/send` once per
 * recipient. Two reasons:
 *
 *   1. Per-recipient personalization is already the natural unit of
 *      work — Gmail itself sends one message per recipient under the
 *      hood, so batching doesn't save round-trips.
 *   2. Real-time progress feedback ("sending 3 of 12…") falls out for
 *      free without server-side streaming.
 *
 * Industry pattern: HubSpot's bulk email and Pipedrive's "Email Sync"
 * both work this way for sub-100-recipient sends. For massive lists
 * (thousands), they switch to a queue-based backend — Roadrunner's
 * audience is well below that threshold.
 *
 * Recipients can be added from three sources:
 *   • **Saved lists** — pick a list, all its members get added at once
 *   • **Individual contacts** — search + click to add
 *   • **Custom addresses** — type any email and add as ad-hoc
 *
 * Templates picker reuses the same store as the single-message
 * composer. Variables are substituted PER RECIPIENT at send time, so
 * `{{firstName}}` resolves correctly for each person.
 */

interface Recipient {
  /** Stable key for React lists. For contacts: the contact id. For
   *  custom addresses: `custom:<email>`. Used so a contact's email
   *  changing doesn't drop them from the list. */
  key: string;
  email: string;
  contactId?: string;
  name?: string;
}

export interface BulkEmailComposerProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-loaded recipients — e.g. from a saved-list "Email all"
   *  action or a contacts-grid bulk-select. */
  initialRecipients?: Recipient[];
}

export default function BulkEmailComposer({ open, onClose, initialRecipients = [] }: BulkEmailComposerProps) {
  const allContacts = useContactStore((s) => s.contacts);
  const lists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const templates = useTemplateStore((s) => s.templates);
  const seedDefaults = useTemplateStore((s) => s.seedDefaultsIfEmpty);
  const trackTemplateUsage = useTemplateStore((s) => s.trackUsage);
  const user = useUserStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);
  const createBatch = useBulkBatchStore((s) => s.createBatch);
  const updateRecipient = useBulkBatchStore((s) => s.updateRecipient);
  const gmailStatus = useGmailStatusStore((s) => s.status);
  // Track which template was applied so the batch record can show
  // "Sent via 'Cold intro' template" — used by the Sent feed and
  // future template-performance analytics.
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);

  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pickerMode, setPickerMode] = useState<null | 'contacts' | 'lists' | 'custom'>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });

  // AI draft state. The "✨ AI draft" button opens a small panel where
  // the user types a goal + optional tone hints; the result streams into
  // the subject + body fields. Mirrors HubSpot's AI Email Writer and
  // Apollo's per-recipient draft assist, but adapted for bulk: we tell
  // the model to keep merge fields like {{firstName}} intact so a single
  // draft personalizes per recipient at send time.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'casual' | 'direct' | 'warm'>('professional');
  const [aiLength, setAiLength] = useState<'short' | 'medium' | 'long'>('short');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  // Reset state on open + seed default templates so the picker isn't empty.
  useEffect(() => {
    if (open) {
      setRecipients(initialRecipients);
      setSubject('');
      setBody('');
      setPickerMode(null);
      setPickerSearch('');
      setCustomEmail('');
      setTemplatePickerOpen(false);
      setSending(false);
      setProgress({ done: 0, total: 0, failed: 0 });
      setAppliedTemplateName(null);
      setAiOpen(false);
      setAiGoal('');
      setAiTone('professional');
      setAiLength('short');
      setAiStreaming(false);
      setAiError(null);
      seedDefaults();
    } else {
      // Cancel any in-flight AI stream when the modal closes so we don't
      // pay for tokens the user no longer wants.
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Generate a bulk-friendly draft via the streaming AI endpoint. We
   * prepend bulk-specific guidance to the user's goal so the model:
   *   • emits the merge fields {{firstName}}, {{company}}, {{senderName}}
   *     instead of inventing names (a single draft has to work for every
   *     recipient)
   *   • respects the chosen tone + length
   *   • follows the same `Subject: …\n\nBody…` convention the existing
   *     /api/ai/email/draft route already uses, so `splitDraft()` works
   *     unchanged
   *
   * Industry parallel: HubSpot AI Email Writer + Apollo's per-prospect
   * draft both layer goal/tone/length on top of a base prompt; the
   * bulk-specific tweak (preserve merge fields) is unique to bulk
   * surfaces — single-message composers substitute up-front.
   */
  const generateAiDraft = async () => {
    if (!aiGoal.trim()) {
      setAiError('Tell the AI what to write — e.g. "Follow-up after our call about hiring forecasts."');
      return;
    }
    setAiError(null);
    setAiStreaming(true);

    const ac = new AbortController();
    aiAbortRef.current = ac;
    let accumulated = '';
    const lastApplied = { subject: '', body: '' };

    const lengthHint = {
      short: '2-3 short sentences. No throat-clearing.',
      medium: '4-6 sentences total — context, value, ask.',
      long: '6-10 sentences with concrete detail.',
    }[aiLength];

    const toneHint = {
      professional: 'Tone: clean, professional, peer-to-peer.',
      casual: 'Tone: warm and conversational, like emailing a friend.',
      direct: 'Tone: short, direct, no filler. Get to the ask fast.',
      warm: 'Tone: warm, personal, build rapport before the ask.',
    }[aiTone];

    // Bulk-specific instruction layered onto the user's goal.
    const fullInstruction = [
      `Write a BULK email that will be personalized per recipient via merge fields.`,
      `Use {{firstName}} for the recipient's first name, {{company}} for their company, and {{senderName}} for the sender's name.`,
      `Do NOT invent specific names — every reference to the recipient or their company must use a merge field.`,
      ``,
      `Goal: ${aiGoal.trim()}`,
      ``,
      lengthHint,
      toneHint,
    ].join('\n');

    try {
      const res = await fetch('/api/ai/email/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // No specific contactId — bulk drafts are recipient-agnostic.
          // Pass the user's email + name as a placeholder so the route
          // doesn't reject the request for a missing recipient.
          recipientEmail: user?.email || 'recipient@example.com',
          recipientName: '{{firstName}}',
          instruction: fullInstruction,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setAiError(data.message || `AI draft failed (HTTP ${res.status}).`);
        setAiStreaming(false);
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

      // Final pass — make sure trailing partial output lands.
      const finalSplit = splitDraft(accumulated);
      if (finalSplit.subject) setSubject(finalSplit.subject);
      if (finalSplit.body) setBody(finalSplit.body);
      // Keep the panel open so the user can tweak the goal + regenerate
      // if the first pass isn't quite right (HubSpot UX pattern).
      // setAiOpen(false);
      pushToast({ severity: 'success', title: 'AI draft ready — tweak or send', duration: 1800 });
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

  // Helpers ──────────────────────────────────────────────────────────

  const primaryEmailFor = (c: ContactWithEntries): string => {
    return (
      c.entries?.emails?.find((e) => e.primary)?.value
      ?? c.entries?.emails?.[0]?.value
      ?? ('email' in c ? c.email : undefined)
      ?? ''
    );
  };

  const addContact = (c: ContactWithEntries) => {
    const email = primaryEmailFor(c);
    if (!email) {
      pushToast({ severity: 'warning', title: `${c.name} has no email on file`, duration: 1800 });
      return;
    }
    setRecipients((prev) => {
      if (prev.some((r) => r.email.toLowerCase() === email.toLowerCase())) return prev;
      return [...prev, { key: c.id, email, contactId: c.id, name: c.name }];
    });
  };

  const addListMembers = (listId: string) => {
    const memberIds = new Set(
      memberships
        .filter((m) => m.listId === listId && m.entityType === 'contact')
        .map((m) => m.entityId),
    );
    const contactsInList = allContacts.filter((c) => memberIds.has(c.id));
    const existing = new Set(recipients.map((r) => r.email.toLowerCase()));
    const additions: Recipient[] = [];
    let skippedNoEmail = 0;
    for (const c of contactsInList) {
      const email = primaryEmailFor(c);
      if (!email) { skippedNoEmail += 1; continue; }
      if (existing.has(email.toLowerCase())) continue;
      existing.add(email.toLowerCase());
      additions.push({ key: c.id, email, contactId: c.id, name: c.name });
    }
    if (additions.length === 0 && skippedNoEmail === 0) {
      pushToast({ severity: 'info', title: 'All members already in recipients', duration: 1500 });
    } else {
      const list = lists.find((l) => l.id === listId);
      pushToast({
        severity: 'success',
        title: `Added ${additions.length} from ${list?.name ?? 'list'}`,
        description: skippedNoEmail > 0 ? `${skippedNoEmail} skipped (no email on file)` : undefined,
        duration: 2200,
      });
    }
    setRecipients((prev) => [...prev, ...additions]);
    setPickerMode(null);
  };

  const addCustom = () => {
    const email = customEmail.trim();
    if (!email.includes('@')) {
      pushToast({ severity: 'warning', title: 'Enter a valid email address', duration: 1500 });
      return;
    }
    setRecipients((prev) => {
      if (prev.some((r) => r.email.toLowerCase() === email.toLowerCase())) return prev;
      return [...prev, { key: `custom:${email}`, email, name: email }];
    });
    setCustomEmail('');
  };

  const removeRecipient = (key: string) => {
    setRecipients((prev) => prev.filter((r) => r.key !== key));
  };

  const applyTemplate = (t: EmailTemplate) => {
    // For bulk, we DON'T substitute variables now — we keep the raw
    // {{tokens}} so the user can see they'll be filled in per-recipient.
    // Final substitution happens at send time inside the loop.
    setSubject(t.subject);
    setBody(t.body);
    setAppliedTemplateName(t.name);
    setTemplatePickerOpen(false);
    // Bump the template's usage counter so the picker can surface
    // popular templates and the analytics dashboard can rank them.
    // Same UX pattern as HubSpot's "most used" sort + Outreach's
    // template performance leaderboard.
    trackTemplateUsage(t.id);
    pushToast({ severity: 'success', title: `Template "${t.name}" loaded`, duration: 1600 });
  };

  // Filter contacts in the picker by search query.
  const filteredContacts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const alreadyEmails = new Set(recipients.map((r) => r.email.toLowerCase()));
    return allContacts
      .filter((c) => {
        if (!q) return true;
        const hay = [c.name, primaryEmailFor(c)].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .filter((c) => {
        const e = primaryEmailFor(c).toLowerCase();
        return e && !alreadyEmails.has(e);
      })
      .slice(0, 50);
  }, [allContacts, pickerSearch, recipients]);

  // Send loop ────────────────────────────────────────────────────────

  const canSend = recipients.length > 0 && subject.trim().length > 0 && !sending;

  const sendBulk = async () => {
    if (!canSend) return;
    setSending(true);
    setProgress({ done: 0, total: recipients.length, failed: 0 });
    let done = 0;
    let failed = 0;

    // Create the batch record up front with all recipients in
    // 'pending' state. As each per-recipient send resolves below we
    // flip its status to 'sent' or 'failed' so the /sent feed can
    // render real-time progress without having to poll.
    const batch = createBatch({
      subject,
      bodyPreview: body.slice(0, 240),
      templateName: appliedTemplateName ?? undefined,
      recipients: recipients.map((r) => ({
        email: r.email,
        contactId: r.contactId,
        contactName: r.name,
        status: 'pending' as const,
      })),
    });

    // Demo-mode short-circuit: when Gmail isn't connected (anonymous
    // demo viewer or local dev without a Google token), skip the real
    // API call and simulate per-recipient resolves on a short timer.
    // Lets people click through the bulk-send flow on the deployed demo
    // without firing real emails. The batch record + delivery progress
    // bar render exactly the same as a real send.
    const demoMode = !gmailStatus?.connected;

    for (const r of recipients) {
      const c = r.contactId ? allContacts.find((x) => x.id === r.contactId) : null;
      const ctx = buildTemplateContext({
        contactName: c?.name ?? r.name,
        contactType: c?.type,
        orgName: c && 'orgName' in c ? c.orgName : undefined,
        title: c && 'title' in c ? c.title : undefined,
        email: r.email,
        userName: user?.name,
        userEmail: user?.email,
      });
      const finalSubject = applyTemplateVariables(subject, ctx);
      const finalBody = applyTemplateVariables(body, ctx);

      if (demoMode) {
        // Visible delay so the progress bar animates rather than
        // jumping to 100% — keeps the demo feeling alive.
        await new Promise((resolve) => setTimeout(resolve, 350));
        updateRecipient(batch.id, r.email, {
          status: 'sent',
          resolvedAt: new Date().toISOString(),
        });
        done += 1;
        setProgress({ done, total: recipients.length, failed });
        continue;
      }

      try {
        const res = await fetch('/api/gmail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            to: r.email,
            subject: finalSubject,
            bodyText: finalBody,
            contactId: r.contactId,
          }),
        });
        if (res.ok) {
          updateRecipient(batch.id, r.email, {
            status: 'sent',
            resolvedAt: new Date().toISOString(),
          });
        } else {
          const errBody = await res.json().catch(() => ({} as { error?: string }));
          console.warn(`[bulk-email] send to ${r.email} failed`, res.status, errBody);
          updateRecipient(batch.id, r.email, {
            status: 'failed',
            resolvedAt: new Date().toISOString(),
            error: errBody.error || `HTTP ${res.status}`,
          });
          failed += 1;
        }
      } catch (e) {
        console.warn(`[bulk-email] send to ${r.email} threw`, e);
        updateRecipient(batch.id, r.email, {
          status: 'failed',
          resolvedAt: new Date().toISOString(),
          error: e instanceof Error ? e.message : 'unknown',
        });
        failed += 1;
      }
      done += 1;
      setProgress({ done, total: recipients.length, failed });
    }

    setSending(false);
    const succeeded = done - failed;
    pushToast({
      severity: failed === 0 ? 'success' : 'warning',
      title: `Sent ${succeeded} of ${recipients.length} emails`,
      description: failed > 0 ? `${failed} failed — check Gmail outbox or try again` : undefined,
      duration: 4000,
    });
    if (failed === 0) onClose();
  };

  if (!open) return null;
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Users size={18} weight="fill" className="text-[var(--brand-primary)]" />
            <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Bulk Email</h2>
            {recipients.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
                {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer disabled:opacity-50"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Recipients section */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              To
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPickerMode((m) => (m === 'lists' ? null : 'lists'))}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer hover:bg-[var(--brand-bg)] ${
                  pickerMode === 'lists' ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]' : 'text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <Users size={10} weight="bold" /> List
              </button>
              <button
                onClick={() => setPickerMode((m) => (m === 'contacts' ? null : 'contacts'))}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer hover:bg-[var(--brand-bg)] ${
                  pickerMode === 'contacts' ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]' : 'text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <Plus size={10} weight="bold" /> Contact
              </button>
              <button
                onClick={() => setPickerMode((m) => (m === 'custom' ? null : 'custom'))}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer hover:bg-[var(--brand-bg)] ${
                  pickerMode === 'custom' ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]' : 'text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <Envelope size={10} weight="bold" /> Email
              </button>
            </div>
          </div>

          {/* Recipient chips */}
          {recipients.length === 0 ? (
            <p className="text-[11.5px] text-[var(--text-tertiary)] py-1">
              No recipients yet. Add from a saved list, individual contacts, or paste an email address.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1 mb-2 max-h-[120px] overflow-y-auto">
              {recipients.map((r) => (
                <span
                  key={r.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]"
                  title={r.email}
                >
                  {r.name && r.name !== r.email ? (
                    <>
                      <span>{r.name}</span>
                      <span className="text-[var(--text-tertiary)]">·</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{r.email}</span>
                    </>
                  ) : (
                    <span>{r.email}</span>
                  )}
                  <button
                    onClick={() => removeRecipient(r.key)}
                    className="text-[var(--brand-primary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer p-0 flex"
                    aria-label={`Remove ${r.name ?? r.email}`}
                  >
                    <XIcon size={10} weight="bold" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Picker panels */}
          {pickerMode === 'lists' && (
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-2 max-h-[200px] overflow-y-auto">
              {lists.length === 0 ? (
                <p className="text-[11px] text-[var(--text-tertiary)] py-1">No saved lists yet.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {lists.map((l) => {
                    const memberCount = memberships.filter(
                      (m) => m.listId === l.id && m.entityType === 'contact',
                    ).length;
                    return (
                      <button
                        key={l.id}
                        onClick={() => addListMembers(l.id)}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--brand-primary)] cursor-pointer text-left"
                      >
                        <span className="text-[12px] font-bold text-[var(--text-primary)] truncate">{l.name}</span>
                        <span className="text-[10.5px] text-[var(--text-tertiary)] flex-shrink-0">
                          {memberCount} member{memberCount === 1 ? '' : 's'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {pickerMode === 'contacts' && (
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-2">
              <SearchInput
                value={pickerSearch}
                onChange={setPickerSearch}
                placeholder="Search contacts…"
                ariaLabel="Search contacts to add as recipients"
                size="sm"
                autoFocus
                className="mb-2"
              />
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <p className="text-[11px] text-[var(--text-tertiary)] py-1 px-2">
                    {pickerSearch ? 'No matches' : 'All available contacts already added'}
                  </p>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addContact(c)}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--brand-primary)] cursor-pointer text-left"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-[var(--text-primary)] truncate">{c.name}</span>
                        <span className="text-[10.5px] text-[var(--text-tertiary)] truncate">{primaryEmailFor(c)}</span>
                      </div>
                      <Plus size={12} weight="bold" className="text-[var(--brand-primary)] flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {pickerMode === 'custom' && (
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-2">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
                  placeholder="someone@example.com"
                  autoFocus
                  className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
                <button
                  onClick={addCustom}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer hover:opacity-90"
                >
                  <Plus size={11} weight="bold" /> Add
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 italic">
                Ad-hoc addresses don&apos;t have CRM data, so merge fields like
                <code className="font-mono"> {'{{firstName}}'}</code> will fall back to the email itself.
              </p>
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] w-14">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (use {{firstName}}, {{company}}, etc. for personalization)"
              className="flex-1 border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] py-1 placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>

        {/* AI draft panel — generate goal-driven copy with merge fields. */}
        {aiOpen && (
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[linear-gradient(180deg,var(--brand-bg),transparent)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkle size={13} weight="fill" className="text-[var(--brand-primary)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                AI draft
              </span>
              <span className="text-[10.5px] text-[var(--text-tertiary)] italic">
                Keeps {'{{firstName}}'}, {'{{company}}'} merge fields intact for per-recipient personalization
              </span>
              <button
                onClick={() => setAiOpen(false)}
                className="ml-auto text-[10.5px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
              >
                Hide
              </button>
            </div>
            <textarea
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              placeholder='What should this email say? e.g. "Follow-up to architects who attended last week&apos;s webinar — invite them to a 15-min product demo."'
              rows={2}
              disabled={aiStreaming}
              className="w-full text-[12.5px] text-[var(--text-primary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md px-2.5 py-1.5 outline-none placeholder:text-[var(--text-tertiary)] resize-none mb-2 disabled:opacity-60"
            />
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                Tone:
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
                  disabled={aiStreaming}
                  className="text-[11.5px] bg-[var(--surface-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-primary)] outline-none cursor-pointer disabled:opacity-60"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="direct">Direct</option>
                  <option value="warm">Warm</option>
                </select>
              </label>
              <label className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                Length:
                <select
                  value={aiLength}
                  onChange={(e) => setAiLength(e.target.value as typeof aiLength)}
                  disabled={aiStreaming}
                  className="text-[11.5px] bg-[var(--surface-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-primary)] outline-none cursor-pointer disabled:opacity-60"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>
              <div className="ml-auto flex items-center gap-2">
                {aiStreaming ? (
                  <button
                    onClick={cancelAi}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer hover:border-[var(--danger)] hover:text-[var(--danger)]"
                  >
                    <StopCircle size={11} weight="fill" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={generateAiDraft}
                    disabled={!aiGoal.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11.5px] font-bold bg-[var(--brand-primary)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkle size={11} weight="fill" />
                    {subject || body ? 'Regenerate' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
            {aiStreaming && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--brand-primary)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
                Streaming draft… subject and body fill in live below.
              </div>
            )}
            {aiError && (
              <div className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)] rounded-md px-2 py-1.5">
                <Warning size={11} weight="fill" className="mt-0.5 flex-shrink-0" />
                <span className="flex-1">{aiError}</span>
              </div>
            )}
          </div>
        )}

        {/* Templates panel */}
        {templatePickerOpen && (
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
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
            <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
              {/* Sort by usageCount desc — popular templates float up.
                  Mirrors HubSpot's "Most used" sort and Outreach's
                  template leaderboard. Falls back to alpha for ties so
                  the order is deterministic across renders. */}
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
                  className="text-left px-2 py-1.5 rounded-md bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--brand-primary)] cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{t.name}</div>
                    <div className="text-[10.5px] text-[var(--text-tertiary)] truncate">{t.subject || '(no subject)'}</div>
                  </div>
                  {(t.usageCount ?? 0) > 0 && (
                    <span
                      title={`Used ${t.usageCount} time${t.usageCount === 1 ? '' : 's'}`}
                      className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]"
                    >
                      {t.usageCount}×
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…  Use {{firstName}}, {{company}}, {{senderName}} for personalization."
          rows={8}
          className="flex-1 min-h-[180px] border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] px-4 py-3 resize-none placeholder:text-[var(--text-tertiary)] leading-relaxed"
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={sendBulk}
              disabled={!canSend}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold border-none ${
                canSend
                  ? 'bg-[var(--brand-primary)] text-white cursor-pointer hover:opacity-90'
                  : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]'
              }`}
            >
              <PaperPlaneTilt size={12} weight="fill" />
              {sending
                ? `Sending ${progress.done} of ${progress.total}…`
                : `Send to ${recipients.length || '0'} recipient${recipients.length === 1 ? '' : 's'}`}
            </button>
            <button
              onClick={() => setTemplatePickerOpen((v) => !v)}
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
              onClick={() => setAiOpen((v) => !v)}
              title="Generate a draft with AI — keeps {{firstName}}, {{company}} merge fields intact"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-bold bg-transparent border cursor-pointer hover:bg-[var(--ai-bg,var(--brand-bg))] ${
                aiOpen
                  ? 'text-[var(--ai,var(--brand-primary))] border-[var(--ai,var(--brand-primary))]'
                  : 'text-[var(--text-secondary)] border-[var(--border)]'
              }`}
            >
              <Sparkle size={11} weight="fill" /> AI draft
            </button>
          </div>
          {sending && progress.failed > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--warning)]">
              <Warning size={12} /> {progress.failed} failed
            </span>
          )}
          {!sending && (
            <button
              onClick={onClose}
              className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
