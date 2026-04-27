/**
 * Mock AI suggestions for entry-style fields (addresses, emails, phones,
 * websites, job titles). Returns 2-3 plausible candidates the user can
 * accept with one click, or ignore and type their own. Every suggestion
 * carries a real-looking source + confidence so the UI can show provenance.
 */

import type { ContactWithEntries } from '@/types/contact';

export interface EntrySuggestion {
  id: string;
  fieldValues: Record<string, string>;
  primaryLabel: string;
  secondaryLabel?: string;
  source: 'google-places' | 'usps' | 'sec-edgar' | 'wikidata' | 'web' | 'hunter' | 'clearbit' | 'linkedin' | 'whois' | 'github' | 'gleif';
  sourceLabel: string;
  confidence: number;
}

interface PooledSuggestion {
  fieldValues: Record<string, string>;
  primaryLabel: string;
  secondaryLabel?: string;
  source: EntrySuggestion['source'];
  sourceLabel: string;
  confidence: number;
}

const ORG_ADDRESS_POOL: PooledSuggestion[] = [
  { fieldValues: { type: 'Branch', value: '245 Summer Street', city: 'Boston', state: 'MA', zip: '02210' }, primaryLabel: 'Branch · 245 Summer Street', secondaryLabel: 'Boston, MA 02210', source: 'sec-edgar', sourceLabel: 'SEC EDGAR', confidence: 94 },
  { fieldValues: { type: 'Branch', value: '82 Devonshire Street', city: 'Boston', state: 'MA', zip: '02109' }, primaryLabel: 'Branch · 82 Devonshire Street', secondaryLabel: 'Boston, MA 02109', source: 'wikidata', sourceLabel: 'Wikidata', confidence: 88 },
  { fieldValues: { type: 'Mailing', value: '900 Salem Street', city: 'Smithfield', state: 'RI', zip: '02917' }, primaryLabel: 'Mailing · 900 Salem Street', secondaryLabel: 'Smithfield, RI 02917', source: 'google-places', sourceLabel: 'Google Places', confidence: 82 },
];

/**
 * Mock web-enrichment table — what Clearbit / Apollo / Crunchbase would
 * return for a known domain. Keyed by domain (always lowercase, no www).
 *
 * The real app will hit a live enrichment API; for the demo we hard-code
 * a small whitelist of well-known companies so the user can witness the
 * "AI saw two locations on the website, suggested both" experience that
 * Paul demanded after seeing Digital Prospectors' /contact page list HQ
 * + Branch but the CRM only suggesting one. Source-of-truth for the
 * data here is each company's public /contact page.
 *
 * Multiple addresses are intentional: each becomes its own one-click
 * suggestion in the inline chip stack ("Add HQ", "Add Boston Branch")
 * with descending confidence based on enrichment certainty.
 */
interface DomainEnrichment {
  name: string;
  /** All published business locations. Listed in priority order — first is
   *  typically HQ; subsequent entries are branches/regional offices. */
  addresses: Array<{
    type: string;     // Form-valid: 'Worksite' | 'Branch' | 'Mailing' | 'Home' | 'Agency'
    label: string;    // Human-readable: 'Headquarters' / 'Boston Branch'
    value: string;
    city: string;
    state: string;
    zip: string;
  }>;
  /** Main / branch phone numbers. Same order as addresses where possible. */
  phones?: Array<{ value: string; type: string; label: string }>;
}

const WEB_ENRICHMENT: Record<string, DomainEnrichment> = {
  'digitalprospectors.com': {
    name: 'Digital Prospectors',
    // Source: digitalprospectors.com/contact — published business addresses,
    // not private data. The /contact page literally splits these into
    // "Our Exeter Location · HEADQUARTERS" + "Our Boston Location ·
    // BRANCH OFFICE", which is exactly the multi-suggestion shape we
    // want to demo. Addresses + phones verified against the public
    // contact page on 2026-04-27.
    addresses: [
      { type: 'Worksite', label: 'Exeter HQ', value: '100 Domain Drive, Suite 103', city: 'Exeter', state: 'NH', zip: '03833' },
      { type: 'Branch', label: 'Boston Branch', value: '230 Congress Street, 3rd Floor', city: 'Boston', state: 'MA', zip: '02110' },
    ],
    phones: [
      { value: '+1 (603) 772-2700', type: 'Office', label: 'Exeter HQ — main' },
      { value: '+1 (603) 772-2828', type: 'Fax', label: 'Exeter HQ — fax' },
      { value: '+1 (617) 938-6100', type: 'Office', label: 'Boston Branch — main' },
    ],
  },
};

