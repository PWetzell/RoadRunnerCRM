# Roadrunner CRM — Session Summary (2026-04-20)

> Chronological record of UX/UI work completed in the previous session, plus a **complete field-by-field validation audit** for Person + Organization detail cards (and related surfaces), ready to hand to a new session for implementation.

---

## Project Context

- **App**: Roadrunner CRM (`C:\Paul\navigator-crm-app`)
- **Goal**: Package as an Etsy template — feature baseline to match Salesforce / HubSpot / Monday / Zoho / Pipedrive
- **Stack**: Next.js 16 (Turbopack), React 19, Zustand v5 (+persist), TanStack Table v8, @dnd-kit, Tailwind v4, Phosphor Icons
- **Persistence**: localStorage under `roadrunner-*` keys with `skipHydration: true` + explicit `useStore.persist.rehydrate()` on client mount to beat a Zustand v5 / Next.js 16 hydration race

---

## Completed Work This Session (brief)

1. **Custom Report Builder + Library** (plan `fuzzy-crafting-knuth.md`): types/store/engine, cross-object presets, modal form+preview, report library tab, Custom Reports in Add Widget menus.
2. **Print/Export for Custom Reports** — so reports ship real value.
3. **Saved Lists system rework** — Bookmark=lists, Star=favorites; new `PinListsDropdown`, `ListMembershipPill`; simplified `SaveToListPicker` / `ManageListsDialog`.
4. **Sidebar SAVED LISTS** — Bookmark title icon, gear right-aligned, empty-state message.
5. **Detail header Star/Bookmark split** — across DetailHeader / SalesDetailHeader / DocumentPreviewPanel; kebab removed; pill added to tag row.
6. **Tag border consistency audit** — added `border` classes across 15+ files.
7. **Grid column width fixes** — all 4 grids using `canvas.measureText()` with uppercase letter-spacing.
8. **Destructive action audit** → ConfirmDialog on 10 actions.
9. **Duplicate-view name handling** — `uniqueName(base, existing)` helper.
10. **Rename UX** — explicit ✓/X, Enter/Esc, onBlur cancel.
11. **Modal transparency fix** — Report Builder `bg-[var(--surface-card)]`.

---

# VALIDATION — Complete field-by-field audit

## Two implementation paths

**Path A — `CardEditForm` surfaces (easy):**
`src/components/detail/CardEditForm.tsx` **already** wires `validation.ts`: it supports `required: true` and `rules: ValidationRule[]` on each field, renders errors with Warning icon, red border+shadow, required asterisk, touched/blur tracking. Sales tabs just don't *pass* those props. For these surfaces, only field configs change — no component code.

**Path B — `DetailsTab.tsx` inline forms (needs component changes):**
`EditForm` and `EntryEditForm` in `src/components/detail/DetailsTab.tsx` (~lines 734 and 770) do NOT support validation. They need to be extended to mirror `CardEditForm`'s pattern. This is the only real component change needed.

## Validation rule shorthand used below

| Shorthand | Rule |
|---|---|
| `required` | `!val.trim()` → "<Label> is required" |
| `email` | `isEmail()` from validation.ts |
| `phone` | `isPhone()` |
| `url` | `isUrl()` |
| `zip` | `/^\d{5}(-\d{4})?$/` |
| `maxLen(N)` | `maxLength(N)` |
| `minLen(N)` | `minLength(N)` |
| `positive` | `isPositiveNumber()` |
| `nonneg` | `isNonNegativeNumber()` |
| `date` | `isDate()` |
| `oneOf([...])` | whitelist enforcement |
| `range(min,max)` | numeric range 0–100 etc. |
| `name` | `/^[A-Za-z\s'\-\.]+$/` — letters, space, apostrophe, hyphen, period |

---

## 🧑 PERSON — detail cards (`DetailsTab.tsx`, isOrg = false)

Path: **B (inline forms in DetailsTab)**

### Card: Name (`SectionCard title="Names"`, fields array ~line 244)

