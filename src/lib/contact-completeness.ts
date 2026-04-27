import type { ContactWithEntries } from '@/types/contact';

/**
 * Returns the list of REQUIRED fields that aren't filled in on this
 * contact. Single source of truth used by the detail header pill, the
 * /contacts grid AI Insights bar, and the (forthcoming) Tags column —
 * so all three surfaces agree on whether a contact is complete.
 *
 * History: previously the "Complete / Incomplete" badge was a binary
 * mirror of `c.stale` — a hand-set "this record hasn't been refreshed
 * in a while" flag — so a brand-new contact with only a name + email
 * could still be marked "Complete" while missing phone, address,
 * title, etc. Paul caught this on Holly's record on 2026-04-27, and
 * the AI Insights bar on /contacts had the same lie ("All contacts
 * complete" while every grid row screamed Incomplete in 5 columns).
 * Now we compute it from actual required-field presence, matching
 * HubSpot's "Property completeness" check and Pipedrive's required-
 * field warnings.
 *
 * Required-field set picked to match what a recruiter needs to actually
 * act on the contact:
 *   Person: Email, Phone, Address, Title, Organization, Identification  (6)
 *   Org:    Website, Phone, Address, Industry, Identification           (5)
 *
 * **Hidden-card opt-out.** If the user has hidden the card that owns a
 * required field (via the eye-slash on the SectionCard header), that
 * field is excluded from the missing-list. The semantic is "I've
 * decided this field doesn't apply to this contact" — common for
 * candidates we'll never know the home address of, vendors with no
 * website, etc. Matches HubSpot's per-layout required-field overrides
 * and Attio's per-record attribute hiding.
 *
 * Card-id → required-field map is kept inline below; the relationship
 * is tight and currently single-purpose, so a separate constants file
 * would just split a ~10-line truth table across two files.
 *
 * Email/phone/website are checked through `entries.*` first (the
 * canonical multi-entry source) and fall back to the legacy top-level
 * `email` / `phone` / `website` fields so older seed records and Gmail-
 * imported contacts don't all read as Incomplete.
 */
export function computeMissingFields(c: ContactWithEntries): string[] {
  const isOrg = c.type === 'org';
  const missing: string[] = [];
  const hidden = new Set(c.hiddenCards || []);

  const emails = c.entries?.emails || [];
  const phones = c.entries?.phones || [];
  const addresses = c.entries?.addresses || [];
  const websites = c.entries?.websites || [];
  const identifiers = c.entries?.identifiers || [];

  const hasEmail = emails.length > 0 || ('email' in c && !!c.email);
  const hasPhone = phones.length > 0 || ('phone' in c && !!c.phone);
  const hasAddress = addresses.length > 0;
  const hasWebsite = websites.length > 0 || ('website' in c && !!c.website);
  const hasIdentifier = identifiers.length > 0;

  const industries = c.entries?.industries || [];
  const hasIndustry = industries.length > 0 || ('industry' in c && !!c.industry);

  if (isOrg) {
    if (!hidden.has('card-websites') && !hasWebsite) missing.push('Website');
    if (!hidden.has('card-phones') && !hasPhone) missing.push('Phone');
    if (!hidden.has('card-addresses') && !hasAddress) missing.push('Address');
    if (!hidden.has('card-industries') && !hasIndustry) missing.push('Industry');
    if (!hidden.has('card-identification') && !hasIdentifier) missing.push('Identification');
  } else {
    if (!hidden.has('card-emails') && !hasEmail) missing.push('Email');
    if (!hidden.has('card-phones') && !hasPhone) missing.push('Phone');
    if (!hidden.has('card-addresses') && !hasAddress) missing.push('Address');
    // Title and Organization both live on `card-jobtitle` — the General
    // Information person variant was deleted as redundant (its Email /
    // Phone / Last Updated all duplicated dedicated cards). Industry-CRM
    // peers (HubSpot, Salesforce, Pipedrive, Attio) all group employer +
    // role together, so the Job Title card now owns both checks.
    // Hiding `card-jobtitle` therefore opts out of BOTH the Title and
    // Organization required-field checks.
    if (!hidden.has('card-jobtitle') && (!('title' in c) || !c.title)) missing.push('Title');
    if (!hidden.has('card-jobtitle') && (!('orgName' in c) || !c.orgName)) missing.push('Organization');
    if (!hidden.has('card-identification') && !hasIdentifier) missing.push('Identification');
  }

  return missing;
}

/** Convenience predicate — `true` iff the contact has no missing required fields. */
export function isContactComplete(c: ContactWithEntries): boolean {
  return computeMissingFields(c).length === 0;
}
