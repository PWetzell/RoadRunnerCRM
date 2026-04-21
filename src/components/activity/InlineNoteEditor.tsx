'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  TextB, TextItalic, TextUnderline as UnderlineIcon,
  TextAlignLeft, ListBullets, TextAlignCenter, TextAlignRight,
  Link as LinkIcon, FloppyDisk, X, Trash
} from '@phosphor-icons/react';

interface InlineNoteEditorProps {
  mode: 'add' | 'edit';
  initialContent?: string;
  onSave: (html: string, plainText: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  authorName?: string;
  authorInitials?: string;
  authorColor?: string;
  createdAt?: string;
}

export default function InlineNoteEditor({
  mode, initialContent = '', onSave, onCancel, onDelete,
  authorName, authorInitials, authorColor, createdAt
}: InlineNoteEditorProps) {
  const [hasContent, setHasContent] = useState(!!initialContent);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your note...' }),
    ],
    content: initialContent,
    onUpdate: ({ editor: e }) => {
      setHasContent(e.getText().trim().length > 0);
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[120px] px-3 py-3 text-[13px] leading-relaxed',
        style: 'color: var(--text-primary)',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({ onClick, active, children, title }: {
    onClick: () => void; active?: boolean; children: React.ReactNode; title: string;
  }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-all bg-transparent border-none cursor-pointer ${
        active
          ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
          : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border-t border-[var(--border)] animate-[fieldSlideIn_0.25s_ease-out]">
      {mode === 'edit' && authorName && (
        <div className="flex items-center gap-2.5 px-4 pt-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: authorColor }}>
            {authorInitials}
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">{authorName}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{createdAt}</div>
          </div>
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Type (Optional)</label>
        <select className="w-[180px] h-[32px] px-2 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none">
          <option>Sales</option><option>Support</option><option>General</option><option>Follow-up</option><option>Meeting</option><option>Call Log</option>
        </select>
      </div>

      <div className="mx-4 border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
        <div className="px-2 py-1.5 bg-[var(--surface-raised)] border-b border-[var(--border)] flex gap-0.5 items-center">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><TextB size={16} weight="bold" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><TextItalic size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={16} /></ToolbarButton>
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><TextAlignLeft size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><ListBullets size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><TextAlignCenter size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><TextAlignRight size={16} /></ToolbarButton>
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Insert Link"><LinkIcon size={16} /></ToolbarButton>
        </div>
        <div className="bg-[var(--surface-card)]">
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {mode === 'edit' && onDelete ? (
          <button onClick={onDelete} className="text-xs font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer flex items-center gap-1"><Trash size={14} /> Delete</button>
        ) : <div />}
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer flex items-center gap-1"><X size={14} /> Cancel</button>
          <button
            onClick={() => onSave(editor.getHTML(), editor.getText())}
            disabled={!hasContent}
            className="px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <FloppyDisk size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