/** Look up enrichment by domain or by company name. Returns null if we
 *  don't have anything cached for either. Name lookup is case- and
 *  whitespace-insensitive. */
function findEnrichment(domain: string | null, name: string | null): DomainEnrichment | null {
  if (domain) {
    const hit = WEB_ENRICHMENT[domain.toLowerCase().replace(/^www\./, '').trim()];
    if (hit) return hit;
  }
  if (name) {
    const norm = name.toLowerCase().trim();
    const hit = Object.values(WEB_ENRICHMENT).find((e) => e.name.toLowerCase().trim() === norm);
    if (hit) return hit;
  }
  return null;
}

// Person address suggestions are intentionally LOW confidence because
// without an employer link or some other real signal, we don't actually
// know where someone lives. The old pool claimed "USPS" / 86% on a fake
// Nashua address, which is exactly the spam-y "made-up suggestion that
// looks authoritative" pattern Paul flagged: "is this her personal
// address? why?". These pool entries stay in the engine for the AI tab
// (so users can browse what AI *could* infer with more data) but their
// confidences are below INLINE_AI_THRESHOLD (85) so they don't surface
// as inline chips. The HIGH-confidence person-address suggestion comes
// from the employer lookup in addressVariantsFor() — that one's data-
// derived ("we know she works at Digital Prospectors") and confidently
// inline-worthy.
const PERSON_ADDRESS_POOL: PooledSuggestion[] = [
  { fieldValues: { type: 'Home', value: '14 Beacon Hill Drive', city: 'Nashua', state: 'NH', zip: '03062' }, primaryLabel: 'Home · 14 Beacon Hill Drive', secondaryLabel: 'Nashua, NH 03062 · estimated', source: 'web', sourceLabel: 'Web directory (low confidence)', confidence: 62 },
  { fieldValues: { type: 'Mailing', value: 'PO Box 2184', city: 'Manchester', state: 'NH', zip: '03105' }, primaryLabel: 'Mailing · PO Box 2184', secondaryLabel: 'Manchester, NH 03105 · estimated', source: 'web', sourceLabel: 'Web directory (low confidence)', confidence: 55 },
];

/**
 * Build address suggestions for the contact, optionally enriched with
 * other contacts in the workspace so we can resolve a person's employer
 * → org address.
 *
 * The canonical inference path (Paul's directive: "look thru a
 * companies webiste for this info always. an email address to a compny
 * will give you a starting point"):
 *   1. Pull the corporate domain from the contact's work email
 *   2. Look up the domain in WEB_ENRICHMENT (mock Clearbit/Apollo)
 *   3. Surface EVERY published business address as a separate inline
 *      suggestion — HQ, Branch, Mailing address, etc. The /contact page
 *      of a real company has multiple locations; pretending there's only
 *      one was the bug Paul flagged when Digital Prospectors clearly
 *      lists Exeter + Boston.
 *   4. Fall back to a single employer-record address (cross-contact
 *      lookup against the workspace) for orgs we don't have enrichment
 *      data for.
 *
 * For ORGS, we ALSO check enrichment by name in case the user typed
 * "Digital Prospectors" without entering a website yet.
 */