| Field | Current | New config |
|---|---|---|
| **prefix** | NOT IN UI | ADD `{ key:'prefix', label:'Prefix (Optional)', type:'select', options:['Mr','Mrs','Ms','Mx','Dr','Prof','Rev','Hon','Sir','Dame'] }` |
| firstName | text | `{ ..., required:true, maxLen:60, validate:'name' }` |
| middleName | text | `{ ..., maxLen:40, validate:'name' }` |
| lastName | text | `{ ..., required:true, maxLen:60, validate:'name' }` |
| **suffix** | NOT IN UI | ADD `{ key:'suffix', label:'Suffix (Optional)', type:'select', options:['Jr','Sr','II','III','IV','V','PhD','MD','JD','DDS','DVM','Esq','CPA','CFA'] }` |
| type | select | required:true, oneOf enforced by select |

> `NameEntry` in `src/types/contact.ts` already has `prefix?` and `suffix?` — **no type change**.

### Card: Job Title (`SectionCard title="Job Title"`, ~line 270)

| Field | Current | New config |
|---|---|---|
| title | text | `required:true, maxLen:120` |
| department | select | type='select' already; no change |
| reportsTo | text | `maxLen:120` |

### Card: Addresses (~line 299)

| Field | Current | New config |
|---|---|---|
| type | select | already constrained |
| value (street) | text | `required:true, maxLen:200` |
| city | text | `required:true, maxLen:80, validate:'name'` (allow letters/spaces/hyphens) |
| state | select | already constrained |
| zip | text | `required:true, validate:'zip'` |
| country (not in UI) | — | Add optional `{ key:'country', label:'Country', value:'USA' }` |

### Card: Emails (~line 330)

| Field | Current | New config |
|---|---|---|
| value | text | `required:true, validate:'email'`, input `type="email" inputMode="email" autoComplete="email"` |
| type | select | already constrained |

### Card: Phones (~line 358)

| Field | Current | New config |
|---|---|---|
| value | text | `required:true, validate:'phone'`, input `type="tel" inputMode="tel" autoComplete="tel"` |
| type | select | already constrained |
| extension (not in UI) | — | Optional `{ key:'extension', label:'Ext. (Optional)', inputMode:'numeric', maxLen:10 }` |

### Card: Websites (~line 386)

| Field | Current | New config |
|---|---|---|
| value | text | `required:true, validate:'url'`, input `type="url" inputMode="url"` |
| type | select | already constrained |

### Card: General Information — person branch (~line 458)

| Field | Current | New config |
|---|---|---|
| orgName | text | `maxLen:120` |
| email | text | `validate:'email'` |
| phone | text | `validate:'phone'` |

### Card: Identification (~line 500)
Currently view-only with placeholder `onClick={() => {}}`. When edit UI is built:

| Field | Needed |
|---|---|
| type | required, select (SSN, Passport, Driver License, Tax ID, Employee ID, Other) |
| authority | required, maxLen:80 |
| value | required, maxLen:40 — SSN format `^\d{3}-\d{2}-\d{4}$` when type='SSN' |

### Card: Visibility & Access (~line 598)
No freeform inputs — all selects/toggles. **No validation needed.**

### Card: AI Record Health
Read-only. **No validation needed.**

### Card: System Identifiers
Read-only. **No validation needed.**

---

## 🏢 ORGANIZATION — detail cards (`DetailsTab.tsx`, isOrg = true)

Path: **B (inline forms in DetailsTab)**

### Card: Company Names (~line 241)

| Field | Current | New config |
|---|---|---|
| value | text | `required:true, maxLen:120` |
| type | select | already constrained |

### Card: Addresses (same fields as Person)

Same config as Person addresses — reused.

### Card: Emails (same as Person)

Same config.

### Card: Phones (same as Person)

Same config.

### Card: Websites (same as Person)

Same config.

### Card: General Information — org branch (~line 453)

| Field | Current | New config |
|---|---|---|
| industry | select | already constrained |
| employees | select | already constrained |
| hq | text | `required:true, maxLen:120` |
| description | textarea | `maxLen:500` |

### Card: Industries (~line 485)
Currently view-only. When edit UI is built:

| Field | Needed |
|---|---|
| code | required, `/^\d{2,6}$/` (NAICS/SIC format) |
| name | required, maxLen:80 |

---

## 💼 SALES — Deal detail cards

Path: **A (CardEditForm — just add props)**

### `SalesDetailsTab.tsx` — "Person" card (~line 103)

| Field | Current | Add |
|---|---|---|
| name | full text | `required:true, maxLen:120, rules:[...]` |
| title | text + placeholder | `maxLen:120` |
| department | text | `maxLen:80` |
| email | text + placeholder | `rules:[isEmail()]` |
| phone | text + placeholder | `rules:[isPhone()]` |
| orgName | text | `maxLen:120` |

### `SalesDetailsTab.tsx` — "Company" card (~line 142)

| Field | Current | Add |
|---|---|---|
| name | text | `required:true, maxLen:120` |
| industry | text | `maxLen:80` |
| employees | text | `rules:[oneOf('Employees', ['1-10','11-25','25-50','50-100','100-250','250-500','500-1000','1000+'])]` — or convert to select |
| hq | text | `required:true, maxLen:120` |
| website | text | `rules:[isUrl()]` |
| description | textarea | `rules:[maxLength(500)]` |

### `SalesDetailsTab.tsx` — "Engagement" card (~line 178)

| Field | Current | Add |
|---|---|---|
| name | full text | `required:true, maxLen:120` |
| amount | number | `required:true, rules:[isPositiveNumber()]` |
| expectedCloseDate | date | `required:true, rules:[isDate()]` — also `min={today}` on input |
| targetStartDate | date | `rules:[isDate()]` |
| source | select | already constrained |
| owner | text | `required:true, maxLen:60` |
| initiative | textarea | `rules:[maxLength(500)]` |

### `SalesQualifyTab.tsx` — "Engagement / Need" card (~line 120)

| Field | Add |
|---|---|
| initiative | `rules:[maxLength(500)]` |
| targetStartDate | `rules:[isDate()]` |

### `SalesQualifyTab.tsx` — "Company Details" card (~line 151)

| Field | Add |
|---|---|
| industry | `maxLen:80` |
| employees | oneOf(common buckets) or select |
| structure | select (already constrained) |
| category | select (already constrained) |
| hq | `required:true, maxLen:120` |

### `SalesQualifyTab.tsx` — "Revenue Volume" card (~line 186)

| Field | Add |
|---|---|
| annual | `rules:[isNonNegativeNumber()]` |
| quarterly | `rules:[isNonNegativeNumber()]` |
| monthly | `rules:[isNonNegativeNumber()]` |

> Logic check: quarterly×4 ≈ annual; monthly×12 ≈ annual — add warning (not error) in help text when mismatched > 20%.

### `SalesQualifyTab.tsx` — "Sales Volume" card (~line 217)

Same as Revenue Volume.

### `SalesQualifyTab.tsx` — "Products & Services" card (~line 352)
Uses inline custom editor, NOT CardEditForm. Needs separate treatment:

| Field | Add |
|---|---|
| type | `required:true, maxLen:60` |
| description | `required:true, maxLen:200` |

---

## 📄 DOCUMENTS — detail (`DocumentPreviewPanel.tsx`)

| Field | Current | Add |
|---|---|---|
| name | text | `required:true, maxLen:160` |
| category | select | already constrained |
| tags | multi-select | constrain each tag to maxLen:40 |
| expiresAt | date | `rules:[isDate()]` |

---

## ⚙️ OTHER SURFACES

### Settings page (`src/app/settings/page.tsx`)
| Field | Add |
|---|---|
| name | `required:true, maxLen:80` |
| email | `required:true, validate:'email'` |
| phone | `validate:'phone'` |
| password (change) | `required:true, minLen:8`, at least one number `/\d/`, at least one special `/[^a-zA-Z0-9]/` |
| password confirmation | match password |

### New Company / New Contact dialogs
| Field | Add |
|---|---|
| name | `required:true, maxLen:120` |
| email | `validate:'email'` |
| phone | `validate:'phone'` |
| website | `validate:'url'` |

