/**
 * Format validation for government-issued identifier numbers.
 *
 * This module validates that an identifier *looks* like a well-formed
 * number of the chosen type. It does NOT verify that the number actually
 * belongs to a real person or entity — that requires paid registry
 * access (SSA eCBSV, AAMVA, IRS TIN Matching), which is deliberately
 * out of scope for this demo.
 *
 * Patterns are sourced from each authority's public documentation and
 * from the commonly-referenced AAMVA driver-license regex set.
 */

/** US states + territories used for state-scoped identifiers. */
export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

/** Identifier types that need a state picker to validate correctly. */
export const STATE_SCOPED_TYPES = new Set<string>([
  "Driver's License",
  'State ID Only',
  'State Business ID',
  'State Organization ID',
  'State Vendor ID',
  'Birth Certificate',
]);

export function isStateScoped(type: string): boolean {
  return STATE_SCOPED_TYPES.has(type);
}

/**
 * AAMVA-published driver's license formats, per state.
 * Values normalize to uppercase + stripped whitespace before matching.
 */
const DL_PATTERNS: Record<string, { regex: RegExp; hint: string }> = {
  AL: { regex: /^[0-9]{1,8}$/, hint: 'up to 8 digits' },
  AK: { regex: /^[0-9]{1,7}$/, hint: 'up to 7 digits' },
  AZ: { regex: /^([A-Z][0-9]{1,8}|[0-9]{9})$/, hint: '1 letter + 1-8 digits, or 9 digits' },
  AR: { regex: /^[0-9]{4,9}$/, hint: '4-9 digits' },
  CA: { regex: /^[A-Z][0-9]{7}$/, hint: '1 letter + 7 digits' },
  CO: { regex: /^([0-9]{9}|[A-Z][0-9]{3,6}|[A-Z]{2}[0-9]{2,5})$/, hint: '9 digits, or 1 letter + 3-6 digits, or 2 letters + 2-5 digits' },
  CT: { regex: /^[0-9]{9}$/, hint: '9 digits' },
  DE: { regex: /^[0-9]{1,7}$/, hint: 'up to 7 digits' },
  DC: { regex: /^[0-9]{7,9}$/, hint: '7-9 digits' },
  FL: { regex: /^[A-Z][0-9]{12}$/, hint: '1 letter + 12 digits' },
  GA: { regex: /^[0-9]{7,9}$/, hint: '7-9 digits' },
  HI: { regex: /^([0-9]{9}|H[0-9]{8})$/, hint: '9 digits or H + 8 digits' },
  ID: { regex: /^([A-Z]{2}[0-9]{6}[A-Z]|[0-9]{9})$/, hint: '2 letters + 6 digits + 1 letter, or 9 digits' },
  IL: { regex: /^[A-Z][0-9]{11,12}$/, hint: '1 letter + 11-12 digits' },
  IN: { regex: /^([A-Z][0-9]{9}|[0-9]{9,10})$/, hint: '1 letter + 9 digits, or 9-10 digits' },
  IA: { regex: /^([0-9]{9}|[0-9]{3}[A-Z]{2}[0-9]{4})$/, hint: '9 digits, or 3 digits + 2 letters + 4 digits' },
  KS: { regex: /^([A-Z][0-9][A-Z][0-9][A-Z]|[A-Z][0-9]{8})$/, hint: 'alternating letters/digits, or 1 letter + 8 digits' },
  KY: { regex: /^([A-Z][0-9]{8,9}|[0-9]{9})$/, hint: '1 letter + 8-9 digits, or 9 digits' },
  LA: { regex: /^[0-9]{1,9}$/, hint: 'up to 9 digits' },
  ME: { regex: /^([0-9]{7,8}|[0-9]{7}X)$/, hint: '7-8 digits, or 7 digits + X' },
  MD: { regex: /^[A-Z][0-9]{12}$/, hint: '1 letter + 12 digits' },
  MA: { regex: /^([A-Z][0-9]{8}|[0-9]{9})$/, hint: '1 letter + 8 digits, or 9 digits' },
  MI: { regex: /^[A-Z][0-9]{12}$/, hint: '1 letter + 12 digits' },
  MN: { regex: /^[A-Z][0-9]{12}$/, hint: '1 letter + 12 digits' },
  MS: { regex: /^[0-9]{9}$/, hint: '9 digits' },
  MO: { regex: /^([A-Z][0-9]{5,9}|[A-Z][0-9]{6}R|[0-9]{8}[A-Z]{2}|[0-9]{9}[A-Z]|[0-9]{9})$/, hint: '1 letter + 5-9 digits, or variants' },
  MT: { regex: /^([A-Z][0-9]{8}|[0-9]{9,14})$/, hint: '1 letter + 8 digits, or 9-14 digits' },
  NE: { regex: /^[A-Z][0-9]{6,8}$/, hint: '1 letter + 6-8 digits' },
  NV: { regex: /^([0-9]{9,10}|[0-9]{12}|X[0-9]{8})$/, hint: '9-10 or 12 digits, or X + 8 digits' },
  NH: { regex: /^[0-9]{2}[A-Z]{3}[0-9]{5}$/, hint: '2 digits + 3 letters + 5 digits' },
  NJ: { regex: /^[A-Z][0-9]{14}$/, hint: '1 letter + 14 digits' },
  NM: { regex: /^[0-9]{8,9}$/, hint: '8-9 digits' },
  NY: { regex: /^([A-Z][0-9]{7}|[A-Z][0-9]{18}|[0-9]{8,9}|[0-9]{16}|[A-Z]{8})$/, hint: '1 letter + 7 digits, or 9 digits, or 16 digits (EDL)' },
  NC: { regex: /^[0-9]{1,12}$/, hint: 'up to 12 digits' },
  ND: { regex: /^([A-Z]{3}[0-9]{6}|[0-9]{9})$/, hint: '3 letters + 6 digits, or 9 digits' },
  OH: { regex: /^([A-Z][0-9]{4,8}|[A-Z]{2}[0-9]{3,7}|[0-9]{8})$/, hint: '1-2 letters + digits, or 8 digits' },
  OK: { regex: /^([A-Z][0-9]{9}|[0-9]{9})$/, hint: '1 letter + 9 digits, or 9 digits' },
  OR: { regex: /^[0-9]{1,9}$/, hint: 'up to 9 digits' },
  PA: { regex: /^[0-9]{8}$/, hint: '8 digits' },
  RI: { regex: /^([0-9]{7}|[A-Z][0-9]{6})$/, hint: '7 digits, or 1 letter + 6 digits' },
  SC: { regex: /^[0-9]{5,11}$/, hint: '5-11 digits' },
  SD: { regex: /^([0-9]{6,10}|[0-9]{12})$/, hint: '6-10 or 12 digits' },
  TN: { regex: /^[0-9]{7,9}$/, hint: '7-9 digits' },
  TX: { regex: /^[0-9]{7,8}$/, hint: '7-8 digits' },
  UT: { regex: /^[0-9]{4,10}$/, hint: '4-10 digits' },
  VT: { regex: /^([0-9]{8}|[0-9]{7}A)$/, hint: '8 digits, or 7 digits + A' },
  VA: { regex: /^([A-Z][0-9]{8,11}|[0-9]{9})$/, hint: '1 letter + 8-11 digits, or 9 digits' },
  WA: { regex: /^[A-Z0-9*]{12}$/, hint: '12 characters (letters, digits, or *)' },
  WV: { regex: /^([0-9]{7}|[A-Z]{1,2}[0-9]{5,6})$/, hint: '7 digits, or 1-2 letters + 5-6 digits' },
  WI: { regex: /^[A-Z][0-9]{13}$/, hint: '1 letter + 13 digits' },
  WY: { regex: /^[0-9]{9,10}$/, hint: '9-10 digits' },
};

