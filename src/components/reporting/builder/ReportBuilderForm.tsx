'use client';

import { useState } from 'react';
import {
  ChartBar, ChartPieSlice, ChartDonut, Table, Hash,
  CaretDown, Palette, CheckSquare, TextAa, TextAlignLeft, TextAlignCenter, TextAlignRight,
} from '@phosphor-icons/react';
import {
  CustomReport,
  ReportSource,
  ReportAggregation,
  ReportDisplay,
  FilterClause,
  ReportStyle,
  AGGREGATION_LABELS,
  SOURCE_LABELS,
  DISPLAY_LABELS,
  getFields,
  getField,
} from '@/types/custom-report';
import { WIDGET_HEADER_COLORS, ContentTextSize, ContentAlign, WIDGET_ICON_SUGGESTIONS } from '@/types/dashboard';
import { getIcon } from '@/lib/phosphor-icons';
import { CROSS_OBJECT_PRESETS } from '@/lib/cross-object-presets';
import FilterClauseRow, { AddFilterButton } from './FilterClauseRow';

interface Props {
  draft: CustomReport;
  onChange: (patch: Partial<CustomReport>) => void;
}

const SOURCES: ReportSource[] = ['deals', 'contacts', 'documents', 'cross-object'];
const AGGREGATIONS: ReportAggregation[] = ['count', 'sum', 'avg', 'min', 'max'];
const DISPLAYS: ReportDisplay[] = ['number', 'bar', 'pie', 'donut', 'table'];

const DISPLAY_ICONS = {
  number: Hash,
  bar:    ChartBar,
  pie:    ChartPieSlice,
  donut:  ChartDonut,
  table:  Table,
} as const;

