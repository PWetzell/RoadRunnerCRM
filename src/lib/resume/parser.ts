/**
 * Resume parser — extracts structured fields from PDF/DOCX resumes.
 *
 * Runs server-side (inside a Next.js route handler) so the binary parsing
 * libraries (pdf-parse, mammoth) don't bloat the client bundle. Returns a
 * `ParsedResume` that the UI can use to prefill a new-candidate form.
 *
 * Intentionally conservative: every extracted field is a best-effort guess
 * with a confidence score. The UI should always let the user review and
 * edit before saving.
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedResume {
  rawText: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;           // e.g. "Senior Backend Engineer"
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  skills: string[];
  employmentHistory: EmploymentEntry[];
  educationHistory: EducationEntry[];
  confidence: {
    name: number;
    email: number;
    phone: number;
    skills: number;
    employment: number;
  };
}

export interface EmploymentEntry {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  field?: string;
  endDate?: string;
}

// ─── Extraction helpers ──────────────────────────────────────────────────

/** A common tech/HR skill vocabulary. Matches tokens case-insensitively against resume text. */
const SKILL_VOCAB = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Swift', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Scala', 'R', 'MATLAB', 'SQL', 'Bash', 'Shell', 'Perl',
  // Frontend
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Remix', 'Redux', 'MobX', 'Zustand', 'Tailwind', 'CSS', 'SCSS', 'HTML', 'JSX', 'TSX',
  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Rails', 'Laravel', '.NET', 'GraphQL', 'REST', 'gRPC',
  // Data
  'Postgres', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Snowflake', 'BigQuery', 'Kafka', 'Airflow', 'Spark', 'Hadoop', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch',
  // Cloud / DevOps
  'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI',
  // Mobile
  'iOS', 'Android', 'React Native', 'Flutter', 'SwiftUI',
  // Business / HR
  'Salesforce', 'HubSpot', 'Workday', 'SAP', 'Oracle', 'Jira', 'Confluence', 'Asana', 'Slack',
  // Soft skills signals
  'Leadership', 'Mentoring', 'Agile', 'Scrum', 'Kanban',
];

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_RE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i;
const URL_RE = /https?:\/\/[^\s)]+/i;

function extractEmail(text: string): string | undefined {
  return text.match(EMAIL_RE)?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(PHONE_RE);
  return m ? m[0].trim() : undefined;
}

function extractUrls(text: string): { linkedin?: string; github?: string; website?: string } {
  const linkedin = text.match(LINKEDIN_RE)?.[0];
  const github = text.match(GITHUB_RE)?.[0];
  // First URL that isn't LinkedIn or GitHub
  const firstUrl = text.match(URL_RE)?.[0];
  const website = firstUrl && firstUrl !== linkedin && firstUrl !== github ? firstUrl : undefined;
  return { linkedin, github, website };
}

/**
 * Guess the candidate's name from the first few lines.
 * Most resumes put the name at the very top as 2–4 capitalized words.
 */
function extractName(text: string): { firstName?: string; lastName?: string; confidence: number } {
  const firstLines = text.split('\n').slice(0, 5).map((l) => l.trim()).filter(Boolean);
  for (const line of firstLines) {
    // Reject lines with emails, phones, URLs (not a name)
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    // Look for 2–4 words, each starting with a capital letter
    const m = line.match(/^([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,3})\s*$/);
    if (m) {
      const parts = m[1].split(/\s+/);
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
        confidence: 85,
      };
    }
  }
  return { confidence: 0 };
}

/**
 * Guess the candidate's current headline / job title from the first page.
 * Looks at lines 2–6 of the resume for a line that looks like a title
 * (e.g. "Senior Backend Engineer" — capitalized, no @/phone/URL).
 */
function extractHeadline(text: string, name?: { firstName?: string; lastName?: string }): string | undefined {
  const firstLines = text.split('\n').slice(0, 10).map((l) => l.trim()).filter(Boolean);
  for (const line of firstLines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    if (name?.firstName && line.includes(name.firstName)) continue;
    // Title-ish: 2–8 words, mostly capitalized, under 80 chars
    if (line.length > 80 || line.length < 10) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 10) continue;
    const capitalWordsRatio = words.filter((w) => /^[A-Z]/.test(w)).length / words.length;
    if (capitalWordsRatio >= 0.5) return line;
  }
  return undefined;
}

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  const lowerText = text.toLowerCase();
  for (const skill of SKILL_VOCAB) {
    // Word-boundary match, case-insensitive
    const re = new RegExp(`\\b${skill.replace(/[.+*()]/g, '\\$&')}\\b`, 'i');
    if (re.test(lowerText)) found.add(skill);
  }
  return Array.from(found);
}

/**
 * Very loose employment parse: look for lines that match "Title at Company"
 * or "Title, Company" or lines followed by company names. This is a first
 * pass — a full NER would need an LLM. The output is intentionally sparse
 * and the UI treats it as a suggestion.
 */
