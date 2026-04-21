'use client';

import { useState } from 'react';
import { Trash, TextAlignLeft, TextAlignCenter, TextAlignRight, Check, FloppyDisk, X, DotsSixVertical } from '@phosphor-icons/react';
import { WidgetConfig, WIDGET_HEADER_COLORS, ContentAlign, ContentTextSize, WidgetType } from '@/types/dashboard';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useWidgetStoreActionsOptional } from './WidgetStoreContext';
import IconPicker from './IconPicker';

interface Props {
  widget: WidgetConfig;
  widgetType: WidgetType;
  /** The display title of the widget — shown in the dialog header. */
  title: string;
  onClose: () => void;
  onRemove: () => void;
  /** Called on mousedown on the header bar so the parent can track a drag. */
  onDragStart?: (e: React.MouseEvent) => void;
  /** Optional external style-write callback. When provided, ALL style changes
   *  go through this instead of the dashboard store. Used by ConfigurableCard
   *  to write to card-style-store. */
  onStyleChange?: (patch: Partial<WidgetConfig>) => void;
}

const TEXT_SIZES: { value: ContentTextSize; label: string }[] = [
  { value: 'sm',  label: 'SM' },
  { value: 'md',  label: 'MD' },
  { value: 'lg',  label: 'LG' },
  { value: 'xl',  label: 'XL' },
  { value: 'xxl', label: 'XXL' },
];

const secondaryBtn = (active: boolean) =>
  `flex-1 h-[26px] text-[10px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all inline-flex items-center justify-center ${
    active
      ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
  }`;

export default function WidgetSettingsPopover({ widget, widgetType, title, onClose, onRemove, onDragStart, onStyleChange }: Props) {
  const ctxActions = useWidgetStoreActionsOptional();
  const _setWidgetHeaderColor = useDashboardStore((s) => s.setWidgetHeaderColor);
  const _setWidgetStyle = useDashboardStore((s) => s.setWidgetStyle);

  // Priority: onStyleChange prop (ConfigurableCard) > context (Reporting/Admin) > dashboard store
  const setWidgetStyle = onStyleChange
    ? (_id: string, patch: Partial<WidgetConfig>) => onStyleChange(patch)
    : ctxActions
    ? (id: string, patch: Partial<WidgetConfig>) => ctxActions.setWidgetStyle(id, patch)
    : (id: string, patch: Partial<WidgetConfig>) => _setWidgetStyle(id, patch);
  const setWidgetHeaderColor = onStyleChange
    ? (_id: string, color: string | undefined) => onStyleChange({ headerColor: color })
    : ctxActions
    ? (id: string, color: string | undefined) => ctxActions.setWidgetHeaderColor(id, color)
    : (id: string, color: string | undefined) => _setWidgetHeaderColor(id, color);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  if (iconPickerOpen) {
    return (
      <IconPicker
        selectedName={widget.iconName}
        widgetType={widgetType}
        color={widget.iconColor || widget.headerColor}
        onPick={(name) => {
          setWidgetStyle(widget.id, { iconName: name });
          setIconPickerOpen(false);
        }}
        onClear={() => {
          setWidgetStyle(widget.id, { iconName: undefined });
          setIconPickerOpen(false);
        }}
        onClose={() => setIconPickerOpen(false)}
      />
    );
  }

  return (
    <div className="w-[500px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-xl animate-[fadeUp_0.15s_ease-out] flex flex-col">
      {/* HEADER — doubles as drag handle */}
      <div
        className="flex-shrink-0 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
      >
        <span className="text-[12px] font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
          <DotsSixVertical size={12} weight="bold" className="text-[var(--text-tertiary)]" />
          Edit {title}
        </span>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Close"
          className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* BODY — 2 columns: Visual (left) | Typography (right) */}
      <div className="grid grid-cols-2">
        {/* LEFT — visual chrome */}
        <div className="border-r border-[var(--border-subtle)]">
          <SectionRow label="Icon">
            <button
              onClick={() => setIconPickerOpen(true)}
              className="w-full h-[28px] px-2 text-[11px] font-semibold text-[var(--text-primary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer hover:border-[var(--brand-primary)] text-left flex items-center gap-2"
            >
              <span className="flex-1 truncate">{widget.iconName || 'Default'}</span>
              <span className="text-[9px] text-[var(--text-tertiary)]">Change…</span>
            </button>
          </SectionRow>

          <SectionRow label="Icon color">
            <ColorGrid
              value={widget.iconColor}
              onPick={(c) => setWidgetStyle(widget.id, { iconColor: c })}
              onClear={() => setWidgetStyle(widget.id, { iconColor: undefined })}
            />
          </SectionRow>

          <SectionRow label="Header color">
            <ColorGrid
              value={widget.headerColor}
              onPick={(c) => setWidgetHeaderColor(widget.id, c)}
              onClear={() => setWidgetHeaderColor(widget.id, undefined)}
            />
          </SectionRow>

          <SectionRow label="Alignment" last={widgetType !== 'chart-pipeline-by-stage'}>
            <div className="flex gap-1">
              {([
                { value: 'left', icon: <TextAlignLeft size={13} weight="bold" /> },
                { value: 'center', icon: <TextAlignCenter size={13} weight="bold" /> },
                { value: 'right', icon: <TextAlignRight size={13} weight="bold" /> },
              ] as { value: ContentAlign; icon: React.ReactNode }[]).map((a) => {
                const active = (widget.contentAlign || 'left') === a.value;
                return (
                  <button
                    key={a.value}
                    onClick={() => setWidgetStyle(widget.id, { contentAlign: a.value })}
                    aria-label={a.value}
                    className={secondaryBtn(active)}
                  >
                    {a.icon}
                  </button>
                );
              })}
            </div>
          </SectionRow>

          {widgetType === 'chart-pipeline-by-stage' && (
            <SectionRow label="Chart type" last>
              <div className="flex gap-1">
                {([
                  { value: 'bar', label: 'Bar' },
                  { value: 'pie', label: 'Pie' },
                  { value: 'donut', label: 'Donut' },
                ] as { value: string; label: string }[]).map((c) => {
                  const current = (widget.config?.chartType as string) || 'bar';
                  const active = current === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), chartType: c.value } })}
                      className={secondaryBtn(active)}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </SectionRow>
          )}

          {widgetType === 'ai-suggestions' && (
            <>
              <SectionRow label="Suggestion bg">
                <ColorGrid
                  value={widget.config?.suggestionBg as string | undefined}
                  onPick={(c) => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), suggestionBg: c } })}
                  onClear={() => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), suggestionBg: undefined } })}
                />
              </SectionRow>
              <SectionRow label="Suggestion border">
                <ColorGrid
                  value={widget.config?.suggestionBorder as string | undefined}
                  onPick={(c) => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), suggestionBorder: c } })}
                  onClear={() => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), suggestionBorder: undefined } })}
                />
              </SectionRow>
              <SectionRow label="Suggestion accent" last>
                <ColorGrid
                  value={widget.config?.suggestionAccent as string | undefined}
                  onPick={(c) => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), suggestionAccent: c } })}
                  onClear={() => setWidgetStyle(widget.id, { config: { ...(widget.config || {}), suggestionAccent: undefined } })}
                />
              </SectionRow>
            </>
          )}
        </div>

        {/* RIGHT — typography tiers: Title, Value, Subtitle */}
        <div>
          <TypographySection
            label="Title"
            color={widget.titleColor}
            size={widget.titleSize}
            onColorPick={(c) => setWidgetStyle(widget.id, { titleColor: c })}
            onColorClear={() => setWidgetStyle(widget.id, { titleColor: undefined })}
            onSizePick={(s) => setWidgetStyle(widget.id, { titleSize: s })}
          />
          <TypographySection
            label="Value"
            color={widget.contentTextColor}
            size={widget.contentTextSize}
            onColorPick={(c) => setWidgetStyle(widget.id, { contentTextColor: c })}
            onColorClear={() => setWidgetStyle(widget.id, { contentTextColor: undefined })}
            onSizePick={(s) => setWidgetStyle(widget.id, { contentTextSize: s })}
          />
          <TypographySection
            label="Subtitle"
            color={widget.subtitleColor}
            size={widget.subtitleSize}
            onColorPick={(c) => setWidgetStyle(widget.id, { subtitleColor: c })}
            onColorClear={() => setWidgetStyle(widget.id, { subtitleColor: undefined })}
            onSizePick={(s) => setWidgetStyle(widget.id, { subtitleSize: s })}
            last
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex-shrink-0 border-t border-[var(--border-subtle)] px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={() => { onClose(); onRemove(); }}
          className="inline-flex items-center justify-center gap-1.5 h-[32px] px-3 text-[11px] font-bold text-[var(--danger)] bg-transparent border border-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer hover:bg-[var(--danger-bg)]"
        >
          <Trash size={12} /> Remove
        </button>
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center justify-center gap-1.5 h-[32px] px-5 text-[11px] font-bold text-white bg-[var(--brand-primary)] border border-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90"
        >
          <FloppyDisk size={12} weight="fill" /> Save
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-3 py-2 ${last ? '' : 'border-b border-[var(--border-subtle)]'}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pb-1">{label}</div>
      {children}
    </div>
  );
}