/** SSN: 9 digits, invalid area codes 000/666/9xx, group 00, serial 0000. */
function validateSSN(raw: string): string | null {
  const v = raw.replace(/\s|-/g, '');
  if (!/^\d{9}$/.test(v)) return 'SSN must be 9 digits (e.g., 123-45-6789)';
  const area = v.slice(0, 3), group = v.slice(3, 5), serial = v.slice(5);
  if (area === '000' || area === '666' || area.startsWith('9')) return 'SSN area (first 3 digits) cannot be 000, 666, or 9xx';
  if (group === '00') return 'SSN group (middle 2 digits) cannot be 00';
  if (serial === '0000') return 'SSN serial (last 4 digits) cannot be 0000';
  return null;
}

/** EIN: 9 digits, IRS-assigned prefix in a published set. */
const EIN_VALID_PREFIXES = new Set([
  '01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '14', '15', '16',
  '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34',
  '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47',
  '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61',
  '62', '63', '64', '65', '66', '67', '68', '71', '72', '73', '74', '75', '76',
  '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92',
  '93', '94', '95', '98', '99',
]);
function validateEIN(raw: string): string | null {
  const v = raw.replace(/\s|-/g, '');
  if (!/^\d{9}$/.test(v)) return 'EIN must be 9 digits (e.g., 12-3456789)';
  if (!EIN_VALID_PREFIXES.has(v.slice(0, 2))) return `EIN prefix ${v.slice(0, 2)} is not an IRS-assigned campus code`;
  return null;
}