### Alert rules (if creating rules with email recipients)
| Field | Add |
|---|---|
| email recipient | `validate:'email'` |

### Todos
| Field | Add |
|---|---|
| title | `required:true, maxLen:160` |
| dueDate | `rules:[isDate()]` |

---

## Path B implementation spec — `DetailsTab.tsx`

### 1. Extend `FieldConfig` (~line 726)

```ts
import type { ValidationRule } from '@/lib/validation';

interface FieldConfig {
  key: string;
  label: string;
  value?: string;
  type?: 'text' | 'select' | 'textarea' | 'email' | 'tel' | 'url';
  options?: string[];
  required?: boolean;
  maxLength?: number;
  validate?: 'email' | 'phone' | 'url' | 'zip' | 'name';
  rules?: ValidationRule[];
  placeholder?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal';
  autoComplete?: string;
}
```

### 2. Add state + validator in both `EditForm` and `EntryEditForm`

```ts
import { isEmail, isPhone, isUrl, validate, isValid, maxLength } from '@/lib/validation';
import { Warning } from '@phosphor-icons/react';

const [errors, setErrors] = useState<Record<string, string | null>>({});
const [touched, setTouched] = useState<Set<string>>(new Set());

const rulesMap = useMemo(() => {
  const map: Record<string, ValidationRule[]> = {};
  fields.forEach((f) => {
    const r: ValidationRule[] = [];
    if (f.required) r.push((v) => !v.trim() ? `${f.label.replace(/\s*\(.*?\)/, '')} is required` : null);
    if (f.maxLength) r.push(maxLength(f.maxLength));
    if (f.validate === 'email') r.push(isEmail());
    if (f.validate === 'phone') r.push(isPhone());
    if (f.validate === 'url')   r.push(isUrl());
    if (f.validate === 'zip')   r.push((v) => !v || /^\d{5}(-\d{4})?$/.test(v) ? null : 'Must be a 5- or 9-digit ZIP');
    if (f.validate === 'name')  r.push((v) => !v || /^[A-Za-z\s'\-\.]+$/.test(v) ? null : 'Only letters, spaces, apostrophes, hyphens');
    if (f.rules) r.push(...f.rules);
    if (r.length) map[f.key] = r;
  });
  return map;
}, [fields]);

const validateKey = (key: string, val: string) => {
  if (!rulesMap[key]) return null;
  return validate({ [key]: rulesMap[key] }, { [key]: val })[key] ?? null;
};

const handleChange = (key: string, val: string) => {
  setValues({ ...values, [key]: val });
  if (touched.has(key)) setErrors((e) => ({ ...e, [key]: validateKey(key, val) }));
};
const handleBlur = (key: string) => {
  setTouched((t) => new Set(t).add(key));
  setErrors((e) => ({ ...e, [key]: validateKey(key, values[key] || '') }));
};
const handleSave = () => {
  const allErrors = validate(rulesMap, values);
  setErrors(allErrors);
  setTouched(new Set(fields.map((f) => f.key)));
  if (!isValid(allErrors)) return;
  onSave(values);
};
```

### 3. Input render — add border/error state + input-type hints

```tsx
const inputBorder = (key: string) =>
  errors[key]
    ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
    : 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]';

<input
  type={f.validate === 'email' ? 'email'
      : f.validate === 'phone' ? 'tel'
      : f.validate === 'url'   ? 'url'
      : 'text'}
  inputMode={f.inputMode}
  autoComplete={f.autoComplete}
  value={values[f.key]}
  onChange={(e) => handleChange(f.key, e.target.value)}
  onBlur={() => handleBlur(f.key)}
  placeholder={f.placeholder}
  className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
/>
{errors[f.key] && (
  <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)]">
    <Warning size={12} weight="fill" /> {errors[f.key]}
  </div>
)}
```

### 4. Required-indicator on label

```tsx
<label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
  {f.label}{f.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
</label>
```

