'use client';

import { useEffect, useState } from 'react';
import { X as XIcon } from '@phosphor-icons/react';
import SlidePanel from '@/components/ui/SlidePanel';
import { useScoringStore } from '@/stores/scoring-store';
import type {
  ScoringRule,
  ScoringCategory,
  ScoringCondition,
  FieldPresenceField,
} from '@/types/scoring';

/**
 * Slide-in editor for one scoring rule. Same shell as the contact /
 * lead creation flows (SlidePanel, right-edge), so admins reach
 * for the same affordance to edit a rule as they do to add a contact.
 *
 * Two modes:
 *   - mode "edit": pre-fills from `existing`, save = updateRule.
 *   - mode "create": empty form, category may be pre-selected from
 *     the "+ Add rule" button at the bottom of a category section.
 *     Save = addRule.
 *
 * Validation runs live (button disabled until clean). Saving ALWAYS
 * pushes through the scoring-store's actions, which Zustand
 * propagates to every `useScoringStore` subscriber — so badges +
 * chart + KPIs all refresh immediately without any extra plumbing.
 */

const CATEGORY_OPTIONS: { value: ScoringCategory; label: string }[] = [
  { value: 'completeness', label: 'Profile Completeness' },
  { value: 'firmographics', label: 'Firmographics' },
  { value: 'engagement', label: 'Engagement' },
];

const CONDITION_KIND_OPTIONS: { value: ScoringCondition['kind']; label: string }[] = [
  { value: 'fieldPresent',         label: 'Field is present' },
  { value: 'fieldContains',        label: 'Title contains keyword' },
  { value: 'companySizeGt',        label: 'Company size greater than' },
  { value: 'industryIn',           label: 'Industry in list' },
  { value: 'hasActiveDeal',        label: 'Has an active deal' },
  { value: 'repliedWithinDays',    label: 'Replied within N days' },
  { value: 'contactedWithinDays',  label: 'Contacted within N days' },
  { value: 'noActivityForDays',    label: 'No activity for N days' },
];

const FIELD_PRESENCE_OPTIONS: FieldPresenceField[] = [
  'email', 'phone', 'title', 'company', 'address', 'tags',
];

// Industry options reuse the same canonical list the seeded
// `rule-firm-target-industry` rule uses, so the edit-panel
// selector matches what the engine matches against. Source list
// from `src/lib/scoring/seed-rules.ts`.
const INDUSTRY_OPTIONS = [
  'Software', 'SaaS', 'Technology', 'Artificial Intelligence', 'AI',
  'Data Platform', 'Data', 'Observability', 'Design',
  'Healthcare', 'Biotech', 'Biotechnology', 'Pharma', 'Pharmaceutical',
  'Medical', 'Clinical',
  'Financial Services', 'Investment', 'Banking', 'Insurance', 'Payments',
  'Asset Management', 'Wealth', 'Brokerage', 'Equity',
  'Aerospace', 'Manufacturing',
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Rule to edit; undefined means "create new". */
  existing?: ScoringRule;
  /** Pre-selected category when creating from a section's "+ Add rule" button. */
  defaultCategory?: ScoringCategory;
}