function extractEmployment(text: string): EmploymentEntry[] {
  const entries: EmploymentEntry[] = [];
  const lines = text.split('\n').map((l) => l.trim());

  // Heuristic: find "Experience" / "Employment" / "Work History" section,
  // then collect lines that look like title/company pairs.
  const startIdx = lines.findIndex((l) => /^(experience|employment|work\s+history|professional\s+experience)\s*$/i.test(l));
  if (startIdx < 0) return entries;

  const sectionEndIdx = lines.findIndex((l, i) =>
    i > startIdx && /^(education|skills|projects|certifications|publications|references)\s*$/i.test(l),
  );
  const section = lines.slice(startIdx + 1, sectionEndIdx > 0 ? sectionEndIdx : undefined);

  // Iterate in pairs — title line, then company line, then optional dates
  for (let i = 0; i < section.length; i++) {
    const line = section[i];
    if (!line) continue;
    // Date range on the same line? e.g. "Senior Engineer · Acme Corp · Jan 2020 – Present"
    const sep = line.match(/^(.+?)\s+[·|\-—@]\s+(.+?)(?:\s+[·|\-—]\s+(.+))?$/);
    if (sep) {
      const [, title, company, dates] = sep;
      let startDate: string | undefined, endDate: string | undefined;
      if (dates) {
        const dm = dates.match(/(\w+\s+\d{4}|\d{4})\s*[–\-—to]+\s*(\w+\s+\d{4}|\d{4}|Present|Current)/i);
        if (dm) { startDate = dm[1]; endDate = dm[2]; }
      }
      entries.push({ title: title.trim(), company: company.trim(), startDate, endDate });
    }
    if (entries.length >= 8) break;
  }

  return entries;
}

function extractEducation(text: string): EducationEntry[] {
  const entries: EducationEntry[] = [];
  const lines = text.split('\n').map((l) => l.trim());
  const startIdx = lines.findIndex((l) => /^education\s*$/i.test(l));
  if (startIdx < 0) return entries;
  const sectionEndIdx = lines.findIndex((l, i) =>
    i > startIdx && /^(experience|employment|skills|projects|certifications)\s*$/i.test(l),
  );
  const section = lines.slice(startIdx + 1, sectionEndIdx > 0 ? sectionEndIdx : startIdx + 10);

  for (const line of section) {
    if (!line) continue;
    // Look for "Institution Name — Degree, Field, Year"
    const sep = line.match(/^(.+?)\s+[·|\-—@]\s+(.+?)(?:,\s*(.+?))?(?:,\s*(\d{4}))?$/);
    if (sep) {
      const [, institution, degree, field, endDate] = sep;
      entries.push({ institution, degree, field, endDate });
    } else if (/university|college|institute/i.test(line)) {
      entries.push({ institution: line });
    }
    if (entries.length >= 4) break;
  }

  return entries;
}

function extractLocation(text: string): string | undefined {
  // Look for "City, ST" or "City, Country" in the first 10 lines
  const firstLines = text.split('\n').slice(0, 10).map((l) => l.trim()).filter(Boolean);
  for (const line of firstLines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    const m = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)/);
    if (m) return m[0];
  }
  return undefined;
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2 exports a `PDFParse` class; load → getText returns { text, ... }
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    // v2 shape: { pages: [{ text }], text } — fall back across variants
    return (result as unknown as { text?: string }).text
      || ((result as unknown as { pages?: { text: string }[] }).pages || []).map((p) => p.text).join('\n')
      || '';
  } finally {
    // Release pdf.js worker resources
    try { await parser.destroy(); } catch { /* noop */ }
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

export async function parseResume(buffer: Buffer, mimeType: string, filename?: string): Promise<ParsedResume> {
  const isPdf = mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf');
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename?.toLowerCase().endsWith('.docx');

  let text = '';
  if (isPdf) text = await extractTextFromPdf(buffer);
  else if (isDocx) text = await extractTextFromDocx(buffer);
  else throw new Error('Unsupported file type — please upload a PDF or DOCX resume');

  if (!text.trim()) throw new Error('Could not extract any text from the file (scanned PDF?)');

  const name = extractName(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const urls = extractUrls(text);
  const skills = extractSkills(text);
  const employment = extractEmployment(text);
  const education = extractEducation(text);
  const location = extractLocation(text);
  const headline = extractHeadline(text, name);

  return {
    rawText: text,
    firstName: name.firstName,
    lastName: name.lastName,
    email,
    phone,
    location,
    headline,
    linkedinUrl: urls.linkedin,
    githubUrl: urls.github,
    websiteUrl: urls.website,
    skills,
    employmentHistory: employment,
    educationHistory: education,
    confidence: {
      name: name.confidence,
      email: email ? 98 : 0,
      phone: phone ? 92 : 0,
      skills: Math.min(95, 50 + skills.length * 5),
      employment: employment.length > 0 ? 65 : 0,
    },
  };
}