### 5. Save button disabled when errors exist
```tsx
<button onClick={handleSave}
  disabled={Object.values(errors).some(Boolean)}
  className="... disabled:opacity-50 disabled:cursor-not-allowed">
  <FloppyDisk size={14} /> Save
</button>
```

### 6. Swap per-field configs using the tables above (person Names, person Emails, Addresses, etc.)

---

## Path A implementation spec — Sales cards

For every `CardEditForm fields={[...]}` block in `SalesDetailsTab.tsx` and `SalesQualifyTab.tsx`, add the props from the tables above. Example transformation:

**Before:**
```ts
{ key: 'email', label: 'Email', value: personData.email, placeholder: 'name@company.com' }
```

**After:**
```ts
{ key: 'email', label: 'Email', value: personData.email, placeholder: 'name@company.com',
  rules: [isEmail()] }
```

**Before:**
```ts
{ key: 'amount', label: 'Amount', type: 'number', value: deal.amount || '', placeholder: '0' }
```

**After:**
```ts
{ key: 'amount', label: 'Amount', type: 'number', value: deal.amount || '', placeholder: '0',
  required: true, rules: [isPositiveNumber()] }
```

Add import at top of each file:
```ts
import { isEmail, isPhone, isUrl, isPositiveNumber, isNonNegativeNumber, isDate, maxLength, oneOf } from '@/lib/validation';
```

---

## Implementation Order (recommended)

1. **Path A — Sales cards first** (low risk, no component changes). Validates CardEditForm's already-built validation UX with real data.
   - SalesDetailsTab (Person card, Company card, Engagement card)
   - SalesQualifyTab (Engagement/Need, Company Details, Revenue, Sales Volume)
2. **Path B — DetailsTab**: extend `FieldConfig`, extend `EntryEditForm`, extend `EditForm`. Verify with one section first (Emails is simplest) before rolling across all cards.
3. **Add prefix/suffix** to Person names (UI addition).
4. **Settings, New Company, Alert rules, Todos** — each uses its own form component; apply the same pattern.
5. **Products & Services** inline editor in SalesQualifyTab — custom treatment.

---

## Verification checklist

- [ ] Clear localStorage → all seed data still loads cleanly
- [ ] Person Name edit → prefix/suffix appear; only whitelist values selectable
- [ ] Person email with "bad@" → red border + "Invalid email address" + Save disabled
- [ ] Person phone with "abc" → validates against phone regex
- [ ] Website with "not a url" → fails
- [ ] Zip "1234" fails; "12345" passes; "12345-6789" passes; "abcde" fails
- [ ] Org Company name blank → required error
- [ ] Sales Engagement Amount "−5" → fails positive-number check
- [ ] Sales Revenue monthly "abc" → fails non-negative-number
- [ ] Settings password "short" → fails min 8
- [ ] New Company website → validates
- [ ] Save button stays disabled while any error exists
- [ ] After fixing all errors, Save enables and persists
- [ ] Both light and dark themes render red error state correctly
- [ ] `type="email|tel|url"` inputs invoke correct mobile keyboards

---

---

# BUG — Settings switches not being respected

## Audit results

### ✅ Wired correctly (respected by the app)
- `sidebarBadges.{contacts,sales,recruiting,documents}` → `components/layout/Sidebar.tsx` line 117 — `showBadge = badgeKey && count > 0 && sidebarBadges?.[badgeKey]`
- `insightsBars.dashboard` → `app/dashboard/page.tsx` line 59
- `insightsBars.contacts` → `app/contacts/page.tsx` line 30
- `insightsBars.sales` → `app/sales/page.tsx` line 32
- `insightsBars.recruiting` → `app/recruiting/page.tsx` line 35
- `insightsBars.documents` → `app/documents/page.tsx` line 38
- `insightsBars.reporting` → `app/reporting/page.tsx` line 144
- `defaultView` → Contacts page filter selection
- `theme` via `useTheme` hook

### ❌ Dead switches — saved to localStorage but never read in app code

Grep result: `notifications.emailUpdates`, `notifications.staleAlerts`, `notifications.aiSuggestions` are only referenced in `settings/page.tsx` (the UI reading/writing the toggle itself) and `user-store.ts` (definition). **No other file reads them.**

