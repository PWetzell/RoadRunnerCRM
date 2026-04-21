'use client';

import { X, Plus, Check } from '@phosphor-icons/react';
import {
  FilterClause,
  FilterOp,
  FieldDef,
  FILTER_OP_LABELS,
  getValidOps,
  getField,
  ReportSource,
} from '@/types/custom-report';

interface Props {
  clause: FilterClause;
  source: ReportSource;
  fields: FieldDef[];
  onChange: (patch: Partial<FilterClause>) => void;
  onRemove: () => void;
}

/**
 * A single filter row in the Report Builder: field picker → operator picker →
 * type-aware value input. The value input swaps based on the field's type:
 *   string/number  → text input
 *   date           → date picker (for eq/neq/gt/...); number for withinDays
 *   enum           → single-select dropdown (or chips for in/notIn)
 *   boolean        → true/false pills
 *   array          → text input (contains)
 * For `empty`/`notEmpty` operators, the value is hidden entirely.
 */
export default function FilterClauseRow({ clause, source, fields, onChange, onRemove }: Props) {
  const field = getField(source, clause.field) ?? fields[0];
  const validOps: FilterOp[] = field ? getValidOps(field.type) : ['eq', 'neq'];

  // If the current op isn't valid for the newly-picked field, snap to the first valid op.
  const op: FilterOp = validOps.includes(clause.op) ? clause.op : validOps[0];

  const needsValue = op !== 'empty' && op !== 'notEmpty';

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
      {/* Field picker */}
      <select
        value={clause.field}
        onChange={(e) => {
          const newField = e.target.value;
          const newFieldDef = getField(source, newField);
          const newValidOps: FilterOp[] = newFieldDef ? getValidOps(newFieldDef.type) : ['eq', 'neq'];
          onChange({
            field: newField,
            op: newValidOps[0],
            value: '',
          });
        }}
        className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] font-semibold text-[var(--text-primary)] min-w-[110px] cursor-pointer"
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Op picker */}
      <select
        value={op}
        onChange={(e) => onChange({ op: e.target.value as FilterOp, value: '' })}
        className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)] cursor-pointer"
      >
        {validOps.map((o) => (
          <option key={o} value={o}>
            {FILTER_OP_LABELS[o]}
          </option>
        ))}
      </select>

      {/* Value input (type-aware) */}
      {needsValue && (
        <ValueInput
          field={field}
          op={op}
          value={clause.value}
          onChange={(v) => onChange({ value: v })}
        />
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="h-7 w-7 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--surface-card)] ml-auto"
        aria-label="Remove filter"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Value input                                                        */
/* ------------------------------------------------------------------ */

function ValueInput({
  field,
  op,
  value,
  onChange,
}: {
  field: FieldDef;
  op: FilterOp;
  value: string | number | string[];
  onChange: (v: string | number | string[]) => void;
}) {
  // withinDays / olderThanDays → number input
  if (op === 'withinDays' || op === 'olderThanDays') {
    return (
      <input
        type="number"
        min={0}
        value={value === '' ? '' : Number(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] w-20 text-[var(--text-primary)]"
        placeholder="days"
      />
    );
  }

  // in / notIn on an enum → multi-select chips
  if ((op === 'in' || op === 'notIn') && field.type === 'enum' && field.options) {
    const selected = Array.isArray(value) ? value : value ? [String(value)] : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next);
    };
    return (
      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
        {field.options.map((opt) => {
          const isOn = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`h-6 px-2 rounded-full text-[11px] font-semibold capitalize border transition-colors ${
                isOn
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                  : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {isOn && <Check size={10} className="inline mr-0.5" weight="bold" />}
              {prettyLabel(opt)}
            </button>
          );
        })}
      </div>
    );
  }

  // enum with eq/neq → dropdown
  if (field.type === 'enum' && field.options) {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)] cursor-pointer"
      >
        <option value="">— choose —</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {prettyLabel(opt)}
          </option>
        ))}
      </select>
    );
  }

  // boolean → true/false pills
  if (field.type === 'boolean') {
    const v = String(value) === 'true';
    return (
      <div className="flex items-center gap-1">
        {(['true', 'false'] as const).map((b) => {
          const isOn = String(value) === b;
          return (
            <button
              key={b}
              type="button"
              onClick={() => onChange(b)}
              className={`h-7 px-3 rounded text-[11px] font-semibold border transition-colors ${
                isOn
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                  : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {b === 'true' ? 'Yes' : 'No'}
            </button>
          );
        })}
        {/* voider to keep layout consistent with v */}
        <span className="sr-only">current: {String(v)}</span>
      </div>
    );
  }

  // date → date picker
  if (field.type === 'date') {
    const dateStr = typeof value === 'string' ? value.slice(0, 10) : '';
    return (
      <input
        type="date"
        value={dateStr}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)]"
      />
    );
  }

  // number
  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value === '' ? '' : Number(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] w-28 text-[var(--text-primary)]"
        placeholder="value"
      />
    );
  }

  // string / array default → text input
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 px-2 rounded border border-[var(--border)] bg-[var(--surface-card)] text-[12px] flex-1 min-w-[120px] text-[var(--text-primary)]"
      placeholder="value"
    />
  );
}

function prettyLabel(s: string): string {
  return s.replace(/-/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Add-filter button (exported for convenience)                       */
/* ------------------------------------------------------------------ */

export function AddFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-[var(--border)] text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
    >
      <Plus size={12} weight="bold" />
      Add filter
    </button>
  );
}
