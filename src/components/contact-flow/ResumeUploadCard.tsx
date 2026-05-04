'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileArrowUp, CheckCircle, Warning, Sparkle, Spinner, ArrowRight } from '@phosphor-icons/react';
import { toast } from '@/lib/toast';

/**
 * Public env-var gate. When `NEXT_PUBLIC_AI_RESUME_ENABLED` is unset (the
 * deployed demo default), the card renders the "Live mode only" demo
 * surface and the file picker / parse flow are disabled. When set to
 * `'true'` in local dev, the real upload code path runs as before.
 *
 * Read at module scope so Next.js inlines it at build time.
 */
const AI_RESUME_ENABLED = process.env.NEXT_PUBLIC_AI_RESUME_ENABLED === 'true';

/**
 * Drop a resume here → AI parses it → routes to the new-person wizard
 * with all the fields prefilled.
 *
 * The parsed payload is stashed in sessionStorage so the wizard can pick
 * it up without a heavy URL query string.
 *
 * In the deployed demo the AI resume parser isn't wired (cost + prompt
 * tuning still in flight). This component checks the env-var gate and
 * routes to either `<DemoResumeCard>` (deployed default) or the real
 * `<LiveResumeCard>` (local dev with the env set).
 */
export function ResumeUploadCard() {
  if (!AI_RESUME_ENABLED) return <DemoResumeCard />;
  return <LiveResumeCard />;
}

/**
 * Real upload zone — file picker, drag-drop, POST to /api/resume/parse,
 * stash the parsed JSON + raw bytes in sessionStorage, route to the
 * person wizard with `?from=resume`. Unchanged from the pre-demo-gate
 * implementation; gated behind NEXT_PUBLIC_AI_RESUME_ENABLED='true'.
 */
function LiveResumeCard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    if (!file) return;
    setState('parsing');
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/resume/parse', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Parse failed');

      // Also stash the raw file bytes so the new-person page can attach the
      // original resume to the candidate record in Documents on save.
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);

      sessionStorage.setItem('resume-parse-result', JSON.stringify(json));
      sessionStorage.setItem('resume-file-data', JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: b64,
      }));
      setState('done');
      router.push('/contacts/new/person?from=resume');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse failed';
      setError(msg);
      setState('error');
      toast.error('Resume parse failed', { description: msg });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-all ${
        dragOver
          ? 'border-[var(--ai)] bg-[var(--ai-bg)]'
          : state === 'error'
            ? 'border-[var(--danger)] bg-[var(--danger-bg)]'
            : 'border-[var(--border-strong)] bg-[var(--surface-raised)] hover:border-[var(--ai)] hover:bg-[var(--ai-bg)]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />

      {state === 'idle' && (
        <>
          <div className="w-10 h-10 rounded-full bg-[var(--ai-bg)] border border-[var(--ai-border)] flex items-center justify-center">
            <Sparkle size={18} weight="duotone" className="text-[var(--ai)]" />
          </div>
          <div className="text-[13px] font-extrabold text-[var(--text-primary)]">Upload a resume</div>
          <div className="text-[11px] text-[var(--text-secondary)] text-center">
            AI extracts name, email, phone, skills, and work history.
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            <FileArrowUp size={12} />
            Drop PDF / DOCX or click to browse
          </div>
        </>
      )}

      {state === 'parsing' && (
        <>
          <Spinner size={28} />
          <div className="text-[13px] font-extrabold text-[var(--text-primary)]">Parsing resume…</div>
          <div className="text-[11px] text-[var(--text-secondary)]">Extracting structured fields. This takes a few seconds.</div>
        </>
      )}

      {state === 'done' && (
        <>
          <CheckCircle size={28} weight="fill" className="text-[var(--success)]" />
          <div className="text-[13px] font-extrabold text-[var(--success)]">Resume parsed</div>
          <div className="text-[11px] text-[var(--text-secondary)]">Opening new-candidate form…</div>
        </>
      )}

      {state === 'error' && (
        <>
          <Warning size={28} weight="fill" className="text-[var(--danger)]" />
          <div className="text-[13px] font-extrabold text-[var(--danger)]">Parse failed</div>
          <div className="text-[11px] text-[var(--text-secondary)] text-center">{error}</div>
          <button
            onClick={(e) => { e.stopPropagation(); setState('idle'); setError(null); }}
            className="mt-1 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:underline"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Demo-mode upload zone. Two states:
 *   1. `idle` — looks like the live upload zone (icon, hint copy, hover
 *      treatment) but with a "Live mode only" pill at the top so the
 *      affordance is honest about not accepting files.
 *   2. `explained` — content swaps in-place to a short explanation of
 *      what the live parser does, plus two CTAs: route into the manual
 *      Person form, or jump to the case study anchor.
 *
 * No modal, no toast — pure in-place state swap inside the same card
 * footprint as the live version, so the surrounding chooser layout
 * doesn't shift.
 */
function DemoResumeCard() {
  const router = useRouter();
  const [explained, setExplained] = useState(false);

  if (!explained) {
    return (
      <div
        onClick={() => setExplained(true)}
        className="cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-all border-[var(--border-strong)] bg-[var(--surface-raised)] hover:border-[var(--ai)] hover:bg-[var(--ai-bg)]"
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
          <Sparkle size={9} weight="duotone" />
          Live mode only
        </span>
        <div className="w-10 h-10 rounded-full bg-[var(--ai-bg)] border border-[var(--ai-border)] flex items-center justify-center">
          <Sparkle size={18} weight="duotone" className="text-[var(--ai)]" />
        </div>
        <div className="text-[13px] font-extrabold text-[var(--text-primary)]">Upload a resume</div>
        <div className="text-[11px] text-[var(--text-secondary)] text-center">
          AI extracts name, email, phone, skills, and work history.
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          <FileArrowUp size={12} />
          Drop PDF / DOCX or click to browse
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-[var(--ai-border)] bg-[var(--ai-bg)] rounded-xl p-6 flex flex-col items-center gap-3">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--surface-card)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
        <Sparkle size={9} weight="duotone" />
        Live mode only
      </span>
      <h3 className="text-[14px] font-extrabold text-[var(--text-primary)] m-0">AI Resume Parsing</h3>
      <p className="text-[11px] text-[var(--text-secondary)] text-center leading-relaxed max-w-[420px] m-0">
        In the live app, drop a PDF or DOCX and Claude extracts name, email, phone, current role, work history, and skills into the contact form. The AI parser isn't enabled in this demo — use the manual Person form to add a contact, or see the feature in action in the case study.
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); router.push('/contacts/new/person'); }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)] text-[11px] font-bold bg-[var(--tag-info-bg)] text-white border-none cursor-pointer hover:opacity-90"
        >
          Use manual Person form
          <ArrowRight size={11} weight="bold" />
        </button>
      </div>
    </div>
  );
}

/**
 * ArrayBuffer → base64 without blowing the call-stack. Chunks the conversion
 * so large resumes don't fail in `String.fromCharCode(...byteArray)`.
 */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000; // 32 KB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