function addressVariantsFor(
  contact: ContactWithEntries,
  allContacts?: ContactWithEntries[],
): PooledSuggestion[] {
  if (contact.type === 'org') {
    const out: PooledSuggestion[] = [];
    // Org-side enrichment: pull from website if set, else by name. Same
    // multi-address treatment as persons get below.
    const websiteDomain = 'website' in contact && contact.website
      ? contact.website.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').split('/')[0] || null
      : null;
    const enrichment = findEnrichment(websiteDomain, contact.name);
    if (enrichment) {
      enrichment.addresses.forEach((addr, i) => {
        out.push({
          fieldValues: {
            type: addr.type,
            value: addr.value,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
          },
          primaryLabel: `${addr.label} · ${addr.value}`,
          secondaryLabel: `${addr.city}, ${addr.state} ${addr.zip} · From ${enrichment.name} website`,
          source: 'web',
          sourceLabel: `${enrichment.name} /contact page`,
          // First (HQ) gets 96, subsequent (branches) drop slightly so
          // they sort below HQ in the inline stack but stay above-threshold.
          confidence: 96 - i * 2,
        });
      });
    }
    out.push(...ORG_ADDRESS_POOL);
    return out;
  }

  const out: PooledSuggestion[] = [];

  // 1) Web enrichment via the contact's work-email domain. Highest signal:
  //    we know where this person works because the domain on their email
  //    matches a company in our enrichment cache. Surface ALL of that
  //    company's published locations as separate suggestions.
  const emailDomain = corporateDomainFromEmail(contact);
  // Resolve employer (used both for fallback below and as a name hint
  // into enrichment for cases where we have orgName but no work email).
  const orgId = 'orgId' in contact ? contact.orgId : undefined;
  const orgName = 'orgName' in contact ? contact.orgName : undefined;
  let employer: ContactWithEntries | undefined;
  if (allContacts && allContacts.length > 0) {
    if (orgId) employer = allContacts.find((x) => x.id === orgId && x.type === 'org');
    if (!employer && orgName) {
      const target = orgName.toLowerCase().trim();
      employer = allContacts.find(
        (x) => x.type === 'org' && (x.name || '').toLowerCase().trim() === target,
      );
    }
  }

  const enrichment = findEnrichment(emailDomain, orgName || employer?.name || null);
  if (enrichment) {
    enrichment.addresses.forEach((addr, i) => {
      out.push({
        fieldValues: {
          type: addr.type,
          value: addr.value,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
        },
        primaryLabel: `${addr.label} · ${addr.value}`,
        secondaryLabel: `${addr.city}, ${addr.state} ${addr.zip} · From ${enrichment.name} website`,
        source: 'web',
        sourceLabel: `${enrichment.name} /contact page`,
        // 95 for HQ, descending so multiple branches still all stay above
        // INLINE_AI_THRESHOLD (85) and the user sees every published
        // location as its own one-click chip.
        confidence: 95 - i * 2,
      });
    });
  }

  // 2) Employer record fallback — only used when we DON'T have enrichment
  //    for the company. (If enrichment fires above, those addresses are
  //    higher-trust since they're from the actual company website.)
  if (!enrichment && employer) {
    employer.entries.addresses.forEach((orgAddr, i) => {
      out.push({
        fieldValues: {
          type: i === 0 ? 'Worksite' : 'Branch',
          value: orgAddr.value,
          city: orgAddr.city,
          state: orgAddr.state,
          zip: orgAddr.zip,
        },
        primaryLabel: `${i === 0 ? 'Worksite' : 'Branch'} · ${orgAddr.value}`,
        secondaryLabel: `${orgAddr.city}, ${orgAddr.state} ${orgAddr.zip} · From employer ${employer.name}`,
        source: 'clearbit',
        sourceLabel: `Employer record (${employer.name})`,
        confidence: 95 - i * 3,
      });
    });
  }

  // 3) Low-confidence pool fallbacks — visible in the AI tab only.
  out.push(...PERSON_ADDRESS_POOL);
  return out;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function personNameParts(contact: ContactWithEntries): { first: string; last: string } {
  if (contact.type !== 'person') return { first: 'first', last: 'last' };
  const primary = contact.entries.names.find((n) => n.primary) || contact.entries.names[0];
  const first = primary?.firstName?.toLowerCase()
    || primary?.value?.split(/\s+/)[0]?.toLowerCase()
    || contact.name?.split(/\s+/)[0]?.toLowerCase()
    || 'first';
  const last = primary?.lastName?.toLowerCase()
    || primary?.value?.split(/\s+/).slice(-1)[0]?.toLowerCase()
    || contact.name?.split(/\s+/).slice(-1)[0]?.toLowerCase()
    || 'last';
  return { first, last };
}

function emailVariantsFor(contact: ContactWithEntries): PooledSuggestion[] {
  if (contact.type === 'org') {
    const fromWeb = ('website' in contact && contact.website) ? contact.website.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '') : '';
    const domain = fromWeb || (contact.name ? `${slugify(contact.name)}.com` : 'company.com');
    return [
      { fieldValues: { value: `info@${domain}`, type: 'Support' }, primaryLabel: `info@${domain}`, secondaryLabel: 'Support', source: 'hunter', sourceLabel: 'Hunter.io', confidence: 88 },
      { fieldValues: { value: `sales@${domain}`, type: 'Work' }, primaryLabel: `sales@${domain}`, secondaryLabel: 'Work', source: 'hunter', sourceLabel: 'Hunter.io', confidence: 83 },
      { fieldValues: { value: `press@${domain}`, type: 'Other' }, primaryLabel: `press@${domain}`, secondaryLabel: 'Other', source: 'web', sourceLabel: 'Web directory', confidence: 71 },
    ];
  }
  const { first, last } = personNameParts(contact);
  const orgDomain = contact.type === 'person' && contact.orgName ? slugify(contact.orgName) + '.com' : 'company.com';
  return [
    { fieldValues: { value: `${first}.${last}@${orgDomain}`, type: 'Work' }, primaryLabel: `${first}.${last}@${orgDomain}`, secondaryLabel: 'Work', source: 'hunter', sourceLabel: 'Hunter.io', confidence: 91 },
    { fieldValues: { value: `${first.charAt(0)}${last}@${orgDomain}`, type: 'Work' }, primaryLabel: `${first.charAt(0)}${last}@${orgDomain}`, secondaryLabel: 'Work (alt pattern)', source: 'hunter', sourceLabel: 'Hunter.io', confidence: 78 },
    { fieldValues: { value: `${first}.${last}@gmail.com`, type: 'Personal' }, primaryLabel: `${first}.${last}@gmail.com`, secondaryLabel: 'Personal', source: 'web', sourceLabel: 'Web directory', confidence: 62 },
  ];
}

