'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info, X as XIcon } from '@phosphor-icons/react';
import Topbar from '@/components/layout/Topbar';
import { FormField } from '@/components/ui/FormField';
import { AIDuplicateDetection } from '@/components/contact-flow/ai/AIDuplicateDetection';
import { AIOrgHierarchy } from '@/components/contact-flow/ai/AIOrgHierarchy';
import { AIPrivacyAdvisory } from '@/components/contact-flow/ai/AIPrivacyAdvisory';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { useDocumentStore } from '@/stores/document-store';
import { ContactWithEntries } from '@/types/contact';
import { CrmDocument, getFileFamily } from '@/types/document';
import { uid } from '@/lib/utils';
import { isEmail, isPhone } from '@/lib/validation';
import { toast } from '@/lib/toast';

const NAME_PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Mx.', 'Dr.', 'Prof.', 'Rev.', 'Hon.', 'Sir', 'Dame'];
const NAME_SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'PhD', 'MD', 'DDS', 'Esq.', 'CPA', 'RN', 'MBA'];

type StepId = 'basic' | 'organization' | 'relationship';

const STEPS = [
  { id: 'basic' as const, label: 'Basic Info' },
  { id: 'organization' as const, label: 'Organization' },
  { id: 'relationship' as const, label: 'Relationship' },
];

const RELATIONSHIP_TYPES = ['Client', 'Prospect', 'Partner', 'Vendor', 'Investor', 'Personal'] as const;
const ROLE_LEVELS = ['C-Suite', 'VP', 'Director', 'Manager', 'IC'] as const;