/** Compact typography section: color swatches + size pills on 2 rows. */
function TypographySection({
  label, color, size, onColorPick, onColorClear, onSizePick, last,
}: {
  label: string;
  color?: string;
  size?: ContentTextSize;
  onColorPick: (c: string) => void;
  onColorClear: () => void;
  onSizePick: (s: ContentTextSize) => void;
  last?: boolean;
}) {
  return (
    <div className={`px-3 py-2 ${last ? '' : 'border-b border-[var(--border-subtle)]'}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pb-1">{label}</div>
      <div className="flex flex-col gap-1.5">
        <ColorGrid value={color} onPick={onColorPick} onClear={onColorClear} />
        <div className="flex gap-0.5">
          {TEXT_SIZES.map((t) => {
            const active = (size || 'md') === t.value;
            return (
              <button
                key={t.value}
                onClick={() => onSizePick(t.value)}
                className={secondaryBtn(active)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColorGrid({ value, onPick, onClear }: { value?: string; onPick: (c: string) => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5 flex-1">
        {WIDGET_HEADER_COLORS.map((c) => {
          const isActive = value?.toLowerCase() === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              onClick={() => onPick(c.value)}
              title={c.name}
              aria-label={c.name}
              className={`h-5 flex-1 rounded-[3px] border-2 cursor-pointer flex items-center justify-center transition-all ${
                isActive ? 'border-[var(--text-primary)]' : 'border-transparent hover:border-[var(--border-strong)]'
              }`}
              style={{ background: c.value }}
            >
              {isActive && <Check size={9} weight="bold" className="text-white" />}
            </button>
          );
        })}
      </div>
      {value && (
        <button
          onClick={onClear}
          className="text-[9px] font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer whitespace-nowrap"
        >
          Reset
        </button>
      )}
    </div>
  );
}
