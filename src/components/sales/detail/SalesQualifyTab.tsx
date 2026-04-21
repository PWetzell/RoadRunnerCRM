'use client';

import { useState } from 'react';
import { Deal, DealStage } from '@/types/deal';
import { Contact, Organization, ProductEntry } from '@/types/contact';
import { Buildings, ChartLineUp, ChartPieSlice, Package, MapPin, Flag, CheckCircle, Warning, Plus, Trash } from '@phosphor-icons/react';
import { LeadCompleteness } from '@/lib/leadCompleteness';
import PipelineStepper from '@/components/sales/PipelineStepper';
import SectionCard, { FieldRow } from '@/components/detail/SectionCard';
import CardEditForm from '@/components/detail/CardEditForm';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { isDate, isNonNegativeNumber, maxLength, oneOf } from '@/lib/validation';

interface Props {
  deal: Deal;
  person?: Contact;
  org?: Contact;
  completeness: LeadCompleteness;
  onStageChange: (s: DealStage) => void;
}

type EditingCard =
  | 'engagement'
  | 'company-details'
  | 'revenue'
  | 'sales-volume'
  | 'products'
  | null;

const fmtMoney = (n?: number) => {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

/**
 * Qualify tab — Figma-inspired stack of editable cards. Each card uses the
 * shared SectionCard + CardEditForm pattern from the Contacts detail page, so
 * the edit affordances (pencil toggle, save/cancel, border highlight) are
 * consistent across Contacts and Sales.
 *
 * Card data writes:
 * - Engagement/Need → deal (initiative, targetStartDate)
 * - Company Details → linked org (employees, structure, category)
 * - Revenue Volume → linked org (revenueVolume.{annual,quarterly,monthly})
 * - Sales Volume   → linked org (salesVolume.{annual,quarterly,monthly})
 * - Products       → linked org (products[])
 */
export default function SalesQualifyTab({ deal, person, org, completeness, onStageChange }: Props) {
  const updateDeal = useSalesStore((s) => s.updateDeal);
  const updateContact = useContactStore((s) => s.updateContact);

  const [editing, setEditing] = useState<EditingCard>(null);
  const orgData = org && org.type === 'org' ? (org as Organization) : undefined;
  const isCompany = deal.type === 'company';

  // Field-level persist helpers ----------------------------------------------

  function saveEngagement(v: Record<string, string>) {
    updateDeal(deal.id, {
      initiative: v.initiative || undefined,
      targetStartDate: v.targetStartDate || undefined,
    });
    setEditing(null);
  }

  function saveCompanyDetails(v: Record<string, string>) {
    if (!orgData) return;
    updateContact(orgData.id, {
      employees: v.employees || undefined,
      structure: v.structure || undefined,
      category: v.category || undefined,
      industry: v.industry || undefined,
      hq: v.hq || undefined,
    });
    setEditing(null);
  }

  function saveRevenue(v: Record<string, string>) {
    if (!orgData) return;
    const annual = parseFloat(v.annual) || undefined;
    const quarterly = parseFloat(v.quarterly) || undefined;
    const monthly = parseFloat(v.monthly) || undefined;
    updateContact(orgData.id, {
      revenueVolume: annual || quarterly || monthly ? { annual, quarterly, monthly } : undefined,
    });
    setEditing(null);
  }

  function saveSalesVolume(v: Record<string, string>) {
    if (!orgData) return;
    const annual = parseFloat(v.annual) || undefined;
    const quarterly = parseFloat(v.quarterly) || undefined;
    const monthly = parseFloat(v.monthly) || undefined;
    updateContact(orgData.id, {
      salesVolume: annual || quarterly || monthly ? { annual, quarterly, monthly } : undefined,
    });
    setEditing(null);
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="grid grid-cols-[1fr_340px] gap-4">
      {/* Left column — editable cards */}
      <div className="flex flex-col gap-4">
        {isCompany && (
          <SectionCard
            icon={<Flag size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
            title="Engagement / Need"
            isEditing={editing === 'engagement'}
            onEdit={() => setEditing('engagement')}
            onCancel={() => setEditing(null)}
            incomplete={!deal.initiative}
            cardId="sales-engagement"
          >
            {editing === 'engagement' ? (
              <CardEditForm
                onCancel={() => setEditing(null)}
                onSave={saveEngagement}
                fields={[
                  { key: 'initiative', label: 'Initiative / Need', type: 'textarea', value: deal.initiative, placeholder: 'What project or hire is driving this deal?', full: true, rules: [maxLength('Initiative', 500)] },
                  { key: 'targetStartDate', label: 'Target Start Date', type: 'date', value: deal.targetStartDate, rules: [isDate()] },
                ]}
              />
            ) : (
              <>
                <FieldRow label="Initiative" value={deal.initiative} small />
                <FieldRow label="Target Start" value={deal.targetStartDate} />
              </>
            )}
          </SectionCard>
        )}

        <SectionCard
          icon={<Buildings size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Company Details"
          isEditing={editing === 'company-details'}
          onEdit={() => setEditing('company-details')}
          onCancel={() => setEditing(null)}
          editable={Boolean(orgData)}
          cardId="sales-company-details"
        >
          {!orgData ? (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">
              {isCompany ? 'Link a company to populate this card' : 'No current employer attached'}
            </div>
          ) : editing === 'company-details' ? (
            <CardEditForm
              onCancel={() => setEditing(null)}
              onSave={saveCompanyDetails}
              fields={[
                { key: 'industry', label: 'Industry', type: 'text', value: orgData.industry, placeholder: 'e.g. SaaS, Fintech', rules: [maxLength('Industry', 80)] },
                { key: 'employees', label: 'Employees', type: 'text', value: orgData.employees, placeholder: '50-100', rules: [oneOf('Employees', ['1-10','11-25','25-50','50-100','100-250','250-500','500-1000','1000+'])] },
                { key: 'structure', label: 'Structure', type: 'select', value: orgData.structure, options: ['Public', 'Private', 'Partnership', 'LLC', 'Non-profit', 'Cooperative'] },
                { key: 'category', label: 'Category', type: 'select', value: orgData.category, options: ['Local', 'Regional', 'National', 'Global'] },
                { key: 'hq', label: 'HQ', type: 'text', value: orgData.hq, placeholder: 'City, State', required: true, rules: [maxLength('HQ', 120)] },
              ]}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Industry" value={orgData.industry} />
              <Stat label="Employees" value={orgData.employees} />
              <Stat label="Structure" value={orgData.structure} />
              <Stat label="Category" value={orgData.category} />
              <Stat label="HQ" value={orgData.hq} className="col-span-2" />
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={<ChartLineUp size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Revenue Volume"
          isEditing={editing === 'revenue'}
          onEdit={() => setEditing('revenue')}
          onCancel={() => setEditing(null)}
          editable={Boolean(orgData)}
          cardId="sales-revenue"
        >
          {!orgData ? (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">Link a company to track revenue</div>
          ) : editing === 'revenue' ? (
            <CardEditForm
              onCancel={() => setEditing(null)}
              onSave={saveRevenue}
              fields={[
                { key: 'annual', label: 'Annual', type: 'number', value: orgData.revenueVolume?.annual, placeholder: 'e.g. 1000000', rules: [isNonNegativeNumber()] },
                { key: 'quarterly', label: 'Quarterly', type: 'number', value: orgData.revenueVolume?.quarterly, rules: [isNonNegativeNumber()] },
                { key: 'monthly', label: 'Monthly', type: 'number', value: orgData.revenueVolume?.monthly, rules: [isNonNegativeNumber()] },
              ]}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Annual" value={fmtMoney(orgData.revenueVolume?.annual)} />
              <Stat label="Quarterly" value={fmtMoney(orgData.revenueVolume?.quarterly)} />
              <Stat label="Monthly" value={fmtMoney(orgData.revenueVolume?.monthly)} />
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={<ChartPieSlice size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Sales Volume"
          isEditing={editing === 'sales-volume'}
          onEdit={() => setEditing('sales-volume')}
          onCancel={() => setEditing(null)}
          editable={Boolean(orgData)}
          cardId="sales-sales-volume"
        >
          {!orgData ? (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">Link a company to track sales volume</div>
          ) : editing === 'sales-volume' ? (
            <CardEditForm
              onCancel={() => setEditing(null)}
              onSave={saveSalesVolume}
              fields={[
                { key: 'annual', label: 'Annual', type: 'number', value: orgData.salesVolume?.annual, placeholder: 'e.g. 1000000', rules: [isNonNegativeNumber()] },
                { key: 'quarterly', label: 'Quarterly', type: 'number', value: orgData.salesVolume?.quarterly, rules: [isNonNegativeNumber()] },
                { key: 'monthly', label: 'Monthly', type: 'number', value: orgData.salesVolume?.monthly, rules: [isNonNegativeNumber()] },
              ]}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Annual" value={fmtMoney(orgData.salesVolume?.annual)} />
              <Stat label="Quarterly" value={fmtMoney(orgData.salesVolume?.quarterly)} />
              <Stat label="Monthly" value={fmtMoney(orgData.salesVolume?.monthly)} />
            </div>
          )}
        </SectionCard>

        <ProductsCard
          org={orgData}
          editing={editing === 'products'}
          onEnterEdit={() => setEditing('products')}
          onCancel={() => setEditing(null)}
          onSave={(products) => {
            if (!orgData) return;
            updateContact(orgData.id, { products: products.length ? products : undefined });
            setEditing(null);
          }}
        />
      </div>

      {/* Right column — pipeline + completeness + locations */}
      <div className="flex flex-col gap-4">
        <SectionCard
          icon={<Flag size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Pipeline"
          isEditing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          editable={false}
          cardId="sales-pipeline"
        >
          <PipelineStepper stage={deal.stage} onChange={onStageChange} />
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] flex items-center justify-between">
            <span>Owner</span>
            <span className="font-bold text-[var(--text-secondary)]">{deal.owner || '—'}</span>
          </div>
        </SectionCard>

        <SectionCard
          icon={completeness.pct === 100 ? <CheckCircle size={16} weight="fill" className="text-[var(--success)]" /> : <Warning size={16} weight="bold" className="text-[var(--warning)]" />}
          title="Completeness"
          isEditing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          editable={false}
          cardId="sales-completeness"
        >
          <ul className="flex flex-col gap-1">
            {completeness.fields.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-[12px]">
                <span className={f.filled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>{f.label}</span>
                {f.filled ? (
                  <CheckCircle size={14} weight="fill" className="text-[var(--success)]" />
                ) : (
                  <span className="text-[10px] font-bold text-[var(--warning)] uppercase">Missing</span>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          icon={<MapPin size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
          title="Locations"
          isEditing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          editable={false}
          cardId="sales-locations"
        >
          {orgData?.hq ? (
            <div className="text-[13px] text-[var(--text-primary)]">{orgData.hq}</div>
          ) : (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">No locations on file</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stat({ label, value, className = '' }: { label: string; value?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{label}</div>
      <div className="text-[13px] text-[var(--text-primary)] mt-0.5">{value || <span className="text-[var(--text-tertiary)]">—</span>}</div>
    </div>
  );
}

/**
 * Products & Services — multi-entry list. View mode shows each entry; edit mode
 * shows inline rows with Type + Description + Remove, plus an "Add product"
 * button at the bottom. All changes commit together on Save.
 */
function ProductsCard({
  org,
  editing,
  onEnterEdit,
  onCancel,
  onSave,
}: {
  org?: Organization;
  editing: boolean;
  onEnterEdit: () => void;
  onCancel: () => void;
  onSave: (products: ProductEntry[]) => void;
}) {
  const [draft, setDraft] = useState<ProductEntry[]>(() => org?.products ? [...org.products] : []);
  const [confirmRemove, setConfirmRemove] = useState<{ idx: number; product: ProductEntry } | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Reset draft when entering edit mode
  const enterEdit = () => {
    setDraft(org?.products ? [...org.products] : []);
    setTouched(new Set());
    onEnterEdit();
  };

  const update = (idx: number, patch: Partial<ProductEntry>) => {
    setDraft((d) => d.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };
  const remove = (idx: number) => setDraft((d) => d.filter((_, i) => i !== idx));
  const add = () =>
    setDraft((d) => [...d, { id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: '', description: '' }]);

  const errorFor = (p: ProductEntry, field: 'type' | 'description'): string | null => {
    const v = p[field];
    if (field === 'type') {
      if (!v.trim()) return 'Type is required';
      if (v.length > 60) return 'Type must be at most 60 characters';
    } else {
      if (!v.trim()) return 'Description is required';
      if (v.length > 200) return 'Description must be at most 200 characters';
    }
    return null;
  };
  const hasAnyError = draft.some((p) => errorFor(p, 'type') || errorFor(p, 'description'));

  return (
    <SectionCard
      icon={<Package size={16} weight="duotone" className="text-[var(--brand-primary)]" />}
      title="Products & Services"
      isEditing={editing}
      onEdit={enterEdit}
      onCancel={onCancel}
      editable={Boolean(org)}
      cardId="sales-products"
    >
      {!org ? (
        <div className="text-[12px] italic text-[var(--text-tertiary)]">Link a company to manage products</div>
      ) : editing ? (
        <div className="flex flex-col gap-3">
          {draft.length === 0 && (
            <div className="text-[12px] italic text-[var(--text-tertiary)]">No products yet — add one below.</div>
          )}
          {draft.map((p, idx) => {
            const typeKey = `${p.id}-type`;
            const descKey = `${p.id}-description`;
            const typeErr = touched.has(typeKey) ? errorFor(p, 'type') : null;
            const descErr = touched.has(descKey) ? errorFor(p, 'description') : null;
            const borderFor = (err: string | null) =>
              err
                ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
                : 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]';
            return (
              <div key={p.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <div>
                  <input
                    value={p.type}
                    onChange={(e) => update(idx, { type: e.target.value })}
                    onBlur={() => setTouched((t) => new Set(t).add(typeKey))}
                    placeholder="Type (e.g. Software)"
                    className={`w-full h-[34px] px-2.5 border ${borderFor(typeErr)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
                  />
                  {typeErr && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
                      <Warning size={12} weight="fill" /> {typeErr}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    value={p.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    onBlur={() => setTouched((t) => new Set(t).add(descKey))}
                    placeholder="Description"
                    className={`w-full h-[34px] px-2.5 border ${borderFor(descErr)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
                  />
                  {descErr && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
                      <Warning size={12} weight="fill" /> {descErr}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    // Skip confirm if the row is still empty — users just added it by mistake.
                    if (!p.type && !p.description) { remove(idx); return; }
                    setConfirmRemove({ idx, product: p });
                  }}
                  aria-label="Remove product"
                  className="h-[34px] w-[34px] inline-flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger-bg)] bg-transparent border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer"
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
          <button
            onClick={add}
            className="self-start inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)] bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer"
          >
            <Plus size={14} /> Add product
          </button>
          <div className="flex justify-end gap-2 pt-3 mt-1 border-t border-[var(--border-subtle)]">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Mark all as touched so any errors become visible
                const allKeys = new Set<string>();
                draft.forEach((p) => { allKeys.add(`${p.id}-type`); allKeys.add(`${p.id}-description`); });
                setTouched(allKeys);
                const filtered = draft.filter((p) => p.type.trim() || p.description.trim());
                const remainingHasError = filtered.some((p) => errorFor(p, 'type') || errorFor(p, 'description'));
                if (remainingHasError) return;
                onSave(filtered);
              }}
              disabled={hasAnyError}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      ) : !org.products || org.products.length === 0 ? (
        <div className="text-[12px] italic text-[var(--text-tertiary)]">No products or services documented yet</div>
      ) : (
        <ul className="flex flex-col gap-0">
          {org.products.map((p) => (
            <li key={p.id} className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
              <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{p.type || '—'}</div>
              <div className="text-[13px] text-[var(--text-primary)]">{p.description || '—'}</div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove product?"
        message={
          confirmRemove
            ? `Remove "${confirmRemove.product.type || 'Untitled'}${confirmRemove.product.description ? ' — ' + confirmRemove.product.description : ''}" from the products list? This is not saved until you click Save on the card.`
            : ''
        }
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmRemove) remove(confirmRemove.idx);
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </SectionCard>
  );
}