export default function NewPersonPage() {
  const router = useRouter();
  const addContact = useContactStore((s) => s.addContact);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const contacts = useContactStore((s) => s.contacts);
  const orgs = contacts.filter((c) => c.type === 'org');

  // Fields from a parsed resume that we persist on the new Person beyond the
  // basic form fields (skills, URLs, etc.). Set during the prefill effect below.
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [resumeGithub, setResumeGithub] = useState<string>('');
  const [resumeWebsite, setResumeWebsite] = useState<string>('');

  const [currentStep, setCurrentStep] = useState<StepId>('basic');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

  // Step 1 — Basic Info
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState('Work');
  const [phone, setPhone] = useState('');
  const [phoneExt, setPhoneExt] = useState('');
  const [phoneType, setPhoneType] = useState('Mobile');
  const [jobTitle, setJobTitle] = useState('');

  // Step 2 — Organization
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [roleLevel, setRoleLevel] = useState<(typeof ROLE_LEVELS)[number] | ''>('');

  // Step 3 — Relationship
  const [relationshipType, setRelationshipType] = useState<(typeof RELATIONSHIP_TYPES)[number] | ''>('');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);


  const aiSuggestionsOn = useUserStore((s) => s.aiEnabled && s.notifications.aiSuggestions);

  // ─── Prefill from parsed resume (if user uploaded a resume on the picker) ──
  const [resumeBanner, setResumeBanner] = useState<{ filename: string; fieldCount: number; skillCount: number } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('resume-parse-result');
    if (!raw) return;
    sessionStorage.removeItem('resume-parse-result');
    try {
      const p = JSON.parse(raw);
      let filled = 0;
      if (p.firstName) { setFirstName(p.firstName); filled++; }
      if (p.lastName) { setLastName(p.lastName); filled++; }
      if (p.email) { setEmail(p.email); filled++; }
      if (p.phone) { setPhone(p.phone); filled++; }
      if (p.headline) { setJobTitle(p.headline); filled++; }
      if (p.employmentHistory?.[0]?.company) { setCompanyName(p.employmentHistory[0].company); filled++; }
      // Structured fields not in the visible form — persist on save.
      const skills = Array.isArray(p.skills) ? p.skills.slice(0, 40) : [];
      if (skills.length) { setResumeSkills(skills); filled++; }
      if (p.linkedinUrl) { setLinkedinUrl(p.linkedinUrl); filled++; }
      if (p.githubUrl) { setResumeGithub(p.githubUrl); filled++; }
      if (p.websiteUrl) { setResumeWebsite(p.websiteUrl); filled++; }
      setResumeBanner({
        filename: p.filename || 'resume',
        fieldCount: filled,
        skillCount: skills.length,
      });
    } catch {
      /* ignore — malformed payload */
    }
  }, []);

  // ─── Live validation for Basic Info step ────────────────────────────
  const nameRe = /^[A-Za-z\s'\-\.]+$/;
  const basicErrors = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    else if (firstName.length > 60) e.firstName = 'Must be at most 60 characters';
    else if (!nameRe.test(firstName)) e.firstName = 'Only letters, spaces, apostrophes, hyphens, periods';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    else if (lastName.length > 60) e.lastName = 'Must be at most 60 characters';
    else if (!nameRe.test(lastName)) e.lastName = 'Only letters, spaces, apostrophes, hyphens, periods';
    if (middleName && middleName.length > 60) e.middleName = 'Must be at most 60 characters';
    else if (middleName && !nameRe.test(middleName)) e.middleName = 'Only letters, spaces, apostrophes, hyphens, periods';
    if (email) {
      const err = isEmail()(email);
      if (err) e.email = err;
    }
    if (phone) {
      const err = isPhone()(phone);
      if (err) e.phone = err;
    }
    if (phoneExt && !/^\d{1,6}$/.test(phoneExt)) e.phoneExt = 'Digits only, max 6';
    if (jobTitle && jobTitle.length > 120) e.jobTitle = 'Must be at most 120 characters';
    return e;
  }, [firstName, lastName, middleName, email, phone, phoneExt, jobTitle]);

  const canProceedFromBasic =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !Object.values(basicErrors).some(Boolean);
  const canProceedFromOrg = true;

  const goNext = () => {
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    if (currentStep === 'basic') setCurrentStep('organization');
    else if (currentStep === 'organization') setCurrentStep('relationship');
  };

  const goBack = () => {
    if (currentStep === 'organization') setCurrentStep('basic');
    else if (currentStep === 'relationship') setCurrentStep('organization');
  };

  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (phone && !/^[+]?[\d\s()./-]{7,20}$/.test(phone.replace(/\s+/g, ''))) errs.phone = 'Enter a valid phone number';
    setSaveErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    // Persist to the DB FIRST so we use the server-allocated UUID as the
    // contact id everywhere — Zustand state, the saved-redirect URL, and
    // any subsequent PATCH calls. Falling back to a client-side `uid()`
    // would mean the row could never be edited or deleted via the API
    // (the server would 404 because the demo prefix isn't a UUID).
    let id: string;
    const fullName = [prefix, firstName, middleName, lastName, suffix].filter(Boolean).join(' ');
    const selectedOrg = orgs.find((o) => o.id === companyId);
    try {
      const r = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          type: 'person',
          email: email || null,
          phone: phone || null,
          orgName: selectedOrg?.name || companyName || null,
          title: jobTitle || null,
        }),
      });
      const body = await r.json().catch(() => ({} as { error?: string; contact?: { id: string } }));
      if (!r.ok || !body.contact?.id) {
        throw new Error(body.error || `save failed (${r.status})`);
      }
      id = body.contact.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.error('Couldn\u2019t save contact', { description: msg });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Build a websites[] from any resume-extracted URLs so they render as
    // proper website entries on the contact detail page.
    const resumeWebsites: { id: string; type: string; value: string; primary: boolean }[] = [];
    if (linkedinUrl) resumeWebsites.push({ id: uid('w'), type: 'LinkedIn', value: linkedinUrl, primary: !resumeWebsites.length });
    if (resumeGithub) resumeWebsites.push({ id: uid('w'), type: 'Social', value: resumeGithub, primary: !resumeWebsites.length });
    if (resumeWebsite) resumeWebsites.push({ id: uid('w'), type: 'Primary', value: resumeWebsite, primary: !resumeWebsites.length });

    const contact: ContactWithEntries = {
      id,
      type: 'person',
      name: fullName,
      title: jobTitle || undefined,
      department: department || undefined,
      email: email || undefined,
      phone: phone || undefined,
      orgId: companyId || undefined,
      orgName: selectedOrg?.name || companyName || undefined,
      status: 'active',
      lastUpdated: today,
      stale: false,
      aiStatus: 'new',
      isPrivate,
      createdBy: 'Paul Wentzell',
      // Resume-extracted structured fields
      skills: resumeSkills.length ? resumeSkills : undefined,
      linkedinUrl: linkedinUrl || undefined,
      githubUrl: resumeGithub || undefined,
      websiteUrl: resumeWebsite || undefined,
      entries: {
        addresses: [],
        emails: email ? [{ id: uid('e'), type: emailType, value: email, primary: true }] : [],
        phones: phone ? [{ id: uid('p'), type: phoneType, value: phone, extension: phoneExt || undefined, primary: true }] : [],
        websites: resumeWebsites,
        names: [{ id: uid('n'), type: 'Primary · Legal', value: fullName, primary: true, firstName, middleName, lastName, prefix, suffix }],
        identifiers: [],
        industries: [],
      },
    } as ContactWithEntries;

    addContact(contact);
    toast.success('Candidate saved', {
      description: resumeBanner
        ? `${fullName} added with resume attached.`
        : `${fullName} added to your contacts.`,
    });

    // If the user uploaded a resume on the picker, attach the original file
    // to this person's Documents. The bytes are stashed as base64 in
    // sessionStorage by ResumeUploadCard; convert to a Blob + object URL.
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('resume-file-data');
      if (raw) {
        sessionStorage.removeItem('resume-file-data');
        try {
          const { name, type, size, base64 } = JSON.parse(raw) as { name: string; type: string; size: number; base64: string };
          const blob = base64ToBlob(base64, type || 'application/octet-stream');
          const file = new File([blob], name, { type });
          const docUrl = URL.createObjectURL(blob);
          const doc: CrmDocument = {
            id: uid('doc'),
            name,
            fileName: name,
            mimeType: type || 'application/octet-stream',
            size: size ?? blob.size,
            fileFamily: getFileFamily(type || '', name),
            category: 'resume',
            tags: ['Recruiting'],
            contactId: id,
            uploadedAt: today,
            updatedAt: today,
            uploadedBy: 'Paul Wentzell',
            previewUrl: docUrl,
            _localFile: file,
          };
          addDocument(doc);
        } catch {
          /* ignore — stashed payload unreadable */
        }
      }
    }

    router.push(`/contacts/saved/${id}`);
  };

  const stepTitle = STEPS.find((s) => s.id === currentStep)?.label || '';

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

  return (
    <>
      <Topbar title="Contacts" />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4 text-[13px]" data-tour="person-breadcrumb">
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
            Add Person
          </button>
          <span className="text-[var(--text-secondary)] mx-1">/</span>
          <span className="text-[var(--text-primary)] font-semibold">Step {STEPS.findIndex((s) => s.id === currentStep) + 1} of {STEPS.length}: {stepTitle}</span>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-[1fr_380px] gap-4 items-start">
            {/* Main form */}
            <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 relative" data-tour={`person-step-${currentStep}`}>
              {/* Prominent close button — mirrors the X pattern users already
                  know from the right-pane SlidePanel and from every dialog
                  on the web. Also responds to the ESC key. */}
              <button
                onClick={() => router.push('/contacts')}
                aria-label="Close and return to Contacts"
                title="Close (Esc)"
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border border-[var(--border)] cursor-pointer transition-all z-10"
              >
                <XIcon size={14} weight="bold" />
              </button>
              {resumeBanner && (
                <div className="mb-4 flex items-start gap-2.5 p-3 bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] animate-[fadeUp_0.3s_ease-out]">
                  <Info size={16} className="text-[var(--ai)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-[12px]">
                    <div className="font-bold text-[var(--ai-dark)]">Prefilled from resume</div>
                    <div className="text-[var(--text-secondary)]">
                      AI extracted <strong className="text-[var(--text-primary)]">{resumeBanner.fieldCount} fields</strong>
                      {resumeBanner.skillCount > 0 && <> (including <strong className="text-[var(--text-primary)]">{resumeBanner.skillCount} skills</strong>)</>}
                      {' '}from <strong className="text-[var(--text-primary)]">{resumeBanner.filename}</strong>. The original resume will be attached to this candidate on save. Review and edit below.
                    </div>
                  </div>
                  <button
                    onClick={() => setResumeBanner(null)}
                    aria-label="Dismiss"
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {currentStep === 'basic' && (
                <BasicInfoStep
                  firstName={firstName} setFirstName={setFirstName}
                  middleName={middleName} setMiddleName={setMiddleName}
                  lastName={lastName} setLastName={setLastName}
                  prefix={prefix} setPrefix={setPrefix}
                  suffix={suffix} setSuffix={setSuffix}
                  email={email} setEmail={setEmail}
                  emailType={emailType} setEmailType={setEmailType}
                  phone={phone} setPhone={setPhone}
                  phoneExt={phoneExt} setPhoneExt={setPhoneExt}
                  phoneType={phoneType} setPhoneType={setPhoneType}
                  jobTitle={jobTitle} setJobTitle={setJobTitle}
                  linkedinUrl={linkedinUrl} setLinkedinUrl={setLinkedinUrl}
                  errors={basicErrors}
                />
              )}

              {currentStep === 'organization' && (
                <OrganizationStep
                  contactName={`${firstName} ${lastName}`.trim() || 'this contact'}
                  orgs={orgs}
                  companyId={companyId} setCompanyId={setCompanyId}
                  companyName={companyName} setCompanyName={setCompanyName}
                  department={department} setDepartment={setDepartment}
                  reportsTo={reportsTo} setReportsTo={setReportsTo}
                  roleLevel={roleLevel} setRoleLevel={setRoleLevel}
                />
              )}

              {currentStep === 'relationship' && (
                <RelationshipStep
                  contactName={`${firstName} ${lastName}`.trim() || 'this contact'}
                  relationshipType={relationshipType} setRelationshipType={setRelationshipType}
                  interactionNotes={interactionNotes} setInteractionNotes={setInteractionNotes}
                  isPrivate={isPrivate} setIsPrivate={setIsPrivate}
                />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                {currentStep === 'basic' ? (
                  <button
                    onClick={() => router.push('/contacts?add=1')}
                    className="text-[13px] font-semibold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--brand-primary)]"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={goBack}
                    className="text-[13px] font-semibold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--brand-primary)]"
                  >
                    ← Back
                  </button>
                )}

                <div className="flex gap-2">
                  {currentStep !== 'relationship' ? (
                    <button
                      onClick={goNext}
                      disabled={currentStep === 'basic' && !canProceedFromBasic}
                      className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 text-[13px] font-bold text-white bg-[var(--success)] rounded-[var(--radius-sm)] cursor-pointer border-none"
                    >
                      Save Contact ✓
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar — AI panels per step (gated by Settings → AI suggestions) */}
            <div className="flex flex-col gap-3" data-tour="person-ai-sidebar">
              {currentStep === 'basic' && aiSuggestionsOn && (
                <AIDuplicateDetection
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  phone={phone}
                  company={companyName}
                  onPickCandidate={(p) => {
                    // Name: use firstName/lastName if provided, otherwise split the full name
                    if (p.firstName || p.lastName) {
                      setFirstName(p.firstName ?? '');
                      setLastName(p.lastName ?? '');
                      setMiddleName('');
                    } else if (p.name) {
                      const parts = p.name.trim().split(/\s+/);
                      if (parts.length === 1) {
                        setFirstName(parts[0]);
                        setLastName('');
                        setMiddleName('');
                      } else if (parts.length === 2) {
                        setFirstName(parts[0]);
                        setLastName(parts[1]);
                        setMiddleName('');
                      } else {
                        setFirstName(parts[0]);
                        setMiddleName(parts.slice(1, -1).join(' '));
                        setLastName(parts[parts.length - 1]);
                      }
                    }
                    // Remaining fields: only overwrite when the suggestion has the data.
                    // If the source doesn't provide the field, leave the form value alone.
                    if (p.email) setEmail(p.email);
                    if (p.phone) setPhone(p.phone);
                    if (p.title) setJobTitle(p.title);
                    if (p.company) setCompanyName(p.company);
                  }}
                />
              )}

              {currentStep === 'organization' && aiSuggestionsOn && (
                <AIOrgHierarchy
                  companyName={companyName}
                  personName={`${firstName} ${lastName}`.trim() || 'New Contact'}
                  personTitle={jobTitle}
                  onApplySuggestion={(rt) => setReportsTo(`${rt.name} (${rt.title})`)}
                />
              )}

              {currentStep === 'relationship' && aiSuggestionsOn && (
                <AIPrivacyAdvisory
                  relationshipType={relationshipType}
                  companyName={companyName}
                  isPrivate={isPrivate}
                />
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

// ── Step 1: Basic Info ─────────────────────────────────────────────
function BasicInfoStep(props: any) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">Basic Info</h2>
      <p className="text-[12px] text-[var(--text-secondary)] -mt-2">Enter info to view matches or leave blank to skip verification.</p>

      <div className="bg-[var(--ai-bg)] border border-[var(--ai-border)] rounded-[var(--radius-md)] px-3 py-2 flex items-start gap-2 mt-1">
        <Info size={14} className="text-[var(--ai)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-secondary)]">
          AI suggests matches as you type — pick an existing record to <strong className="text-[var(--ai-dark)]">merge and clean up duplicates</strong>, or keep typing to create a new contact.
        </p>
      </div>

      <div>
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Hierarchy Node</label>
        <select className="w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none">
          <option>— None —</option>
          <option>ESI East</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="First" value={props.firstName} onChange={props.setFirstName} autoFocus required error={props.errors?.firstName} />
        <FormField label="Middle (Optional)" value={props.middleName} onChange={props.setMiddleName} error={props.errors?.middleName} />
        <FormField label="Last" value={props.lastName} onChange={props.setLastName} required error={props.errors?.lastName} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Prefix (Optional)</label>
          <select
            value={props.prefix}
            onChange={(e) => props.setPrefix(e.target.value)}
            className="w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="">—</option>
            {NAME_PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Suffix (Optional)</label>
          <select
            value={props.suffix}
            onChange={(e) => props.setSuffix(e.target.value)}
            className="w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="">—</option>
            {NAME_SUFFIXES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <FormField label="Email" value={props.email} onChange={props.setEmail} type="email" placeholder="name@company.com" error={props.errors?.email} />
        <div>
          <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Email Type</label>
          <select value={props.emailType} onChange={(e) => props.setEmailType(e.target.value)} className="w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none">
            <option>Work</option>
            <option>Personal</option>
            <option>Support</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_80px_120px] gap-3">
        <FormField label="Phone" value={props.phone} onChange={props.setPhone} type="tel" placeholder="+1 555 123 4567" error={props.errors?.phone} />
        <FormField label="Ext" value={props.phoneExt} onChange={props.setPhoneExt} error={props.errors?.phoneExt} />
        <div>
          <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Phone Type</label>
          <select value={props.phoneType} onChange={(e) => props.setPhoneType(e.target.value)} className="w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none">
            <option>Mobile</option>
            <option>Office</option>
            <option>Fax</option>
          </select>
        </div>
      </div>

      <FormField label="Job Title (Optional)" value={props.jobTitle} onChange={props.setJobTitle} placeholder="e.g. VP of Engineering" error={props.errors?.jobTitle} />

      <FormField label="LinkedIn URL (Optional)" value={props.linkedinUrl} onChange={props.setLinkedinUrl} placeholder="https://linkedin.com/in/..." />
    </div>
  );
}

// ── Step 2: Organization ───────────────────────────────────────────
function OrganizationStep(props: any) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">Organization</h2>
      <p className="text-[12px] text-[var(--text-secondary)] -mt-2">Associate {props.contactName} with a company and define reporting.</p>

      <div>
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
          Company <span className="text-[var(--danger)]">*</span>
        </label>
        <input
          value={props.companyName}
          onChange={(e) => { props.setCompanyName(e.target.value); props.setCompanyId(''); }}
          placeholder="Start typing a company name..."
          className="w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none"
        />
      </div>

      <FormField label="Department" value={props.department} onChange={props.setDepartment} placeholder="e.g. Engineering" />
      <FormField label="Reports To" value={props.reportsTo} onChange={props.setReportsTo} placeholder="e.g. James Mitchell (CEO)" />

      <div>
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">Role Level</label>
        <div className="flex gap-2 flex-wrap">
          {ROLE_LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => props.setRoleLevel(props.roleLevel === lvl ? '' : lvl)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                props.roleLevel === lvl
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--brand-primary)]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Relationship Classification ────────────────────────────
function RelationshipStep(props: any) {
  const descriptions: Record<string, string> = {
    Client: 'Active customer',
    Prospect: 'Potential future customer',
    Partner: 'Business partner',
    Vendor: 'Supplier',
    Investor: 'Financial stakeholder',
    Personal: 'Personal contact',
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">Relationship Classification</h2>
      <p className="text-[12px] text-[var(--text-secondary)] -mt-2">Define how {props.contactName} relates to your business.</p>

      <div className="grid grid-cols-3 gap-3 mt-1">
        {RELATIONSHIP_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => props.setRelationshipType(t)}
            className={`flex flex-col items-start gap-1 p-3 rounded-[var(--radius-md)] border-2 cursor-pointer text-left transition-all ${
              props.relationshipType === t
                ? 'border-[var(--brand-primary)] bg-[var(--brand-bg)]'
                : 'border-[var(--border-strong)] bg-transparent hover:border-[var(--brand-primary)]'
            }`}
          >
            <span className="text-[13px] font-extrabold text-[var(--text-primary)]">{t}</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{descriptions[t]}</span>
          </button>
        ))}
      </div>

      <div className="mt-2">
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Interaction Notes</label>
        <textarea
          value={props.interactionNotes}
          onChange={(e) => props.setInteractionNotes(e.target.value)}
          placeholder="e.g. Met at Tech Summit 2026. Discussed potential engineering partnership for Q3."
          rows={3}
          className="w-full px-3 py-2 text-[13px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] resize-none"
        />
      </div>

      {/* Private toggle */}
      <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-bg)] mt-2">
        <div>
          <div className="text-[13px] font-bold text-[var(--danger)]">Mark as Private Contact</div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">Only you and specified team members will see this contact</div>
        </div>
        <button
          onClick={() => props.setIsPrivate(!props.isPrivate)}
          className={`relative w-10 h-5 rounded-full cursor-pointer transition-all border-none flex-shrink-0 ${
            props.isPrivate ? 'bg-[var(--danger)]' : 'bg-[var(--border-strong)]'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            props.isPrivate ? 'left-[22px]' : 'left-0.5'
          }`} />
        </button>
      </div>
    </div>
  );
}

/**
 * Rehydrate a base64 payload (stashed by ResumeUploadCard) into a Blob we
 * can turn into a File + object URL for the Documents module.
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
