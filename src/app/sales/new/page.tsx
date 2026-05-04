'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, FloppyDisk, X as XIcon } from '@phosphor-icons/react';
import Topbar from '@/components/layout/Topbar';
import { StepIndicator } from '@/components/contact-flow/StepIndicator';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useUserStore } from '@/stores/user-store';
import { Deal, DEAL_SOURCES, DealSource } from '@/types/deal';
import { uid, initials, getAvatarColor } from '@/lib/utils';
import AIDealDuplicateDetection from '@/components/sales/ai/AIDealDuplicateDetection';
import AIDealScoring from '@/components/sales/ai/AIDealScoring';
import { isDate, isNonNegativeNumber, maxLength as maxLenRule } from '@/lib/validation';
import { Warning } from '@phosphor-icons/react';
import { LABELS, CANDIDATE_SOURCES } from '@/lib/vertical/hr-staffing';
import { toast } from '@/lib/toast';

type StepId = 'details' | 'contacts' | 'pricing';

const STEPS = [
  { id: 'details' as const, label: 'Deal Details' },
  { id: 'contacts' as const, label: 'Candidate & Client' },
  { id: 'pricing' as const, label: 'Fee & Forecast' },
];

export default function NewLeadPage() {
  const router = useRouter();
  const contacts = useContactStore((s) => s.contacts);
  const addDeal = useSalesStore((s) => s.addDeal);
  const owner = useUserStore((s) => s.user.name);

  const [currentStep, setCurrentStep] = useState<StepId>('details');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

  // Step 1
  const [name, setName] = useState('');
  const [source, setSource] = useState<DealSource>('Inbound');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  // Step 2
  const [personId, setPersonId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  // Step 3
  const [amount, setAmount] = useState(50000);
  const [probability, setProbability] = useState(20);
  const [notes, setNotes] = useState('');

  const persons = useMemo(() => contacts.filter((c) => c.type === 'person'), [contacts]);
  const orgs = useMemo(() => contacts.filter((c) => c.type === 'org'), [contacts]);

  const filteredPersons = useMemo(() => {
    const q = personSearch.toLowerCase();
    return persons.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [persons, personSearch]);

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.toLowerCase();
    return orgs.filter((o) => !q || o.name.toLowerCase().includes(q));
  }, [orgs, orgSearch]);

  const selectedPerson = contacts.find((c) => c.id === personId);
  const selectedOrg = contacts.find((c) => c.id === orgId);

  const aiSuggestionsOn = useUserStore((s) => s.aiEnabled && s.notifications.aiSuggestions);

  // ─── Live validation ───────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const detailsErrors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    if (!name.trim()) e.name = 'Deal title is required';
    else if (name.trim().length < 2) e.name = 'Must be at least 2 characters';
    else if (name.length > 120) e.name = 'Must be at most 120 characters';
    if (expectedCloseDate) {
      const d = isDate()(expectedCloseDate);
      if (d) e.expectedCloseDate = d;
      else if (expectedCloseDate < today) e.expectedCloseDate = 'Close date cannot be in the past';
    }
    return e;
  }, [name, expectedCloseDate, today]);

  const pricingErrors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    const amtErr = isNonNegativeNumber()(String(amount));
    if (amtErr) e.amount = amtErr;
    else if (amount > 1_000_000_000) e.amount = 'Amount is too large';
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) e.probability = 'Must be between 0 and 100';
    const noteErr = maxLenRule('Notes', 1000)(notes);
    if (noteErr) e.notes = noteErr;
    return e;
  }, [amount, probability, notes]);

  const canProceedDetails =
    name.trim().length > 0 && !Object.values(detailsErrors).some(Boolean);
  const canProceedContacts = Boolean(personId && orgId);
  const canSave =
    canProceedDetails && canProceedContacts && !Object.values(pricingErrors).some(Boolean);

  function pickPerson(id: string) {
    setPersonId(id);
    const p = contacts.find((c) => c.id === id);
    if (p && 'orgId' in p && p.orgId && !orgId) setOrgId(p.orgId);
  }

  function goNext() {
    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    if (currentStep === 'details') setCurrentStep('contacts');
    else if (currentStep === 'contacts') setCurrentStep('pricing');
  }

  function goBack() {
    if (currentStep === 'contacts') setCurrentStep('details');
    else if (currentStep === 'pricing') setCurrentStep('contacts');
  }

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  function handleSave() {
    const errs: Record<string, string> = {};
    Object.entries({ ...detailsErrors, ...pricingErrors }).forEach(([k, v]) => {
      if (v) errs[k] = v;
    });
    if (!owner.trim()) errs.owner = 'Owner is required';
    if (!personId && !orgId) errs.contacts = 'Select at least a candidate or a client';
    setFormErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const id = uid('deal');
    const close = expectedCloseDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deal: Deal = {
      id,
      name: name.trim(),
      // New leads from the wizard are company-first by default — they have an org
      // attached via the contacts step. If you need to create a person-first lead
      // (e.g. a candidate between jobs), leave orgId blank and change type here.
      type: orgId ? 'company' : 'person',
      personContactId: personId || undefined,
      orgContactId: orgId || undefined,
      stage: 'lead',
      amount,
      probability,
      expectedCloseDate: close,
      source,
      priority: 'medium',
      owner,
      notes: notes.trim() || undefined,
      createdAt: today,
      lastUpdated: today,
    };
    addDeal(deal);
    toast.success('Deal saved', {
      description: `${name.trim()} added to the pipeline.`,
    });
    router.push(`/sales/saved/${id}`);
  }

  return (
    <>
      <Topbar title={LABELS.newDeal}>
        <StepIndicator steps={STEPS} currentStep={currentStep} completedSteps={completedSteps} />
      </Topbar>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1080px] mx-auto px-6 py-6 grid grid-cols-[1fr_320px] gap-5">
          {/* Main column */}
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">
                {currentStep === 'details' && 'Deal Details'}
                {currentStep === 'contacts' && 'Link Candidate & Client'}
                {currentStep === 'pricing' && 'Fee & Forecast'}
              </h2>
              <button
                onClick={() => router.push('/sales')}
                aria-label="Cancel"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {currentStep === 'details' && (
                <>
                  <Field label="Deal title *" error={detailsErrors.name}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Senior Backend Engineer — Vertex Analytics"
                      className={`w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${detailsErrors.name ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Source">
                      <select value={source} onChange={(e) => setSource(e.target.value as DealSource)} className="w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]">
                        {DEAL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Expected close date" error={detailsErrors.expectedCloseDate}>
                      <input
                        type="date"
                        value={expectedCloseDate}
                        min={today}
                        onChange={(e) => setExpectedCloseDate(e.target.value)}
                        className={`w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${detailsErrors.expectedCloseDate ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
                      />
                    </Field>
                  </div>
                </>
              )}

              {currentStep === 'contacts' && (
                <>
                  <Field label="Candidate *">
                    {selectedPerson ? (
                      <SelectedChip name={selectedPerson.name} subtitle={'title' in selectedPerson ? selectedPerson.title : ''} avatarBg={getAvatarColor(selectedPerson.id, selectedPerson.avatarColor)} onClear={() => setPersonId('')} />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={personSearch}
                          onChange={(e) => setPersonSearch(e.target.value)}
                          placeholder="Search candidates..."
                          className="w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] mb-1"
                        />
                        <div className="border border-[var(--border)] rounded-md max-h-[180px] overflow-y-auto">
                          {filteredPersons.slice(0, 10).map((p) => (
                            <button key={p.id} onClick={() => pickPerson(p.id)} className="flex items-center gap-2 w-full px-3 py-2 text-left bg-transparent border-none border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] cursor-pointer">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: getAvatarColor(p.id, p.avatarColor) }}>{initials(p.name)}</div>
                              <div>
                                <div className="text-[12px] font-semibold text-[var(--text-primary)]">{p.name}</div>
                                <div className="text-[10px] text-[var(--text-tertiary)]">{'title' in p ? p.title : ''}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </Field>

                  <Field label="Client *">
                    {selectedOrg ? (
                      <SelectedChip name={selectedOrg.name} subtitle={'industry' in selectedOrg ? selectedOrg.industry : ''} avatarBg={getAvatarColor(selectedOrg.id, selectedOrg.avatarColor)} isSquare onClear={() => setOrgId('')} />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={orgSearch}
                          onChange={(e) => setOrgSearch(e.target.value)}
                          placeholder="Search clients..."
                          className="w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] mb-1"
                        />
                        <div className="border border-[var(--border)] rounded-md max-h-[180px] overflow-y-auto">
                          {filteredOrgs.slice(0, 10).map((o) => (
                            <button key={o.id} onClick={() => setOrgId(o.id)} className="flex items-center gap-2 w-full px-3 py-2 text-left bg-transparent border-none border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] cursor-pointer">
                              <div className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: getAvatarColor(o.id, o.avatarColor) }}>{initials(o.name)}</div>
                              <div>
                                <div className="text-[12px] font-semibold text-[var(--text-primary)]">{o.name}</div>
                                <div className="text-[10px] text-[var(--text-tertiary)]">{'industry' in o ? o.industry : ''}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </Field>
                </>
              )}

              {currentStep === 'pricing' && (
                <>
                  <Field label="Deal amount (USD)" error={pricingErrors.amount}>
                    <input
                      type="number"
                      min={0}
                      max={1_000_000_000}
                      step={1000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className={`w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${pricingErrors.amount ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
                    />
                  </Field>
                  <Field label={`Probability — ${probability}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={probability}
                      onChange={(e) => setProbability(Number(e.target.value))}
                      className="w-full accent-[var(--brand-primary)]"
                    />
                  </Field>
                  <Field label="Notes" error={pricingErrors.notes}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      placeholder="Candidate notes, interview feedback, key stakeholders..."
                      rows={4}
                      className={`w-full px-3 py-2 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none resize-y ${pricingErrors.notes ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
                    />
                  </Field>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-bg)] flex items-center justify-between">
              <button
                onClick={goBack}
                disabled={currentStep === 'details'}
                className="px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={12} weight="bold" /> Back
              </button>
              {currentStep !== 'pricing' ? (
                <button
                  onClick={goNext}
                  disabled={(currentStep === 'details' && !canProceedDetails) || (currentStep === 'contacts' && !canProceedContacts)}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  Next <ArrowRight size={12} weight="bold" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--tag-success-bg)] border-none rounded-md cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <FloppyDisk size={12} weight="bold" /> Save deal
                </button>
              )}
            </div>
            {Object.values(formErrors).some(Boolean) && (
              <div className="mt-2 flex flex-col gap-1">
                {Object.values(formErrors).filter(Boolean).map((err, i) => (
                  <div key={i} className="text-[11px] font-semibold text-[var(--danger)]">⚠ {err}</div>
                ))}
              </div>
            )}
          </div>

          {/* AI side panel — gated by Settings → AI suggestions */}
          {aiSuggestionsOn && (
            <div className="flex flex-col gap-4">
              {currentStep === 'details' && <AIDealDuplicateDetection dealName={name} personContactId={personId} orgContactId={orgId} />}
              {currentStep === 'contacts' && <AIDealDuplicateDetection dealName={name} personContactId={personId} orgContactId={orgId} />}
              {currentStep === 'pricing' && <AIDealScoring source={source} amount={amount} personContactId={personId} orgContactId={orgId} onApplyProbability={setProbability} />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      {children}
      {error && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--danger)]">
          <Warning size={12} weight="fill" className="flex-shrink-0" /> {error}
        </span>
      )}
    </label>
  );
}

function SelectedChip({ name, subtitle, avatarBg, isSquare, onClear }: { name: string; subtitle?: string; avatarBg: string; isSquare?: boolean; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-md">
      <div className="w-7 h-7 flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: avatarBg, borderRadius: isSquare ? '4px' : '50%' }}>{initials(name)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{name}</div>
        {subtitle && <div className="text-[10px] text-[var(--text-tertiary)] truncate">{subtitle}</div>}
      </div>
      <button onClick={onClear} aria-label="Clear" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-1">
        <XIcon size={14} />
      </button>
    </div>
  );
}