/** US Passport: 1 letter + 8 digits (current format). */
function validatePassport(raw: string): string | null {
  const v = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z][0-9]{8}$/.test(v)) return 'US passport is 1 letter + 8 digits (e.g., A12345678)';
  return null;
}

/** DUNS / Federal Vendor ID / D&B: 9 digits. */
function validate9Digits(label: string): (raw: string) => string | null {
  return (raw: string) => {
    const v = raw.replace(/\s|-/g, '');
    if (!/^\d{9}$/.test(v)) return `${label} must be exactly 9 digits`;
    return null;
  };
}

/** SSN Last 4: 4 digits, cannot be 0000. */
function validateSSNLast4(raw: string): string | null {
  const v = raw.replace(/\s/g, '');
  if (!/^\d{4}$/.test(v)) return 'Last 4 must be exactly 4 digits';
  if (v === '0000') return 'Last 4 cannot be 0000';
  return null;
}

/** TIN: accepts SSN or EIN format. */
function validateTIN(raw: string): string | null {
  const ssnErr = validateSSN(raw);
  if (!ssnErr) return null;
  const einErr = validateEIN(raw);
  if (!einErr) return null;
  return 'TIN must match SSN (123-45-6789) or EIN (12-3456789) format';
}

/** Birthday: YYYY-MM-DD, real calendar date, not in the future. */
function validateBirthday(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'Use YYYY-MM-DD (e.g., 1985-07-23)';
  const d = new Date(raw + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return 'Not a valid calendar date';
  if (d.getTime() > Date.now()) return 'Date cannot be in the future';
  return null;
}

/**
 * Validate a driver's license against the selected state's published
 * pattern. State must be passed — DL format is meaningless without it.
 */
function validateDL(raw: string, state: string | undefined): string | null {
  if (!state) return 'Select a state — driver\'s license format is state-specific';
  const pattern = DL_PATTERNS[state];
  if (!pattern) return `No DL pattern on file for ${state}`;
  const v = raw.replace(/\s|-/g, '').toUpperCase();
  if (!pattern.regex.test(v)) return `${state} driver's license format: ${pattern.hint}`;
  return null;
}

/**
 * Validate a state-scoped alphanumeric identifier when we don't have
 * a narrow pattern on file — accept 4-20 alphanumerics and require
 * the state field so the record stays meaningful.
 */
function validateGenericStateId(label: string): (raw: string, state: string | undefined) => string | null {
  return (raw, state) => {
    if (!state) return `Select a state — ${label} is state-specific`;
    const v = raw.replace(/\s|-/g, '');
    if (!/^[A-Za-z0-9]{4,20}$/.test(v)) return `${label} should be 4-20 letters or digits`;
    return null;
  };
}

type Validator = (value: string, state?: string) => string | null;

const VALIDATORS: Record<string, Validator> = {
  // Org — no state
  'Social Security Number (SSN)': validateSSN,
  'Federal Tax ID (EIN)': validateEIN,
  'Federal Vendor ID (DUNS)': validate9Digits('DUNS'),
  'Dun & Bradstreet Number (D&B)': validate9Digits('D&B Number'),
  'Taxpayer Identification Number (TIN)': validateTIN,

  // Org — state-scoped
  'State Business ID': validateGenericStateId('State Business ID'),
  'State Organization ID': validateGenericStateId('State Organization ID'),
  'State Vendor ID': validateGenericStateId('State Vendor ID'),

  // Person — no state
  'Social Security Number': validateSSN,
  'Social Security Number (Last 4 Digits)': validateSSNLast4,
  Passport: validatePassport,
  Birthday: validateBirthday,

  // Person — state-scoped
  "Driver's License": validateDL,
  'State ID Only': validateDL,
  'Birth Certificate': validateGenericStateId('Birth Certificate number'),
};

/**
 * Main entry point. Returns a human-readable error string when the
 * value doesn't look right for the chosen type, or null when it does.
 * Types without a specific validator (Membership ID, Legacy, Union, …)
 * fall through to null — they're accepted as entered.
 */
export function validateIdentifier(type: string, value: string, state?: string): string | null {
  if (!value.trim()) return null; // the required-check is a separate concern
  const fn = VALIDATORS[type];
  if (!fn) return null;
  return fn(value, state);
}

/**
 * Label for the number/value input, chosen per identifier type.
 * Using "ID Number" for everything is misleading — a birth certificate
 * has a *certificate number*, a driver's license has a *license number*,
 * and a birthday isn't a number at all (it's a date of birth).
 */
export function numberFieldLabel(type: string): string {
  switch (type) {
    case 'Birthday': return 'Date of Birth';
    case "Driver's License": return 'License Number';
    case 'State ID Only': return 'State ID Number';
    case 'Passport': return 'Passport Number';
    case 'Birth Certificate': return 'Certificate Number';
    case 'Military': return 'DoD ID Number';
    case 'Federal Security': return 'Clearance Number';
    case 'Security Access': return 'Badge Number';
    case 'Public Assistance': return 'Case Number';
    case 'Residence': return 'Residence Card Number';
    case 'Membership':
    case 'Membership ID': return 'Member Number';
    case 'Union': return 'Union Member Number';
    case 'Student — High School':
    case 'Student — College': return 'Student ID';
    case 'Organization':
    case 'Organization ID': return 'Organization Number';
    case 'Legacy': return 'Reference';
    case 'Social Security Number':
    case 'Social Security Number (SSN)': return 'SSN';
    case 'Social Security Number (Last 4 Digits)': return 'Last 4 Digits';
    case 'Federal Tax ID (EIN)': return 'EIN';
    case 'Taxpayer Identification Number (TIN)': return 'TIN';
    case 'Federal Vendor ID (DUNS)': return 'DUNS Number';
    case 'Dun & Bradstreet Number (D&B)': return 'DUNS Number';
    case 'State Business ID':
    case 'State Organization ID': return 'Registration Number';
    case 'State Vendor ID': return 'Vendor Number';
    default: return 'ID Number';
  }
}

/** Types that take a calendar date, not a number. */
export function isDateType(type: string): boolean {
  return type === 'Birthday';
}

/** Placeholder hint used in the value input for the selected type. */
export function placeholderForType(type: string, state?: string): string {
  switch (type) {
    case 'Social Security Number (SSN)':
    case 'Social Security Number':
      return '123-45-6789';
    case 'Social Security Number (Last 4 Digits)':
      return '6789';
    case 'Federal Tax ID (EIN)':
    case 'Taxpayer Identification Number (TIN)':
      return '12-3456789';
    case 'Federal Vendor ID (DUNS)':
    case 'Dun & Bradstreet Number (D&B)':
      return '123456789';
    case 'Passport':
      return 'A12345678';
    case 'Birthday':
      return 'YYYY-MM-DD';
    case "Driver's License":
    case 'State ID Only':
      if (state && DL_PATTERNS[state]) return DL_PATTERNS[state].hint;
      return 'Select a state first';
    default:
      return 'Enter identifier';
  }
}
