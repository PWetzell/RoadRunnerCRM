'use client';

import { useEffect, useMemo, useState } from 'react';
import { PencilSimple, Trash, Plus, ArrowClockwise, CaretDown } from '@phosphor-icons/react';
import Widget from '../Widget';
import RuleEditPanel from '@/components/admin/scoring/RuleEditPanel';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useScoringStore } from '@/stores/scoring-store';
import type { WidgetConfig } from '@/types/dashboard';
import type { ScoringRule, ScoringCategory } from '@/types/scoring';

/**
 * Quality Score rules table — collapsible groups, edit panel, reset.
 * NO internal scrolling per Paul's spec: the card sizes large enough
 * (default 4×6 = 960px) to fit 16 rules fully expanded; if the user
 * adds many more rules and the card overflows, the page itself
 * scrolls because the parent admin shell is the only scrollable
 * container.
 *
 * KPIs and the distribution chart used to live in this widget too —
 * they're now siblings (`score-kpis`, `score-distribution`) so each
 * piece can be hidden, dragged, and resized independently.
 *
 * Live reactivity: every consumer (this widget, KPIs widget,
 * distribution widget, score badges across the app) subscribes to
 * the same scoring-store. Toggling/editing/deleting a rule
 * propagates everywhere in the same render.
 */

const CATEGORY_META: { id: ScoringCategory; label: string; description: string }[] = [
  { id: 'completeness',  label: 'Profile Completeness', description: 'Field-presence rules — does the record have what we need to act on it?' },
  { id: 'firmographics', label: 'Firmographics',         description: 'Who they are — title seniority, company size, industry.' },
  { id: 'engagement',    label: 'Engagement',            description: 'Recent contact, open deals, stale relationships.' },
];