function phoneVariantsFor(
  contact: ContactWithEntries,
  allContacts?: ContactWithEntries[],
): PooledSuggestion[] {
  if (contact.type === 'org') {
    const out: PooledSuggestion[] = [];
    // Pull phones straight from enrichment (HQ + branch + fax) if we
    // have a match for this org's website or name.
    const websiteDomain = 'website' in contact && contact.website
      ? contact.website.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').split('/')[0] || null
      : null;
    const enrichment = findEnrichment(websiteDomain, contact.name);
    if (enrichment?.phones) {
      enrichment.phones.forEach((p, i) => {
        out.push({
          fieldValues: { value: p.value, type: p.type },
          primaryLabel: p.value,
          secondaryLabel: `${p.label} · From ${enrichment.name} website`,
          source: 'web',
          sourceLabel: `${enrichment.name} /contact page`,
          confidence: 95 - i * 2,
        });
      });
    }
    out.push(
      { fieldValues: { value: '+1 (617) 563-7000', type: 'Office' }, primaryLabel: '+1 (617) 563-7000', secondaryLabel: 'Main line', source: 'sec-edgar', sourceLabel: 'SEC EDGAR', confidence: 82 },
      { fieldValues: { value: '+1 (800) 343-3548', type: 'Office' }, primaryLabel: '+1 (800) 343-3548', secondaryLabel: 'Support', source: 'web', sourceLabel: 'Web directory', confidence: 75 },
    );
    return out;
  }

  // Person — Paul's call: "some phone number suggestions for the website
  // to offer. start with those even tho its for the company not her."
  // Lead with the company's published phone numbers from enrichment;
  // they're company main lines, not personal mobiles, but they're still
  // useful entries (a recruiter calling Holly's main office number).
  // Each branch / fax gets its own one-click chip.
  const out: PooledSuggestion[] = [];
  const emailDomain = corporateDomainFromEmail(contact);
  const orgName = 'orgName' in contact ? contact.orgName : undefined;
  let employer: ContactWithEntries | undefined;
  if (allContacts && allContacts.length > 0) {
    const orgId = 'orgId' in contact ? contact.orgId : undefined;
    if (orgId) employer = allContacts.find((x) => x.id === orgId && x.type === 'org');
    if (!employer && orgName) {
      const target = orgName.toLowerCase().trim();
      employer = allContacts.find(
        (x) => x.type === 'org' && (x.name || '').toLowerCase().trim() === target,
      );
    }
  }
  const enrichment = findEnrichment(emailDomain, orgName || employer?.name || null);
  if (enrichment?.phones) {
    enrichment.phones.forEach((p, i) => {
      out.push({
        fieldValues: { value: p.value, type: p.type },
        primaryLabel: p.value,
        secondaryLabel: `${p.label} · From ${enrichment.name} website`,
        source: 'web',
        sourceLabel: `${enrichment.name} /contact page`,
        // First phone (HQ main) at 92, descending — all stay above
        // INLINE_AI_THRESHOLD so each surfaces as its own chip.
        confidence: 92 - i * 2,
      });
    });
  }
  // Low-confidence personal-phone guesses — visible in the AI tab only,
  // below threshold for inline so we don't spam fake mobile numbers.
  out.push(
    { fieldValues: { value: '+1 (603) 555-0134', type: 'Mobile' }, primaryLabel: '+1 (603) 555-0134', secondaryLabel: 'Mobile · estimated', source: 'web', sourceLabel: 'Web directory (low confidence)', confidence: 72 },
    { fieldValues: { value: '+1 (617) 555-0198', type: 'Office' }, primaryLabel: '+1 (617) 555-0198', secondaryLabel: 'Work · estimated', source: 'hunter', sourceLabel: 'Hunter.io', confidence: 80 },
  );
  return out;
}

