export type ContactType = 'org' | 'person';
export type ContactStatus = 'active' | 'inactive';
export type AIStatus = 'verified' | 'stale' | 'new';

export type ContactTag = 'Contacts Tag' | 'Sales Tag' | 'VIP' | 'Recruiting' | 'Partner'
  | 'Prospect' | 'Client' | 'Customer' | 'Vendor' | 'Do Not Contact' | 'Follow Up';

export interface BaseContact {
  id: string;
  type: ContactType;
  name: string;
  status: ContactStatus;
  lastUpdated: string;
  stale: boolean;
  staleReason?: string;
  aiStatus: AIStatus;
  avatarColor?: string;
  overviewCards?: string[];
  /** Left-column card order on Overview. Card ids include the built-in
   *  `summary`, `address`, `industries`, and any `card-*` from overviewCards.
   *  Missing ids render in default order after the ordered ones. */
  overviewLeftOrder?: string[];
  /** Card ids the user has turned OFF for this contact. Hidden cards
   *  don't render on Details, and are excluded from Overview even if
   *  they were pinned. HubSpot/Pipedrive do the same per-record layout
   *  override on top of the global layout. */
  hiddenCards?: string[];
  /** AI suggestion IDs the user has explicitly dismissed for this contact.
   *  IDs are content-based (`ai-{section}-{contactId}-{slug}`) so a
   *  dismissed suggestion stays dismissed even if rotation/filtering
   *  changes its position. Per-contact (not global) because the same
   *  suggestion shape might be wanted on contact A but rejected on
   *  contact B. */
  dismissedSuggestions?: string[];
  tags?: ContactTag[];
  isPrivate?: boolean;
  assignedTo?: string;
  visibleTo?: string[];
  createdBy?: string;
  /** Per-contact email-activity summary attached by GET /api/contacts.
   *  Drives the contacts-grid Unread column's "New" pill + paperclip
   *  indicator. Optional because the field only exists on rows
   *  hydrated from the API — locally-created contacts won't have it
   *  until the next round-trip. The grid's seed-fallback path
   *  handles `undefined` gracefully. */
  recentEmail?: {
    hasNew: boolean;
    hasAttachment: boolean;
    lastEmailAt: string | null;
  };
}

/** Revenue/Sales volume breakdown (annual/quarterly/monthly). Neutral B2B
 *  numbers — usable for any industry, not just finance/vendor management. */
export interface VolumeBreakdown {
  annual?: number;
  quarterly?: number;
  monthly?: number;
}

/** A product or service offered by the organization — appears in the
 *  Products & Services card on the Sales Qualify tab. */
export interface ProductEntry {
  id: string;
  type: string;
  description: string;
}

export interface Organization extends BaseContact {
  type: 'org';
  industry?: string;
  employees?: string;
  hq?: string;
  website?: string;
  description?: string;
  /** Legal structure (LLC, Partnership, Public, Private, etc.) */
  structure?: string;
  /** Market category (National, Regional, Local, Global, etc.) */
  category?: string;
  revenueVolume?: VolumeBreakdown;
  salesVolume?: VolumeBreakdown;
  products?: ProductEntry[];
}

export interface Person extends BaseContact {
  type: 'person';
  title?: string;
  department?: string;
  orgId?: string;
  orgName?: string;
  email?: string;
  phone?: string;
  /** Technical + soft skills extracted from a resume (HR-staffing feature). */
  skills?: string[];
  /** LinkedIn URL (extracted from resume or entered manually). */
  linkedinUrl?: string;
  /** GitHub URL (extracted from resume or entered manually). */
  githubUrl?: string;
  /** Personal / portfolio URL (extracted from resume or entered manually). */
  websiteUrl?: string;
}

export type Contact = Organization | Person;

// Multi-entry types
export interface EntryBase {
  id: string;
  type: string;
  primary: boolean;
}

export interface AddressEntry extends EntryBase {
  value: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface EmailEntry extends EntryBase {
  value: string;
}

export interface PhoneEntry extends EntryBase {
  value: string;
  extension?: string;
}

export interface WebsiteEntry extends EntryBase {
  value: string;
}

export interface NameEntry extends EntryBase {
  value: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  prefix?: string;
  suffix?: string;
}

export interface IdentifierEntry extends EntryBase {
  authority: string;
  value: string;
}

export interface IndustryEntry {
  id: string;
  code: string;
  name: string;
  primary: boolean;
}

export interface ContactEntries {
  addresses: AddressEntry[];
  emails: EmailEntry[];
  phones: PhoneEntry[];
  websites: WebsiteEntry[];
  names: NameEntry[];
  identifiers: IdentifierEntry[];
  industries: IndustryEntry[];
}

export type ContactWithEntries = (Organization | Person) & {
  entries: ContactEntries;
};
