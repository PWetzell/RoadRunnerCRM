'use client';

import { useState } from 'react';
import { X, FloppyDisk, Trash, TextB, TextItalic, TextUnderline, TextAlignLeft, ListBullets, TextAlignCenter, TextAlignRight, Link as LinkIcon } from '@phosphor-icons/react';
import { Note, NoteTag } from '@/types/note';

interface NoteEditorProps {
  open: boolean;
  mode: 'add' | 'edit';
  note?: Note;
  onSave: (data: { body: string; type: string; tags: NoteTag[] }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const NOTE_TYPES = ['Sales', 'Support', 'General', 'Follow-up', 'Meeting', 'Call Log'];
const MAX_CHARS = 4000;

export default function NoteEditor({ open, mode, note, onSave, onDelete, onClose }: NoteEditorProps) {
  const [body, setBody] = useState(note?.body || '');
  const [type, setType] = useState(note?.tags?.[0] || 'Sales');

  if (!open) return null;

  const charCount = body.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[560px] max-w-[95vw] shadow-lg animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-[15px] font-extrabold text-[var(--text-primary)]">
            {mode === 'add' ? 'New Note' : 'Edit Note'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all bg-transparent border-none cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Note author info (edit mode) */}
          {mode === 'edit' && note && (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: note.authorColor }}>
                {note.authorInitials}
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{note.author}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{note.createdAt}</div>
              </div>
            </div>
          )}

          {/* Type dropdown */}
          <div className="mb-3">
            <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Type (Optional)</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-[200px] h-[34px] px-2.5 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none"
            >
              {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Rich text editor */}
          <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
            {/* Toolbar */}
            <div className="px-2.5 py-1.5 bg-[var(--surface-raised)] border-b border-[var(--border)] flex gap-1">
              {[
                { icon: TextB, label: 'Bold' },
                { icon: TextItalic, label: 'Italic' },
                { icon: TextUnderline, label: 'Underline' },
                null,
                { icon: TextAlignLeft, label: 'Align Left' },
                { icon: ListBullets, label: 'Bullet List' },
                { icon: TextAlignCenter, label: 'Center' },
                { icon: TextAlignRight, label: 'Align Right' },
                null,
                { icon: LinkIcon, label: 'Link' },
              ].map((item, i) =>
                item === null ? (
                  <div key={`sep-${i}`} className="w-px h-5 bg-[var(--border)] mx-0.5 self-center" />
                ) : (
                  <button
                    key={item.label}
                    title={item.label}
                    className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)] transition-all bg-transparent border-none cursor-pointer"
                  >
                    <item.icon size={16} />
                  </button>
                )
              )}
            </div>

            {/* Text area */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Write your note..."
              className="w-full min-h-[160px] px-3 py-3 text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] border-none outline-none resize-y leading-relaxed placeholder:text-[var(--text-tertiary)]"
              style={{ fontFamily: 'inherit' }}
              autoFocus
            />

            {/* Character count */}
            <div className="text-right px-3 py-1.5 text-[11px] text-[var(--text-tertiary)]">
              {charCount} / {MAX_CHARS}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          {mode === 'edit' && onDelete ? (
            <button onClick={onDelete} className="text-xs font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer flex items-center gap-1">
              <Trash size={14} /> Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer">
              Cancel
            </button>
            <button
              onClick={() => onSave({ body, type, tags: [] })}
              disabled={!body.trim()}
              className="px-4 py-2 text-sm font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <FloppyDisk size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