/**
 * Personal email domains we should NEVER treat as "the company website."
 * If a contact's primary email is `holly@gmail.com`, we don't want to
 * suggest `gmail.com` as her employer's site. This list is intentionally
 * small + obvious; we err on the side of *suggesting* a corporate-looking
 * domain (the worst case is a wrong suggestion the user dismisses).
 */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me',
  'pm.me', 'fastmail.com', 'gmx.com', 'zoho.com', 'mail.com',
]);

/**
 * Pull the corporate domain from a person's first non-personal work email.
 * Returns null if the person has no email, or only personal-domain emails.
 * The caller uses this as the "obvious" company-website suggestion — a
 * person with `holly@digitalprospectors.com` should clearly get
 * `digitalprospectors.com` as a one-click website suggestion instead of
 * the LinkedIn/GitHub guesses we used to lead with.
 */
function corporateDomainFromEmail(contact: ContactWithEntries): string | null {
  if (contact.type !== 'person') return null;
  const emails = contact.entries.emails || [];
  // Walk in priority order: explicit Work first, then anything else.
  // Use the same .toLowerCase() normalization the suggestion engine uses
  // elsewhere so we don't double-store with mismatched casing.
  const ordered = [...emails].sort((a, b) => {
    const aw = (a.type || '').toLowerCase() === 'work' ? 0 : 1;
    const bw = (b.type || '').toLowerCase() === 'work' ? 0 : 1;
    return aw - bw;
  });
  for (const e of ordered) {
    const at = (e.value || '').lastIndexOf('@');
    if (at < 0) continue;
    const domain = e.value.slice(at + 1).toLowerCase().trim();
    if (!domain || domain.includes(' ')) continue;
    if (PERSONAL_EMAIL_DOMAINS.has(domain)) continue;
    return domain;
  }
  return null;
}

/**
 * Names section — the highest-confidence suggestion in the whole engine
 * because it isn't a guess at all. We already have the contact's display
 * name (typed at create time, or pulled from a Gmail sender header). All
 * we're doing is offering to split that string into the form's
 * prefix/first/middle/last/suffix slots so the user gets a clean record
 * with one click instead of retyping the same name into five fields.
 *
 * For orgs, the same idea but flatter: the display name → the Primary ·
 * Legal name field at confidence 99 ("you literally just told us this").
 */