export default function ReportBuilderForm({ draft, onChange }: Props) {
  const fields = getFields(draft.source);
  const aggregableFields = fields.filter((f) => f.aggregable);
  const groupableFields = fields.filter((f) => f.groupable);

  const isCrossObject = draft.source === 'cross-object';
  const needsField = !isCrossObject && draft.aggregation !== 'count';
  const needsGroup =
    !isCrossObject && draft.display !== 'number' && draft.display !== 'table';
  const isTable = draft.display === 'table';

  function addFilter() {
    const firstField = fields[0];
    if (!firstField) return;
    const id = `f-${Math.random().toString(36).slice(2, 8)}`;
    onChange({
      filters: [
        ...draft.filters,
        { id, field: firstField.key, op: 'eq', value: '' },
      ],
    });
  }

  function updateFilter(id: string, patch: Partial<FilterClause>) {
    onChange({
      filters: draft.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  function removeFilter(id: string) {
    onChange({ filters: draft.filters.filter((f) => f.id !== id) });
  }

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-2">
      {/* 1. Name + description */}
      <section>
        <Label>Name</Label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Negotiation Value"
          className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[13px] font-semibold text-[var(--text-primary)]"
          autoFocus
        />
        <textarea
          value={draft.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Optional — what this metric measures."
          rows={2}
          className="w-full mt-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)] resize-none"
        />
      </section>

      {/* 2. Data source */}
      <section>
        <Label>Data source</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {SOURCES.map((s) => {
            const active = draft.source === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  // Reset field/groupBy/filters/preset when switching source
                  onChange({
                    source: s,
                    field: undefined,
                    groupBy: undefined,
                    filters: [],
                    presetMetricId: undefined,
                  });
                }}
                className={`h-9 px-3 rounded-lg text-[12px] font-bold border transition-colors ${
                  active
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                    : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {SOURCE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Preset (cross-object only) */}
      {isCrossObject && (
        <section>
          <Label>Preset metric</Label>
          <div className="flex flex-col gap-1.5">
            {CROSS_OBJECT_PRESETS.map((p) => {
              const active = draft.presetMetricId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({
                    presetMetricId: p.id,
                    display: p.display,
                  })}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                    active
                      ? 'bg-[var(--brand-primary-tint)] border-[var(--brand-primary)]'
                      : 'bg-[var(--surface-card)] border-[var(--border)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <div className="text-[12px] font-extrabold text-[var(--text-primary)]">{p.name}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{p.description}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Aggregation (non-cross-object) */}
      {!isCrossObject && (
        <section>
          <Label>Aggregation</Label>
          <div className="flex flex-wrap gap-1.5">
            {AGGREGATIONS.map((a) => {
              const active = draft.aggregation === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange({
                    aggregation: a,
                    field: a === 'count' ? undefined : draft.field,
                  })}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold border transition-colors ${
                    active
                      ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                      : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  {AGGREGATION_LABELS[a]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Field (when needed) */}
      {needsField && (
        <section>
          <Label>Field to {draft.aggregation}</Label>
          <select
            value={draft.field ?? ''}
            onChange={(e) => onChange({ field: e.target.value || undefined })}
            className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[12px] font-semibold text-[var(--text-primary)] cursor-pointer"
          >
            <option value="">— choose a numeric field —</option>
            {aggregableFields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </section>
      )}

      {/* 6. Filters */}
      {!isCrossObject && (
        <section>
          <Label>Filters</Label>
          <div className="flex flex-col gap-1.5">
            {draft.filters.map((f) => (
              <FilterClauseRow
                key={f.id}
                clause={f}
                source={draft.source}
                fields={fields}
                onChange={(patch) => updateFilter(f.id, patch)}
                onRemove={() => removeFilter(f.id)}
              />
            ))}
            <div className="pt-1">
              <AddFilterButton onClick={addFilter} />
            </div>
          </div>
        </section>
      )}

      {/* 7. Display type */}
      {!isCrossObject && (
        <section>
          <Label>Display</Label>
          <div className="flex flex-wrap gap-1.5">
            {DISPLAYS.map((d) => {
              const active = draft.display === d;
              const Icon = DISPLAY_ICONS[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ display: d, groupBy: d === 'number' || d === 'table' ? undefined : draft.groupBy })}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-bold border transition-colors ${
                    active
                      ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                      : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <Icon size={14} weight={active ? 'fill' : 'regular'} />
                  {DISPLAY_LABELS[d]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Group by */}
      {needsGroup && (
        <section>
          <Label>Group by</Label>
          <select
            value={draft.groupBy ?? ''}
            onChange={(e) => onChange({ groupBy: e.target.value || undefined })}
            className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[12px] font-semibold text-[var(--text-primary)] cursor-pointer"
          >
            <option value="">— choose a dimension —</option>
            {groupableFields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </section>
      )}

      {/* 9. Appearance (collapsible) — same controls as dashboard widget settings */}
      <AppearanceSection
        style={draft.style ?? {}}
        displayType={draft.display}
        reportType={draft.source}
        onChange={(patch) => onChange({ style: { ...(draft.style ?? {}), ...patch } })}
      />

      {/* 10. Table options */}
      {!isCrossObject && isTable && (
        <section>
          <Label>Table options</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Sort by</div>
              <select
                value={draft.sortBy ?? ''}
                onChange={(e) => onChange({ sortBy: e.target.value || undefined })}
                className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)]"
              >
                <option value="">— none —</option>
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Direction</div>
              <div className="flex gap-1">
                {(['asc', 'desc'] as const).map((d) => {
                  const active = (draft.sortDir ?? 'asc') === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onChange({ sortDir: d })}
                      className={`flex-1 h-8 rounded-lg text-[11px] font-bold border ${
                        active
                          ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                          : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {d === 'asc' ? 'Asc' : 'Desc'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Row limit</div>
              <input
                type="number"
                min={1}
                max={100}
                value={draft.limit ?? 10}
                onChange={(e) => onChange({ limit: Number(e.target.value) || 10 })}
                className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)]"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Appearance — collapsible section with style defaults               */
/* ------------------------------------------------------------------ */

const TEXT_SIZES: { id: ContentTextSize; label: string }[] = [
  { id: 'sm',  label: 'S' },
  { id: 'md',  label: 'M' },
  { id: 'lg',  label: 'L' },
  { id: 'xl',  label: 'XL' },
  { id: 'xxl', label: 'XXL' },
];

const ALIGN_OPTIONS: { id: ContentAlign; Icon: typeof TextAlignLeft; label: string }[] = [
  { id: 'left',   Icon: TextAlignLeft,   label: 'Left' },
  { id: 'center', Icon: TextAlignCenter, label: 'Center' },
  { id: 'right',  Icon: TextAlignRight,  label: 'Right' },
];

/** Neutral B2B color palette used for text colors — matches the widget settings. */
const TEXT_COLORS: { value: string | undefined; label: string }[] = [
  { value: undefined,  label: 'Default' },
  { value: '#0F172A',  label: 'Ink' },
  { value: '#475569',  label: 'Slate' },
  { value: '#1955A6',  label: 'Brand' },
  { value: '#0E7490',  label: 'Teal' },
  { value: '#059669',  label: 'Green' },
  { value: '#D97706',  label: 'Amber' },
  { value: '#DC2626',  label: 'Red' },
  { value: '#7C3AED',  label: 'Violet' },
];

function AppearanceSection({
  style,
  displayType,
  reportType,
  onChange,
}: {
  style: ReportStyle;
  displayType: ReportDisplay;
  reportType: ReportSource;
  onChange: (patch: Partial<ReportStyle>) => void;
}) {
  const [open, setOpen] = useState(false);

  // Count non-default style fields so the collapsed header can show a count badge
  const styledCount = Object.values(style).filter((v) => v != null && v !== '').length;

  return (
    <section className="border border-[var(--border)] rounded-lg bg-[var(--surface-raised)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <Palette size={14} weight="fill" className="text-[var(--brand-primary)]" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Appearance</span>
        {styledCount > 0 && (
          <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[9px] font-extrabold bg-[var(--brand-primary)] text-white">
            {styledCount} customized
          </span>
        )}
        <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
          {open ? 'Hide' : 'Show'}
        </span>
        <CaretDown size={11} weight="bold" className={`text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-[var(--border)]">
          {/* Header color */}
          <div>
            <MiniLabel>Header color</MiniLabel>
            <div className="flex flex-wrap items-center gap-1">
              <ColorSwatch
                selected={!style.headerColor}
                onClick={() => onChange({ headerColor: undefined })}
                label="Default"
                checker
              />
              {WIDGET_HEADER_COLORS.map((c) => (
                <ColorSwatch
                  key={c.value}
                  color={c.value}
                  selected={style.headerColor === c.value}
                  onClick={() => onChange({ headerColor: c.value })}
                  label={c.name}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <MiniLabel>Icon</MiniLabel>
            <IconSuggestionRow
              selected={style.iconName}
              suggestions={getIconSuggestions(reportType, displayType)}
              onChange={(iconName) => onChange({ iconName })}
            />
          </div>

          {/* Content color */}
          <div>
            <MiniLabel>Value / content color</MiniLabel>
            <div className="flex flex-wrap items-center gap-1">
              {TEXT_COLORS.map((c) => (
                <ColorSwatch
                  key={c.label}
                  color={c.value}
                  selected={(style.contentTextColor ?? undefined) === c.value}
                  onClick={() => onChange({ contentTextColor: c.value })}
                  label={c.label}
                  checker={c.value === undefined}
                />
              ))}
            </div>
          </div>

          {/* Title size + Content size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MiniLabel>Title size</MiniLabel>
              <SizePills
                value={style.titleSize ?? 'md'}
                onChange={(titleSize) => onChange({ titleSize })}
              />
            </div>
            <div>
              <MiniLabel>Content size</MiniLabel>
              <SizePills
                value={style.contentTextSize ?? 'md'}
                onChange={(contentTextSize) => onChange({ contentTextSize })}
              />
            </div>
          </div>

          {/* Alignment */}
          <div>
            <MiniLabel>Alignment</MiniLabel>
            <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden">
              {ALIGN_OPTIONS.map((a) => {
                const active = (style.contentAlign ?? 'left') === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onChange({ contentAlign: a.id })}
                    aria-label={a.label}
                    aria-pressed={active}
                    className={`h-7 w-9 flex items-center justify-center ${
                      active ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <a.Icon size={12} weight="bold" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset */}
          {styledCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({
                headerColor: undefined,
                iconName: undefined,
                iconColor: undefined,
                titleColor: undefined,
                titleSize: undefined,
                contentTextColor: undefined,
                contentTextSize: undefined,
                subtitleColor: undefined,
                contentAlign: undefined,
              })}
              className="self-start text-[11px] font-bold text-[var(--text-tertiary)] hover:text-[var(--danger)] underline"
            >
              Reset to brand defaults
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
      {children}
    </div>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
  label,
  checker,
}: {
  color?: string;
  selected: boolean;
  onClick: () => void;
  label: string;
  /** Visual checker pattern — used for "default" (no fill). */
  checker?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
        selected
          ? 'border-[var(--brand-primary)] scale-110 shadow'
          : 'border-[var(--border)] hover:scale-105'
      }`}
      style={{
        background: checker
          ? 'repeating-conic-gradient(#E2E8F0 0% 25%, #FFFFFF 0% 50%) 0 / 8px 8px'
          : color ?? 'transparent',
      }}
    >
      {selected && <CheckSquare size={12} weight="fill" className="text-white drop-shadow" />}
    </button>
  );
}

function SizePills({
  value,
  onChange,
}: {
  value: ContentTextSize;
  onChange: (v: ContentTextSize) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden">
      {TEXT_SIZES.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-pressed={active}
            className={`h-7 px-2 text-[10px] font-extrabold ${
              active ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function IconSuggestionRow({
  selected,
  suggestions,
  onChange,
}: {
  selected?: string;
  suggestions: string[];
  onChange: (name: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        aria-pressed={!selected}
        title="Default"
        className={`h-8 px-2 rounded-md text-[10px] font-bold border ${
          !selected
            ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
            : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)]'
        }`}
      >
        Auto
      </button>
      {suggestions.map((name) => {
        const Icon = getIcon(name);
        if (!Icon) return null;
        const active = selected === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            aria-pressed={active}
            title={name}
            className={`h-8 w-8 rounded-md flex items-center justify-center border transition-all ${
              active
                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <Icon size={14} weight={active ? 'fill' : 'bold'} />
          </button>
        );
      })}
    </div>
  );
}

function getIconSuggestions(source: ReportSource, displayType: ReportDisplay): string[] {
  // Pull from the widget registry's suggestions when there's a 1:1 mapping,
  // otherwise use general chart icons.
  const byDisplay: Record<ReportDisplay, string[]> = {
    number: ['TrendUp', 'ChartLineUp', 'CurrencyDollar', 'Sparkle', 'Trophy'],
    bar:    ['ChartBar', 'ChartBarHorizontal', 'Kanban'],
    pie:    ['ChartPieSlice'],
    donut:  ['ChartDonut'],
    table:  ['Table', 'ListBullets', 'Rows'],
  };
  const bySource: Record<ReportSource, string[]> = {
    deals:    ['Handbag', 'Briefcase', 'Target'],
    contacts: ['UsersThree', 'Users', 'AddressBook'],
    documents:['FileText', 'Folder', 'Files'],
    'cross-object': ['Funnel', 'GitMerge', 'ArrowsClockwise'],
  };
  const combined = [...byDisplay[displayType], ...bySource[source]];
  // Deduplicate while preserving order
  return Array.from(new Set(combined));
}
