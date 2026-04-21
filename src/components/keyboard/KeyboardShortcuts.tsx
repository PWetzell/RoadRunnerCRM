'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Keyboard } from '@phosphor-icons/react';
import { useAlertStore } from '@/stores/alert-store';

interface Shortcut {
  keys: string[];
  label: string;
  category: string;
  action: () => void;
}

/**
 * Global keyboard shortcuts. Mounts at the app root and listens for
 * key combinations. Press `?` to see the full list.
 *
 * Follows the conventions from Linear, Notion, Slack — `cmd+k` for
 * command palette style navigation, single-letter shortcuts for
 * section navigation (g then d = go to dashboard), etc.
 */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const setAlertPanelOpen = useAlertStore((s) => s.setPanelOpen);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gPending, setGPending] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ['?'],       label: 'Show keyboard shortcuts', category: 'General', action: () => setHelpOpen(true) },
    { keys: ['Esc'],     label: 'Close dialog / popover',   category: 'General', action: () => { /* handled per-component */ } },
    { keys: ['/'],       label: 'Focus search',              category: 'General', action: () => focusSearch() },
    { keys: ['n'],       label: 'Open notifications',        category: 'General', action: () => setAlertPanelOpen(true) },

    { keys: ['g', 'd'],  label: 'Go to Dashboard',           category: 'Navigation', action: () => router.push('/dashboard') },
    { keys: ['g', 'c'],  label: 'Go to Contacts',            category: 'Navigation', action: () => router.push('/contacts') },
    { keys: ['g', 's'],  label: 'Go to Sales',               category: 'Navigation', action: () => router.push('/sales') },
    { keys: ['g', 'r'],  label: 'Go to Recruiting',          category: 'Navigation', action: () => router.push('/recruiting') },
    { keys: ['g', 'f'],  label: 'Go to Documents (Files)',   category: 'Navigation', action: () => router.push('/documents') },
    { keys: ['g', 'p'],  label: 'Go to Reporting',           category: 'Navigation', action: () => router.push('/reporting') },
    { keys: ['g', 'a'],  label: 'Go to Admin',               category: 'Navigation', action: () => router.push('/admin') },
    { keys: ['g', 't'],  label: 'Go to To-dos',              category: 'Navigation', action: () => router.push('/todos') },

    { keys: ['c'],       label: 'Create new contact',        category: 'Actions', action: () => router.push('/contacts?add=1') },
    { keys: ['d'],       label: 'Create new deal',           category: 'Actions', action: () => router.push('/sales/new') },
  ];

  function focusSearch() {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement | null;
    input?.focus();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') (target as HTMLInputElement).blur();
        return;
      }

      // Dismiss help modal with Esc
      if (e.key === 'Escape') {
        setHelpOpen(false);
        setGPending(false);
        return;
      }

      // Handle `g then X` sequences
      if (gPending) {
        const match = shortcuts.find((s) => s.keys.length === 2 && s.keys[0] === 'g' && s.keys[1] === e.key.toLowerCase());
        if (match) {
          e.preventDefault();
          match.action();
        }
        setGPending(false);
        return;
      }

      // Start `g` sequence
      if (e.key === 'g') {
        setGPending(true);
        setTimeout(() => setGPending(false), 1500);
        return;
      }

      // Single-key shortcuts
      const single = shortcuts.find((s) => s.keys.length === 1 && s.keys[0] === e.key);
      if (single) {
        e.preventDefault();
        single.action();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gPending]);

  if (!helpOpen) return null;

  const byCategory = shortcuts.reduce<Record<string, Shortcut[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setHelpOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[520px] max-w-[95vw] shadow-lg animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Keyboard size={18} weight="duotone" className="text-[var(--brand-primary)]" />
          <span className="text-[14px] font-extrabold text-[var(--text-primary)] flex-1">Keyboard Shortcuts</span>
          <button
            onClick={() => setHelpOpen(false)}
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{cat}</div>
              <div className="flex flex-col gap-1.5">
                {list.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {s.keys.map((k, ki) => (
                        <kbd key={ki} className="px-2 py-0.5 min-w-[24px] text-center bg-[var(--surface-raised)] border border-[var(--border)] rounded text-[11px] font-bold text-[var(--text-primary)]">
                          {k}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-[12px] text-[var(--text-secondary)]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] text-[11px] text-[var(--text-tertiary)]">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded text-[10px] font-bold">?</kbd> any time to open this help. Most shortcuts are disabled while typing in a field.
        </div>
      </div>
    </div>
  );
}