export default function RuleEditPanel({ open, onClose, existing, defaultCategory }: Props) {
  const addRule = useScoringStore((s) => s.addRule);
  const updateRule = useScoringStore((s) => s.updateRule);

  // Local form state — initialised from `existing` (edit) or sensible
  // defaults (create). Resets every time the panel opens for a new
  // target so leftover state from a previous open doesn't bleed in.
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ScoringCategory>('completeness');
  const [points, setPoints] = useState<number>(5);
  const [active, setActive] = useState(true);
  const [kind, setKind] = useState<ScoringCondition['kind']>('fieldPresent');

  // Per-kind fields. We hold ALL of them in local state and pick the
  // relevant subset when building the saved condition. This is simpler
  // than a discriminated-state machine and lets the user flip between
  // kinds without losing what they typed in another kind's field.
  const [field, setField] = useState<FieldPresenceField>('email');
  const [titleKeywords, setTitleKeywords] = useState<string[]>([]);
  const [titleKeywordInput, setTitleKeywordInput] = useState('');
  const [companySize, setCompanySize] = useState<number>(100);
  const [industries, setIndustries] = useState<string[]>([]);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setCategory(existing.category);
      setPoints(existing.points);
      setActive(existing.active);
      setKind(existing.condition.kind);
      switch (existing.condition.kind) {
        case 'fieldPresent':
          setField(existing.condition.field);
          break;
        case 'fieldContains':
          setTitleKeywords(existing.condition.anyOf);
          break;
        case 'companySizeGt':
          setCompanySize(existing.condition.value);
          break;
        case 'industryIn':
          setIndustries(existing.condition.values);
          break;
        case 'repliedWithinDays':
        case 'contactedWithinDays':
        case 'noActivityForDays':
          setDays(existing.condition.days);
          break;
        case 'hasActiveDeal':
          // No extra fields.
          break;
      }
    } else {
      setName('');
      setCategory(defaultCategory ?? 'completeness');
      setPoints(5);
      setActive(true);
      setKind('fieldPresent');
      setField('email');
      setTitleKeywords([]);
      setTitleKeywordInput('');
      setCompanySize(100);
      setIndustries([]);
      setDays(30);
    }
  }, [open, existing, defaultCategory]);

  // Live validation. Save button disabled until errors clear.
  const trimmedName = name.trim();
  const nameError =
    trimmedName.length === 0 ? 'Name is required'
      : trimmedName.length < 2 ? 'Name must be at least 2 characters'
      : trimmedName.length > 60 ? 'Name must be at most 60 characters'
      : null;
  const pointsError =
    points === 0 ? 'Points cannot be zero (use a positive or negative value)'
      : !Number.isFinite(points) ? 'Points must be a number'
      : null;
  const conditionError = (() => {
    switch (kind) {
      case 'fieldContains':
        return titleKeywords.length === 0 ? 'Add at least one keyword' : null;
      case 'companySizeGt':
        return !Number.isFinite(companySize) || companySize < 0 ? 'Enter a non-negative employee count' : null;
      case 'industryIn':
        return industries.length === 0 ? 'Select at least one industry' : null;
      case 'repliedWithinDays':
      case 'contactedWithinDays':
      case 'noActivityForDays':
        return !Number.isFinite(days) || days < 1 || days > 365 ? 'Days must be between 1 and 365' : null;
      default:
        return null;
    }
  })();

  const valid = !nameError && !pointsError && !conditionError;

  function buildCondition(): ScoringCondition {
    switch (kind) {
      case 'fieldPresent':         return { kind, field };
      case 'fieldContains':        return { kind, field: 'title', anyOf: titleKeywords };
      case 'companySizeGt':        return { kind, value: companySize };
      case 'industryIn':           return { kind, values: industries };
      case 'hasActiveDeal':        return { kind };
      case 'repliedWithinDays':    return { kind, days };
      case 'contactedWithinDays':  return { kind, days };
      case 'noActivityForDays':    return { kind, days };
    }
  }

  function handleSave() {
    if (!valid) return;
    const payload = {
      name: trimmedName,
      category,
      points,
      active,
      condition: buildCondition(),
    };
    if (existing) {
      updateRule(existing.id, payload);
    } else {
      addRule(payload);
    }
    onClose();
  }

  function addKeyword() {
    const trimmed = titleKeywordInput.trim();
    if (!trimmed) return;
    if (titleKeywords.includes(trimmed)) {
      setTitleKeywordInput('');
      return;
    }
    setTitleKeywords([...titleKeywords, trimmed]);
    setTitleKeywordInput('');
  }

  function toggleIndustry(value: string) {
    setIndustries((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={existing ? 'Edit scoring rule' : 'New scoring rule'}
      width={520}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-8 px-3 text-[12px] font-bold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="h-8 px-4 text-[12px] font-bold text-white bg-[var(--tag-brand-bg)] border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existing ? 'Save changes' : 'Add rule'}
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Name */}
        <Field label="Name" error={nameError}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Has a senior title"
            className="h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
          />
        </Field>

        {/* Category + Points + Active in a row */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ScoringCategory)}
              className="h-9 px-2 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Points" error={pointsError} hint="Positive rewards, negative penalises. Cannot be zero.">
            <input
              type="number"
              value={Number.isFinite(points) ? points : ''}
              onChange={(e) => setPoints(parseInt(e.target.value, 10))}
              className="h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-[var(--surface-raised)]">
          <div>
            <div className="text-[12px] font-bold text-[var(--text-primary)]">Active</div>
            <div className="text-[10.5px] text-[var(--text-tertiary)]">Inactive rules are skipped by the scorer.</div>
          </div>
          <button
            role="switch"
            aria-checked={active}
            onClick={() => setActive((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer border-none ${active ? 'bg-[var(--tag-success-bg)]' : 'bg-[var(--border-strong)]'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Condition kind */}
        <Field label="Condition">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ScoringCondition['kind'])}
            className="h-9 px-2 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
          >
            {CONDITION_KIND_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        {/* Conditional inputs based on kind */}
        {kind === 'fieldPresent' && (
          <Field label="Field">
            <select
              value={field}
              onChange={(e) => setField(e.target.value as FieldPresenceField)}
              className="h-9 px-2 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
            >
              {FIELD_PRESENCE_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
        )}

        {kind === 'fieldContains' && (
          <Field label="Title contains any of" error={conditionError} hint="Add words/phrases. Title matches if any are found (case-insensitive).">
            <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--surface-bg)] border border-[var(--border)] rounded-md min-h-[40px] focus-within:border-[var(--brand-primary)]">
              {titleKeywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold bg-[var(--tag-brand-bg)] text-white"
                >
                  {k}
                  <button
                    onClick={() => setTitleKeywords(titleKeywords.filter((x) => x !== k))}
                    aria-label={`Remove ${k}`}
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 border-none cursor-pointer text-white"
                  >
                    <XIcon size={9} weight="bold" />
                  </button>
                </span>
              ))}
              <input
                value={titleKeywordInput}
                onChange={(e) => setTitleKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  } else if (e.key === 'Backspace' && titleKeywordInput === '' && titleKeywords.length > 0) {
                    setTitleKeywords(titleKeywords.slice(0, -1));
                  }
                }}
                placeholder={titleKeywords.length === 0 ? 'Type and press Enter…' : ''}
                className="flex-1 min-w-[120px] h-6 text-[12px] bg-transparent border-none outline-none text-[var(--text-primary)]"
              />
            </div>
          </Field>
        )}

        {kind === 'companySizeGt' && (
          <Field label="Employee count greater than" error={conditionError}>
            <input
              type="number"
              min={0}
              value={Number.isFinite(companySize) ? companySize : ''}
              onChange={(e) => setCompanySize(parseInt(e.target.value, 10))}
              className="h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
            />
          </Field>
        )}

        {kind === 'industryIn' && (
          <Field label="Industries" error={conditionError} hint="Click to toggle. Engine matches as a case-insensitive substring.">
            <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--surface-bg)] border border-[var(--border)] rounded-md max-h-[260px] overflow-y-auto">
              {INDUSTRY_OPTIONS.map((opt) => {
                const selected = industries.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleIndustry(opt)}
                    className={`inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold cursor-pointer border-none ${
                      selected
                        ? 'bg-[var(--tag-brand-bg)] text-white'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--zebra-row-hover)]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {kind === 'hasActiveDeal' && (
          <div className="text-[12px] text-[var(--text-tertiary)] italic">
            No additional fields. The rule fires when the contact (or their org) has any deal not in <strong>closed-won</strong> or <strong>closed-lost</strong>.
          </div>
        )}

        {(kind === 'repliedWithinDays' || kind === 'contactedWithinDays' || kind === 'noActivityForDays') && (
          <Field label="Days" error={conditionError} hint="Between 1 and 365.">
            <input
              type="number"
              min={1}
              max={365}
              value={Number.isFinite(days) ? days : ''}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] w-full"
            />
          </Field>
        )}
      </div>
    </SlidePanel>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</label>
      {children}
      {error && <div className="text-[11px] font-semibold text-[var(--danger)]">{error}</div>}
      {!error && hint && <div className="text-[10.5px] text-[var(--text-tertiary)]">{hint}</div>}
    </div>
  );
}