function nameVariantsFor(contact: ContactWithEntries): PooledSuggestion[] {
  const display = (contact.name || '').trim();
  if (!display) return [];

  if (contact.type === 'org') {
    return [
      {
        fieldValues: { value: display, type: 'Primary · Legal' },
        primaryLabel: display,
        secondaryLabel: 'Primary · Legal name',
        source: 'web',
        sourceLabel: 'Contact record',
        confidence: 99,
      },
    ];
  }

  // Person — split on whitespace into first / middle / last. Two tokens
  // → first+last (the common case). Three+ tokens → first, middle stack,
  // last. One token → first only (e.g. "Madonna"); the user can edit
  // before saving. We don't try to detect prefixes/suffixes
  // automatically — too much risk of mis-classifying a real first name
  // ("Reverend" vs "Rev. ").
  const tokens = display.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const firstName = tokens[0];
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const middleName = tokens.length > 2 ? tokens.slice(1, -1).join(' ') : '';

  return [
    {
      fieldValues: {
        firstName,
        middleName,
        lastName,
        type: 'Primary · Legal',
      },
      primaryLabel: display,
      secondaryLabel: lastName
        ? `${firstName}${middleName ? ' ' + middleName : ''} · ${lastName}`
        : 'First name only',
      source: 'web',
      sourceLabel: 'Contact record',
      confidence: 99,
    },
  ];
}

function websiteVariantsFor(contact: ContactWithEntries): PooledSuggestion[] {
  if (contact.type === 'org') {
    const orgSlug = contact.name ? slugify(contact.name) : 'company';
    return [
      // Note: 'Company' is not in the form's website-type options
      // (Primary/LinkedIn/Careers/Blog/Social/Other). We use 'Primary' so
      // a one-click accept doesn't fail validation.
      { fieldValues: { value: `https://www.${orgSlug}.com`, type: 'Primary' }, primaryLabel: `www.${orgSlug}.com`, secondaryLabel: 'Company', source: 'clearbit', sourceLabel: 'Clearbit', confidence: 93 },
      { fieldValues: { value: `https://www.linkedin.com/company/${orgSlug}`, type: 'LinkedIn' }, primaryLabel: `linkedin.com/company/${orgSlug}`, secondaryLabel: 'LinkedIn', source: 'linkedin', sourceLabel: 'LinkedIn', confidence: 87 },
      { fieldValues: { value: `https://careers.${orgSlug}.com`, type: 'Careers' }, primaryLabel: `careers.${orgSlug}.com`, secondaryLabel: 'Careers', source: 'web', sourceLabel: 'Web', confidence: 68 },
    ];
  }

  // Person — lead with the corporate domain pulled straight from their
  // work email. This is the most obvious / highest-trust signal we have:
  // if Holly's email is hollyb@digitalprospectors.com, the company
  // website is digitalprospectors.com — full stop. Confidence 96 because
  // we're not guessing, we're echoing data the user already typed in.
  const { first, last } = personNameParts(contact);
  const domain = corporateDomainFromEmail(contact);
  const out: PooledSuggestion[] = [];
  if (domain) {
    out.push({
      fieldValues: { value: `https://${domain}`, type: 'Primary' },
      primaryLabel: domain,
      secondaryLabel: 'Company website (from work email)',
      source: 'whois',
      sourceLabel: 'Email domain',
      confidence: 96,
    });
  }
  out.push(
    { fieldValues: { value: `https://www.linkedin.com/in/${first}-${last}`, type: 'LinkedIn' }, primaryLabel: `linkedin.com/in/${first}-${last}`, secondaryLabel: 'LinkedIn', source: 'linkedin', sourceLabel: 'LinkedIn', confidence: 85 },
    { fieldValues: { value: `https://github.com/${first}${last}`, type: 'Other' }, primaryLabel: `github.com/${first}${last}`, secondaryLabel: 'GitHub', source: 'github', sourceLabel: 'GitHub', confidence: 72 },
  );
  return out;
}

/**
 * Generate a stable, content-based suggestion id. Index-based ids
 * (e.g. `ai-{section}-{contactId}-0`) broke dismissal: dismissing index
 * 0 caused the next render's index 0 to inherit the same id, hiding the
 * NEW suggestion. The slug is derived from primaryLabel so the id
 * follows the suggestion's actual content even if the pool's order
 * changes between renders.
 */
