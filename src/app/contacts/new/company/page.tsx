'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, Info, LinkSimple, Plus, X as XIcon, Buildings, User, MagnifyingGlass } from '@phosphor-icons/react';
import Topbar from '@/components/layout/Topbar';
import { FormField } from '@/components/ui/FormField';
import { AIOrgDuplicateDetection } from '@/components/contact-flow/ai/AIOrgDuplicateDetection';
import { AIEnrichmentPreview } from '@/components/contact-flow/ai/AIEnrichmentPreview';
import { AIEnrichmentReview } from '@/components/contact-flow/ai/AIEnrichmentReview';
import { OrgDuplicateFoundDialog } from '@/components/contact-flow/OrgDuplicateFoundDialog';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { ContactWithEntries } from '@/types/contact';
import { initials, getAvatarColor, uid } from '@/lib/utils';
import { enrichCompany, EnrichmentField, EnrichmentResult } from '@/lib/data/mock-ai/company-enrichment';
import { OrgDuplicateCandidate } from '@/lib/data/mock-ai/duplicate-orgs';
import { Relationship, RelationshipKind, RELATIONSHIP_META, validKindsFor } from '@/types/relationship';
import { isUrl, isPhone } from '@/lib/validation';
import { toast } from '@/lib/toast';

type StepId = 'details' | 'enrichment' | 'relationships' | 'confirm';

const STEPS = [
  { id: 'details' as const, label: 'Company Details' },
  { id: 'enrichment' as const, label: 'AI Enrichment' },
  { id: 'relationships' as const, label: 'Relationships' },
  { id: 'confirm' as const, label: 'Confirm' },
];

const STEP_TITLES: Record<StepId, string> = {
  details: 'Company Details',
  enrichment: 'AI Enrichment',
  relationships: 'Relationships',
  confirm: 'Confirm',
};

