'use client';

import { DotsSixVertical, PencilSimple, X, Info, PushPin, EyeSlash } from '@phosphor-icons/react';

/**
 * Shared editable card container used by the Contact and Sales detail pages.
 *
 * - Shows an icon + title + optional Incomplete badge in its header.
 * - Exposes a pencil/X toggle on the right for entering/leaving edit mode.
 * - Draggable via `data-card-id` for DOM-based reordering (same trick the
 *   Contacts details tab already uses).
 * - Body renders whatever children are passed — view state or edit form.
 *
 * This used to live inline in DetailsTab.tsx; it was pulled out so Sales
 * detail tabs can reuse the exact same visual + edit affordances as Contacts.
 */
export default function SectionCard({
  icon,
  title,
  children,
  isEditing,
  onEdit,
  onCancel,
  editable = true,
  incomplete = false,
  cardId,
  isPinned,
  onTogglePin,
  onHide,
  hidden = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  editable?: boolean;
  incomplete?: boolean;
  cardId?: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  /** Turn this card OFF for the current contact. Shown as an eye-slash
   *  icon in the header; hidden cards disappear from Details and from
   *  Overview (even if pinned), and can be restored from the "Hidden
   *  cards" bar at the top of the Details tab. */
  onHide?: () => void;
  /** When true the card is turned off for this contact and we return
   *  null — caller can pass this directly instead of wrapping every
   *  card in a conditional. */
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div
      className={`bg-[var(--surface-card)] border rounded-xl overflow-visible transition-all duration-300 section-card ${
        isEditing ? 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]' : 'border-[var(--border)]'
      }`}
      draggable={!isEditing}
      data-card-id={cardId}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cardId || '');
        (e.currentTarget as HTMLElement).classList.add('dragging-card');
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('dragging-card');
        document.querySelectorAll('.drag-over-top, .drag-over-left, .drag-over-right').forEach((el) =>
          el.classList.remove('drag-over-top', 'drag-over-left', 'drag-over-right'),
        );
        document.querySelectorAll('.drop-zone-highlight').forEach((el) => el.classList.remove('drop-zone-highlight'));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const el = e.currentTarget as HTMLElement;
        el.classList.remove('drag-over-top', 'drag-over-left', 'drag-over-right');
        el.classList.add('drag-over-top');
      }}
      onDragLeave={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('drag-over-top', 'drag-over-left', 'drag-over-right');
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetEl = e.currentTarget as HTMLElement;
        targetEl.classList.remove('drag-over-top', 'drag-over-left', 'drag-over-right');
        const draggedEl = document.querySelector(`[data-card-id="${draggedId}"]`);
        if (draggedEl && draggedEl !== targetEl) {
          targetEl.parentNode?.insertBefore(draggedEl, targetEl);
          draggedEl.classList.add('card-just-dropped');
          setTimeout(() => draggedEl.classList.remove('card-just-dropped'), 300);
        }
      }}
    >
      <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <span className="text-[10.5px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <DotsSixVertical size={13} weight="bold" className="text-[var(--text-secondary)] cursor-grab hover:text-[var(--brand-primary)] transition-colors" />
          {icon} {title}
          {incomplete && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]">
              <Info size={9} /> Incomplete
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              aria-label={isPinned ? 'Unpin from Overview' : 'Pin to Overview'}
              title={isPinned ? 'Unpin from Overview' : 'Pin to Overview'}
              className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-150 bg-transparent border-none cursor-pointer ${
                isPinned
                  ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--brand-primary)]'
              }`}
            >
              <PushPin size={14} weight={isPinned ? 'fill' : 'regular'} />
            </button>
          )}
          {onHide && (
            <button
              onClick={onHide}
              aria-label="Hide card"
              title="Hide card"
              className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-150 bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--danger)]"
            >
              <EyeSlash size={14} />
            </button>
          )}
          {editable && (
            <button
              onClick={isEditing ? onCancel : onEdit}
              aria-label={isEditing ? 'Cancel edit' : `Edit ${title}`}
              title={isEditing ? 'Cancel edit' : `Edit ${title}`}
              className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-300 ${
                isEditing ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--brand-primary)]'
              }`}
            >
              {isEditing ? <X size={14} /> : <PencilSimple size={14} />}
            </button>
          )}
        </div>
      </div>
      <div style={{ paddingLeft: 'var(--detail-card-px, 16px)', paddingRight: 'var(--detail-card-px, 16px)', paddingTop: 'var(--detail-card-py, 12px)', paddingBottom: 'var(--detail-card-py, 12px)' }}>{children}</div>
    </div>
  );
}

/** A two-column label/value row for view mode. Shows "—" when empty. */
export function FieldRow({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[var(--border-subtle)] last:border-0">
      <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-[110px] flex-shrink-0 pt-0.5">
        {label}
      </div>
      <div className={`text-[var(--text-primary)] flex-1 ${small ? 'text-xs leading-relaxed' : 'text-[13px]'}`}>
        {value || <span className="text-[var(--text-tertiary)]">—</span>}
      </div>
    </div>
  );
}
