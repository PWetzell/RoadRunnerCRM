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
  tags?: ContactTag[];
  isPrivate?: boolean;
  assignedTo?: string;
  visibleTo?: string[];
  createdBy?: string;
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
