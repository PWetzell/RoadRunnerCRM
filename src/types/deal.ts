export type DealStage =
  | 'lead'
  | 'qualified'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

export interface DealStageMeta {
  id: DealStage;
  label: string;
  color: string;
  bg: string;
  darkColor: string;
  darkBg: string;
  order: number;
  isOpen: boolean;
}

// All color combos meet WCAG AA contrast (>= 4.5:1) for small bold text.
// Light: dark text on light tint. Dark: light text on dark tint.
//
// Labels use HR Staffing vertical terminology (see src/lib/vertical/hr-staffing.ts
// for the canonical mapping). Stage IDs stay generic so the data model is portable
// across future verticals.
// Stage colors picked to be visually distinct as a 7-step sequence —
// no two adjacent stages read as "the same color" at a glance.
// Previously: Sourced + Screened both very dark navy; Interview +
// Not a fit both dark red/pink. New palette spans
//   slate → blue → violet → cyan → orange → green → red,
// one unambiguous hue per stage. Light/dark pairs match the same hue
// at different shades (lighter in dark mode for visibility on dark
// surface, darker in light mode for contrast on white).
export const DEAL_STAGES: DealStageMeta[] = [
  { id: 'lead',         label: 'Sourced',       color: '#A21CAF', bg: '#FAE8FF', darkColor: '#C026D3', darkBg: '#4A044E', order: 1, isOpen: true },
  { id: 'qualified',    label: 'Screened',      color: '#1D4ED8', bg: '#DBEAFE', darkColor: '#3B82F6', darkBg: '#172554', order: 2, isOpen: true },
  { id: 'discovery',    label: 'Submitted',     color: '#6D28D9', bg: '#EDE9FE', darkColor: '#A78BFA', darkBg: '#2E1065', order: 3, isOpen: true },
  { id: 'proposal',     label: 'Client review', color: '#0E7490', bg: '#CFFAFE', darkColor: '#22D3EE', darkBg: '#164E63', order: 4, isOpen: true },
  { id: 'negotiation',  label: 'Interview',     color: '#C2410C', bg: '#FFEDD5', darkColor: '#FB923C', darkBg: '#431407', order: 5, isOpen: true },
  { id: 'closed-won',   label: 'Placed',        color: '#047857', bg: '#D1FAE5', darkColor: '#34D399', darkBg: '#064E3B', order: 6, isOpen: false },
  { id: 'closed-lost',  label: 'Not a fit',     color: '#B91C1C', bg: '#FEE2E2', darkColor: '#F87171', darkBg: '#450A0A', order: 6, isOpen: false },
];

export const STAGE_META: Record<DealStage, DealStageMeta> = DEAL_STAGES.reduce(
  (acc, s) => { acc[s.id] = s; return acc; },
  {} as Record<DealStage, DealStageMeta>
);

export const PIPELINE_STAGES: DealStage[] = ['lead', 'qualified', 'discovery', 'proposal', 'negotiation', 'closed-won'];

export type DealSource = 'Inbound' | 'Outbound' | 'Referral' | 'Event' | 'Partner' | 'Marketing';

export const DEAL_SOURCES: DealSource[] = ['Inbound', 'Outbound', 'Referral', 'Event', 'Partner', 'Marketing'];

export type DealPriority = 'high' | 'medium' | 'low';

export const PRIORITY_META: Record<DealPriority, { label: string; color: string; bg: string; darkColor: string; darkBg: string }> = {
  high:   { label: 'High',   color: '#991B1B', bg: '#FEE2E2', darkColor: '#FCA5A5', darkBg: '#450A0A' },
  medium: { label: 'Medium', color: '#9A3412', bg: '#FFEDD5', darkColor: '#FDBA74', darkBg: '#431407' },
  low:    { label: 'Low',    color: '#475569', bg: '#E2E8F0', darkColor: '#CBD5E1', darkBg: '#1E293B' },
};

export type CommType = 'Phone Call' | 'Email' | 'Left Message' | 'Meeting' | 'Slate Sent' | 'Intake';

export const COMM_META: Record<CommType, { color: string; bg: string; darkColor: string; darkBg: string }> = {
  'Phone Call':   { color: '#065F46', bg: '#D1FAE5', darkColor: '#6EE7B7', darkBg: '#064E3B' },
  'Email':        { color: '#1E40AF', bg: '#DBEAFE', darkColor: '#93C5FD', darkBg: '#172554' },
  'Left Message': { color: '#92400E', bg: '#FEF3C7', darkColor: '#FCD34D', darkBg: '#451A03' },
  'Meeting':      { color: '#5B21B6', bg: '#EDE9FE', darkColor: '#C4B5FD', darkBg: '#2E1065' },
  'Slate Sent':   { color: '#0E7490', bg: '#CFFAFE', darkColor: '#67E8F9', darkBg: '#164E63' },
  'Intake':       { color: '#9D174D', bg: '#FCE7F3', darkColor: '#F9A8D4', darkBg: '#500724' },
};

export interface LastCommunication {
  type: CommType;
  date: string;
}

/**
 * A lead is either person-first (an individual contact, may or may not be
 * associated with a company) or company-first (a prospective client org, with
 * an optional primary contact). `type` drives header rendering, the Details
 * tab content, and which fields count toward completeness. Both types convert
 * to `closed-won` = customer.
 */
export type LeadType = 'person' | 'company';

export interface Deal {
  id: string;
  /** Display name of the lead. For person leads, this mirrors the person's name;
   * for company leads, this is the engagement / role title. */
  name: string;
  /** Which kind of lead this is. Drives header, Details-tab content, and
   *  completeness calculation. */
  type: LeadType;
  /** Person-first: required. Company-first: optional primary contact. */
  personContactId?: string;
  /** Person-first: optional current employer (can be absent for between-jobs candidates).
   *  Company-first: required. */
  orgContactId?: string;
  stage: DealStage;
  amount: number;
  probability: number;
  expectedCloseDate: string;
  source: DealSource;
  priority: DealPriority;
  lastCommunication?: LastCommunication;
  owner: string;
  notes?: string;
  /** Short description of the hiring need or project (primarily for company leads). */
  initiative?: string;
  /** Target start date for the placement / engagement kickoff. */
  targetStartDate?: string;
  createdAt: string;
  lastUpdated: string;
  closedAt?: string;
  lostReason?: string;
}