| Setting | Should gate |
|---|---|
| `notifications.emailUpdates` | Weekly digest / email notifications (no email system yet — either wire up or remove switch) |
| `notifications.staleAlerts` ("Incomplete contact alerts") | Incomplete/stale badges, stale-reason banners, AIInsightsBar stale sections |
| `notifications.aiSuggestions` | All AI-related surfaces (see below) |

### Fix spec — respect `notifications.aiSuggestions`

Every component below should read `useUserStore((s) => s.notifications.aiSuggestions)` and early-return `null` when false:

| Component | Path |
|---|---|
| AIInsightsBar | `src/components/contacts/AIInsightsBar.tsx` — also remove from `app/contacts/page.tsx` line 30 (combine gates: `insightsBars?.contacts && aiSuggestions`) |
| AIDuplicateDetection | `src/components/contact-flow/ai/AIDuplicateDetection.tsx` |
| AIEnrichmentPreview | `src/components/contact-flow/ai/AIEnrichmentPreview.tsx` |
| AIOrgDuplicateDetection | `src/components/contact-flow/ai/AIOrgDuplicateDetection.tsx` |
| AIPrivacyAdvisory | `src/components/contact-flow/ai/AIPrivacyAdvisory.tsx` |
| AIDealDuplicateDetection | `src/components/sales/ai/AIDealDuplicateDetection.tsx` |
| OrgDuplicateFoundDialog | `src/components/contact-flow/OrgDuplicateFoundDialog.tsx` (suppress auto-open when off) |
| AISuggestionsWidget | `src/components/dashboard/widgets/AISuggestionsWidget.tsx` — show "AI suggestions are turned off in Settings" empty state OR hide the widget |
| AI Record Health card | `src/components/detail/DetailsTab.tsx` line ~525 — wrap `<SectionCard>` in gate |
| AI Status column | `src/components/contacts/DataGrid.tsx` — hide the `aiStatus` column when off |
| Any Sparkle-icon'd hints | Audit `<Sparkle>` usages across contact-flow, sales-flow |

### Fix spec — respect `notifications.staleAlerts`

| Component | Behavior when off |
|---|---|
| Sidebar badges for incomplete contacts | Hide / show 0 |
| `incomplete` prop on `<SectionCard>` | Don't render warning border/icon |
| Stale-reason banner in AI Record Health card | Hide |
| Stale-profile section in AIInsightsBar | Hide |
| "stale" red-triangle sidebar counts | Hide |

### Fix spec — `notifications.emailUpdates`

There's no email backend in this template. Decision needed:
- **Option A**: Remove the toggle altogether (cleaner for template buyers without a backend)
- **Option B**: Keep as "visual" preference and document in the README

### Settings page — other issues noted while auditing

1. **Password change has no validation** (line 49-58 of `settings/page.tsx`):
   - Current: `if (newPw && newPw === confirmPw)` — accepts any non-empty password including `"a"`
   - Needs: minLen(8), at least one digit, at least one special char, confirm match
2. **Name input no validation** — accepts empty string after trim-check that doesn't actually trim
3. **Email input no format validation** — accepts `"not an email"`
4. **Incomplete contact alerts** label mentions "AI flags a contact as incomplete" — if keeping AI flow gated by `aiSuggestions`, this toggle is redundant/confusing; consolidate or rename

---

## Patterns to keep using

- **Bookmark icon + brand blue** = list / save-to-list
- **Star icon + warning orange** = favorite / flagged record
- **Tags always have `border`** matched to fill color
- **Zustand v5 + Next 16**: `skipHydration:true` + explicit rehydrate on client mount
- **Destructive actions** always go through `ui/ConfirmDialog`
- **Rename**: explicit ✓/X buttons + Enter/Esc + onBlur cancel
- **Grid defaults**: generous, measured via canvas.measureText with uppercase letter-spacing
- **Widget customization**: headerColor / titleColor / contentTextColor / titleSize / contentTextSize via `<Widget>` wrapper
