import { CrmDocument } from '@/types/document';

/**
 * Bulk document seed — represents the document footprint of a mature boutique
 * search-agency book of business as of 2026-04-22. Every client org has an
 * MSA on file. Every active candidate has a resume. Placed candidates have a
 * full lifecycle packet (offer letter, signed placement contract, I-9, 90-day
 * guarantee). Healthcare + legal candidates with credentials have license
 * PDFs. Active searches have slates, JDs, and interview feedback.
 *
 * IDs follow `bdoc-<n>` to avoid collision with the hand-crafted doc-1..doc-12
 * in seed-documents.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// RESUMES — one per candidate (per-33..per-112)
// ─────────────────────────────────────────────────────────────────────────

interface ResumeSeed {
  id: string;           // contactId
  name: string;
  title: string;
  city: string;
  state: string;
  email: string;
  phoneArea: string;
  skills: string[];
  employer: string;
  credentials?: string;
  summary: string;
  experience: { role: string; company: string; dates: string; bullets: string[] }[];
  education?: string;
  uploadedDaysAgo: number;
}

const RESUME_SEEDS: ResumeSeed[] = [
  // ── Tech / AI Engineering ──
  {
    id: 'per-33', name: 'Ethan Park', title: 'Staff Machine Learning Engineer', city: 'Palo Alto', state: 'CA',
    email: 'ethan.park@gmail.com', phoneArea: '650',
    skills: ['PyTorch', 'Transformers', 'CUDA', 'Distributed Training', 'Python', 'RLHF'],
    employer: 'Meta AI',
    summary: 'Staff ML engineer with 9 years building and scaling large-model training infrastructure. Led RLHF pipeline for Meta\'s Llama post-training stack. Comfortable owning systems from single-node prototyping through multi-thousand-GPU production runs.',
    experience: [
      { role: 'Staff ML Engineer — Llama Post-Training', company: 'Meta AI', dates: 'Mar 2022 — Present',
        bullets: ['Led 11-person team building RLHF pipeline used across Llama 3 and 4 releases', 'Cut 70B-parameter fine-tune cost 43% by redesigning reward-model serving on ROCm', 'Shipped DPO-based preference-learning variant that replaced PPO for most internal fine-tunes'] },
      { role: 'Senior ML Engineer', company: 'OpenAI (contract)', dates: 'Jun 2020 — Feb 2022',
        bullets: ['Contributed to GPT-3.5 data-mixing and curriculum design', 'Authored internal tools for distillation of 175B → 7B student models'] },
      { role: 'Research Engineer', company: 'DeepMind', dates: 'Aug 2016 — May 2020',
        bullets: ['Published 3 NeurIPS papers on meta-learning', 'Core contributor to JAX-based AlphaFold training harness'] },
    ],
    education: 'M.S. Computer Science — Stanford University, 2016 | B.S. Math & CS — UC Berkeley, 2014',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-34', name: 'Ravi Narayan', title: 'Senior Research Scientist — NLP', city: 'Cambridge', state: 'MA',
    email: 'ravi.narayan@gmail.com', phoneArea: '617',
    skills: ['NLP', 'LLMs', 'JAX', 'PyTorch', 'Published ACL/NeurIPS'],
    employer: 'Google DeepMind', credentials: 'PhD',
    summary: 'Research scientist with deep expertise in large language models and multilingual NLP. 14 peer-reviewed publications (7 at NeurIPS/ACL/ICLR). Currently leading a five-person research team at DeepMind\'s Cambridge office.',
    experience: [
      { role: 'Senior Research Scientist', company: 'Google DeepMind', dates: 'Sep 2021 — Present',
        bullets: ['Technical lead for multilingual Gemini data-preprocessing workstream', 'Co-authored 2024 Gemini 1.5 tech report (author #14 of 200+)', 'Mentor for 3 PhD interns annually'] },
      { role: 'Research Scientist', company: 'Microsoft Research Montreal', dates: 'Jul 2018 — Aug 2021',
        bullets: ['Published ACL 2020 best-paper runner-up on low-resource MT', 'Built internal benchmark for cross-lingual transfer (900+ languages)'] },
    ],
    education: 'PhD Computational Linguistics — University of Edinburgh, 2018 | B.Tech CSE — IIT Bombay, 2013',
    uploadedDaysAgo: 8,
  },
  {
    id: 'per-35', name: 'Sofia Restrepo', title: 'Principal Platform Engineer', city: 'Seattle', state: 'WA',
    email: 'sofia.restrepo@gmail.com', phoneArea: '206',
    skills: ['Kubernetes', 'Rust', 'Go', 'eBPF', 'Service Mesh', 'AWS'],
    employer: 'Amazon Web Services',
    summary: 'Principal platform engineer with 13 years building distributed infrastructure at hyperscale. Currently owns the multi-tenant control plane for AWS Lambda (~18B monthly invocations). Deep background in Rust, eBPF, and service-mesh internals.',
    experience: [
      { role: 'Principal Engineer — AWS Lambda Control Plane', company: 'Amazon Web Services', dates: 'Jan 2020 — Present',
        bullets: ['Drove Firecracker-based cold-start reduction program (P99 from 1.2s → 180ms)', 'Owned service-reliability goals across 17-team org; led Sev-1 rewrites for regional isolation', 'Author of internal "Rust at Amazon" style guide; coach 40+ engineers on Rust adoption'] },
      { role: 'Senior SDE', company: 'Amazon EC2', dates: 'Mar 2014 — Dec 2019',
        bullets: ['Shipped EC2 Nitro enclaves control-plane integration', 'Promoted to Principal on strength of cross-service fleet-management redesign'] },
    ],
    education: 'B.S. Computer Engineering — Universidad de los Andes, 2012',
    uploadedDaysAgo: 1,
  },
  {
    id: 'per-36', name: 'Nikolai Petrov', title: 'Senior SRE — Payments Infrastructure', city: 'Austin', state: 'TX',
    email: 'nikolai.petrov@gmail.com', phoneArea: '512',
    skills: ['Kubernetes', 'Terraform', 'Go', 'Observability', 'Incident Response'],
    employer: 'PayPal',
    summary: 'Senior SRE with 8 years operating high-throughput payment systems at PayPal and Square. Currently accountable for the Kubernetes fleet running PayPal\'s authorization path (6M TPS peak). Strong incident-command track record across 40+ Sev-1s.',
    experience: [
      { role: 'Senior SRE — Payments Core', company: 'PayPal', dates: 'Apr 2021 — Present',
        bullets: ['Reduced MTTR from 42m to 11m through runbook + tooling overhaul', 'Owned K8s upgrade program across 2,400-node production fleet', 'Author of PayPal\'s internal SLO framework (adopted by 60+ services)'] },
      { role: 'SRE II', company: 'Square (Block)', dates: 'Jun 2018 — Mar 2021',
        bullets: ['Built observability pipeline ingesting 2M events/sec into Honeycomb', 'On-call rotation lead for Cash App authorization infrastructure'] },
    ],
    education: 'B.S. Computer Science — University of Texas at Austin, 2017',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-37', name: 'Olivia Chen', title: 'Senior Full-Stack Engineer', city: 'Brooklyn', state: 'NY',
    email: 'olivia.chen@gmail.com', phoneArea: '718',
    skills: ['TypeScript', 'React', 'Next.js', 'PostgreSQL', 'GraphQL', 'AWS'],
    employer: '(Contract ending Apr 30)',
    summary: 'Senior full-stack engineer with 7 years shipping consumer and B2B product surfaces. Just wrapping a 14-month contract at Airbnb. Immediate availability, open to remote or NYC-based roles.',
    experience: [
      { role: 'Senior Full-Stack Engineer (Contract)', company: 'Airbnb', dates: 'Mar 2025 — Apr 2026',
        bullets: ['Rebuilt host-onboarding flow (Next.js + GraphQL); 22% completion lift', 'Shepherded migration of the host dashboard from Ember to React + shadcn/ui', 'Mentored 3 mid-level engineers through performance cycles'] },
      { role: 'Senior Engineer', company: 'Vercel', dates: 'Oct 2022 — Feb 2025',
        bullets: ['Core contributor to Next.js App Router migration tooling', 'Shipped first version of analytics dashboards in Vercel product UI'] },
      { role: 'Software Engineer', company: 'Datadog', dates: 'Jul 2019 — Sep 2022',
        bullets: ['Built React component library used across 12 product surfaces'] },
    ],
    education: 'B.S. Computer Science — NYU Tandon, 2019',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-38', name: 'Marcus Abernathy', title: 'Engineering Manager, Data Platform', city: 'Chicago', state: 'IL',
    email: 'marcus.abernathy@gmail.com', phoneArea: '773',
    skills: ['Leadership', 'Hiring', 'dbt', 'Airflow', 'Snowflake', 'Org Design'],
    employer: 'Groupon',
    summary: 'Engineering manager with 12 years of experience, last 5 leading data platform orgs. Built Groupon\'s current analytics platform team (from 4 to 19 engineers over 3 years). Looking for Director or Head of Data Platform next.',
    experience: [
      { role: 'Engineering Manager — Data Platform', company: 'Groupon', dates: 'Jan 2022 — Present',
        bullets: ['Grew team 4 → 19 (16 direct, 3 indirect via sr. ICs)', 'Delivered dbt + Airflow standardization replacing 400+ legacy Jenkins jobs', 'Owned $4.2M annual cloud spend; drove 38% cost reduction via Snowflake autosuspend tuning'] },
      { role: 'Senior Engineer / Tech Lead', company: 'Grubhub', dates: 'Aug 2017 — Dec 2021',
        bullets: ['Promoted to TL for analytics platform within 18 months', 'Shipped company-wide feature store (used by 40+ ML models)'] },
    ],
    education: 'M.S. Computer Science — University of Chicago, 2014',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-39', name: 'Yuki Tanaka', title: 'Staff iOS Engineer', city: 'San Francisco', state: 'CA',
    email: 'yuki.tanaka@gmail.com', phoneArea: '415',
    skills: ['Swift', 'SwiftUI', 'Combine', 'Core Data', 'App Performance'],
    employer: 'Apple',
    summary: 'Staff iOS engineer, 11 years at Apple. Currently on the Photos app performance team. Passive candidate — open to ex-Apple senior roles with meaningful scope and equity.',
    experience: [
      { role: 'Staff iOS Engineer — Photos Performance', company: 'Apple', dates: 'Sep 2020 — Present',
        bullets: ['Led memory-pressure reduction program (30% P99 reduction across iPhone 13+)', 'Shepherded SwiftUI adoption in Photos editing surface', 'ICPC for the cross-Apple performance working group'] },
      { role: 'Senior iOS Engineer', company: 'Apple — iMessage', dates: 'May 2014 — Aug 2020',
        bullets: ['Core contributor to iMessage reactions (shipped iOS 10) and Tapback (iOS 16)'] },
    ],
    education: 'M.S. HCI — Carnegie Mellon, 2013',
    uploadedDaysAgo: 12,
  },
  {
    id: 'per-40', name: 'Danielle Okonkwo', title: 'Senior Product Manager — AI Products', city: 'San Francisco', state: 'CA',
    email: 'danielle.okonkwo@gmail.com', phoneArea: '415',
    skills: ['Product Strategy', 'AI/ML Product', 'B2B SaaS', 'Roadmapping', 'PRDs'],
    employer: 'Notion',
    summary: 'Senior PM shipping AI features inside Notion for the last two years. Previously at Airtable and Palantir. Strong technical background (CS undergrad + 3 years SWE before pivoting to PM). Target: Principal PM or Group PM.',
    experience: [
      { role: 'Senior PM — Notion AI', company: 'Notion', dates: 'Jun 2023 — Present',
        bullets: ['Owns AI features product line (~$48M ARR attributed)', 'Shipped Q&A, Autofill, and Writing Assistant GA launches', 'Co-authored Notion\'s 2026 AI pricing model'] },
      { role: 'PM — Platform', company: 'Airtable', dates: 'Feb 2021 — May 2023',
        bullets: ['Shipped Airtable Interface Designer v1 (used by 250K+ bases)'] },
      { role: 'Forward Deployed Engineer → PM', company: 'Palantir', dates: 'Aug 2017 — Jan 2021',
        bullets: ['Transitioned from FDE to PM after 2 years; worked across 4 commercial accounts'] },
    ],
    education: 'B.S. Computer Science — Stanford, 2017',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-41', name: 'Tyler Kwiatkowski', title: 'Security Engineer — AppSec', city: 'Denver', state: 'CO',
    email: 'tyler.kwiatkowski@gmail.com', phoneArea: '303',
    skills: ['AppSec', 'Pen Testing', 'OWASP', 'Burp Suite', 'Python', 'Cloud Security'],
    employer: 'Cloudflare',
    summary: 'AppSec engineer with 6 years of offensive + defensive work. Currently on Cloudflare\'s product-security team, embedded with the Workers platform org. Looking for senior IC role at a smaller, higher-leverage security team.',
    experience: [
      { role: 'Security Engineer II', company: 'Cloudflare', dates: 'Oct 2022 — Present',
        bullets: ['Lead security reviewer for Workers platform (500+ PRs/year)', 'Authored internal threat-model framework adopted by 8 product teams', 'Presented at BSidesSF 2025 on serverless sandbox escape patterns'] },
      { role: 'AppSec Engineer', company: 'GitHub', dates: 'Jan 2020 — Sep 2022',
        bullets: ['Shipped secret-scanning push-protection feature (2022 GA)', 'Triage + remediation lead for 200+ bug-bounty reports'] },
    ],
    education: 'B.S. Computer Science — University of Colorado Boulder, 2019',
    uploadedDaysAgo: 6,
  },
  {
    id: 'per-42', name: 'Mei-Lin Huang', title: 'Senior Data Scientist', city: 'Mountain View', state: 'CA',
    email: 'mei-lin.huang@gmail.com', phoneArea: '650',
    skills: ['Python', 'SQL', 'Experimentation', 'Causal Inference', 'Bayesian Methods'],
    employer: 'Google',
    summary: 'Senior data scientist, 9 years at Google. Currently embedded with the Search Ads team. Passive candidate, but open to exploratory conversations at AI-first companies.',
    experience: [
      { role: 'Senior Data Scientist — Search Ads', company: 'Google', dates: 'Jan 2020 — Present',
        bullets: ['Lead DS for auction-side experimentation (~$140B revenue surface)', 'Author of Google\'s internal Bayesian-A/B framework documentation'] },
      { role: 'Data Scientist II', company: 'Google — YouTube', dates: 'Aug 2016 — Dec 2019',
        bullets: ['Owned recommendations evaluation infrastructure'] },
    ],
    education: 'PhD Statistics — Stanford, 2016',
    uploadedDaysAgo: 20,
  },
  {
    id: 'per-43', name: 'Kwame Adebayo', title: 'Head of Design', city: 'New York', state: 'NY',
    email: 'kwame.adebayo@gmail.com', phoneArea: '212',
    skills: ['Design Leadership', 'Design Systems', 'Hiring', 'Product Design', 'Figma'],
    employer: 'Stripe',
    summary: 'Head of Design at Stripe\'s New York office. 14 years in product design, last 7 in leadership. Manages 28 designers across product, brand, and design systems. Target: VP Design at a Series C+ tech company.',
    experience: [
      { role: 'Head of Design, NYC', company: 'Stripe', dates: 'Jul 2022 — Present',
        bullets: ['Manages 28 designers (5 direct managers + 23 ICs)', 'Shepherded rollout of the 2025 Stripe Dashboard redesign', 'Partnered with Engineering on the Atlas launch'] },
      { role: 'Director of Design', company: 'Dropbox', dates: 'Mar 2019 — Jun 2022',
        bullets: ['Scaled design team 11 → 24', 'Rebuilt Dropbox design system from scratch (2020 release)'] },
    ],
    education: 'B.F.A. Graphic Design — Rhode Island School of Design, 2011',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-44', name: 'Blake Ferrer', title: 'Senior Software Engineer — Backend', city: 'Remote', state: 'TX',
    email: 'blake.ferrer@gmail.com', phoneArea: '737',
    skills: ['Go', 'Postgres', 'Redis', 'gRPC', 'Microservices'],
    employer: '(Laid off Mar 2026)',
    summary: 'Senior backend engineer, 9 years of experience. Most recently at Brex — part of the March 2026 layoff wave. Immediate availability, fully remote. Strong Go, deep Postgres knowledge.',
    experience: [
      { role: 'Senior Backend Engineer', company: 'Brex', dates: 'Oct 2022 — Mar 2026',
        bullets: ['Built expense-policy engine (Go + Postgres + Temporal) handling 2.4M txn/month', 'Led migration from REST to gRPC across 7 internal services', 'Laid off Mar 2026 as part of 280-person RIF'] },
      { role: 'Software Engineer', company: 'Stripe', dates: 'Apr 2019 — Sep 2022',
        bullets: ['Worked on Stripe Radar fraud-detection rules engine'] },
    ],
    education: 'B.S. Computer Science — University of Texas at Austin, 2017',
    uploadedDaysAgo: 1,
  },
  {
    id: 'per-45', name: 'Heather Nolan', title: 'Engineering Director — Observability', city: 'Boston', state: 'MA',
    email: 'heather.nolan@gmail.com', phoneArea: '617',
    skills: ['Engineering Leadership', 'Distributed Systems', 'OpenTelemetry', 'Metrics/Logs/Traces'],
    employer: 'Honeycomb',
    summary: 'Engineering director at Honeycomb. Leads the 34-person observability-engineering org. Prior leadership at Splunk and New Relic. Looking for VP Engineering roles at a Series C–D infra company.',
    experience: [
      { role: 'Engineering Director', company: 'Honeycomb', dates: 'Feb 2022 — Present',
        bullets: ['Manages 34 engineers across query, ingest, and storage teams', 'Owns $8.5M annualized infra budget', 'Shipped 2025 column-store rewrite (p50 query latency -62%)'] },
      { role: 'Senior Engineering Manager', company: 'Splunk Observability Cloud', dates: 'Aug 2019 — Jan 2022',
        bullets: ['Joined as part of SignalFx acquisition', 'Managed 18-person distributed team'] },
    ],
    education: 'M.S. Computer Science — Boston University, 2011',
    uploadedDaysAgo: 3,
  },

  // ── Healthcare ──
  {
    id: 'per-46', name: 'Jasmine Carter', title: 'ICU Registered Nurse', city: 'Boston', state: 'MA',
    email: 'jasmine.carter@gmail.com', phoneArea: '617',
    skills: ['Critical Care', 'ACLS', 'BLS', 'CCRN', 'Vasoactive Drips'],
    employer: 'Tufts Medical Center', credentials: 'RN, BSN, CCRN',
    summary: 'Critical-care RN with 7 years of ICU experience across medical, surgical, and cardiac ICU settings. CCRN certified since 2022. Currently at Tufts MC — looking to transition to a Magnet hospital with structured preceptor tracks.',
    experience: [
      { role: 'Charge Nurse — Medical ICU', company: 'Tufts Medical Center', dates: 'Aug 2021 — Present',
        bullets: ['Charge coverage on 18-bed unit, 2-3 shifts/week', 'Preceptor for 4 new-graduate residents per cycle', 'Serves on unit-based council; led 2024 fall-prevention QI initiative'] },
      { role: 'Staff Nurse — Medical ICU', company: 'Boston Medical Center', dates: 'Jun 2019 — Jul 2021',
        bullets: ['3:1 patient ratio, vasoactive drip management, CRRT-certified'] },
    ],
    education: 'BSN — Boston College Connell School of Nursing, 2019',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-47', name: 'Dmitri Sokolov', title: 'Emergency Department RN', city: 'Cambridge', state: 'MA',
    email: 'dmitri.sokolov@gmail.com', phoneArea: '617',
    skills: ['Trauma', 'TNCC', 'Triage', 'Pediatric Emergencies'],
    employer: '(Travel contract ended)', credentials: 'RN, BSN, CEN',
    summary: 'Emergency RN, 6 years of ED experience including 18 months of travel-nurse assignments (Boston, Seattle, Albuquerque). Just finished a contract at Mass General — available immediately for a permanent position.',
    experience: [
      { role: 'Travel RN — Emergency Department', company: 'Aya Healthcare Assignments', dates: 'Oct 2024 — Mar 2026',
        bullets: ['13-week assignments at MGH Boston, Harborview Seattle, UNMH Albuquerque', 'Level I trauma experience across all three facilities'] },
      { role: 'Staff Nurse — Emergency Department', company: 'Beth Israel Deaconess', dates: 'May 2020 — Sep 2024',
        bullets: ['Core preceptor for new-graduate ED residency cohort'] },
    ],
    education: 'BSN — UMass Boston, 2020',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-48', name: 'Priya Venkatesh', title: 'Nurse Practitioner — Family Medicine', city: 'Newton', state: 'MA',
    email: 'priya.venkatesh@gmail.com', phoneArea: '617',
    skills: ['Primary Care', 'Chronic Disease', 'EMR (Epic)', 'Patient Education'],
    employer: 'Atrius Health', credentials: 'MSN, FNP-BC',
    summary: 'FNP with 8 years of primary-care experience. Panel of 1,200+ active patients. Fluent in English, Tamil, and conversational Spanish. Seeking a suburban Boston FQHC or similar mission-aligned practice.',
    experience: [
      { role: 'Family Nurse Practitioner', company: 'Atrius Health — Newton Clinic', dates: 'Sep 2018 — Present',
        bullets: ['Patient panel of 1,240 active patients', 'Clinical lead for diabetes population-health initiative', 'Preceptor for NP students from MGH Institute'] },
    ],
    education: 'MSN-FNP — Boston College, 2018 | BSN — Simmons, 2013',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-49', name: 'Brandon Tillman', title: 'Operating Room RN', city: 'Providence', state: 'RI',
    email: 'brandon.tillman@gmail.com', phoneArea: '401',
    skills: ['Surgical Nursing', 'Scrub/Circulate', 'Orthopedic Surgery', 'CNOR'],
    employer: 'Rhode Island Hospital', credentials: 'RN, CNOR',
    summary: 'CNOR-certified OR nurse, 5 years of experience with a specialty in orthopedic surgery (total hips/knees, spine). Currently circulating + scrubbing a mix of elective and trauma cases.',
    experience: [
      { role: 'OR Staff Nurse', company: 'Rhode Island Hospital', dates: 'Jun 2021 — Present',
        bullets: ['Orthopedic service line — total joints, spine, trauma', 'CNOR certification obtained 2023'] },
    ],
    education: 'BSN — University of Rhode Island, 2021',
    uploadedDaysAgo: 1,
  },
  {
    id: 'per-50', name: 'Amara Johnson', title: 'Clinical Nurse Specialist — Oncology', city: 'Brookline', state: 'MA',
    email: 'amara.johnson@gmail.com', phoneArea: '617',
    skills: ['Chemotherapy', 'OCN', 'Clinical Trials', 'Protocol Development'],
    employer: 'Dana-Farber', credentials: 'MSN, CNS, OCN',
    summary: 'Clinical Nurse Specialist with 11 years in oncology. Currently at Dana-Farber on the breast oncology service. Passive candidate — would consider a senior CNS or nurse-leader role with a clinical-trials focus.',
    experience: [
      { role: 'Clinical Nurse Specialist — Breast Oncology', company: 'Dana-Farber Cancer Institute', dates: 'Mar 2020 — Present',
        bullets: ['Protocol lead for 6 active Phase 2/3 breast-cancer trials', 'Co-authored institutional chemotherapy education curriculum'] },
    ],
    education: 'MSN — Yale School of Nursing, 2019',
    uploadedDaysAgo: 18,
  },
  {
    id: 'per-51', name: 'Liam O\'Sullivan, MD', title: 'Hospitalist Physician', city: 'Boston', state: 'MA',
    email: 'liam.osullivan@gmail.com', phoneArea: '617',
    skills: ['Internal Medicine', 'EHR (Epic)', 'Teaching', 'Quality Improvement'],
    employer: 'Beth Israel Deaconess', credentials: 'MD, Board Certified IM',
    summary: 'Board-certified internist with 6 years of hospitalist experience post-residency. Chief Resident year at BIDMC 2019-2020. Looking for an academic hospitalist position with ~20% teaching effort.',
    experience: [
      { role: 'Hospitalist', company: 'Beth Israel Deaconess Medical Center', dates: 'Jul 2020 — Present',
        bullets: ['7-on/7-off schedule, average daily census 14-16', 'Teaching attending for IM residency 6 weeks/year', 'Co-chair of institutional sepsis-QI committee'] },
    ],
    education: 'MD — Harvard Medical School, 2017 | IM Residency — BIDMC, 2017-2020',
    uploadedDaysAgo: 7,
  },
  {
    id: 'per-52', name: 'Isabella Ricci', title: 'Physical Therapist — Outpatient Ortho', city: 'Worcester', state: 'MA',
    email: 'isabella.ricci@gmail.com', phoneArea: '508',
    skills: ['Manual Therapy', 'Post-Surgical Rehab', 'McKenzie Method'],
    employer: '(Relocation)', credentials: 'DPT, OCS',
    summary: 'OCS-certified PT with 7 years of outpatient orthopedic experience. Relocating from Chicago to Worcester area in June 2026 — immediate availability thereafter. Manual therapy focus, McKenzie certified.',
    experience: [
      { role: 'Senior Physical Therapist', company: 'Athletico Physical Therapy — Chicago', dates: 'Aug 2019 — Apr 2026',
        bullets: ['Clinic lead for 6-person outpatient team', 'OCS certification 2022, McKenzie cert 2021'] },
    ],
    education: 'DPT — Northwestern University, 2019',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-53', name: 'Reginald Whitaker', title: 'Healthcare Administrator — Nursing Operations', city: 'Boston', state: 'MA',
    email: 'reginald.whitaker@gmail.com', phoneArea: '617',
    skills: ['Operations Leadership', 'Staffing Analytics', 'Labor Budget', 'Magnet Certification'],
    employer: 'Boston Medical Center', credentials: 'MBA, MSN',
    summary: 'Healthcare administrator with 14 years of experience bridging clinical and operational leadership. Currently oversees nursing operations across 4 BMC service lines (~320 RN FTEs, $42M labor budget).',
    experience: [
      { role: 'Senior Director — Nursing Operations', company: 'Boston Medical Center', dates: 'Oct 2021 — Present',
        bullets: ['Owns labor budget + staffing analytics across Med-Surg, Telemetry, IMCU, and Float Pool', 'Led BMC\'s 2024 Magnet redesignation effort'] },
    ],
    education: 'MBA — Boston University Questrom, 2018 | MSN — Simmons, 2012',
    uploadedDaysAgo: 2,
  },

  // ── Biotech / Clinical Research ──
  {
    id: 'per-54', name: 'Sophia Nguyen, PhD', title: 'Senior Clinical Research Associate', city: 'Cambridge', state: 'MA',
    email: 'sophia.nguyen@gmail.com', phoneArea: '617',
    skills: ['ICH-GCP', 'Site Monitoring', 'Veeva CTMS', 'Oncology Trials', 'Phase 2/3'],
    employer: 'IQVIA', credentials: 'PhD, CCRA',
    summary: 'Senior CRA with 9 years of on-site monitoring experience, heavy Phase 2/3 oncology focus. Currently managing 14 sites for a lung-cancer combination therapy trial sponsored by a top-5 pharma.',
    experience: [
      { role: 'Senior CRA II', company: 'IQVIA', dates: 'Jan 2022 — Present',
        bullets: ['Lead monitor for 14-site oncology trial (Phase 3, NSCLC)', 'Trained + mentored 8 junior CRAs'] },
      { role: 'CRA II', company: 'PPD', dates: 'Mar 2019 — Dec 2021',
        bullets: ['Site-management experience across hematology and solid tumors'] },
    ],
    education: 'PhD Molecular Biology — Tufts, 2018',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-55', name: 'Joaquín Herrera', title: 'Clinical Research Coordinator', city: 'Boston', state: 'MA',
    email: 'joaquin.herrera@gmail.com', phoneArea: '617',
    skills: ['Patient Recruitment', 'Protocol Adherence', 'IRB Submissions', 'EDC (Medidata)'],
    employer: 'Brigham & Women\'s Hospital', credentials: 'CCRC',
    summary: 'CCRC-certified clinical research coordinator with 5 years of academic-medical-center trial experience. Currently coordinating 3 active BWH cardiology trials. Bilingual (English/Spanish) — strong patient-recruitment track record.',
    experience: [
      { role: 'Clinical Research Coordinator II', company: 'Brigham & Women\'s Hospital', dates: 'Apr 2021 — Present',
        bullets: ['Lead CRC for a Phase 3 heart-failure trial (247 enrolled)', 'Maintains 98% protocol-adherence score across 3 active trials', 'Bilingual recruitment lift in Latinx patient population (+34% enrollment vs. baseline)'] },
    ],
    education: 'B.S. Biology — Boston University, 2020',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-56', name: 'Anastasia Kuznetsova', title: 'Principal Scientist — mRNA Formulation', city: 'Cambridge', state: 'MA',
    email: 'anastasia.kuznetsova@gmail.com', phoneArea: '617',
    skills: ['mRNA', 'Lipid Nanoparticles', 'Formulation', 'Protein Chemistry'],
    employer: 'Alnylam', credentials: 'PhD',
    summary: 'Principal scientist with 12 years of drug-delivery formulation experience, including 5 years focused on lipid nanoparticle (LNP) development for mRNA therapeutics. Passive candidate — open to Senior Principal or Director roles at a clinical-stage mRNA biotech.',
    experience: [
      { role: 'Principal Scientist — LNP Formulation', company: 'Alnylam Pharmaceuticals', dates: 'Jun 2021 — Present',
        bullets: ['Technical lead for formulation of 3 pipeline mRNA candidates', 'Author / co-author on 18 patents; 24 peer-reviewed publications'] },
    ],
    education: 'PhD Chemical Engineering — MIT, 2013',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-57', name: 'Benjamin Oyelaran', title: 'QA Specialist — GMP Manufacturing', city: 'Norwood', state: 'MA',
    email: 'benjamin.oyelaran@gmail.com', phoneArea: '781',
    skills: ['cGMP', 'FDA Audits', 'Deviation Management', 'CAPA', '21 CFR Part 11'],
    employer: 'Moderna (contract)',
    summary: 'GMP QA specialist, 8 years in biologics manufacturing. Currently on a 12-month contract at Moderna supporting their Norwood fill-finish site. Contract ends July — open to direct-hire roles.',
    experience: [
      { role: 'Quality Assurance Specialist III (Contract)', company: 'Moderna, Inc.', dates: 'Jul 2025 — Jul 2026',
        bullets: ['Responsible for batch-record review + deviation management at Norwood mRNA site', 'Supported FDA PAI inspection Feb 2026 — zero 483 observations'] },
      { role: 'QA Specialist II', company: 'Sanofi', dates: 'Jan 2020 — Jun 2025',
        bullets: ['CAPA owner for 40+ deviations; averaged 14-day closure cycle'] },
    ],
    education: 'B.S. Biochemistry — Brandeis University, 2018',
    uploadedDaysAgo: 6,
  },
  {
    id: 'per-58', name: 'Harper Sinclair', title: 'Regulatory Affairs Manager', city: 'Cambridge', state: 'MA',
    email: 'harper.sinclair@gmail.com', phoneArea: '617',
    skills: ['IND Submissions', 'FDA', 'EMA', 'Regulatory Strategy', 'Oncology'],
    employer: 'Bristol Myers Squibb',
    summary: 'Regulatory affairs manager with 11 years of experience spanning oncology small-molecule and biologic submissions. Led 3 successful IND filings and 1 NDA. Passive but open.',
    experience: [
      { role: 'Regulatory Affairs Manager — Oncology', company: 'Bristol Myers Squibb', dates: 'Mar 2022 — Present',
        bullets: ['Global regulatory lead for a Phase 3 oncology asset', 'Liaison with FDA, EMA, and PMDA on trial design + labeling'] },
    ],
    education: 'M.S. Regulatory Science — Northeastern, 2014 | B.S. Biology — Tufts, 2012',
    uploadedDaysAgo: 22,
  },
  {
    id: 'per-59', name: 'Gabriela Santos-Mendes', title: 'Biostatistician II', city: 'Waltham', state: 'MA',
    email: 'gabriela.santos-mendes@gmail.com', phoneArea: '781',
    skills: ['R', 'SAS', 'Survival Analysis', 'Bayesian Methods', 'CDISC'],
    employer: 'Sanofi', credentials: 'MS Biostatistics',
    summary: 'Biostatistician with 6 years of pharma experience, currently supporting Sanofi\'s oncology trial portfolio. Strong SAS + R, familiar with CDISC standards. Looking to move to a clinical-stage biotech where the statistical work has more individual leverage.',
    experience: [
      { role: 'Biostatistician II', company: 'Sanofi', dates: 'Jun 2020 — Present',
        bullets: ['Primary statistician for 2 Phase 2 trials + 1 Phase 3', 'Co-authored 6 peer-reviewed publications'] },
    ],
    education: 'M.S. Biostatistics — Harvard T.H. Chan School, 2020',
    uploadedDaysAgo: 9,
  },

  // ── Finance ──
  {
    id: 'per-60', name: 'David Hernandez', title: 'Senior CPA — Audit Manager', city: 'Boston', state: 'MA',
    email: 'david.hernandez@gmail.com', phoneArea: '617',
    skills: ['Public Accounting', 'GAAP', 'SOX', 'Financial Reporting', 'Team Leadership'],
    employer: 'Deloitte', credentials: 'CPA',
    summary: 'Deloitte audit manager, 9 years in public accounting. Currently leading audits for 3 public clients (two SaaS, one life-sciences). Looking to transition industry side into Controller or Director of Financial Reporting roles.',
    experience: [
      { role: 'Audit Manager', company: 'Deloitte Boston', dates: 'Aug 2022 — Present',
        bullets: ['Manages 4-6 person audit teams across 3 public-company engagements', 'Lead SOX-compliance reviewer for a $1.2B mid-cap SaaS client'] },
      { role: 'Senior Auditor', company: 'Deloitte Boston', dates: 'Aug 2019 — Jul 2022',
        bullets: ['CPA licensure 2019'] },
    ],
    education: 'B.S. Accounting — Bentley University, 2017',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-61', name: 'Brian Sullivan', title: 'Assistant Controller', city: 'Portsmouth', state: 'NH',
    email: 'brian.sullivan@gmail.com', phoneArea: '603',
    skills: ['Month-End Close', 'NetSuite', 'Financial Consolidation', 'Team Management'],
    employer: '(Previous role ended Mar)', credentials: 'CPA',
    summary: 'Assistant controller with 12 years of progressive accounting experience. Most recent role (VP Finance at a mid-market SaaS) ended in March 2026 after company was acquired. Open and interviewing actively.',
    experience: [
      { role: 'VP Finance', company: 'Rapid7 (prior to acquisition)', dates: 'Jan 2022 — Mar 2026',
        bullets: ['Managed a 7-person accounting team', 'Led monthly close process (5-business-day close)', 'Role eliminated post-acquisition Mar 2026'] },
    ],
    education: 'MBA — UNH Peter T. Paul School of Business, 2015',
    uploadedDaysAgo: 1,
  },
  {
    id: 'per-62', name: 'Chandra Reddy', title: 'Senior Compliance Officer — BSA/AML', city: 'New York', state: 'NY',
    email: 'chandra.reddy@gmail.com', phoneArea: '212',
    skills: ['BSA/AML', 'OFAC', 'KYC', 'Transaction Monitoring', 'FINRA'],
    employer: 'JPMorgan Chase', credentials: 'CAMS',
    summary: 'CAMS-certified compliance officer, 11 years at JPMC. Currently leading a team of 6 in the consumer-bank BSA/AML investigations group. Seeking Director-level roles at a smaller private bank or fintech.',
    experience: [
      { role: 'Senior Compliance Officer', company: 'JPMorgan Chase', dates: 'Mar 2020 — Present',
        bullets: ['Manages team of 6 BSA investigators', 'Serves on the quarterly SAR filing committee'] },
    ],
    education: 'JD — Fordham Law, 2014 | B.A. Economics — NYU, 2011',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-63', name: 'Alexander Rothstein', title: 'VP, Fixed Income Trading', city: 'New York', state: 'NY',
    email: 'alexander.rothstein@gmail.com', phoneArea: '212',
    skills: ['Treasury Trading', 'Rates', 'Risk Management', 'Bloomberg', 'Series 7/63'],
    employer: 'Morgan Stanley',
    summary: 'VP on Morgan Stanley\'s Treasury trading desk. 13 years of fixed-income experience. Passive but open to MD-track opportunities at Citadel, Bridgewater, or boutique macro shops.',
    experience: [
      { role: 'VP, Treasury Trading', company: 'Morgan Stanley', dates: 'Jan 2020 — Present',
        bullets: ['Primary market-maker for on-the-run US Treasuries', 'P&L responsibility'] },
    ],
    education: 'MBA — Columbia Business School, 2013',
    uploadedDaysAgo: 25,
  },
  {
    id: 'per-64', name: 'Fernanda Montoya', title: 'Financial Analyst II — FP&A', city: 'Stamford', state: 'CT',
    email: 'fernanda.montoya@gmail.com', phoneArea: '203',
    skills: ['Excel', 'Power BI', 'Hyperion', 'Forecasting', 'Business Partnering'],
    employer: 'Aetna', credentials: 'MBA',
    summary: 'FP&A analyst with 5 years of experience, currently supporting Aetna\'s Medicare Advantage business unit. MBA 2023. Looking for senior analyst or manager roles with more decision-making leverage.',
    experience: [
      { role: 'Financial Analyst II', company: 'Aetna (CVS Health)', dates: 'Jul 2021 — Present',
        bullets: ['Builds monthly forecast + variance analysis for MA P&L ($8.2B segment)', 'Power BI admin for the FP&A team'] },
    ],
    education: 'MBA — UConn School of Business, 2023 | B.S. Finance — Bentley, 2020',
    uploadedDaysAgo: 7,
  },
  {
    id: 'per-65', name: 'Gregory Fitzpatrick', title: 'Director of Internal Audit', city: 'Boston', state: 'MA',
    email: 'gregory.fitzpatrick@gmail.com', phoneArea: '617',
    skills: ['SOX', 'Risk Assessment', 'IT Audit', 'Team Leadership'],
    employer: 'State Street', credentials: 'CPA, CIA',
    summary: 'Director of Internal Audit at State Street, 17 years of progressive audit experience. Leads a 22-person team covering IT, operational, and financial audit for the global-markets segment.',
    experience: [
      { role: 'Director, Internal Audit', company: 'State Street Corporation', dates: 'Oct 2020 — Present',
        bullets: ['Leads 22-person audit team', 'Reports quarterly to the Audit Committee of the Board'] },
    ],
    education: 'MBA — Boston College Carroll School, 2012',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-66', name: 'Kenji Yamamoto', title: 'Quantitative Researcher', city: 'Greenwich', state: 'CT',
    email: 'kenji.yamamoto@gmail.com', phoneArea: '203',
    skills: ['Python', 'C++', 'Statistical Arbitrage', 'Time Series', 'PhD Math'],
    employer: 'Citadel Securities', credentials: 'PhD Mathematics',
    summary: 'Quantitative researcher at Citadel Securities, 9 years in stat-arb and market-making strategies. Passive — only interested in senior PM or head-of-research roles at top-tier pods.',
    experience: [
      { role: 'Senior Quantitative Researcher', company: 'Citadel Securities', dates: 'Sep 2019 — Present',
        bullets: ['PM on equity stat-arb book (confidential size)', 'Focus on microstructure + order-book prediction'] },
    ],
    education: 'PhD Mathematics — Princeton, 2016',
    uploadedDaysAgo: 35,
  },
  {
    id: 'per-67', name: 'Madison Kellerman', title: 'Senior Risk Analyst — Credit', city: 'Charlotte', state: 'NC',
    email: 'madison.kellerman@gmail.com', phoneArea: '704',
    skills: ['Credit Risk', 'Basel III', 'Stress Testing', 'SAS', 'Python'],
    employer: 'Bank of America',
    summary: 'Senior credit-risk analyst, 7 years at Bank of America. Focus on CCAR stress-testing and portfolio-level credit modeling. Looking at buy-side credit-analyst roles at asset managers.',
    experience: [
      { role: 'Senior Risk Analyst — Credit', company: 'Bank of America', dates: 'May 2019 — Present',
        bullets: ['CCAR submission contributor — commercial real-estate portfolio', 'SAS + Python model developer'] },
    ],
    education: 'M.S. Financial Engineering — NC State, 2019',
    uploadedDaysAgo: 11,
  },

  // ── Legal ──
  {
    id: 'per-68', name: 'Rebecca Feinstein', title: 'Senior Associate — M&A', city: 'New York', state: 'NY',
    email: 'rebecca.feinstein@gmail.com', phoneArea: '212',
    skills: ['M&A', 'Private Equity', 'Contract Drafting', 'Due Diligence'],
    employer: 'Wachtell Lipton', credentials: 'JD, NY Bar',
    summary: 'Senior associate at Wachtell, 6th-year class, M&A group. Worked on 8 public-company transactions totaling ~$42B in deal value. Looking at in-house GC / Deputy GC roles at PE-backed mid-market companies.',
    experience: [
      { role: 'Senior Associate — M&A', company: 'Wachtell, Lipton, Rosen & Katz', dates: 'Sep 2020 — Present',
        bullets: ['Staffed on recent $12B public-company take-private for a major PE sponsor', 'Lead associate on 3 active cross-border transactions'] },
    ],
    education: 'JD — Harvard Law School, 2020 | B.A. Political Science — Yale, 2017',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-69', name: 'Marcus Oyelowo', title: 'Litigation Associate — Commercial', city: 'Chicago', state: 'IL',
    email: 'marcus.oyelowo@gmail.com', phoneArea: '312',
    skills: ['Commercial Litigation', 'E-Discovery', 'Depositions', 'Trial Prep'],
    employer: 'Latham & Watkins', credentials: 'JD, IL Bar',
    summary: 'Senior litigation associate at Latham, 7th year, commercial litigation practice. Significant deposition + trial experience. Passive — interested in senior associate opportunities at boutiques or lateral partnership tracks.',
    experience: [
      { role: 'Senior Associate — Litigation', company: 'Latham & Watkins', dates: 'Sep 2019 — Present',
        bullets: ['Conducted 40+ depositions across the last 3 years', '2nd chair on 2 jury trials (both defense verdicts)'] },
    ],
    education: 'JD — University of Chicago Law, 2019',
    uploadedDaysAgo: 15,
  },
  {
    id: 'per-70', name: 'Eleanor Whitmore', title: 'Senior Paralegal — Corporate', city: 'Boston', state: 'MA',
    email: 'eleanor.whitmore@gmail.com', phoneArea: '617',
    skills: ['Corporate Governance', 'SEC Filings', 'Closing Management', 'Cap Tables'],
    employer: 'Ropes & Gray', credentials: 'Paralegal Certificate',
    summary: 'Senior corporate paralegal at Ropes & Gray, 9 years of AmLaw experience. Strong closings + cap-table management skill set. Considering in-house senior-paralegal or legal-ops roles at a growth-stage company.',
    experience: [
      { role: 'Senior Paralegal — Private Equity Group', company: 'Ropes & Gray', dates: 'Mar 2019 — Present',
        bullets: ['Closings lead for 20+ PE transactions/year', 'Manages cap-table records for 8 active portfolio companies'] },
    ],
    education: 'ABA-Approved Paralegal Certificate — Boston University, 2016',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-71', name: 'Thomas Blackburn', title: 'In-House Counsel — Commercial Contracts', city: 'Cambridge', state: 'MA',
    email: 'thomas.blackburn@gmail.com', phoneArea: '617',
    skills: ['SaaS Contracts', 'Data Privacy (GDPR/CCPA)', 'Procurement', 'IP Licensing'],
    employer: 'HubSpot', credentials: 'JD, MA Bar',
    summary: 'Commercial-contracts counsel at HubSpot, 8 years post-JD (3 years law firm, 5 in-house). Focus on enterprise SaaS agreements + global data-privacy compliance.',
    experience: [
      { role: 'Senior Commercial Counsel', company: 'HubSpot', dates: 'Jul 2021 — Present',
        bullets: ['Owns commercial-contract workflow for EMEA customers', 'GDPR + CCPA privacy liaison'] },
    ],
    education: 'JD — Boston College Law School, 2017',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-72', name: 'Priscilla Durand', title: 'Immigration Attorney', city: 'Washington', state: 'DC',
    email: 'priscilla.durand@gmail.com', phoneArea: '202',
    skills: ['H-1B', 'L-1', 'Green Cards', 'PERM', 'I-9 Compliance'],
    employer: 'Fragomen', credentials: 'JD',
    summary: 'Business-immigration attorney at Fragomen, 6 years of practice. Heavy H-1B and EB-2 NIW / PERM volume. Interested in in-house immigration counsel roles at Big Tech or Big Pharma.',
    experience: [
      { role: 'Associate Attorney — Business Immigration', company: 'Fragomen, Del Rey, Bernsen & Loewy', dates: 'Sep 2020 — Present',
        bullets: ['Manages a book of ~140 active corporate clients', 'Filed 400+ H-1B petitions across last 3 cycles'] },
    ],
    education: 'JD — Georgetown Law, 2020',
    uploadedDaysAgo: 6,
  },
  {
    id: 'per-73', name: 'Jamal Whitfield', title: 'Compliance Counsel — Financial Services', city: 'New York', state: 'NY',
    email: 'jamal.whitfield@gmail.com', phoneArea: '212',
    skills: ['SEC', 'FINRA', 'Investment Adviser Act', 'Regulatory Exams'],
    employer: 'Fidelity Investments', credentials: 'JD, CFA',
    summary: 'Compliance counsel at Fidelity, 9 years combined SEC + law-firm experience. JD + CFA. Looking at CCO or senior-counsel roles at alternative-asset managers or fintech.',
    experience: [
      { role: 'Compliance Counsel', company: 'Fidelity Investments', dates: 'Jan 2022 — Present',
        bullets: ['Lead counsel for SEC/FINRA exam response', 'Advises 5 Fidelity adviser entities on 40 Act compliance'] },
    ],
    education: 'JD — NYU School of Law, 2017 | CFA, 2020',
    uploadedDaysAgo: 8,
  },

  // ── Manufacturing ──
  {
    id: 'per-74', name: 'Roland Kosinski', title: 'Plant Manager — Heavy Equipment', city: 'Peoria', state: 'IL',
    email: 'roland.kosinski@gmail.com', phoneArea: '309',
    skills: ['Lean Manufacturing', 'Six Sigma Black Belt', 'Team of 400+', 'Union Environment'],
    employer: 'John Deere', credentials: 'MBA, SSBB',
    summary: 'Plant manager with 22 years of heavy-equipment manufacturing experience. Currently runs a 430-person Deere facility making articulated haul trucks. Target: Plant Director or VP Operations at a Tier-1 industrial manufacturer.',
    experience: [
      { role: 'Plant Manager', company: 'John Deere — Dubuque Works', dates: 'Aug 2020 — Present',
        bullets: ['Runs 430-person, 3-shift plant producing $620M annual revenue', 'Led lean transformation reducing cycle time 22%', 'UAW-Local 94 bargaining-table experience'] },
    ],
    education: 'MBA — University of Illinois, 2015',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-75', name: 'Derek Holcomb', title: 'Senior Manufacturing Engineer', city: 'Decatur', state: 'IL',
    email: 'derek.holcomb@gmail.com', phoneArea: '217',
    skills: ['CAD (SolidWorks)', 'Process Design', 'Robotics', 'PLCs', 'Automation'],
    employer: '(Plant closure)', credentials: 'BSME, PE',
    summary: 'Senior manufacturing engineer, 14 years at ADM\'s Decatur corn-processing complex until the 2026 plant closure. PE-licensed. Immediately available.',
    experience: [
      { role: 'Senior Manufacturing Engineer', company: 'ADM — Decatur Operations', dates: 'Jun 2012 — Mar 2026',
        bullets: ['Designed + commissioned 4 major automation upgrades', 'Plant closure announced Jan 2026; affected 350 employees'] },
    ],
    education: 'B.S. Mechanical Engineering — Purdue, 2012 | PE License IL, 2018',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-76', name: 'Miguel Acosta', title: 'CNC Machinist — Journey Level', city: 'Wichita', state: 'KS',
    email: 'miguel.acosta@gmail.com', phoneArea: '316',
    skills: ['5-Axis CNC', 'Mastercam', 'Aerospace Tolerances', 'Inspection'],
    employer: 'Textron Aviation',
    summary: 'Journey-level CNC machinist, 16 years of aerospace-parts experience. Currently on Textron\'s Cessna Citation wing-spar line. Union member, looking for day-shift opportunities closer to Wichita.',
    experience: [
      { role: 'CNC Machinist — 5-Axis', company: 'Textron Aviation', dates: 'Mar 2018 — Present',
        bullets: ['Works from BOM and engineering drawings to tolerances as tight as ±0.0005"', 'Preferred operator on the two Mazak Variaxis cells'] },
    ],
    education: 'Apprenticeship — Wichita Area Technical College, 2010',
    uploadedDaysAgo: 6,
  },
  {
    id: 'per-77', name: 'Jessica Laferriere', title: 'Quality Engineer — AS9100', city: 'Everett', state: 'WA',
    email: 'jessica.laferriere@gmail.com', phoneArea: '425',
    skills: ['AS9100', 'Root Cause Analysis', 'Minitab', 'FAI', 'Aerospace'],
    employer: 'Boeing', credentials: 'CQE',
    summary: 'Senior QE at Boeing Everett. 11 years of aerospace QE experience, CQE certified. Seeking Quality Manager roles at Tier-1 suppliers or defense primes.',
    experience: [
      { role: 'Senior Quality Engineer', company: 'Boeing Commercial Airplanes', dates: 'Jun 2018 — Present',
        bullets: ['Quality lead for 787 wing-assembly line', 'Owned 2 major supplier audits in 2025'] },
    ],
    education: 'B.S. Industrial Engineering — Purdue, 2014',
    uploadedDaysAgo: 9,
  },
  {
    id: 'per-78', name: 'Tyrone Beasley', title: 'Senior Welder — Pressure Vessel', city: 'Houston', state: 'TX',
    email: 'tyrone.beasley@gmail.com', phoneArea: '713',
    skills: ['ASME Code', 'TIG/MIG', 'Stainless / Carbon', 'Pipe Welding 6G'],
    employer: '(Contract ending)', credentials: 'AWS Certified Welder',
    summary: '18-year journeyman welder with ASME Section IX certifications. Currently finishing a shutdown contract at a refinery. Open to direct-hire at a fabrication shop or plant-maintenance role.',
    experience: [
      { role: 'Senior Welder (Contract)', company: 'Turner Industries — Shell Deer Park', dates: 'Oct 2025 — Apr 2026',
        bullets: ['Shutdown/turnaround work on distillation columns', '6G pipe welding certified'] },
    ],
    education: 'AWS Certified Welder — 2008',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-79', name: 'Stacy Rinehart', title: 'Supply Chain Manager', city: 'Greenville', state: 'SC',
    email: 'stacy.rinehart@gmail.com', phoneArea: '864',
    skills: ['S&OP', 'SAP', 'Supplier Development', 'Cost Reduction'],
    employer: 'BMW Manufacturing', credentials: 'APICS CSCP',
    summary: 'Supply-chain manager at BMW\'s Spartanburg plant. 13 years in automotive supply chain. Passive but interested in Director-level roles with global scope.',
    experience: [
      { role: 'Supply Chain Manager — Seat Systems', company: 'BMW Manufacturing Co.', dates: 'Jan 2020 — Present',
        bullets: ['Manages 12 Tier-1 suppliers, $180M annual spend'] },
    ],
    education: 'MBA — Clemson, 2018 | APICS CSCP 2019',
    uploadedDaysAgo: 19,
  },

  // ── HR / Admin ──
  {
    id: 'per-80', name: 'Maya Patel', title: 'Senior HR Business Partner', city: 'San Francisco', state: 'CA',
    email: 'maya.patel@gmail.com', phoneArea: '415',
    skills: ['Employee Relations', 'Org Design', 'Compensation', 'Tech HRBP'],
    employer: 'Airbnb', credentials: 'SPHR',
    summary: 'Senior HRBP at Airbnb supporting the Engineering org (1,800+ headcount). 10 years in HR, 6 of them in tech. Looking for Director of People Partners roles.',
    experience: [
      { role: 'Senior HRBP — Engineering', company: 'Airbnb', dates: 'May 2021 — Present',
        bullets: ['Primary HRBP for 1,800 engineers across 4 product orgs', 'Led 2024 calibration cycles across VP-level promo rounds'] },
    ],
    education: 'M.A. Industrial/Organizational Psychology — Columbia, 2015',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-81', name: 'Tomás Ríos', title: 'Technical Recruiter', city: 'Austin', state: 'TX',
    email: 'tomas.rios@gmail.com', phoneArea: '512',
    skills: ['Full-Cycle Recruiting', 'Sourcing', 'Greenhouse', 'LinkedIn Recruiter'],
    employer: 'Indeed',
    summary: 'Technical recruiter at Indeed, 6 years of experience in full-cycle tech recruiting. Averaged 38 placements/year over the last 3 years. Looking for senior recruiter or recruiting-manager roles.',
    experience: [
      { role: 'Senior Technical Recruiter', company: 'Indeed', dates: 'Jan 2022 — Present',
        bullets: ['38 placements in 2024, 41 in 2025', 'Core recruiter on the data-platform org'] },
    ],
    education: 'B.A. Communication — UT Austin, 2018',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-82', name: 'Nadia Whitfield-Ajani', title: 'Director of Total Rewards', city: 'Boston', state: 'MA',
    email: 'nadia.whitfield-ajani@gmail.com', phoneArea: '617',
    skills: ['Compensation Design', 'Equity Plans', 'Benefits', 'Radford Surveys'],
    employer: 'Wayfair', credentials: 'CCP',
    summary: 'Director of Total Rewards at Wayfair, overseeing compensation + benefits for 17K+ employees. CCP-certified. Passive but open to VP Total Rewards roles.',
    experience: [
      { role: 'Director of Total Rewards', company: 'Wayfair', dates: 'Mar 2021 — Present',
        bullets: ['Redesigned equity program post-SPAC transition', 'Led 2025 pay-equity audit — published internal transparency report'] },
    ],
    education: 'MBA — MIT Sloan, 2016',
    uploadedDaysAgo: 16,
  },
  {
    id: 'per-83', name: 'Lorraine McCutcheon', title: 'Executive Assistant to CEO', city: 'New York', state: 'NY',
    email: 'lorraine.mccutcheon@gmail.com', phoneArea: '212',
    skills: ['C-Suite Support', 'Calendar Management', 'Board Coordination', 'Travel'],
    employer: 'McKinsey',
    summary: 'Executive Assistant to the Office-Managing Partner at McKinsey NYC. 14 years of C-suite support experience. Target: EA to CEO at a public company or late-stage tech.',
    experience: [
      { role: 'EA to Office Managing Partner', company: 'McKinsey & Company', dates: 'Sep 2019 — Present',
        bullets: ['Supports OMP + 3 senior partners', 'Quarterly board-meeting coordination'] },
    ],
    education: 'B.A. English — Barnard College, 2011',
    uploadedDaysAgo: 1,
  },
  {
    id: 'per-84', name: 'Cameron Whitlock', title: 'People Operations Manager', city: 'Remote', state: 'OR',
    email: 'cameron.whitlock@gmail.com', phoneArea: '503',
    skills: ['HRIS (Workday)', 'Onboarding', 'HR Analytics', 'Process Design'],
    employer: '(Laid off Apr 2026)',
    summary: 'People Ops manager with 8 years of experience. Most recent role at Okta ended in April 2026 RIF. Fully remote, open to contract or direct-hire People Ops / HR Ops Manager roles.',
    experience: [
      { role: 'People Operations Manager', company: 'Okta', dates: 'Aug 2021 — Apr 2026',
        bullets: ['Workday admin lead for North American region', 'Role eliminated in April 2026 RIF (400 positions)'] },
    ],
    education: 'B.A. Organizational Communication — University of Oregon, 2017',
    uploadedDaysAgo: 4,
  },

  // ── Exec / placed ──
  {
    id: 'per-85', name: 'Jennifer Morrison', title: 'VP of Compliance', city: 'Boston', state: 'MA',
    email: 'jennifer.morrison@gmail.com', phoneArea: '617',
    skills: ['SEC/FINRA', 'Compliance Program Build-Out', 'Team Leadership'],
    employer: 'Meridian Capital Group (placed Jan 2026)', credentials: 'JD',
    summary: 'VP of Compliance at Meridian Capital Group — placed via Roadrunner in January 2026. JD, 17 years of compliance leadership. Resume on file for future search alumni referrals.',
    experience: [
      { role: 'VP of Compliance', company: 'Meridian Capital Group', dates: 'Feb 2026 — Present',
        bullets: ['Currently building out 6-person compliance function from scratch', '90-day review: exceeded expectations'] },
      { role: 'Director of Compliance', company: 'Atlantic Financial Group', dates: 'Mar 2018 — Jan 2026',
        bullets: ['Scaled compliance team 2 → 12', 'Survived 3 SEC exams with minimal findings'] },
    ],
    education: 'JD — Boston University School of Law, 2008',
    uploadedDaysAgo: 38,
  },
  {
    id: 'per-86', name: 'Robert Kim', title: 'Former VP Regulatory Affairs', city: 'San Francisco', state: 'CA',
    email: 'robert.kim@gmail.com', phoneArea: '415',
    skills: ['Government Relations', 'SEC Former Regulator', 'Policy'],
    employer: 'Pacific Trust', credentials: 'JD',
    summary: 'VP Regulatory Affairs at Pacific Trust. Former SEC staff attorney (2008-2012). Strong government-relations profile. Candidate flagged as not-a-fit for Meridian search but kept in rolodex for future federal/policy roles.',
    experience: [
      { role: 'VP Regulatory Affairs', company: 'Pacific Trust', dates: 'Apr 2018 — Present',
        bullets: ['Primary government-relations contact'] },
      { role: 'Staff Attorney', company: 'U.S. Securities and Exchange Commission', dates: 'Jun 2008 — Mar 2012',
        bullets: ['Enforcement Division — Asset Management Unit'] },
    ],
    education: 'JD — Stanford Law, 2008',
    uploadedDaysAgo: 52,
  },
  {
    id: 'per-87', name: 'Maria Santos', title: 'Chief Compliance Officer', city: 'Stamford', state: 'CT',
    email: 'maria.santos@gmail.com', phoneArea: '203',
    skills: ['M&A Compliance', 'Chief Compliance Officer', 'Legal + Regulatory'],
    employer: 'Greenfield Capital', credentials: 'JD, CFA',
    summary: 'CCO at Greenfield Capital, 12 years in financial-services compliance. JD + CFA dual credential. Currently in final-round interviews for a CCO role at a larger PE firm.',
    experience: [
      { role: 'Chief Compliance Officer', company: 'Greenfield Capital', dates: 'Jan 2020 — Present',
        bullets: ['Built Greenfield\'s compliance program from scratch post-firm launch'] },
    ],
    education: 'JD — University of Pennsylvania Law, 2013 | CFA 2016',
    uploadedDaysAgo: 6,
  },
  {
    id: 'per-88', name: 'Jonathan Whitfield', title: 'Chief Financial Officer', city: 'Boston', state: 'MA',
    email: 'jonathan.whitfield@gmail.com', phoneArea: '617',
    skills: ['IPO Readiness', 'Series D+ Capital Raises', 'SaaS Finance', 'Team of 45'],
    employer: 'Toast, Inc.', credentials: 'CPA, MBA',
    summary: 'CFO at Toast, Inc. Led the 2021 IPO. Managing a 45-person finance org. Passive — only interested in CFO roles at late-stage private companies with clear IPO paths.',
    experience: [
      { role: 'Chief Financial Officer', company: 'Toast, Inc.', dates: 'Mar 2019 — Present',
        bullets: ['Led 2021 IPO (NYSE: TOST)', 'Raised Series E + F ($650M combined prior to IPO)'] },
    ],
    education: 'MBA — HBS, 2005',
    uploadedDaysAgo: 28,
  },
  {
    id: 'per-89', name: 'Valentina Rossi', title: 'Chief Marketing Officer', city: 'New York', state: 'NY',
    email: 'valentina.rossi@gmail.com', phoneArea: '212',
    skills: ['B2B Marketing', 'Demand Gen', 'Brand', 'Team Leadership', 'PLG'],
    employer: 'Asana', credentials: 'MBA Kellogg',
    summary: 'CMO at Asana. 18 years of B2B marketing leadership across Asana, Box, and Salesforce. Managing a 90-person global marketing org.',
    experience: [
      { role: 'Chief Marketing Officer', company: 'Asana', dates: 'Jul 2021 — Present',
        bullets: ['Grew ARR from $450M → $720M over tenure', 'Rebuilt demand-gen engine post-2022 revenue miss'] },
    ],
    education: 'MBA — Kellogg, 2008',
    uploadedDaysAgo: 10,
  },

  // ── Additional diverse candidates (per-90..per-112) ──
  {
    id: 'per-90', name: 'Aisha Rahman', title: 'Data Engineer — Analytics Platform', city: 'San Jose', state: 'CA',
    email: 'aisha.rahman@gmail.com', phoneArea: '408',
    skills: ['dbt', 'Snowflake', 'Airflow', 'Python', 'SQL'],
    employer: 'Okta',
    summary: 'Data engineer at Okta with 6 years of analytics-platform experience. Strong dbt + Snowflake proficiency. Looking for senior roles at product-led growth companies.',
    experience: [
      { role: 'Senior Data Engineer', company: 'Okta', dates: 'Jun 2022 — Present',
        bullets: ['Owns the analytics DAG powering executive reporting', 'Core contributor to internal dbt-docs service'] },
      { role: 'Data Engineer', company: 'Segment (Twilio)', dates: 'Aug 2019 — May 2022',
        bullets: ['Built data-warehouse connector templates (Redshift, BigQuery, Snowflake)'] },
    ],
    education: 'B.S. Computer Science — UC San Diego, 2019',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-91', name: 'Hector Valenzuela', title: 'DevOps Engineer', city: 'Phoenix', state: 'AZ',
    email: 'hector.valenzuela@gmail.com', phoneArea: '602',
    skills: ['GitLab CI', 'Terraform', 'Ansible', 'AWS', 'Python'],
    employer: 'GoDaddy',
    summary: 'DevOps engineer at GoDaddy, 5 years of CI/CD + IaC work. Comfortable across GitLab CI, Terraform, Ansible. Fully remote.',
    experience: [
      { role: 'DevOps Engineer II', company: 'GoDaddy', dates: 'Apr 2021 — Present',
        bullets: ['Core contributor to GoDaddy\'s internal Backstage-based developer portal'] },
    ],
    education: 'B.S. Computer Science — ASU, 2020',
    uploadedDaysAgo: 7,
  },
  {
    id: 'per-92', name: 'Felicity Abara', title: 'UX Researcher', city: 'Seattle', state: 'WA',
    email: 'felicity.abara@gmail.com', phoneArea: '206',
    skills: ['Qualitative Research', 'Usability Testing', 'Synthesis', 'Service Design'],
    employer: 'Microsoft',
    summary: 'UX researcher at Microsoft, 7 years of mixed-methods research. Currently embedded with the Teams platform team. Passive but will take qualified outbound.',
    experience: [
      { role: 'Senior UX Researcher', company: 'Microsoft — Teams', dates: 'Oct 2021 — Present',
        bullets: ['Lead researcher for the Teams calling + meeting surface'] },
    ],
    education: 'M.S. HCI — University of Washington, 2018',
    uploadedDaysAgo: 14,
  },
  {
    id: 'per-93', name: 'Omar Khouri', title: 'Neonatal ICU Registered Nurse', city: 'Boston', state: 'MA',
    email: 'omar.khouri@gmail.com', phoneArea: '617',
    skills: ['NICU', 'Neonatal Resuscitation', 'High-Risk Infant Care'],
    employer: 'Boston Children\'s Hospital', credentials: 'RN, BSN, RNC-NIC',
    summary: 'Level III/IV NICU RN at Boston Children\'s Hospital with 6 years of high-acuity neonatal experience. RNC-NIC certified. Target: NICU-to-home transition coordinator or staff-educator role.',
    experience: [
      { role: 'Staff Nurse — NICU', company: 'Boston Children\'s Hospital', dates: 'Jul 2020 — Present',
        bullets: ['Level III/IV NICU assignments — 26-bed unit', 'Preceptor for new-graduate nursing residents'] },
    ],
    education: 'BSN — Boston College, 2020',
    uploadedDaysAgo: 9,
  },
  {
    id: 'per-94', name: 'Yolanda Pritchard', title: 'Clinical Research Associate II', city: 'Research Triangle', state: 'NC',
    email: 'yolanda.pritchard@gmail.com', phoneArea: '919',
    skills: ['Oncology', 'Phase 3', 'ICH-GCP', 'Site Management'],
    employer: 'PPD (Thermo Fisher)',
    summary: 'CRA II at PPD with 4 years of Phase 3 oncology site-management experience. Willing to travel 50-70%.',
    experience: [
      { role: 'Clinical Research Associate II', company: 'PPD (part of Thermo Fisher)', dates: 'Sep 2021 — Present',
        bullets: ['Monitors 8 Phase 3 oncology sites across the Southeast'] },
    ],
    education: 'B.S. Biology — UNC-Chapel Hill, 2020',
    uploadedDaysAgo: 20,
  },
  {
    id: 'per-95', name: 'Ian Sokolowski', title: 'Corporate Paralegal — Capital Markets', city: 'New York', state: 'NY',
    email: 'ian.sokolowski@gmail.com', phoneArea: '212',
    skills: ['IPO Prep', 'SEC Filings', 'S-1 / 10-K', 'EDGAR'],
    employer: '(Relocating)', credentials: 'ABA-Approved Paralegal Certificate',
    summary: 'Capital-markets paralegal, 7 years at Cravath. Relocating from NYC to Boston by end of May 2026. Available immediately for Boston-based paralegal roles at top AmLaw firms.',
    experience: [
      { role: 'Senior Paralegal — Capital Markets', company: 'Cravath, Swaine & Moore', dates: 'Jul 2019 — Apr 2026',
        bullets: ['Worked on 9 IPOs totaling ~$8.4B combined raise', 'EDGAR filing lead for 14 active public clients'] },
    ],
    education: 'ABA Paralegal Certificate — NYU SPS, 2019',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-96', name: 'Beatrice Mukamuri', title: 'FP&A Senior Analyst', city: 'Boston', state: 'MA',
    email: 'beatrice.mukamuri@gmail.com', phoneArea: '617',
    skills: ['Anaplan', 'SaaS Metrics', 'Board Reporting', 'Scenario Modeling'],
    employer: 'Klaviyo',
    summary: 'Senior FP&A analyst at Klaviyo, 5 years of SaaS-finance experience. Owns the board-reporting package + investor-update metrics. Target: FP&A Manager at a pre-IPO SaaS company.',
    experience: [
      { role: 'Senior FP&A Analyst', company: 'Klaviyo', dates: 'Aug 2022 — Present',
        bullets: ['Built the current board-reporting model (adopted by finance + IR)', 'Anaplan power-user — owns 3 core models'] },
    ],
    education: 'B.S. Finance — Bentley, 2020',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-97', name: 'Giancarlo Marconi', title: 'Industrial Maintenance Technician', city: 'Louisville', state: 'KY',
    email: 'giancarlo.marconi@gmail.com', phoneArea: '502',
    skills: ['PLC Troubleshooting (Allen-Bradley)', 'Hydraulics', 'Pneumatics', 'Electrical'],
    employer: 'GE Appliances',
    summary: '12-year industrial maintenance tech at GE Appliances. Strong Allen-Bradley PLC troubleshooting background. Interested in off-shift supervisor or tech-lead roles.',
    experience: [
      { role: 'Senior Maintenance Technician', company: 'GE Appliances', dates: 'May 2015 — Present',
        bullets: ['3rd-shift lead across 4 assembly lines', 'PLC + robotics troubleshooting (ABB + FANUC)'] },
    ],
    education: 'AAS Industrial Maintenance — Jefferson Community and Technical College, 2013',
    uploadedDaysAgo: 11,
  },
  {
    id: 'per-98', name: 'Rebecca Stonebridge', title: 'Learning & Development Manager', city: 'Denver', state: 'CO',
    email: 'rebecca.stonebridge@gmail.com', phoneArea: '303',
    skills: ['Instructional Design', 'Leadership Development', 'LMS Administration'],
    employer: 'Arrow Electronics',
    summary: 'L&D manager with 9 years of experience, currently at Arrow Electronics. Built their manager-development curriculum in 2024. Passive candidate.',
    experience: [
      { role: 'Learning & Development Manager', company: 'Arrow Electronics', dates: 'Jan 2021 — Present',
        bullets: ['Owns the people-manager development curriculum (1,400 eligible managers)'] },
    ],
    education: 'M.Ed. Adult Learning — University of Denver, 2016',
    uploadedDaysAgo: 17,
  },
  {
    id: 'per-99', name: 'Dr. Constance Okwuosa', title: 'Senior Scientific Director — Oncology Research', city: 'Cambridge', state: 'MA',
    email: 'constance.okwuosa@gmail.com', phoneArea: '617',
    skills: ['Translational Research', 'Drug Discovery', 'Leadership', 'Cell Therapy'],
    employer: 'Novartis', credentials: 'PhD, MD',
    summary: 'MD/PhD Scientific Director at Novartis. 19 years in cell-therapy oncology research. Strong translational-science profile. Target: Head of Research or VP Translational Medicine at a clinical-stage biotech.',
    experience: [
      { role: 'Senior Scientific Director — Cell Therapy', company: 'Novartis Institutes for BioMedical Research', dates: 'Oct 2020 — Present',
        bullets: ['Leads a 22-person translational research team', 'Co-PI on 3 active IITs + 1 sponsored Phase 1 trial'] },
    ],
    education: 'MD — Johns Hopkins, 2010 | PhD Molecular Biology — JHU, 2008',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-100', name: 'Wesley Ainsworth', title: 'Technical Sales Engineer — Industrial', city: 'Milwaukee', state: 'WI',
    email: 'wesley.ainsworth@gmail.com', phoneArea: '414',
    skills: ['Solution Selling', 'CAD Literacy', 'Territory Management', 'OEM Relationships'],
    employer: 'Rockwell Automation',
    summary: 'Technical sales engineer at Rockwell Automation, 11 years carrying quota in the Upper Midwest industrial-automation vertical. 2024 President\'s Club.',
    experience: [
      { role: 'Senior Technical Sales Engineer', company: 'Rockwell Automation', dates: 'Jan 2018 — Present',
        bullets: ['$8.4M quota attainment 2024 (112%)', 'OEM territory: IL, WI, MI'] },
    ],
    education: 'B.S. Electrical Engineering — Marquette, 2013',
    uploadedDaysAgo: 24,
  },
  {
    id: 'per-101', name: 'Natalie Grzegorczyk', title: 'Associate — Private Equity', city: 'New York', state: 'NY',
    email: 'natalie.grzegorczyk@gmail.com', phoneArea: '212',
    skills: ['LBO Modeling', 'Due Diligence', 'Deal Execution', 'Post-Close Value Creation'],
    employer: 'KKR', credentials: 'MBA Wharton',
    summary: 'KKR Associate, 2nd year post-MBA. Previously 2 years at Goldman Sachs TMT banking + 2 years at Bain capital consulting. Passive — only open to VP-track PE roles.',
    experience: [
      { role: 'Associate — Technology Group', company: 'KKR', dates: 'Aug 2023 — Present',
        bullets: ['Active on 2 investments (one software, one IT services)'] },
    ],
    education: 'MBA — Wharton, 2023 | B.A. Economics — Yale, 2017',
    uploadedDaysAgo: 32,
  },
  {
    id: 'per-102', name: 'Corey Wahlstrom', title: 'Staff Security Engineer — Cloud', city: 'Chicago', state: 'IL',
    email: 'corey.wahlstrom@gmail.com', phoneArea: '312',
    skills: ['AWS Security', 'GCP Security', 'Kubernetes Security', 'Zero Trust', 'SIEM'],
    employer: 'Salesforce', credentials: 'CISSP',
    summary: 'Staff security engineer at Salesforce with 10 years of cloud-security experience. CISSP certified. Looking for Principal Security Engineer roles at smaller, higher-leverage security teams.',
    experience: [
      { role: 'Staff Security Engineer — Core Cloud', company: 'Salesforce', dates: 'Mar 2022 — Present',
        bullets: ['Owns Kubernetes security posture across the Hyperforce platform'] },
    ],
    education: 'B.S. Computer Science — University of Illinois, 2015',
    uploadedDaysAgo: 3,
  },
  {
    id: 'per-103', name: 'Lucia Vargas', title: 'Senior Perioperative Nurse Educator', city: 'Cleveland', state: 'OH',
    email: 'lucia.vargas@gmail.com', phoneArea: '216',
    skills: ['OR Education', 'Simulation-Based Training', 'CNOR Prep', 'Staff Development'],
    employer: 'Cleveland Clinic', credentials: 'MSN, CNOR, CNE',
    summary: 'Perioperative nurse educator at Cleveland Clinic, 13 years of combined OR + education experience. CNE + CNOR dual certified. Passive candidate.',
    experience: [
      { role: 'Senior Nurse Educator — Perioperative Services', company: 'Cleveland Clinic', dates: 'Sep 2019 — Present',
        bullets: ['Designs + delivers OR orientation for 80+ new nurses/year', 'Simulation-training program lead'] },
    ],
    education: 'MSN Nursing Education — Kent State, 2019',
    uploadedDaysAgo: 21,
  },
  {
    id: 'per-104', name: 'Marguerite Taliaferro', title: 'Environmental Health & Safety Manager', city: 'Knoxville', state: 'TN',
    email: 'marguerite.taliaferro@gmail.com', phoneArea: '865',
    skills: ['OSHA', 'ISO 45001', 'Incident Investigation', 'Regulatory Compliance'],
    employer: 'Eastman Chemical', credentials: 'CSP',
    summary: 'EHS manager at Eastman Chemical\'s Kingsport site. CSP-certified, 12 years of chemical-industry EHS experience. Open to EHS Director roles in the Southeast.',
    experience: [
      { role: 'EHS Manager', company: 'Eastman Chemical Company', dates: 'Apr 2020 — Present',
        bullets: ['Covers 3 plants totaling 1,800 employees', 'Led site through 2024 OSHA VPP Star recertification'] },
    ],
    education: 'B.S. Environmental Science — University of Tennessee, 2013',
    uploadedDaysAgo: 6,
  },
  {
    id: 'per-105', name: 'Sebastian Lindgren', title: 'Head of Data Science', city: 'New York', state: 'NY',
    email: 'sebastian.lindgren@gmail.com', phoneArea: '212',
    skills: ['Leadership', 'Causal Inference', 'A/B Testing at Scale', 'Team Building'],
    employer: 'Warby Parker', credentials: 'PhD Statistics',
    summary: 'Head of DS at Warby Parker, managing a 26-person data-science + analytics org. PhD Statistics. Target: VP Data or CDO at a Series D+ consumer company.',
    experience: [
      { role: 'Head of Data Science', company: 'Warby Parker', dates: 'Jan 2022 — Present',
        bullets: ['Grew team 9 → 26', 'Built the current experimentation platform (in-house — 200+ tests/year)'] },
    ],
    education: 'PhD Statistics — Columbia University, 2015',
    uploadedDaysAgo: 5,
  },
  {
    id: 'per-106', name: 'Cheng-Hui Lo', title: 'Senior Accountant — Revenue Recognition', city: 'San Francisco', state: 'CA',
    email: 'cheng-hui.lo@gmail.com', phoneArea: '415',
    skills: ['ASC 606', 'SaaS Revenue', 'NetSuite', 'Month-End Close'],
    employer: 'Zendesk', credentials: 'CPA',
    summary: 'Senior accountant at Zendesk with 7 years of SaaS rev-rec experience. ASC 606 specialist. Looking for Revenue Manager roles at pre-IPO SaaS.',
    experience: [
      { role: 'Senior Accountant — Revenue', company: 'Zendesk', dates: 'Apr 2021 — Present',
        bullets: ['Owns month-end rev-rec close for North America segment'] },
    ],
    education: 'B.S. Accounting — UC Berkeley Haas, 2018',
    uploadedDaysAgo: 4,
  },
  {
    id: 'per-107', name: 'Amani Solorio', title: 'Labor & Employment Attorney', city: 'Los Angeles', state: 'CA',
    email: 'amani.solorio@gmail.com', phoneArea: '310',
    skills: ['Wage & Hour', 'California Employment Law', 'Single-Plaintiff Litigation', 'Policy Drafting'],
    employer: 'Littler Mendelson', credentials: 'JD, CA Bar',
    summary: 'L&E attorney at Littler, 7 years of practice. Strong California wage-and-hour + single-plaintiff litigation background. Open to in-house L&E counsel roles at West Coast tech companies.',
    experience: [
      { role: 'Senior Associate', company: 'Littler Mendelson', dates: 'Sep 2019 — Present',
        bullets: ['Heavy focus on California Private Attorneys General Act (PAGA) defense', '2nd chair on 4 jury trials'] },
    ],
    education: 'JD — UCLA Law, 2019',
    uploadedDaysAgo: 7,
  },
  {
    id: 'per-108', name: 'Nora Whitby-Chen', title: 'Regulatory Affairs Specialist — Medical Devices', city: 'Minneapolis', state: 'MN',
    email: 'nora.whitby-chen@gmail.com', phoneArea: '612',
    skills: ['FDA 510(k)', 'CE Mark', 'MDR', 'Class II/III Devices'],
    employer: 'Boston Scientific', credentials: 'RAC',
    summary: 'Regulatory affairs specialist at Boston Scientific. RAC-certified. 8 years of Class II/III medical-device regulatory experience. Passive but open to Senior Specialist / Manager roles.',
    experience: [
      { role: 'Regulatory Affairs Specialist II', company: 'Boston Scientific — Cardiology', dates: 'May 2020 — Present',
        bullets: ['Filed 9 successful 510(k)s in the cardiology product line'] },
    ],
    education: 'M.S. Regulatory Affairs — Northeastern, 2017',
    uploadedDaysAgo: 26,
  },
  {
    id: 'per-109', name: 'Reyansh Gupta', title: 'Staff Infrastructure Engineer', city: 'Seattle', state: 'WA',
    email: 'reyansh.gupta@gmail.com', phoneArea: '206',
    skills: ['Kubernetes', 'Istio', 'Go', 'Multi-Region', 'Cost Optimization'],
    employer: 'Airbnb',
    summary: 'Staff infra engineer at Airbnb, 10 years of experience. Led the 2024 multi-region rollout. Passive — interested in Principal Engineer roles at infra companies or frontier-AI labs.',
    experience: [
      { role: 'Staff Infrastructure Engineer', company: 'Airbnb', dates: 'Feb 2021 — Present',
        bullets: ['Technical lead for Airbnb\'s global Kubernetes fleet (5K+ nodes)', 'Shepherded the 2024 active-active multi-region rollout'] },
    ],
    education: 'M.S. CS — University of Washington, 2016',
    uploadedDaysAgo: 18,
  },
  {
    id: 'per-110', name: 'Tara Bolduc', title: 'Nurse Manager — Medical-Surgical', city: 'Manchester', state: 'NH',
    email: 'tara.bolduc@gmail.com', phoneArea: '603',
    skills: ['Staffing Management', 'Quality Metrics', 'Joint Commission', 'Staff Coaching'],
    employer: 'Elliot Health System', credentials: 'MSN, RN, NE-BC',
    summary: 'Nurse manager at Elliot Hospital\'s 32-bed Med-Surg unit. NE-BC certified. 12 years of nursing experience, 4 in leadership. Target: Director of Nursing or larger-unit manager role.',
    experience: [
      { role: 'Nurse Manager — Med-Surg', company: 'Elliot Health System', dates: 'Jul 2022 — Present',
        bullets: ['Manages 52 FTE nursing team on 32-bed unit', 'Led unit through 2024 Joint Commission survey — zero RFIs'] },
    ],
    education: 'MSN Leadership — Rivier University, 2022',
    uploadedDaysAgo: 2,
  },
  {
    id: 'per-111', name: 'Demetrius Okafor-Hale', title: 'Tax Senior Manager — M&A', city: 'Atlanta', state: 'GA',
    email: 'demetrius.okafor-hale@gmail.com', phoneArea: '404',
    skills: ['M&A Tax', 'Transaction Structuring', 'ASC 740', 'International Tax'],
    employer: 'EY', credentials: 'CPA, JD',
    summary: 'Tax senior manager at EY, 11 years of M&A tax + transaction structuring experience. JD + CPA dual credential. Partnership-track at EY but open to corporate tax VP / Director roles.',
    experience: [
      { role: 'Senior Manager — Transaction Tax', company: 'EY', dates: 'Aug 2020 — Present',
        bullets: ['Lead tax advisor on 12 M&A transactions in 2024 ($3.2B combined deal value)'] },
    ],
    education: 'JD — Duke Law, 2014 | Master of Accounting — UNC-Chapel Hill, 2011',
    uploadedDaysAgo: 8,
  },
  {
    id: 'per-112', name: 'Heloise Chevalier', title: 'Senior Paralegal — Immigration', city: 'Washington', state: 'DC',
    email: 'heloise.chevalier@gmail.com', phoneArea: '202',
    skills: ['H-1B Petitions', 'I-140', 'PERM Labor Certifications', 'Case Management'],
    employer: '(Firm dissolution)', credentials: 'Paralegal Certificate',
    summary: 'Senior immigration paralegal, 9 years of experience. Previous firm dissolved Apr 2026 — immediately available. Bilingual French/English.',
    experience: [
      { role: 'Senior Paralegal — Business Immigration', company: 'Berry Appleman & Leiden (dissolved)', dates: 'Jul 2017 — Apr 2026',
        bullets: ['Managed H-1B / L-1 / PERM case loads for 6 corporate clients', 'Firm ceased operations April 2026'] },
    ],
    education: 'ABA Paralegal Certificate — Georgetown University, 2017',
    uploadedDaysAgo: 1,
  },
];

function isoDaysAgo(n: number): string {
  const d = new Date('2026-04-22T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

function buildResumeText(s: ResumeSeed): string {
  const nameLine = s.credentials ? `${s.name.replace(/,\s*(MD|PhD|JD|RN|NP)$/, '')}, ${s.credentials}` : s.name;
  const skillsLine = s.skills.join(' • ');
  const expBlock = s.experience.map((e) =>
    `${e.role}\n${e.company}  |  ${e.dates}\n${e.bullets.map((b) => `• ${b}`).join('\n')}`
  ).join('\n\n');
  return [
    nameLine.toUpperCase(),
    `${s.email} | (${s.phoneArea}) 555-0${(Math.abs(s.id.charCodeAt(4) * 97) % 900 + 100)} | ${s.city}, ${s.state}`,
    `linkedin.com/in/${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    '',
    'SUMMARY',
    s.summary,
    '',
    'EXPERIENCE',
    '',
    expBlock,
    '',
    s.education ? `EDUCATION\n${s.education}` : '',
    '',
    `SKILLS\n${skillsLine}`,
  ].filter(Boolean).join('\n');
}

function makeResume(s: ResumeSeed, i: number): CrmDocument {
  const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `bdoc-r${i + 1}`,
    name: `${s.name} — Resume`,
    fileName: `${slug}-resume-2026.pdf`,
    mimeType: 'application/pdf',
    size: 280_000 + (i * 3271) % 180_000,
    fileFamily: 'pdf',
    category: 'resume',
    description: `${s.title} — ${s.employer}. ${s.credentials ? s.credentials + ' • ' : ''}${s.skills.slice(0, 3).join(', ')}.`,
    tags: ['resume', 'candidate'],
    contactId: s.id,
    uploadedAt: isoDaysAgo(s.uploadedDaysAgo),
    updatedAt: isoDaysAgo(s.uploadedDaysAgo),
    uploadedBy: 'Paul Wentzell',
    textContent: buildResumeText(s),
  };
}

const RESUMES: CrmDocument[] = RESUME_SEEDS.map(makeResume);

// ─────────────────────────────────────────────────────────────────────────
// MSAs — one per active client org
// ─────────────────────────────────────────────────────────────────────────

interface MSASeed {
  contactId: string;
  clientName: string;
  legalName: string;
  effectiveDaysAgo: number;
  expiryYear: number;
  feeTier: '25%-retained' | '22%-retained' | '20%-contingent' | 'rpo';
  billingAddress: string;
  notes?: string;
}

const MSA_SEEDS: MSASeed[] = [
  { contactId: 'org-5',  clientName: 'Mass General Brigham',               legalName: 'Mass General Brigham Incorporated',   effectiveDaysAgo: 320, expiryYear: 2027, feeTier: '20%-contingent', billingAddress: '399 Revolution Drive, Somerville, MA 02145' },
  { contactId: 'org-6',  clientName: 'Moderna, Inc.',                      legalName: 'Moderna, Inc.',                        effectiveDaysAgo: 275, expiryYear: 2027, feeTier: '25%-retained',   billingAddress: '325 Binney Street, Cambridge, MA 02142' },
  { contactId: 'org-7',  clientName: 'Pfizer Inc.',                        legalName: 'Pfizer Inc.',                          effectiveDaysAgo: 410, expiryYear: 2027, feeTier: '22%-retained',   billingAddress: '66 Hudson Boulevard, New York, NY 10001', notes: 'Preferred-vendor list status — requires annual revalidation.' },
  { contactId: 'org-8',  clientName: 'Medtronic plc',                      legalName: 'Medtronic plc',                        effectiveDaysAgo: 500, expiryYear: 2026, feeTier: '22%-retained',   billingAddress: '710 Medtronic Parkway, Minneapolis, MN 55432', notes: 'MSA renewal conversation due Q3 2026.' },
  { contactId: 'org-9',  clientName: 'Anthropic, PBC',                     legalName: 'Anthropic, PBC',                       effectiveDaysAgo: 180, expiryYear: 2027, feeTier: '25%-retained',   billingAddress: '548 Market Street, San Francisco, CA 94104', notes: 'VIP client — 28-day exclusive search window on all roles.' },
  { contactId: 'org-10', clientName: 'Snowflake Inc.',                     legalName: 'Snowflake Inc.',                       effectiveDaysAgo: 240, expiryYear: 2027, feeTier: '22%-retained',   billingAddress: '106 East Babcock Street, Bozeman, MT 59715' },
  { contactId: 'org-11', clientName: 'Datadog, Inc.',                      legalName: 'Datadog, Inc.',                        effectiveDaysAgo: 360, expiryYear: 2026, feeTier: '20%-contingent', billingAddress: '620 8th Avenue, 45th Floor, New York, NY 10018' },
  { contactId: 'org-12', clientName: 'Figma, Inc.',                        legalName: 'Figma, Inc.',                          effectiveDaysAgo: 295, expiryYear: 2027, feeTier: '22%-retained',   billingAddress: '760 Market Street, San Francisco, CA 94102' },
  { contactId: 'org-13', clientName: 'Goldman Sachs',                      legalName: 'The Goldman Sachs Group, Inc.',        effectiveDaysAgo: 520, expiryYear: 2026, feeTier: 'rpo',            billingAddress: '200 West Street, New York, NY 10282', notes: 'Master vendor agreement — amended 2x for RPO scope additions.' },
  { contactId: 'org-14', clientName: 'BlackRock',                          legalName: 'BlackRock, Inc.',                      effectiveDaysAgo: 450, expiryYear: 2027, feeTier: '22%-retained',   billingAddress: '50 Hudson Yards, New York, NY 10001' },
  { contactId: 'org-16', clientName: 'Sidley Austin LLP',                  legalName: 'Sidley Austin LLP',                    effectiveDaysAgo: 380, expiryYear: 2027, feeTier: '25%-retained',   billingAddress: 'One South Dearborn, Chicago, IL 60603', notes: 'Lateral partner search fee structure: 30% of first-year guaranteed compensation.' },
  { contactId: 'org-17', clientName: 'Kirkland & Ellis LLP',               legalName: 'Kirkland & Ellis LLP',                 effectiveDaysAgo: 425, expiryYear: 2026, feeTier: '25%-retained',   billingAddress: '333 West Wolf Point Plaza, Chicago, IL 60654' },
  { contactId: 'org-18', clientName: 'Caterpillar Inc.',                   legalName: 'Caterpillar Inc.',                     effectiveDaysAgo: 600, expiryYear: 2026, feeTier: 'rpo',            billingAddress: '5205 N. O\'Connor Boulevard, Irving, TX 75039', notes: 'RPO wrap covers all skilled-trades searches under $95K.' },
  { contactId: 'org-21', clientName: 'Meridian Capital Group',             legalName: 'Meridian Capital Group, LP',           effectiveDaysAgo: 490, expiryYear: 2027, feeTier: '25%-retained',   billingAddress: '100 Federal Street, Boston, MA 02110', notes: 'VIP — longest-tenured account (since 2021).' },
];

function makeMSA(m: MSASeed, i: number): CrmDocument {
  const effective = isoDaysAgo(m.effectiveDaysAgo);
  const expiresAt = `${m.expiryYear}-12-31`;
  const feeText: Record<MSASeed['feeTier'], string> = {
    '25%-retained':   '• Retained searches: 25% of first-year total compensation\n• Retainer: 1/3 upon engagement, 1/3 at 30 days, 1/3 upon placement\n• Minimum engagement fee: $30,000',
    '22%-retained':   '• Retained searches: 22% of first-year total compensation\n• Retainer: 1/3 upon engagement, 1/3 at 30 days, 1/3 upon placement\n• Minimum engagement fee: $28,000',
    '20%-contingent': '• Contingent searches: 20% of first-year base salary\n• Payment terms: Net 30 from candidate start date\n• Minimum fee: $15,000',
    'rpo':            '• Monthly management fee: $18,500\n• Per-placement fee: 15% for roles >$95K, 12% for roles <$95K\n• Minimum 12-month commitment\n• SLA: 42-day average time-to-fill',
  };
  return {
    id: `bdoc-msa${i + 1}`,
    name: `Master Services Agreement — ${m.clientName}`,
    fileName: `${m.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-msa.pdf`,
    mimeType: 'application/pdf',
    size: 2_100_000 + (i * 77_000),
    fileFamily: 'pdf',
    category: 'contract',
    description: `Signed MSA governing all search engagements with ${m.clientName}. Effective through ${m.expiryYear}.${m.notes ? ' ' + m.notes : ''}`,
    tags: ['signed', 'active', 'MSA'],
    contactId: m.contactId,
    uploadedAt: effective,
    updatedAt: effective,
    expiresAt,
    uploadedBy: 'Paul Wentzell',
    textContent: `MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is entered into effective ${effective}, by and between:

Roadrunner Search Partners LLC ("Provider")
and
${m.legalName} ("Client")
Billing Address: ${m.billingAddress}

1. SCOPE OF SERVICES
Provider shall perform executive search and recruitment services as described in individual Statements of Work ("SOWs") executed under this Agreement.

2. TERM
This Agreement is effective from the date first written above and shall continue through ${expiresAt}, unless earlier terminated.

3. FEES AND PAYMENT
${feeText[m.feeTier]}
• Payment terms: Net 30 from invoice date

4. GUARANTEE
Provider guarantees all placements for 90 days from candidate start date. Replacement search at no additional fee if placement terminates within guarantee window for any reason other than role elimination.

5. EXCLUSIVITY
For retained engagements, Client grants Provider exclusive search rights for a 28-day window from engagement. Client shall not engage competing agencies on the same search during this window.

6. CONFIDENTIALITY
Each party shall hold all non-public information disclosed by the other party in strict confidence. Confidentiality obligations survive 3 years after disclosure.

7. DATA PROCESSING
Candidate personal data shall be processed in accordance with applicable privacy laws (GDPR, CCPA). A Data Processing Addendum (DPA) is attached as Exhibit A.

${m.notes ? 'SPECIAL PROVISIONS:\n' + m.notes : ''}

SIGNED:
Paul Wentzell, Managing Partner — Roadrunner Search Partners LLC
[Authorized Signatory] — ${m.legalName}`,
  };
}

const MSAS: CrmDocument[] = MSA_SEEDS.map(makeMSA);

// ─────────────────────────────────────────────────────────────────────────
// PLACED CANDIDATE LIFECYCLE DOCS — Jennifer Morrison (per-85) @ Meridian (org-21)
// ─────────────────────────────────────────────────────────────────────────

const PLACEMENT_DOCS: CrmDocument[] = [
  {
    id: 'bdoc-offer-1',
    name: 'Offer Letter — Jennifer Morrison, VP Compliance',
    fileName: 'morrison-offer-letter-signed.pdf',
    mimeType: 'application/pdf',
    size: 420_000,
    fileFamily: 'pdf',
    category: 'contract',
    description: 'Signed offer letter. Base $285K, 40% target bonus, $180K sign-on, standard equity grant.',
    tags: ['signed', 'placed', 'offer'],
    contactId: 'per-85',
    uploadedAt: '2026-01-22',
    updatedAt: '2026-01-23',
    uploadedBy: 'Paul Wentzell',
    textContent: `MERIDIAN CAPITAL GROUP, LP
100 Federal Street, Boston, MA 02110

January 22, 2026

Jennifer Morrison
[Address on file]

Dear Jennifer,

On behalf of Meridian Capital Group, LP ("Meridian"), I am pleased to extend this offer of employment for the position of Vice President of Compliance, reporting to Sloan Pemberton, Chief Operating Officer.

POSITION AND COMPENSATION
• Title: Vice President of Compliance
• Start Date: February 3, 2026
• Base Salary: $285,000 annualized
• Target Annual Bonus: 40% of base (pro-rated for 2026)
• Sign-On Bonus: $180,000, payable in two tranches — $90K within 30 days of start, $90K on 12-month anniversary. Subject to pro-rata clawback if voluntary termination occurs within 24 months.
• Equity: Carry participation in the Meridian Capital Partners IV and V funds per the firm's partner-equity policy
• Benefits: Full medical, dental, vision effective day 1; 401(k) with 6% match; 25 days PTO

RESPONSIBILITIES
You will lead Meridian's compliance function with accountability for SEC / FINRA program build-out, regulatory exam response, and hiring a 5-6 person compliance team.

AT-WILL EMPLOYMENT
Your employment with Meridian is at-will. This offer is contingent upon satisfactory completion of background check, reference verification, and execution of Meridian's standard Confidentiality and Non-Solicitation Agreement.

We look forward to welcoming you.

Sincerely,
Sloan Pemberton
COO, Meridian Capital Group

ACCEPTED AND AGREED:
/s/ Jennifer Morrison                 Date: January 23, 2026`,
  },
  {
    id: 'bdoc-placement-1',
    name: 'Placement Contract — Jennifer Morrison (Meridian)',
    fileName: 'meridian-morrison-placement-contract.pdf',
    mimeType: 'application/pdf',
    size: 680_000,
    fileFamily: 'pdf',
    category: 'contract',
    description: 'Placement contract between Roadrunner and Meridian. Fee calculation + 90-day guarantee.',
    tags: ['signed', 'closed', 'placement'],
    contactId: 'org-21',
    uploadedAt: '2026-01-23',
    updatedAt: '2026-01-23',
    uploadedBy: 'Paul Wentzell',
    textContent: `PLACEMENT CONTRACT
Between: Roadrunner Search Partners LLC ("Provider") and Meridian Capital Group, LP ("Client")
Executed under Master Services Agreement dated [effective].

CANDIDATE PLACED
Name: Jennifer Morrison
Position: Vice President of Compliance
Start Date: February 3, 2026
Reporting to: Sloan Pemberton, COO

COMPENSATION BASIS FOR FEE
• Base Salary: $285,000
• Target Annual Bonus: $114,000 (40% of base)
• Sign-On Bonus: $180,000
• First-Year Total Compensation: $579,000

FEE
25% of first-year total compensation = $144,750
Less: Retainer payments previously received ($48,250 × 2) = $96,500
Balance Due upon start: $48,250
Payment Terms: Net 30

GUARANTEE
Provider guarantees the placement for 90 days from the Start Date. If candidate voluntarily resigns or is involuntarily terminated (other than for role elimination) within the guarantee period, Provider shall conduct a replacement search at no additional fee.

GUARANTEE EXPIRATION: May 4, 2026`,
  },
  {
    id: 'bdoc-i9-1',
    name: 'Form I-9 + Work Authorization — J. Morrison',
    fileName: 'morrison-i9-work-auth.pdf',
    mimeType: 'application/pdf',
    size: 180_000,
    fileFamily: 'pdf',
    category: 'legal',
    description: 'Employment eligibility verification. List A: U.S. passport.',
    tags: ['confidential', 'I-9', 'HR'],
    contactId: 'per-85',
    uploadedAt: '2026-02-03',
    updatedAt: '2026-02-03',
    uploadedBy: 'Paul Wentzell',
    textContent: `FORM I-9 — EMPLOYMENT ELIGIBILITY VERIFICATION
U.S. Citizenship and Immigration Services

Employee: Jennifer Morrison
Start Date: February 3, 2026
Employer: Meridian Capital Group, LP

SECTION 1: Employee attests to U.S. citizenship.
SECTION 2: Employer reviewed List A document.
  List A Document: U.S. Passport
  Issuing Authority: U.S. Department of State
  Document # [redacted]
  Expiration: 2032

This file reflects Roadrunner's retained copy of the placement-package documents. The original I-9 is maintained by Meridian HR.`,
  },
  {
    id: 'bdoc-guarantee-1',
    name: '90-Day Guarantee Check-In — Morrison',
    fileName: 'morrison-90-day-checkin.pdf',
    mimeType: 'application/pdf',
    size: 120_000,
    fileFamily: 'pdf',
    category: 'correspondence',
    description: '60-day mark check-in from Sloan Pemberton. Exceeding expectations; hired 2 of 6 compliance team.',
    tags: ['guarantee', 'review'],
    contactId: 'per-85',
    uploadedAt: '2026-04-04',
    updatedAt: '2026-04-04',
    uploadedBy: 'Paul Wentzell',
    textContent: `60-DAY PLACEMENT CHECK-IN
Candidate: Jennifer Morrison | Meridian Capital Group
Review Date: April 4, 2026
Conducted by: Paul Wentzell, Roadrunner
Evaluator: Sloan Pemberton, COO — Meridian

SUMMARY
Placement tracking ahead of plan. Sloan rated the engagement a 9 of 10.

HIGHLIGHTS
• Hired 2 of 6 compliance team headcount (Senior Compliance Analyst + Compliance Associate) within 45 days of start
• Sponsored Meridian through an OCIE examination prep cycle
• Board update delivered at Q1 board meeting (March 26) — "well-received" per Sloan

ISSUES / RISKS
• No material concerns flagged
• One note: her request for an additional $60K in annual team budget is being negotiated — tracking for May board approval

GUARANTEE WINDOW: Closes May 4, 2026. No replacement trigger.

NEXT TOUCHPOINT: Final 90-day check-in on May 1.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// CANDIDATE SLATES — one per active search
// ─────────────────────────────────────────────────────────────────────────

interface SlateSeed {
  id: string;
  clientName: string;
  role: string;
  hmContactId: string;   // hiring manager
  orgContactId: string;  // client org
  candidateIds: string[];
  sentDaysAgo: number;
  description: string;
  notes: string;
}

const SLATE_SEEDS: SlateSeed[] = [
  {
    id: 'bdoc-slate-mgb-icu',
    clientName: 'Mass General Brigham',
    role: 'ICU / ED Registered Nurse — Boston Cohort (5 openings)',
    hmContactId: 'per-9',
    orgContactId: 'org-5',
    candidateIds: ['per-46', 'per-47', 'per-49', 'per-93', 'per-110'],
    sentDaysAgo: 6,
    description: 'First slate for the MGB acute-care nursing cohort. Five candidates covering ICU, ED, OR, and NICU specialties.',
    notes: 'Andrea Kowalski requested parallel interview slots across three MGB hospitals. All 5 candidates have current MA RN licensure on file.',
  },
  {
    id: 'bdoc-slate-moderna-cr',
    clientName: 'Moderna, Inc.',
    role: 'Clinical Research Team — CRA + CRC + QA (3 openings)',
    hmContactId: 'per-12',
    orgContactId: 'org-6',
    candidateIds: ['per-54', 'per-55', 'per-57', 'per-59', 'per-94'],
    sentDaysAgo: 10,
    description: 'Bundled slate covering Moderna\'s oncology mRNA Phase 2/3 team expansion. CRA, CRC, and GMP QA profiles.',
    notes: 'Rachel Finkelstein expressed strong interest in Sophia Nguyen (per-54) and Gabriela Santos-Mendes (per-59). Joaquín Herrera (per-55) flagged as potential CRC-II match despite title mismatch.',
  },
  {
    id: 'bdoc-slate-anthropic-research',
    clientName: 'Anthropic, PBC',
    role: 'Senior Research Scientist — Alignment & Post-Training',
    hmContactId: 'per-16',
    orgContactId: 'org-9',
    candidateIds: ['per-33', 'per-34', 'per-42', 'per-105'],
    sentDaysAgo: 4,
    description: 'Research-scientist slate. All four candidates have ACL/NeurIPS publication history and direct LLM training experience.',
    notes: 'Taylor Ng asked for 30-min intro calls across all four. Ravi Narayan (per-34) flagged as top candidate by her — wants him prioritized for her next-week on-site.',
  },
  {
    id: 'bdoc-slate-anthropic-platform',
    clientName: 'Anthropic, PBC',
    role: 'Staff Platform + Security Engineers (2 openings)',
    hmContactId: 'per-17',
    orgContactId: 'org-9',
    candidateIds: ['per-35', 'per-41', 'per-102', 'per-109'],
    sentDaysAgo: 8,
    description: 'Platform + security slate for Anthropic\'s SF infrastructure team. Mix of Kubernetes + Rust + AppSec profiles.',
    notes: 'Priscilla Okafor strong positive signal on Sofia Restrepo (per-35) and Corey Wahlstrom (per-102). Requested technical deep-dive on-sites for both.',
  },
  {
    id: 'bdoc-slate-snowflake-platform',
    clientName: 'Snowflake Inc.',
    role: 'Senior / Staff Platform Engineer',
    hmContactId: 'per-18',
    orgContactId: 'org-10',
    candidateIds: ['per-36', 'per-37', 'per-90', 'per-109'],
    sentDaysAgo: 12,
    description: 'Platform engineer slate. Snowflake asked for both senior and staff-level profiles for parallel open reqs.',
    notes: 'Dmitri Volkov reviewing this week. Noted that Reyansh Gupta (per-109) is a "reach" stretch candidate but worth a phone-screen if he\'s open.',
  },
  {
    id: 'bdoc-slate-sidley-partner',
    clientName: 'Sidley Austin LLP',
    role: 'Lateral Partner — M&A Group (NYC)',
    hmContactId: 'per-24',
    orgContactId: 'org-16',
    candidateIds: ['per-68', 'per-69', 'per-107'],
    sentDaysAgo: 14,
    description: 'Lateral-partner slate for Sidley NYC M&A practice. All three are senior associates or counsel with portable-book discussions under NDA.',
    notes: 'Robert Goldstein is cross-referencing conflicts with his conflicts department. Rebecca Feinstein (per-68) identified as strongest on chemistry; Marcus Oyelowo (per-69) has the strongest book.',
  },
  {
    id: 'bdoc-slate-caterpillar-trades',
    clientName: 'Caterpillar Inc.',
    role: 'Skilled-Trades RPO Cohort — Decatur Plant',
    hmContactId: 'per-27',
    orgContactId: 'org-18',
    candidateIds: ['per-75', 'per-76', 'per-78', 'per-97'],
    sentDaysAgo: 9,
    description: 'Skilled-trades RPO slate: mfg engineer, CNC machinist, welder, and maintenance tech. All four ready to interview.',
    notes: 'Lindsey Carter wants all 4 in the first round — she has hiring authority through the RPO master agreement, no need to run this through broader talent-acquisition.',
  },
  {
    id: 'bdoc-slate-meridian-fpa',
    clientName: 'Meridian Capital Group',
    role: 'Senior FP&A Analyst',
    hmContactId: 'per-31',
    orgContactId: 'org-21',
    candidateIds: ['per-64', 'per-96', 'per-106'],
    sentDaysAgo: 5,
    description: 'FP&A slate for Meridian\'s newly-created senior-analyst role. Mix of SaaS + public-company-finance backgrounds.',
    notes: 'Angela Farhi interviewing this week. Beatrice Mukamuri (per-96) is her favorite based on the pre-read.',
  },
  {
    id: 'bdoc-slate-mgb-np',
    clientName: 'Mass General Brigham',
    role: 'Family Nurse Practitioner — Primary Care Expansion',
    hmContactId: 'per-10',
    orgContactId: 'org-5',
    candidateIds: ['per-48'],
    sentDaysAgo: 3,
    description: 'Single-candidate submission for the NP role at the new Chestnut Hill primary-care location. Priya Venkatesh matched intake criteria closely.',
    notes: 'Michael Chen requested a direct resume share rather than a full slate — he has one pre-committed internal candidate and wanted to compare.',
  },
];

function makeSlate(s: SlateSeed, i: number, resumeLookup: Map<string, ResumeSeed>): CrmDocument {
  const candidateBlocks = s.candidateIds.map((cid, idx) => {
    const c = resumeLookup.get(cid);
    if (!c) return `Candidate ${idx + 1}: [profile on file]`;
    return `Candidate ${idx + 1}: ${c.name}
Current: ${c.title} at ${c.employer}
Location: ${c.city}, ${c.state}${c.credentials ? ` • ${c.credentials}` : ''}
Key skills: ${c.skills.slice(0, 4).join(', ')}
Summary: ${c.summary.slice(0, 240)}${c.summary.length > 240 ? '...' : ''}`;
  }).join('\n\n');

  return {
    id: s.id,
    name: `${s.clientName} — ${s.role} Slate`,
    fileName: `${s.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${s.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-slate.pdf`,
    mimeType: 'application/pdf',
    size: 3_400_000 + (i * 82_000),
    fileFamily: 'pdf',
    category: 'proposal',
    description: s.description,
    tags: ['slate', 'sent', 'active-search'],
    contactId: s.orgContactId,
    uploadedAt: isoDaysAgo(s.sentDaysAgo),
    updatedAt: isoDaysAgo(s.sentDaysAgo),
    uploadedBy: 'Paul Wentzell',
    textContent: `CANDIDATE SLATE
${s.clientName} — ${s.role}
Prepared by: Paul Wentzell | Sent: ${isoDaysAgo(s.sentDaysAgo)}
Primary contact: [on file]

EXECUTIVE SUMMARY
${s.description}

${candidateBlocks}

INTERNAL NOTES
${s.notes}`,
  };
}

const resumeLookup = new Map(RESUME_SEEDS.map((r) => [r.id, r]));
const SLATES: CrmDocument[] = SLATE_SEEDS.map((s, i) => makeSlate(s, i, resumeLookup));

// ─────────────────────────────────────────────────────────────────────────
// PROFESSIONAL LICENSES + CREDENTIALS — for healthcare / legal candidates
// ─────────────────────────────────────────────────────────────────────────

interface LicenseSeed {
  contactId: string;
  candidateName: string;
  credentialType: string;
  issuer: string;
  licenseNumber: string;
  expiresAt: string;
  uploadedDaysAgo: number;
}

const LICENSE_SEEDS: LicenseSeed[] = [
  { contactId: 'per-46', candidateName: 'Jasmine Carter',    credentialType: 'RN License (MA)',             issuer: 'Massachusetts Board of Registration in Nursing', licenseNumber: 'RN-2198742-MA',  expiresAt: '2027-03-31', uploadedDaysAgo: 8 },
  { contactId: 'per-46', candidateName: 'Jasmine Carter',    credentialType: 'CCRN Certification',          issuer: 'American Association of Critical-Care Nurses',    licenseNumber: 'CCRN-00845612', expiresAt: '2026-11-30', uploadedDaysAgo: 8 },
  { contactId: 'per-47', candidateName: 'Dmitri Sokolov',    credentialType: 'Multi-State RN Compact License', issuer: 'Nurse Licensure Compact (MA primary)',          licenseNumber: 'RN-2315298-MA',  expiresAt: '2028-02-28', uploadedDaysAgo: 6 },
  { contactId: 'per-47', candidateName: 'Dmitri Sokolov',    credentialType: 'CEN Certification',           issuer: 'Board of Certification for Emergency Nursing',    licenseNumber: 'CEN-0048215',   expiresAt: '2027-08-31', uploadedDaysAgo: 6 },
  { contactId: 'per-48', candidateName: 'Priya Venkatesh',   credentialType: 'Massachusetts NP License',    issuer: 'Massachusetts Board of Registration in Nursing', licenseNumber: 'APRN-FNP-412983', expiresAt: '2027-05-31', uploadedDaysAgo: 4 },
  { contactId: 'per-48', candidateName: 'Priya Venkatesh',   credentialType: 'DEA Registration',            issuer: 'U.S. Drug Enforcement Administration',            licenseNumber: 'MV1243587',     expiresAt: '2027-06-30', uploadedDaysAgo: 4 },
  { contactId: 'per-49', candidateName: 'Brandon Tillman',   credentialType: 'RN License (RI)',             issuer: 'Rhode Island Department of Health',              licenseNumber: 'RN-RI-18845',    expiresAt: '2027-01-31', uploadedDaysAgo: 3 },
  { contactId: 'per-49', candidateName: 'Brandon Tillman',   credentialType: 'CNOR Certification',          issuer: 'Competency & Credentialing Institute',           licenseNumber: 'CNOR-0029184',   expiresAt: '2026-10-31', uploadedDaysAgo: 3 },
  { contactId: 'per-51', candidateName: 'Liam O\'Sullivan',  credentialType: 'MA Medical License',          issuer: 'Massachusetts Board of Registration in Medicine', licenseNumber: 'ML-MA-287421',  expiresAt: '2027-12-31', uploadedDaysAgo: 9 },
  { contactId: 'per-51', candidateName: 'Liam O\'Sullivan',  credentialType: 'ABIM Internal Medicine Board Certification', issuer: 'American Board of Internal Medicine', licenseNumber: 'ABIM-IM-218432', expiresAt: '2029-12-31', uploadedDaysAgo: 9 },
  { contactId: 'per-52', candidateName: 'Isabella Ricci',    credentialType: 'DPT License (MA — pending transfer)', issuer: 'Massachusetts Board of Allied Health',      licenseNumber: 'PT-MA-pending',  expiresAt: '2027-04-30', uploadedDaysAgo: 5 },
  { contactId: 'per-53', candidateName: 'Reginald Whitaker', credentialType: 'RN License (MA)',             issuer: 'Massachusetts Board of Registration in Nursing', licenseNumber: 'RN-MA-198441',   expiresAt: '2027-09-30', uploadedDaysAgo: 4 },
  { contactId: 'per-93', candidateName: 'Omar Khouri',       credentialType: 'RN License (MA)',             issuer: 'Massachusetts Board of Registration in Nursing', licenseNumber: 'RN-MA-2184795',  expiresAt: '2027-08-31', uploadedDaysAgo: 11 },
  { contactId: 'per-93', candidateName: 'Omar Khouri',       credentialType: 'RNC-NIC Certification',       issuer: 'National Certification Corporation',             licenseNumber: 'RNC-NIC-18425',  expiresAt: '2028-02-28', uploadedDaysAgo: 11 },
  { contactId: 'per-103', candidateName: 'Lucia Vargas',     credentialType: 'RN License (OH)',             issuer: 'Ohio Board of Nursing',                           licenseNumber: 'RN-OH-428197',   expiresAt: '2027-10-31', uploadedDaysAgo: 22 },
  { contactId: 'per-103', candidateName: 'Lucia Vargas',     credentialType: 'CNOR + CNE (Nurse Educator)', issuer: 'CCI / NLN',                                       licenseNumber: 'CNOR-CNE-comb',  expiresAt: '2027-03-31', uploadedDaysAgo: 22 },
  { contactId: 'per-110', candidateName: 'Tara Bolduc',      credentialType: 'RN License (NH)',             issuer: 'New Hampshire Board of Nursing',                  licenseNumber: 'RN-NH-28945',    expiresAt: '2027-05-31', uploadedDaysAgo: 4 },
  { contactId: 'per-110', candidateName: 'Tara Bolduc',      credentialType: 'NE-BC (Nurse Executive, Board Certified)', issuer: 'ANCC',                                licenseNumber: 'NE-BC-029841',   expiresAt: '2028-06-30', uploadedDaysAgo: 4 },
  { contactId: 'per-68',  candidateName: 'Rebecca Feinstein', credentialType: 'NY Bar Admission',           issuer: 'New York State Bar',                              licenseNumber: 'NY-Bar-5284127', expiresAt: '2099-12-31', uploadedDaysAgo: 10 },
  { contactId: 'per-69',  candidateName: 'Marcus Oyelowo',   credentialType: 'IL Bar Admission',           issuer: 'Illinois State Bar',                               licenseNumber: 'IL-Bar-6187429', expiresAt: '2099-12-31', uploadedDaysAgo: 16 },
  { contactId: 'per-71',  candidateName: 'Thomas Blackburn', credentialType: 'MA Bar Admission',           issuer: 'Massachusetts Board of Bar Overseers',             licenseNumber: 'MA-Bar-298142',  expiresAt: '2099-12-31', uploadedDaysAgo: 7 },
  { contactId: 'per-107', candidateName: 'Amani Solorio',    credentialType: 'CA Bar Admission',           issuer: 'State Bar of California',                          licenseNumber: 'CA-Bar-328184',  expiresAt: '2099-12-31', uploadedDaysAgo: 8 },
];

function makeLicense(l: LicenseSeed, i: number): CrmDocument {
  return {
    id: `bdoc-lic${i + 1}`,
    name: `${l.candidateName} — ${l.credentialType}`,
    fileName: `${l.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${l.credentialType.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}.pdf`,
    mimeType: 'application/pdf',
    size: 95_000 + (i * 4_200),
    fileFamily: 'pdf',
    category: 'legal',
    description: `${l.credentialType} on file for ${l.candidateName}. Verified active ${isoDaysAgo(l.uploadedDaysAgo)}.`,
    tags: ['credential', 'verified', 'active'],
    contactId: l.contactId,
    uploadedAt: isoDaysAgo(l.uploadedDaysAgo),
    updatedAt: isoDaysAgo(l.uploadedDaysAgo),
    expiresAt: l.expiresAt === '2099-12-31' ? undefined : l.expiresAt,
    uploadedBy: 'Paul Wentzell',
    textContent: `PROFESSIONAL CREDENTIAL — VERIFICATION RECORD

Candidate: ${l.candidateName}
Credential: ${l.credentialType}
Issuing Authority: ${l.issuer}
License / Certification Number: ${l.licenseNumber}
Status: ACTIVE
Expiration: ${l.expiresAt === '2099-12-31' ? 'Does not expire (bar admission, in good standing)' : l.expiresAt}

VERIFICATION
Verified via the issuing authority's public license-lookup portal on ${isoDaysAgo(l.uploadedDaysAgo)} by Paul Wentzell. Screenshot on file in candidate folder.

USAGE NOTES
This credential packet is maintained by Roadrunner Search Partners as part of the candidate's onboarding dossier. Copies are shared with client hiring teams only with explicit candidate consent.`,
  };
}

const LICENSES: CrmDocument[] = LICENSE_SEEDS.map(makeLicense);

// ─────────────────────────────────────────────────────────────────────────
// INVOICES for closed placements (handful of historical + recent)
// ─────────────────────────────────────────────────────────────────────────

interface InvoiceSeed {
  id: string;
  invoiceNumber: string;
  clientOrgId: string;
  clientName: string;
  candidateName: string;
  role: string;
  startDate: string;
  firstYearComp: number;
  feePct: number;
  status: 'PAID' | 'OUTSTANDING';
  invoiceDate: string;
}

const INVOICE_SEEDS: InvoiceSeed[] = [
  { id: 'bdoc-inv-1', invoiceNumber: '1058', clientOrgId: 'org-21', clientName: 'Meridian Capital Group',   candidateName: 'Jennifer Morrison',   role: 'VP of Compliance',                  startDate: '2026-02-03', firstYearComp: 579_000, feePct: 0.25, status: 'PAID',        invoiceDate: '2026-02-05' },
  { id: 'bdoc-inv-2', invoiceNumber: '1053', clientOrgId: 'org-9',  clientName: 'Anthropic, PBC',           candidateName: 'Priya Venkatesh',     role: 'Head of Research Ops (concluded)',  startDate: '2026-01-13', firstYearComp: 395_000, feePct: 0.25, status: 'PAID',        invoiceDate: '2026-01-16' },
  { id: 'bdoc-inv-3', invoiceNumber: '1061', clientOrgId: 'org-5',  clientName: 'Mass General Brigham',     candidateName: 'Reginald Whitaker',   role: 'Director of Nursing Operations',    startDate: '2026-03-10', firstYearComp: 225_000, feePct: 0.22, status: 'OUTSTANDING', invoiceDate: '2026-03-12' },
  { id: 'bdoc-inv-4', invoiceNumber: '1067', clientOrgId: 'org-13', clientName: 'Goldman Sachs',            candidateName: 'Alexander Rothstein', role: 'VP Fixed Income (RPO cohort)',      startDate: '2026-04-01', firstYearComp: 540_000, feePct: 0.15, status: 'OUTSTANDING', invoiceDate: '2026-04-02' },
];

function makeInvoice(inv: InvoiceSeed): CrmDocument {
  const fee = Math.round(inv.firstYearComp * inv.feePct);
  const retainerPaid = inv.feePct >= 0.22 ? Math.round(fee * 0.67) : 0;
  const balance = fee - retainerPaid;
  return {
    id: inv.id,
    name: `Invoice #${inv.invoiceNumber} — ${inv.candidateName} Placement`,
    fileName: `invoice-${inv.invoiceNumber}-${inv.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}.pdf`,
    mimeType: 'application/pdf',
    size: 105_000,
    fileFamily: 'pdf',
    category: 'invoice',
    description: `${inv.role} placement fee. ${inv.feePct === 0.25 ? 'Retained 25%' : inv.feePct === 0.22 ? 'Retained 22%' : inv.feePct === 0.15 ? 'RPO per-placement 15%' : 'Contingent 20%'}. Status: ${inv.status}.`,
    tags: [inv.status === 'PAID' ? 'paid' : 'outstanding', 'closed'],
    contactId: inv.clientOrgId,
    uploadedAt: inv.invoiceDate,
    updatedAt: inv.invoiceDate,
    uploadedBy: 'Paul Wentzell',
    textContent: `INVOICE

Roadrunner Search Partners LLC
123 Main Street, Suite 400
Portsmouth, NH 03801

Bill To:
${inv.clientName}

Invoice #: ${inv.invoiceNumber}
Invoice Date: ${inv.invoiceDate}
Due Date: Net 30
Status: ${inv.status}

Description:
${inv.role}
Candidate Placed: ${inv.candidateName}
Start Date: ${inv.startDate}
First-Year Compensation: $${inv.firstYearComp.toLocaleString()}

Fee Calculation:
${(inv.feePct * 100).toFixed(0)}% of first-year compensation
$${inv.firstYearComp.toLocaleString()} × ${(inv.feePct * 100).toFixed(0)}% = $${fee.toLocaleString()}
${retainerPaid > 0 ? `Less: Retainer payments received: $${retainerPaid.toLocaleString()}` : ''}

Balance Due: $${balance.toLocaleString()}

${inv.status === 'PAID' ? 'Payment received in full. Thank you for your business.' : 'Please remit payment to the address above or via ACH (wire instructions on request).'}`,
  };
}

const INVOICES: CrmDocument[] = INVOICE_SEEDS.map(makeInvoice);

// ─────────────────────────────────────────────────────────────────────────
// JOB DESCRIPTIONS for active searches
// ─────────────────────────────────────────────────────────────────────────

const JOB_DESCRIPTIONS: CrmDocument[] = [
  {
    id: 'bdoc-jd-anthropic-rs',
    name: 'Anthropic — Senior Research Scientist (Alignment) JD',
    fileName: 'anthropic-senior-research-scientist-alignment.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 145_000,
    fileFamily: 'office',
    category: 'correspondence',
    description: 'Latest JD from Taylor Ng. Bar raised vs. Dec 2025 draft — now requires 5+ years post-PhD + first-author ACL/NeurIPS.',
    tags: ['JD', 'active-search'],
    contactId: 'org-9',
    uploadedAt: '2026-04-05',
    updatedAt: '2026-04-05',
    uploadedBy: 'Paul Wentzell',
    textContent: `SENIOR RESEARCH SCIENTIST — ALIGNMENT & POST-TRAINING
Anthropic | San Francisco, CA | Full-Time | Reports to: Head of Alignment

ABOUT ANTHROPIC
Anthropic is an AI safety company. We build reliable, interpretable, and steerable AI systems — Claude is our most recent product.

THE ROLE
We are seeking a Senior Research Scientist to join our Alignment team. You will drive technical research on RLHF, constitutional AI, and post-training methods that make Claude more helpful, harmless, and honest.

RESPONSIBILITIES
• Lead research projects end-to-end from hypothesis through deployment
• Collaborate with engineering on scalable post-training infrastructure
• Publish research at top-tier ML venues
• Mentor junior researchers and research interns

REQUIREMENTS
• PhD in ML, CS, Stats, or related field + 5 years post-PhD research experience
• First-author publications at NeurIPS, ICML, ICLR, or ACL
• Deep familiarity with RLHF, DPO, and related post-training methods
• Experience training large language models at scale (100B+ parameters)

COMPENSATION
• Base: $340,000 - $450,000
• Equity participation (meaningful grant)
• Full benefits + 401(k)`,
  },
  {
    id: 'bdoc-jd-moderna-cra',
    name: 'Moderna — Senior Clinical Research Associate JD',
    fileName: 'moderna-senior-cra-oncology.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 88_000,
    fileFamily: 'office',
    category: 'correspondence',
    description: 'JD for the CRA role in Moderna\'s mRNA oncology pipeline. Phase 2/3 monitoring focus.',
    tags: ['JD', 'active-search'],
    contactId: 'org-6',
    uploadedAt: '2026-04-02',
    updatedAt: '2026-04-02',
    uploadedBy: 'Paul Wentzell',
    textContent: `SENIOR CLINICAL RESEARCH ASSOCIATE — mRNA ONCOLOGY
Moderna, Inc. | Cambridge, MA (hybrid, ~40% travel) | Full-Time

THE ROLE
Reporting to the Clinical Operations Manager, this CRA will monitor Phase 2/3 oncology trials across 8-12 sites. This is a critical role supporting our mRNA-4157 (personalized cancer vaccine) program.

REQUIREMENTS
• BS/MS/PhD in life sciences
• 5+ years of on-site CRA monitoring (oncology strongly preferred)
• ICH-GCP, Veeva CTMS, Medidata Rave proficiency
• Willingness to travel 40-60%

COMPENSATION
• Base: $145,000 - $175,000 + 20% target bonus
• Equity grant
• Full benefits`,
  },
  {
    id: 'bdoc-jd-sidley-partner',
    name: 'Sidley Austin — Lateral Partner M&A JD',
    fileName: 'sidley-lateral-partner-ma-nyc.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 92_000,
    fileFamily: 'office',
    category: 'correspondence',
    description: 'JD / partnership-requirements summary. Target portable book $4M+.',
    tags: ['JD', 'active-search', 'confidential'],
    contactId: 'org-16',
    uploadedAt: '2026-03-25',
    updatedAt: '2026-03-25',
    uploadedBy: 'Paul Wentzell',
    textContent: `LATERAL PARTNER — M&A GROUP (NYC)
Sidley Austin LLP | New York Office

ROLE OVERVIEW
Sidley Austin seeks to lateral a senior M&A partner into its New York office to expand its middle-market private-equity practice.

PROFILE
• 10-18 years of M&A practice
• Strong private-equity sponsor relationships
• Portable book target: $4M+ per year (can accommodate $3.2M+ with strategic fit)
• Active NY bar; additional state bars a plus

COMPENSATION
• Guaranteed first-year compensation: $2.8M-$3.6M depending on book
• Multi-year guarantee available for the right profile
• Full partnership-track equity participation from year 1`,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// MERGED EXPORT
// ─────────────────────────────────────────────────────────────────────────

export const BULK_DOCUMENTS: CrmDocument[] = [
  ...RESUMES,
  ...MSAS,
  ...PLACEMENT_DOCS,
  ...SLATES,
  ...LICENSES,
  ...INVOICES,
  ...JOB_DESCRIPTIONS,
];
