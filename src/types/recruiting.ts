/**
 * Recruiting pipeline types. In a full ATS this would be its own module;
 * for the CRM demo we surface recruiting data as a dashboard view that
 * pulls from the existing Contacts + Sales (Deals) stores.
 *
 * The recruiting pipeline reinterprets deals as "placements" and contacts
 * as "candidates." This layer doesn't duplicate data — it projects it
 * through a recruiting lens.
 */

export type RecruitingStage =
  | 'sourced'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'placed'
  | 'rejected';

export const RECRUITING_STAGES: { id: RecruitingStage; label: string; color: string; bg: string; darkColor: string; darkBg: string }[] = [
  { id: 'sourced',    label: 'Sourced',    color: '#1E293B', bg: '#E2E8F0', darkColor: '#CBD5E1', darkBg: '#1E293B' },
  { id: 'screening',  label: 'Screening',  color: '#0B2F5C', bg: '#DBEAFE', darkColor: '#93C5FD', darkBg: '#172554' },
  { id: 'interview',  label: 'Interview',  color: '#5B21B6', bg: '#EDE9FE', darkColor: '#C4B5FD', darkBg: '#2E1065' },
  { id: 'offer',      label: 'Offer',      color: '#0E7490', bg: '#CFFAFE', darkColor: '#67E8F9', darkBg: '#164E63' },
  { id: 'placed',     label: 'Placed',     color: '#065F46', bg: '#D1FAE5', darkColor: '#6EE7B7', darkBg: '#064E3B' },
  { id: 'rejected',   label: 'Rejected',   color: '#991B1B', bg: '#FEE2E2', darkColor: '#FCA5A5', darkBg: '#450A0A' },
];

/**
 * Maps a Deal stage to a recruiting stage for the recruiting dashboard
 * projection. This lets us reuse the existing sales pipeline data
 * without duplicating it.
 */
export function dealStageToRecruitingStage(dealStage: string): RecruitingStage {
  switch (dealStage) {
    case 'lead':
    case 'qualified':
      return 'sourced';
    case 'discovery':
      return 'screening';
    case 'proposal':
      return 'interview';
    case 'negotiation':
      return 'offer';
    case 'closed-won':
      return 'placed';
    case 'closed-lost':
      return 'rejected';
    default:
      return 'sourced';
  }
}

/** Candidate card data — projected from Contact + Deal data. */
export interface CandidateCard {
  id: string;
  name: string;
  title?: string;
  company?: string;
  avatarColor?: string;
  stage: RecruitingStage;
  dealId?: string;
  dealName?: string;
  dealAmount: number;
  lastActivity?: string;
  source?: string;
  personContactId?: string;
  matchScore?: number;
  lastCommType?: string;
  expectedCloseDate?: string;
  priority?: string;
}