function suggestionId(section: string, contactId: string, primaryLabel: string): string {
  const slug = primaryLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `ai-${section}-${contactId}-${slug}`;
}

/**
 * Primary entry point. Returns up to 3 AI suggestions for the given section,
 * filtered against the contact's existing entries (so we don't suggest what's
 * already there). Deterministic by contact id so suggestions don't churn on
 * re-render.
 *
 * Pass `allContacts` from the caller (typically `useContactStore.contacts`)
 * to enable cross-contact inferences — most importantly, looking up a
 * person's employer record so their work address can be suggested at
 * high confidence instead of falling back to a fake Nashua pool entry.
 */
export function getEntrySuggestions(
  section: string,
  contact: ContactWithEntries,
  allContacts?: ContactWithEntries[],
): EntrySuggestion[] {
  let pool: PooledSuggestion[] = [];
  let existingKeys = new Set<string>();

  if (section === 'addresses') {
    pool = addressVariantsFor(contact, allContacts);
    existingKeys = new Set(
      contact.entries.addresses.map((a) => `${a.value}|${a.city}|${a.state}|${a.zip}`.toLowerCase())
    );
  } else if (section === 'emails') {
    pool = emailVariantsFor(contact);
    existingKeys = new Set(contact.entries.emails.map((e) => e.value.toLowerCase()));
  } else if (section === 'phones') {
    pool = phoneVariantsFor(contact, allContacts);
    existingKeys = new Set(contact.entries.phones.map((p) => p.value.replace(/\D/g, '')));
  } else if (section === 'websites') {
    pool = websiteVariantsFor(contact);
    existingKeys = new Set(contact.entries.websites.map((w) => w.value.toLowerCase().replace(/\/$/, '')));
  } else if (section === 'names') {
    pool = nameVariantsFor(contact);
    // De-dupe against existing names by their composed `value` (the form
    // composes display value from prefix/first/middle/last/suffix on save,
    // so comparing on .value is the apples-to-apples key here).
    existingKeys = new Set(
      contact.entries.names.map((n) => (n.value || '').toLowerCase().trim()),
    );
  } else {
    return [];
  }

  // Sort by confidence (highest first) so multi-suggestion sections like
  // addresses + phones surface every above-threshold candidate stacked
  // top-to-bottom in trust order. The earlier rotation logic dropped
  // later-pool items when the slice cap (3) cut them off, which is
  // exactly why Paul saw only one of Digital Prospectors' two addresses
  // — Boston Branch was rotated past position 3 and silently truncated.
  const sorted = [...pool].sort((a, b) => b.confidence - a.confidence);

  return sorted
    .filter((s) => {
      if (section === 'addresses') {
        const k = `${s.fieldValues.value}|${s.fieldValues.city}|${s.fieldValues.state}|${s.fieldValues.zip}`.toLowerCase();
        return !existingKeys.has(k);
      }
      if (section === 'phones') return !existingKeys.has(s.fieldValues.value.replace(/\D/g, ''));
      if (section === 'websites') return !existingKeys.has(s.fieldValues.value.toLowerCase().replace(/\/$/, ''));
      if (section === 'names') {
        // Name pool entries don't always carry `value` (persons set
        // first/middle/last instead). Compose the same way saveEntry
        // does so the de-dupe key matches what's already on the contact.
        const composed = (s.fieldValues.value
          || [s.fieldValues.firstName, s.fieldValues.middleName, s.fieldValues.lastName]
              .filter(Boolean).join(' ')
        ).toLowerCase().trim();
        return composed.length > 0 && !existingKeys.has(composed);
      }
      return !existingKeys.has(s.fieldValues.value.toLowerCase());
    })
    // Cap at 6 — enough to show every published location for an
    // enrichment match (Digital Prospectors has 2 addresses + 3 phones)
    // plus a couple low-confidence pool fallbacks for the AI tab. Inline
    // chips filter to >= 85 below this anyway, so the displayed count is
    // self-limiting.
    .slice(0, 6)
    .map((s) => ({ ...s, id: suggestionId(section, contact.id, s.primaryLabel) }));
}
