'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileArrowUp, CheckCircle, Warning, Sparkle, Spinner } from '@phosphor-icons/react';
import { toast } from '@/lib/toast';

/**
 * Drop a resume here → AI parses it → routes to the new-person wizard
 * with all the fields prefilled.
 *
 * The parsed payload is stashed in sessionStorage so the wizard can pick
 * it up without a heavy URL query string.
 */
export function ResumeUploadCard() {
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