export default function NewCompanyPage() {
  const router = useRouter();
  const addContact = useContactStore((s) => s.addContact);
  const addRelationship = useContactStore((s) => s.addRelationship);
  const allContacts = useContactStore((s) => s.contacts);
  const aiSuggestionsOn = useUserStore((s) => s.aiEnabled && s.notifications.aiSuggestions);

  const [currentStep, setCurrentStep] = useState<StepId>('details');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

  // Step 1 — Details
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [employees, setEmployees] = useState('');
  const [phone, setPhone] = useState('');
  const [founded, setFounded] = useState('');
  const [hq, setHq] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — Enrichment
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [reviewedFields, setReviewedFields] = useState<EnrichmentField[]>([]);

  // Step 3 — Relationships (pending until save)
  interface PendingRel { tempId: string; toContactId: string; kind: RelationshipKind; }
  const [pendingRels, setPendingRels] = useState<PendingRel[]>([]);

  // Duplicate dialog
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; candidate: OrgDuplicateCandidate | null }>({ open: false, candidate: null });

  // Field-level validation state for the details step
  const detailsErrors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    if (!companyName.trim()) e.companyName = 'Company name is required';
    else if (companyName.trim().length < 2) e.companyName = 'Must be at least 2 characters';
    else if (companyName.length > 120) e.companyName = 'Must be at most 120 characters';
    if (website && isUrl()(website)) e.website = isUrl()(website)!;
    if (phone && isPhone()(phone)) e.phone = isPhone()(phone)!;
    if (founded && !/^\d{4}$/.test(founded.trim())) e.founded = 'Must be a 4-digit year';
    else if (founded && (Number(founded) < 1800 || Number(founded) > new Date().getFullYear())) e.founded = `Year must be between 1800 and ${new Date().getFullYear()}`;
    if (hq && hq.length > 120) e.hq = 'Must be at most 120 characters';
    if (description && description.length > 500) e.description = 'Must be at most 500 characters';
    return e;
  }, [companyName, website, phone, founded, hq, description]);

  // ESC silently closes the flow and returns to the contact list — pairs
  // with the always-visible "X" close button in the top-right of the form
  // card, plus the breadcrumb and the Cancel button at the bottom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/contacts');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const canProceedFromDetails =
    companyName.trim().length >= 2 && !Object.values(detailsErrors).some(Boolean);

  const goNext = () => {
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    if (currentStep === 'details') {
      if (aiSuggestionsOn) {
        setEnrichmentResult(enrichCompany({ companyName, website }));
        setCurrentStep('enrichment');
      } else {
        // Skip AI enrichment when disabled in Settings
        setCurrentStep('relationships');
      }
    } else if (currentStep === 'enrichment') {
      setCurrentStep('relationships');
    } else if (currentStep === 'relationships') {
      setCurrentStep('confirm');
    }
  };

  const goBack = () => {
    if (currentStep === 'enrichment') setCurrentStep('details');
    else if (currentStep === 'relationships') setCurrentStep(aiSuggestionsOn ? 'enrichment' : 'details');
    else if (currentStep === 'confirm') setCurrentStep('relationships');
  };

  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    else if (companyName.trim().length < 2) errs.companyName = 'Company name must be at least 2 characters';
    setSaveErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const id = uid('org');
    const today = new Date().toISOString().split('T')[0];

    const acceptedFields = reviewedFields.filter((f) => f.accepted);
    const avgConf = acceptedFields.length > 0
      ? Math.round(acceptedFields.reduce((sum, f) => sum + f.confidence, 0) / acceptedFields.length)
      : 0;
    const sources = [...new Set(acceptedFields.map((f) => f.source))].join(', ');

    const contact: ContactWithEntries = {
      id,
      type: 'org',
      name: companyName.trim(),
      industry: industry || undefined,
      employees: employees || undefined,
      hq: hq || undefined,
      website: website || undefined,
      description: description || undefined,
      status: 'active',
      lastUpdated: today,
      stale: false,
      aiStatus: 'new',
      createdBy: 'Paul Wentzell',
      entries: {
        addresses: [],
        emails: [],
        phones: phone ? [{ id: uid('p'), type: 'Office', value: phone, primary: true }] : [],
        websites: website ? [{ id: uid('w'), type: 'Primary', value: website, primary: true }] : [],
        names: [{ id: uid('n'), type: 'Primary · Legal', value: companyName.trim(), primary: true }],
        identifiers: [],
        industries: [],
      },
    } as ContactWithEntries;

    addContact(contact);
    toast.success('Client saved', {
      description: pendingRels.length > 0
        ? `${companyName.trim()} added with ${pendingRels.length} relationship${pendingRels.length === 1 ? '' : 's'}.`
        : `${companyName.trim()} added to your companies.`,
    });

    // Commit any pending relationships
    for (const pr of pendingRels) {
      addRelationship({
        id: uid('rel'),
        fromContactId: id,
        toContactId: pr.toContactId,
        kind: pr.kind,
        createdAt: today,
        createdBy: 'Paul Wentzell',
      });
    }

    router.push(`/contacts/saved/${id}?enriched=1&fields=${acceptedFields.length} of ${reviewedFields.length} accepted&confidence=${avgConf}%&sources=${encodeURIComponent(sources || 'none')}`);
  };

  return (
    <>
      <Topbar title="Contacts" />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4 text-[13px]">
          <button
            onClick={() => router.push('/contacts')}
            className="text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer font-inherit font-semibold"
          >
            Contacts
          </button>
          <span className="text-[var(--text-secondary)] mx-1">/</span>
          <button
            onClick={() => router.push('/contacts?add=1')}
            className="text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer font-inherit font-semibold"
          >
            Add Company
          </button>
          <span className="text-[var(--text-secondary)] mx-1">/</span>
          <span className="text-[var(--text-primary)] font-semibold">Step {STEPS.findIndex((s) => s.id === currentStep) + 1} of {STEPS.length}: {STEP_TITLES[currentStep]}</span>
        </div>

        <div className="px-6 py-6">
          {currentStep === 'enrichment' && enrichmentResult ? (
            <>
              <AIEnrichmentReview result={enrichmentResult} onChange={setReviewedFields} />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                <button onClick={goBack} className="text-[13px] font-semibold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--brand-primary)]">
                  ← Back
                </button>
                <button
                  onClick={goNext}
                  className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer border-none"
                >
                  Next Step →
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-[1fr_380px] gap-4 items-start">
              <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 relative">
                {/* Prominent close button — mirrors the X pattern users know
                    from the right-pane SlidePanel. Also responds to the ESC key. */}
                <button
                  onClick={() => router.push('/contacts')}
                  aria-label="Close and return to Contacts"
                  title="Close (Esc)"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border border-[var(--border)] cursor-pointer transition-all z-10"
                >
                  <XIcon size={14} weight="bold" />
                </button>
                {currentStep === 'details' && (
                  <DetailsStep
                    companyName={companyName} setCompanyName={setCompanyName}
                    website={website} setWebsite={setWebsite}
                    industry={industry} setIndustry={setIndustry}
                    employees={employees} setEmployees={setEmployees}
                    phone={phone} setPhone={setPhone}
                    founded={founded} setFounded={setFounded}
                    hq={hq} setHq={setHq}
                    description={description} setDescription={setDescription}
                    errors={detailsErrors}
                  />
                )}

                {currentStep === 'relationships' && (
                  <RelationshipsStep
                    companyName={companyName}
                    pendingRels={pendingRels}
                    setPendingRels={setPendingRels}
                    allContacts={allContacts}
                  />
                )}

                {currentStep === 'confirm' && (
                  <ConfirmStep
                    companyName={companyName}
                    industry={industry}
                    website={website}
                    hq={hq}
                    employees={employees}
                    reviewedFields={reviewedFields}
                    pendingRels={pendingRels}
                    allContacts={allContacts}
                  />
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                  {currentStep === 'details' ? (
                    <button onClick={() => router.push('/contacts?add=1')} className="text-[13px] font-semibold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--brand-primary)]">
                      Cancel
                    </button>
                  ) : (
                    <button onClick={goBack} className="text-[13px] font-semibold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--brand-primary)]">
                      ← Back
                    </button>
                  )}

                  {currentStep === 'details' && (
                    <button
                      onClick={goNext}
                      disabled={!canProceedFromDetails}
                      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-extrabold text-white rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
                      style={{ background: canProceedFromDetails ? 'linear-gradient(135deg, #7C3AED, #A78BFA)' : 'var(--text-tertiary)' }}
                    >
                      <Sparkle size={14} weight="duotone" />
                      Enrich with AI →
                    </button>
                  )}

                  {currentStep === 'relationships' && (
                    <button
                      onClick={goNext}
                      className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer border-none"
                    >
                      Next Step →
                    </button>
                  )}

                  {currentStep === 'confirm' && (
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--success)] rounded-[var(--radius-sm)] cursor-pointer border-none"
                    >
                      Save Company ✓
                    </button>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="flex flex-col gap-3">
                {currentStep === 'details' && aiSuggestionsOn && (
                  <>
                    <AIOrgDuplicateDetection
                      companyName={companyName}
                      website={website}
                      hq={hq}
                      onReviewCandidate={(c) => setDuplicateDialog({ open: true, candidate: c })}
                    />
                    <AIEnrichmentPreview companyName={companyName} website={website} />
                  </>
                )}
                {currentStep === 'relationships' && (
                  <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-xl p-5">
                    <div className="text-[13px] font-extrabold text-[var(--ai-dark)] mb-2 flex items-center gap-1.5">
                      <LinkSimple size={16} weight="bold" className="text-[var(--ai)]" />
                      Connect to other records
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Link this company to existing organizations and people in your CRM. Add parent companies, subsidiaries, partners, vendors, customers — or skip and add them later.
                    </p>
                  </div>
                )}
                {currentStep === 'confirm' && (
                  <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-xl p-5">
                    <div className="text-[13px] font-extrabold text-[var(--ai-dark)] mb-2 flex items-center gap-1.5">
                      <Sparkle size={16} weight="duotone" className="text-[var(--ai)]" />
                      Ready to Save
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Review the summary on the left. Once saved, the AI will finalize the quality score and enriched profile.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <OrgDuplicateFoundDialog
        open={duplicateDialog.open}
        candidate={duplicateDialog.candidate}
        newCompany={{
          name: companyName,
          industry,
          website,
          hq,
          employees,
        }}
        onKeepExisting={() => {
          if (duplicateDialog.candidate) router.push(`/contacts/${duplicateDialog.candidate.id}`);
          setDuplicateDialog({ open: false, candidate: null });
        }}
        onSmartMerge={() => {
          // Smart Merge: overwrite the user's draft with the canonical record's data.
          // User can still edit afterwards.
          const c = duplicateDialog.candidate;
          if (c) {
            setCompanyName(c.name);
            if (c.industry && c.industry !== '—') setIndustry(c.industry);
            if (c.website) setWebsite(c.website);
            if (c.hq) setHq(c.hq);
            if (c.employees && c.employees !== '—') setEmployees(c.employees);
          }
          setDuplicateDialog({ open: false, candidate: null });
        }}
        onCreateNew={() => setDuplicateDialog({ open: false, candidate: null })}
        onClose={() => setDuplicateDialog({ open: false, candidate: null })}
      />
    </>
  );
}

// ── Step 1: Company Details ────────────────────────────────────────
function DetailsStep(props: any) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">Company Details</h2>
      <p className="text-[12px] text-[var(--text-secondary)] -mt-2">Enter basic company information. AI will enrich the record in the next step.</p>

      <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] px-3 py-2 flex items-start gap-2 mt-1">
        <Info size={14} className="text-[var(--ai)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-secondary)]">
          AI suggests matches from your CRM and enriches new records from public sources (Crunchbase, LinkedIn, BuiltWith, G2). <strong className="text-[var(--ai-dark)]">Pick a match to merge and clean up duplicates</strong>, or keep typing to create a new company.
        </p>
      </div>

      <FormField label="Company Name" value={props.companyName} onChange={props.setCompanyName} autoFocus required error={props.errors?.companyName} />
      <FormField label="Website" value={props.website} onChange={props.setWebsite} placeholder="e.g. company.com" error={props.errors?.website} />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Industry" value={props.industry} onChange={props.setIndustry} placeholder="e.g. Enterprise Software" />
        <FormField label="Company Size" value={props.employees} onChange={props.setEmployees} placeholder="e.g. 500-1000" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Phone" value={props.phone} onChange={props.setPhone} type="tel" error={props.errors?.phone} />
        <FormField label="Founded" value={props.founded} onChange={props.setFounded} placeholder="e.g. 2015" error={props.errors?.founded} />
      </div>

      <FormField label="Headquarters" value={props.hq} onChange={props.setHq} placeholder="e.g. San Francisco, CA" error={props.errors?.hq} />

      <div>
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Description</label>
        <textarea
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          placeholder="Brief description of the company..."
          rows={3}
          className={`w-full px-3 py-2 text-[13px] bg-[var(--surface-raised)] border rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] resize-none ${
            props.errors?.description ? 'border-[var(--danger)]' : 'border-[var(--border)]'
          }`}
        />
        {props.errors?.description && <p className="text-[10px] text-[var(--danger)] mt-1">{props.errors.description}</p>}
      </div>
    </div>
  );
}

// ── Step 3: Relationships ───────────────────────────────────────────
interface PendingRelLocal { tempId: string; toContactId: string; kind: RelationshipKind; }

function RelationshipsStep({ companyName, pendingRels, setPendingRels, allContacts }: {
  companyName: string;
  pendingRels: PendingRelLocal[];
  setPendingRels: (rels: PendingRelLocal[]) => void;
  allContacts: ContactWithEntries[];
}) {
  const [search, setSearch] = useState('');
  const [pickedContactId, setPickedContactId] = useState<string>('');
  const [pickedKind, setPickedKind] = useState<RelationshipKind | ''>('');

  const candidates = useMemo(() => {
    if (search.length < 1) return [];
    const q = search.toLowerCase();
    return allContacts
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allContacts, search]);

  const pickedContact = useMemo(() => allContacts.find((c) => c.id === pickedContactId), [allContacts, pickedContactId]);

  const validKinds = useMemo(() => {
    if (!pickedContact) return [];
    return validKindsFor('org', pickedContact.type as 'person' | 'org');
  }, [pickedContact]);

  const addRel = () => {
    if (!pickedContactId || !pickedKind) return;
    setPendingRels([
      ...pendingRels,
      { tempId: uid('temp-rel'), toContactId: pickedContactId, kind: pickedKind as RelationshipKind },
    ]);
    setSearch(''); setPickedContactId(''); setPickedKind('');
  };

  const removePending = (tempId: string) => {
    setPendingRels(pendingRels.filter((r) => r.tempId !== tempId));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">Relationships</h2>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1">Link {companyName || 'this company'} to existing contacts in your CRM. Optional — skip to add later.</p>
      </div>

      {/* Pending relationships list */}
      {pendingRels.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Will be created on save ({pendingRels.length})</div>
          {pendingRels.map((pr) => {
            const target = allContacts.find((c) => c.id === pr.toContactId);
            if (!target) return null;
            const kindLabel = RELATIONSHIP_META[pr.kind].label;
            return (
              <div key={pr.tempId} className="flex items-center gap-2.5 p-2 bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-[var(--radius-md)]">
                <div
                  className="w-8 h-8 flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                  style={{ background: getAvatarColor(target.id, target.avatarColor), borderRadius: target.type === 'org' ? '6px' : '50%' }}
                >
                  {initials(target.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{target.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">{kindLabel}</div>
                </div>
                <button
                  onClick={() => removePending(pr.tempId)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer p-1"
                >
                  <XIcon size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new relationship */}
      <div className="border border-dashed border-[var(--border-strong)] rounded-[var(--radius-md)] p-4 flex flex-col gap-3">
        <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Add a relationship</div>

        {!pickedContact ? (
          <>
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts to link..."
                className="w-full h-9 pl-8 pr-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-primary)]"
              />
            </div>
            {search.length > 0 && (
              <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                {candidates.length === 0 && <div className="text-[12px] text-[var(--text-tertiary)] italic px-2 py-1">No contacts found</div>}
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setPickedContactId(c.id); setPickedKind(''); }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-raised)] cursor-pointer bg-transparent border-none text-left"
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
                      style={{ background: getAvatarColor(c.id, c.avatarColor), borderRadius: c.type === 'org' ? '5px' : '50%' }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                        {c.type === 'org' ? <Buildings size={10} /> : <User size={10} />}
                        {c.type === 'org' ? 'Organization' : 'Person'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 p-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)]">
              <div
                className="w-7 h-7 flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
                style={{ background: getAvatarColor(pickedContact.id, pickedContact.avatarColor), borderRadius: pickedContact.type === 'org' ? '5px' : '50%' }}
              >
                {initials(pickedContact.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">{pickedContact.name}</div>
                <div className="text-[10px] text-[var(--text-tertiary)] capitalize">{pickedContact.type}</div>
              </div>
              <button
                onClick={() => { setPickedContactId(''); setPickedKind(''); }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-1"
              >
                <XIcon size={14} />
              </button>
            </div>

            <div>
              <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Relationship</div>
              <div className="flex gap-1.5 flex-wrap">
                {validKinds.map((k) => (
                  <button
                    key={k}
                    onClick={() => setPickedKind(k)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full border cursor-pointer transition-all ${
                      pickedKind === k
                        ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                        : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--brand-primary)]'
                    }`}
                  >
                    {RELATIONSHIP_META[k].label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addRel}
              disabled={!pickedKind}
              className="self-end flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
            >
              <Plus size={12} weight="bold" /> Add
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Confirm ─────────────────────────────────────────────────
function ConfirmStep({ companyName, industry, website, hq, employees, reviewedFields, pendingRels, allContacts }: any) {
  const accepted = reviewedFields.filter((f: EnrichmentField) => f.accepted);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">Confirm & Save</h2>
      <p className="text-[12px] text-[var(--text-secondary)] -mt-2">Review the final record before saving.</p>

      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-4">
        <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Company Summary</div>
        <div className="flex flex-col gap-1.5 text-[13px]">
          <SummaryRow label="Company" value={companyName} />
          {industry && <SummaryRow label="Industry" value={industry} />}
          {website && <SummaryRow label="Website" value={website} />}
          {hq && <SummaryRow label="HQ" value={hq} />}
          {employees && <SummaryRow label="Size" value={`${employees} employees`} />}
        </div>
      </div>

      {accepted.length > 0 && (
        <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] p-4">
          <div className="text-[10px] font-bold text-[var(--ai-dark)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkle size={10} weight="duotone" /> AI Enrichment (accepted)
          </div>
          <div className="flex flex-col gap-1.5 text-[12px]">
            {accepted.map((f: EnrichmentField) => (
              <SummaryRow key={f.key} label={f.label} value={f.value} />
            ))}
          </div>
        </div>
      )}

      {pendingRels && pendingRels.length > 0 && (
        <div className="bg-[var(--brand-bg)] border border-[var(--brand-primary)] rounded-[var(--radius-md)] p-4">
          <div className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <LinkSimple size={10} weight="bold" /> Relationships ({pendingRels.length})
          </div>
          <div className="flex flex-col gap-1.5 text-[12px]">
            {pendingRels.map((pr: PendingRelLocal) => {
              const target = allContacts.find((c: ContactWithEntries) => c.id === pr.toContactId);
              if (!target) return null;
              return (
                <SummaryRow key={pr.tempId} label={RELATIONSHIP_META[pr.kind].label} value={target.name} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <div className="text-[var(--text-tertiary)]">{label}</div>
      <div className="font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