export default function ScoringRulesWidget({ widget }: { widget: WidgetConfig }) {
  const rules = useScoringStore((s) => s.rules);
  const toggleRule = useScoringStore((s) => s.toggleRule);
  const deleteRule = useScoringStore((s) => s.deleteRule);
  const resetToDefaults = useScoringStore((s) => s.resetToDefaults);

  useEffect(() => {
    useScoringStore.persist.rehydrate();
  }, []);

  const [editTarget, setEditTarget] = useState<ScoringRule | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState<ScoringCategory | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ScoringRule | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<ScoringCategory, boolean>>({
    completeness: false,
    firmographics: false,
    engagement: false,
  });

  const rulesByCategory = useMemo(() => {
    const map: Record<ScoringCategory, ScoringRule[]> = {
      completeness: [],
      firmographics: [],
      engagement: [],
    };
    for (const r of rules) map[r.category].push(r);
    return map;
  }, [rules]);

  function openEdit(rule: ScoringRule) {
    setEditTarget(rule);
    setCreateCategory(undefined);
    setEditOpen(true);
  }
  function openCreate(category: ScoringCategory) {
    setEditTarget(undefined);
    setCreateCategory(category);
    setEditOpen(true);
  }

  return (
    <Widget widget={widget} title={widget.title || 'Scoring rules'} defaultIconName="ShieldCheck" autoHeight>
      <div className="flex flex-col gap-3">
        {/* Header strip: total/active counts + Reset to defaults */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {rules.length} total · {rules.filter((r) => r.active).length} active
          </div>
          <button
            onClick={() => setResetConfirm(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-bold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <ArrowClockwise size={11} weight="bold" /> Reset to defaults
          </button>
        </div>

        {/* Category sections */}
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          {CATEGORY_META.map((cat) => {
            const list = rulesByCategory[cat.id];
            const collapsedNow = collapsed[cat.id];
            return (
              <div key={cat.id} className="border-b border-[var(--border)] last:border-0">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border-none cursor-pointer text-left"
                >
                  <div>
                    <div className="text-[12px] font-extrabold text-[var(--text-primary)]">{cat.label}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">{cat.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{list.length}</span>
                    <CaretDown
                      size={12}
                      weight="bold"
                      className={`text-[var(--text-tertiary)] transition-transform ${collapsedNow ? '-rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {!collapsedNow && (
                  <div className="flex flex-col">
                    {list.length === 0 && (
                      <div className="px-4 py-4 text-center text-[11px] text-[var(--text-tertiary)] italic">
                        No rules in this category yet.
                      </div>
                    )}
                    {list.map((r) => (
                      <RuleRow
                        key={r.id}
                        rule={r}
                        onToggle={() => toggleRule(r.id)}
                        onEdit={() => openEdit(r)}
                        onDelete={() => setDeleteTarget(r)}
                      />
                    ))}
                    <button
                      onClick={() => openCreate(cat.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer hover:bg-[var(--brand-bg)]/40 border-t border-[var(--border-subtle)]"
                    >
                      <Plus size={11} weight="bold" /> Add rule
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <RuleEditPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        existing={editTarget}
        defaultCategory={createCategory}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete rule"
        message={
          deleteTarget ? (
            <>Delete <strong>{deleteTarget.name}</strong>? Scores will recompute without this rule.</>
          ) : ''
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteRule(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={resetConfirm}
        title="Reset to default rules"
        message={
          <>
            This restores the original 16 seeded rules and removes any custom rules you've added or edits you've
            made. Scores will recompute immediately. This cannot be undone.
          </>
        }
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={() => {
          resetToDefaults();
          setResetConfirm(false);
        }}
        onCancel={() => setResetConfirm(false)}
      />
    </Widget>
  );
}

function RuleRow({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: ScoringRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPositive = rule.points > 0;
  const conditionSummary = describeCondition(rule);
  return (
    <div className="px-4 py-2.5 flex items-center gap-2.5 border-t border-[var(--border-subtle)] hover:bg-[var(--surface-raised)]/40">
      <button
        role="switch"
        aria-checked={rule.active}
        aria-label={rule.active ? `Disable ${rule.name}` : `Enable ${rule.name}`}
        onClick={onToggle}
        className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 cursor-pointer border-none ${rule.active ? 'bg-[var(--tag-success-bg)]' : 'bg-[var(--border-strong)]'}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${rule.active ? 'left-[18px]' : 'left-0.5'}`} />
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-[12px] font-bold truncate ${rule.active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] line-through'}`}>
          {rule.name}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] truncate">{conditionSummary}</div>
      </div>

      <span
        className="text-[12px] font-extrabold tabular-nums w-[44px] text-right flex-shrink-0"
        style={{ color: isPositive ? 'var(--tag-success-bg)' : 'var(--tag-danger-bg)' }}
      >
        {isPositive ? '+' : ''}{rule.points}
      </span>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onEdit}
          title="Edit rule"
          aria-label={`Edit ${rule.name}`}
          className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)]/40 bg-transparent border-none cursor-pointer"
        >
          <PencilSimple size={12} />
        </button>
        <button
          onClick={onDelete}
          title="Delete rule"
          aria-label={`Delete ${rule.name}`}
          className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]/40 bg-transparent border-none cursor-pointer"
        >
          <Trash size={12} />
        </button>
      </div>
    </div>
  );
}

function describeCondition(rule: ScoringRule): string {
  const c = rule.condition;
  switch (c.kind) {
    case 'fieldPresent':
      return `Field "${c.field}" is present`;
    case 'fieldContains':
      return `Title contains: ${c.anyOf.join(', ')}`;
    case 'companySizeGt':
      return `Company has more than ${c.value} employees`;
    case 'industryIn':
      return `Industry: ${c.values.slice(0, 3).join(', ')}${c.values.length > 3 ? ` +${c.values.length - 3}` : ''}`;
    case 'hasActiveDeal':
      return 'Has an open deal';
    case 'repliedWithinDays':
      return `Replied within ${c.days} days`;
    case 'contactedWithinDays':
      return `Contacted within ${c.days} days`;
    case 'noActivityForDays':
      return `No activity for ${c.days}+ days`;
  }
}
