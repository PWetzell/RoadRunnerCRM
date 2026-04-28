'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Bulk-send batch log. Every time the user clicks "Send" in the
 * BulkEmailComposer, we create a `BulkBatch` record with all the
 * recipients pre-populated in 'pending' state, then flip each
 * recipient to 'sent' or 'failed' as the per-recipient API calls
 * resolve. The /sent page reads from this store to render the
 * "Bulk sends" feed and per-batch detail panel.
 *
 * Industry parallel: HubSpot Marketing → Emails list, Outreach Sent
 * tab, Close Sent filter. All of those show one row per bulk action
 * with a drill-down to per-recipient delivery status. Roadrunner's
 * version is leaner but covers the same data shape.
 *
 * Persistence: localStorage via Zustand persist for now. When we
 * graduate sequences to a Supabase table (Phase-2 automation), this
 * store moves alongside it so the cron worker can append batches
 * without depending on a logged-in browser.
 */

export type BulkRecipientStatus = 'pending' | 'sent' | 'failed';

export interface BulkRecipientRecord {
  /** Resolved recipient email address. */
  email: string;
  /** CRM contact id when the recipient came from the contacts/lists
   *  picker. Empty for ad-hoc custom addresses. Lets the detail
   *  panel link to the contact's record. */
  contactId?: string;
  /** Display name — contact's full name when known, else the email. */
  contactName?: string;
  status: BulkRecipientStatus;
  /** ISO timestamp of the per-recipient send completion. Lets us
   *  show "delivered 2 min ago" in the detail panel. */
  resolvedAt?: string;
  /** Server error message when status === 'failed'. Helps the user
   *  understand whether to retry vs. fix the address. */
  error?: string;
}

/**
 * Attachment metadata captured at send time. We persist enough to render
 * a preview chip + a small inline preview (image thumbnail / PDF first
 * page placeholder) without re-fetching the file. The bytes themselves
 * stay on whatever store the composer used (Drive, Documents, Gmail's
 * own attachment id) — `previewUrl` either points at a public preview
 * URL or a data: URL for tiny embedded thumbs.
 *
 * Industry parallel: Gmail's Sent view, Outlook's Sent Items, and
 * HubSpot's email log all show attachment chips with type-icon + name +
 * size, and inline thumbs for images. Same shape here.
 */
export interface BatchAttachment {
  id: string;
  name: string;
  /** Bytes. Used for the "12.3 MB" label. */
  size: number;
  /** Standard MIME type — drives icon + preview behavior. */
  mimeType: string;
  /** Optional preview URL. For images this is the rendered thumbnail.
   *  For PDFs/docs this can be a first-page render. Omitted for files
   *  we can't preview, in which case the UI shows just a type icon. */
  previewUrl?: string;
}

export interface BulkBatch {
  id: string;
  sentAt: string;
  /** The TEMPLATED subject as the user typed it (with merge fields
   *  intact). Actual sent subjects vary per recipient after
   *  substitution. */
  subject: string;
  /** First ~200 chars of the templated body. Used for a preview snippet
   *  in the feed without bloating localStorage with full bodies. */
  bodyPreview: string;
  /** Optional template name when the user applied one. Useful for
   *  filtering and template-performance analytics later. */
  templateName?: string;
  /** Files attached to every recipient's send. Optional — most bulk
   *  emails don't carry attachments. */
  attachments?: BatchAttachment[];
  recipients: BulkRecipientRecord[];
}

interface BulkBatchStore {
  batches: BulkBatch[];
  createBatch: (input: Omit<BulkBatch, 'id' | 'sentAt'>) => BulkBatch;
  updateRecipient: (
    batchId: string,
    email: string,
    patch: Partial<Omit<BulkRecipientRecord, 'email' | 'contactId' | 'contactName'>>,
  ) => void;
  deleteBatch: (batchId: string) => void;
  clearAll: () => void;
  /** Seed-once: populates the feed with realistic bulk-send records so
   *  the /bulk page isn't empty during a fresh demo. Idempotent on a
   *  versioned demo marker — bumping the seed version replaces stale
   *  demo records but leaves user-created batches alone. */
  seedDemoIfEmpty: (contacts: { id: string; name: string; email: string }[]) => void;

  /** Strip every demo-marked batch from the store. Called on any page
   *  that detects the user is on a real (Gmail-connected) account, so
   *  demo data from a prior demo session doesn't pollute their real
   *  history. User-created batches are preserved. */
  removeDemoData: () => void;
}

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `batch-${Date.now().toString(36)}-${_idCounter}`;
}

export const useBulkBatchStore = create<BulkBatchStore>()(
  persist(
    (set, get) => ({
      batches: [],

      createBatch: (input) => {
        const batch: BulkBatch = {
          id: nextId(),
          sentAt: new Date().toISOString(),
          ...input,
        };
        set((s) => ({ batches: [batch, ...s.batches] }));
        return batch;
      },

      updateRecipient: (batchId, email, patch) => {
        set((s) => ({
          batches: s.batches.map((b) =>
            b.id !== batchId
              ? b
              : {
                  ...b,
                  recipients: b.recipients.map((r) =>
                    r.email.toLowerCase() === email.toLowerCase()
                      ? { ...r, ...patch }
                      : r,
                  ),
                },
          ),
        }));
      },

      deleteBatch: (batchId) => {
        set((s) => ({ batches: s.batches.filter((b) => b.id !== batchId) }));
      },

      clearAll: () => set({ batches: [] }),

      removeDemoData: () => {
        set((s) => ({
          batches: s.batches.filter((b) => !b.id.includes('-demo-')),
        }));
      },

      seedDemoIfEmpty: (contacts) => {
        // Idempotent on a versioned demo marker — bumping `SEED_VERSION`
        // forces the store to drop any stale demo records and lay down a
        // fresh set, while preserving anything the user created. Lets
        // the seed evolve (new attachments, fixed copy, more variety)
        // without users having to manually clear localStorage.
        const SEED_VERSION = 'v6';
        const demoMarker = `-demo-${SEED_VERSION}-`;
        const hasCurrentDemo = get().batches.some((b) => b.id.includes(demoMarker));
        if (hasCurrentDemo) return;
        const now = Date.now();
        const isoMinusMin = (m: number) => new Date(now - m * 60_000).toISOString();
        const isoMinusHr = (h: number) => new Date(now - h * 3_600_000).toISOString();
        const isoMinusDay = (d: number) => new Date(now - d * 86_400_000).toISOString();

        // Pick the first few real contacts (when present) so detail-panel
        // recipient rows link back to actual contact records. Fall back to
        // realistic ad-hoc addresses when the store is empty / under-seeded.
        const pick = (idx: number) => contacts[idx];
        const adhoc = (email: string, name: string) => ({ email, contactId: undefined, contactName: name });
        const fromContact = (idx: number, fallbackEmail: string, fallbackName: string) => {
          const c = pick(idx);
          if (c) return { email: c.email || fallbackEmail, contactId: c.id, contactName: c.name };
          return adhoc(fallbackEmail, fallbackName);
        };

        // Inline SVG previews — kept tiny so localStorage doesn't bloat.
        // Each is data:image/svg+xml so it renders directly in <img>
        // without any network round-trip. Industry parallel: Gmail's
        // sent view embeds attachment thumbnails the same way.
        const dataUriSvg = (svg: string) =>
          `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

        const slidePreview = dataUriSvg(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'>
            <defs>
              <linearGradient id='g1' x1='0' y1='0' x2='1' y2='1'>
                <stop offset='0' stop-color='#1955A6'/>
                <stop offset='1' stop-color='#3B82F6'/>
              </linearGradient>
            </defs>
            <rect width='400' height='240' fill='url(#g1)'/>
            <rect x='32' y='40' width='180' height='12' rx='3' fill='#FFFFFF' opacity='0.95'/>
            <rect x='32' y='62' width='240' height='8' rx='2' fill='#FFFFFF' opacity='0.7'/>
            <rect x='32' y='100' width='110' height='90' rx='6' fill='#FFFFFF' opacity='0.18'/>
            <rect x='160' y='100' width='110' height='90' rx='6' fill='#FFFFFF' opacity='0.18'/>
            <rect x='32' y='200' width='150' height='6' rx='2' fill='#FFFFFF' opacity='0.5'/>
            <text x='32' y='28' font-family='system-ui' font-size='10' fill='#FFFFFF' opacity='0.7'>Roadrunner • Q3</text>
          </svg>`);
        const screenshotPreview = dataUriSvg(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'>
            <rect width='400' height='240' fill='#F8FAFC'/>
            <rect x='0' y='0' width='400' height='28' fill='#1E293B'/>
            <circle cx='14' cy='14' r='5' fill='#EF4444'/>
            <circle cx='30' cy='14' r='5' fill='#F59E0B'/>
            <circle cx='46' cy='14' r='5' fill='#10B981'/>
            <rect x='20' y='44' width='110' height='180' rx='4' fill='#1955A6'/>
            <rect x='30' y='54' width='90' height='10' rx='2' fill='#FFFFFF' opacity='0.85'/>
            <rect x='30' y='72' width='70' height='6' rx='2' fill='#FFFFFF' opacity='0.5'/>
            <rect x='30' y='86' width='80' height='6' rx='2' fill='#FFFFFF' opacity='0.5'/>
            <rect x='30' y='100' width='65' height='6' rx='2' fill='#FFFFFF' opacity='0.5'/>
            <rect x='150' y='44' width='230' height='40' rx='4' fill='#FFFFFF' stroke='#E2E8F0'/>
            <rect x='160' y='54' width='80' height='8' rx='2' fill='#1955A6'/>
            <rect x='160' y='68' width='150' height='6' rx='2' fill='#94A3B8'/>
            <rect x='150' y='96' width='230' height='130' rx='4' fill='#FFFFFF' stroke='#E2E8F0'/>
            <rect x='160' y='110' width='100' height='10' rx='2' fill='#0F172A'/>
            <rect x='160' y='128' width='210' height='6' rx='2' fill='#94A3B8'/>
            <rect x='160' y='142' width='190' height='6' rx='2' fill='#94A3B8'/>
            <rect x='160' y='170' width='80' height='28' rx='4' fill='#16A34A'/>
            <rect x='250' y='170' width='80' height='28' rx='4' fill='#F1F5F9' stroke='#CBD5E1'/>
          </svg>`);
        const chartPreview = dataUriSvg(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'>
            <rect width='400' height='240' fill='#FFFFFF'/>
            <rect x='0' y='0' width='400' height='32' fill='#0F172A'/>
            <text x='16' y='21' font-family='system-ui' font-weight='700' font-size='12' fill='#FFFFFF'>Pipeline snapshot — May 2026</text>
            <line x1='40' y1='200' x2='380' y2='200' stroke='#E2E8F0' stroke-width='1'/>
            <line x1='40' y1='160' x2='380' y2='160' stroke='#E2E8F0' stroke-width='1'/>
            <line x1='40' y1='120' x2='380' y2='120' stroke='#E2E8F0' stroke-width='1'/>
            <line x1='40' y1='80' x2='380' y2='80' stroke='#E2E8F0' stroke-width='1'/>
            <rect x='60' y='130' width='32' height='70' fill='#1955A6'/>
            <rect x='110' y='105' width='32' height='95' fill='#1955A6'/>
            <rect x='160' y='90' width='32' height='110' fill='#1955A6'/>
            <rect x='210' y='75' width='32' height='125' fill='#16A34A'/>
            <rect x='260' y='95' width='32' height='105' fill='#16A34A'/>
            <rect x='310' y='65' width='32' height='135' fill='#16A34A'/>
            <text x='76' y='216' font-family='system-ui' font-size='9' fill='#64748B' text-anchor='middle'>Q1</text>
            <text x='126' y='216' font-family='system-ui' font-size='9' fill='#64748B' text-anchor='middle'>Q2</text>
            <text x='176' y='216' font-family='system-ui' font-size='9' fill='#64748B' text-anchor='middle'>Q3</text>
            <text x='226' y='216' font-family='system-ui' font-size='9' fill='#64748B' text-anchor='middle'>Q4</text>
            <text x='276' y='216' font-family='system-ui' font-size='9' fill='#64748B' text-anchor='middle'>Q1</text>
            <text x='326' y='216' font-family='system-ui' font-size='9' fill='#64748B' text-anchor='middle'>Q2</text>
          </svg>`);
        const officePreview = dataUriSvg(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'>
            <rect width='400' height='240' fill='#1F2937'/>
            <rect x='30' y='30' width='340' height='180' rx='8' fill='#FFFFFF'/>
            <rect x='30' y='30' width='340' height='38' rx='8' fill='#16A34A'/>
            <rect x='30' y='52' width='340' height='16' fill='#16A34A'/>
            <text x='50' y='55' font-family='system-ui' font-weight='700' font-size='13' fill='#FFFFFF'>Q3 Forecast.xlsx</text>
            <line x1='30' y1='90' x2='370' y2='90' stroke='#D1D5DB'/>
            <line x1='30' y1='110' x2='370' y2='110' stroke='#D1D5DB'/>
            <line x1='30' y1='130' x2='370' y2='130' stroke='#D1D5DB'/>
            <line x1='30' y1='150' x2='370' y2='150' stroke='#D1D5DB'/>
            <line x1='30' y1='170' x2='370' y2='170' stroke='#D1D5DB'/>
            <line x1='30' y1='190' x2='370' y2='190' stroke='#D1D5DB'/>
            <line x1='115' y1='68' x2='115' y2='210' stroke='#D1D5DB'/>
            <line x1='200' y1='68' x2='200' y2='210' stroke='#D1D5DB'/>
            <line x1='285' y1='68' x2='285' y2='210' stroke='#D1D5DB'/>
            <rect x='40' y='95' width='60' height='10' fill='#1F2937'/>
            <rect x='125' y='95' width='50' height='10' fill='#1F2937'/>
            <rect x='210' y='95' width='50' height='10' fill='#1F2937'/>
            <rect x='295' y='95' width='40' height='10' fill='#1F2937'/>
            <rect x='40' y='115' width='65' height='8' fill='#6B7280'/>
            <rect x='125' y='115' width='40' height='8' fill='#6B7280'/>
            <rect x='210' y='115' width='45' height='8' fill='#6B7280'/>
            <rect x='295' y='115' width='35' height='8' fill='#6B7280'/>
            <rect x='40' y='135' width='55' height='8' fill='#6B7280'/>
            <rect x='125' y='135' width='40' height='8' fill='#6B7280'/>
            <rect x='210' y='135' width='45' height='8' fill='#6B7280'/>
            <rect x='295' y='135' width='35' height='8' fill='#6B7280'/>
          </svg>`);
        const recapPreview = dataUriSvg(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'>
            <rect width='400' height='240' fill='#FEF3C7'/>
            <rect x='0' y='0' width='400' height='44' fill='#B45309'/>
            <text x='32' y='28' font-family='system-ui' font-weight='700' font-size='14' fill='#FFFFFF'>Demo recap — May 2026</text>
            <rect x='32' y='60' width='240' height='10' rx='2' fill='#92400E'/>
            <rect x='32' y='80' width='336' height='6' rx='2' fill='#A16207' opacity='0.7'/>
            <rect x='32' y='94' width='320' height='6' rx='2' fill='#A16207' opacity='0.7'/>
            <rect x='32' y='108' width='280' height='6' rx='2' fill='#A16207' opacity='0.7'/>
            <rect x='32' y='130' width='150' height='8' rx='2' fill='#92400E'/>
            <rect x='32' y='148' width='336' height='6' rx='2' fill='#A16207' opacity='0.7'/>
            <rect x='32' y='162' width='300' height='6' rx='2' fill='#A16207' opacity='0.7'/>
            <rect x='32' y='190' width='100' height='28' rx='4' fill='#92400E'/>
            <text x='82' y='208' font-family='system-ui' font-weight='700' font-size='11' fill='#FFFFFF' text-anchor='middle'>PDF</text>
          </svg>`);

        const batches: BulkBatch[] = [
          // ── Batch 1: Q3 product update — fully delivered ──────────────
          {
            id: `batch-${now.toString(36)}${demoMarker}1`,
            sentAt: isoMinusDay(2),
            subject: 'Q3 product update — early-access for top customers',
            bodyPreview:
              'Hi {{firstName}}, wanted to give you first look at the workflow rebuild we shipped this week. A few clients including {{company}} have already saved 4-6 hours/wk on intake…',
            templateName: 'Cold intro',
            attachments: [
              {
                id: 'att-q3-deck',
                name: 'Q3-product-update-deck.pdf',
                size: 4_320_000,
                mimeType: 'application/pdf',
                previewUrl: slidePreview,
              },
              {
                id: 'att-q3-screenshot',
                name: 'workflow-rebuild-preview.png',
                size: 248_000,
                mimeType: 'image/png',
                previewUrl: screenshotPreview,
              },
            ],
            recipients: [
              { ...fromContact(0, 'priya.shah@northwind.io', 'Priya Shah'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...fromContact(1, 'alistair.penrose@penroseco.com', 'Alistair Penrose'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...fromContact(2, 'anastasia.k@kuznetsova.partners', 'Anastasia Kuznetsova'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('m.delacroix@helixhealth.com', 'Margot Delacroix'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('jamal.okafor@fairwind.co', 'Jamal Okafor'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('sayuri.tanaka@orca-labs.jp', 'Sayuri Tanaka'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('ben.andrews@cascadepartners.com', 'Ben Andrews'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('rachel.koh@northstar.vc', 'Rachel Koh'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('felix.schroeder@oberland.de', 'Felix Schröder'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('ines.barros@portoharbor.pt', 'Inês Barros'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('arjun.iyer@kestrelai.com', 'Arjun Iyer'), status: 'sent', resolvedAt: isoMinusDay(2) },
              { ...adhoc('lena.vogel@altweg.ch', 'Lena Vogel'), status: 'sent', resolvedAt: isoMinusDay(2) },
            ],
          },
          // ── Batch 2: Follow-up — clean delivery, with a recap PDF ─────
          {
            id: `batch-${now.toString(36)}${demoMarker}2`,
            sentAt: isoMinusHr(20),
            subject: 'Following up — still considering {{company}}?',
            bodyPreview:
              "Hi {{firstName}}, circling back on the demo we lined up. Happy to push it later in the week if your bandwidth is tight — just want to make sure I'm not chasing if it's no longer a priority…",
            templateName: 'Follow-up after no reply',
            attachments: [
              {
                id: 'att-recap',
                name: 'demo-recap-may-2026.pdf',
                size: 1_120_000,
                mimeType: 'application/pdf',
                previewUrl: recapPreview,
              },
            ],
            recipients: [
              { ...adhoc('declan.murphy@redfern.ie', 'Declan Murphy'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('amelia.cho@quantbridge.io', 'Amelia Cho'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('thierry.lambert@meridian.fr', 'Thierry Lambert'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('kristin.engel@nordlys.no', 'Kristin Engel'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('paolo.serra@trevisogroup.it', 'Paolo Serra'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('hannah.weiss@firstline.com', 'Hannah Weiss'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('haruto.morimoto@kobe-systems.jp', 'Haruto Morimoto'), status: 'sent', resolvedAt: isoMinusHr(20) },
              { ...adhoc('omar.haddad@oasisventures.ae', 'Omar Haddad'), status: 'sent', resolvedAt: isoMinusHr(20) },
            ],
          },
          // ── Batch 3: Just kicked off — still in-flight ────────────────
          {
            id: `batch-${now.toString(36)}${demoMarker}3`,
            sentAt: isoMinusMin(8),
            subject: 'Quick favor — would you intro me to your CTO?',
            bodyPreview:
              "Hi {{firstName}}, hope all's well at {{company}}. Wanted to ask a small favor — would you be open to a quick intro to your CTO? We're working on something I think their team would find genuinely useful…",
            templateName: undefined,
            recipients: [
              { ...adhoc('rohan.bhatt@oakridge.partners', 'Rohan Bhatt'), status: 'sent', resolvedAt: isoMinusMin(8) },
              { ...adhoc('mei.lin@horizonbio.com', 'Mei Lin'), status: 'sent', resolvedAt: isoMinusMin(7) },
              { ...adhoc('cas.vandenberg@delftworks.nl', 'Cas van den Berg'), status: 'sent', resolvedAt: isoMinusMin(7) },
              { ...adhoc('zara.malik@kestrel.uk', 'Zara Malik'), status: 'sent', resolvedAt: isoMinusMin(6) },
              { ...adhoc('vidya.ramaswamy@northcape.io', 'Vidya Ramaswamy'), status: 'pending' },
            ],
          },
          // ── Batch 4: Investor update — large send, no attachments ─────
          // Big single-blast announcement. Mirrors the "Marketing > Email"
          // shape HubSpot demos use to show throughput at scale.
          {
            id: `batch-${now.toString(36)}${demoMarker}4`,
            sentAt: isoMinusDay(4),
            subject: 'Roadrunner — April investor update',
            bodyPreview:
              "Hi {{firstName}}, sharing our April update — revenue up 38% MoM, two enterprise pilots converted to annual, and we're closing the seed extension this month. Full numbers below…",
            templateName: undefined,
            recipients: [
              { ...adhoc('partners@northstar.vc', 'Northstar Ventures'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('lp1@brightline.capital', 'Brightline Capital'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('investments@helixgrowth.com', 'Helix Growth'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('partners@oakridge.partners', 'Oakridge Partners'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('hello@firstround.angels', 'First Round Angels'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('team@cascadeventures.com', 'Cascade Ventures'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('partners@meridian.fr', 'Meridian Partners'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('investments@nordlys.no', 'Nordlys Capital'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('contact@kobe-systems.jp', 'Kobe Strategic'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('partners@altweg.ch', 'Altweg Partners'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('lp@oasisventures.ae', 'Oasis Ventures'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('partners@quantbridge.io', 'Quantbridge'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('contact@redfern.ie', 'Redfern Capital'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('investments@trevisogroup.it', 'Treviso Group'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('lp@portoharbor.pt', 'Porto Harbor LP'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('hello@kestrelai.com', 'Kestrel AI'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('partners@oberland.de', 'Oberland Partners'), status: 'failed', resolvedAt: isoMinusDay(4), error: 'Mailbox full — recipient over quota' },
              { ...adhoc('investments@horizonbio.com', 'Horizon Bio'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('contact@delftworks.nl', 'Delftworks'), status: 'sent', resolvedAt: isoMinusDay(4) },
              { ...adhoc('partners@kuznetsova.partners', 'Kuznetsova Partners'), status: 'sent', resolvedAt: isoMinusDay(4) },
            ],
          },
          // ── Batch 5: Forecast — small high-touch send, spreadsheet ────
          // Three-recipient spreadsheet share. Tests the "almost-personal"
          // bulk shape that HubSpot/Outreach handle as bulk-of-N.
          {
            id: `batch-${now.toString(36)}${demoMarker}5`,
            sentAt: isoMinusHr(38),
            subject: 'Q3 forecast workbook for {{company}} review',
            bodyPreview:
              "Hi {{firstName}}, sharing the latest Q3 forecast workbook ahead of our Wednesday review — let me know if anything looks off and I'll loop in finance before the call…",
            templateName: undefined,
            attachments: [
              {
                id: 'att-q3-forecast-xlsx',
                name: 'Q3-forecast-workbook.xlsx',
                size: 84_000,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                previewUrl: officePreview,
              },
            ],
            recipients: [
              { ...adhoc('cfo@northwind.io', 'Aanya Kapoor'), status: 'sent', resolvedAt: isoMinusHr(38) },
              { ...adhoc('finance@fairwind.co', 'Daniel Petrov'), status: 'sent', resolvedAt: isoMinusHr(38) },
              { ...adhoc('ops@helixhealth.com', 'Sophie Bauer'), status: 'sent', resolvedAt: isoMinusHr(38) },
            ],
          },
          // ── Batch 6: Conference recap — older send, three attachments ─
          // Shows what older history looks like + multi-attachment density.
          {
            id: `batch-${now.toString(36)}${demoMarker}6`,
            sentAt: isoMinusDay(8),
            subject: 'Recap from SaaSConnect — slides + chart pack inside',
            bodyPreview:
              'Hi {{firstName}}, great seeing you at SaaSConnect. As promised — slides from our session, the benchmark chart pack, and the snapshot we walked through on Day 2. Holler with questions…',
            templateName: 'Thanks after call',
            attachments: [
              {
                id: 'att-saas-deck',
                name: 'SaaSConnect-2026-deck.pdf',
                size: 6_840_000,
                mimeType: 'application/pdf',
                previewUrl: slidePreview,
              },
              {
                id: 'att-benchmarks',
                name: 'benchmark-chart-pack.pdf',
                size: 2_310_000,
                mimeType: 'application/pdf',
                previewUrl: chartPreview,
              },
              {
                id: 'att-pipeline-snapshot',
                name: 'pipeline-snapshot-may.png',
                size: 412_000,
                mimeType: 'image/png',
                previewUrl: chartPreview,
              },
            ],
            recipients: [
              { ...adhoc('priya.shah@northwind.io', 'Priya Shah'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('alistair.penrose@penroseco.com', 'Alistair Penrose'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('m.delacroix@helixhealth.com', 'Margot Delacroix'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('jamal.okafor@fairwind.co', 'Jamal Okafor'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('declan.murphy@redfern.ie', 'Declan Murphy'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('amelia.cho@quantbridge.io', 'Amelia Cho'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('hannah.weiss@firstline.com', 'Hannah Weiss'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('paolo.serra@trevisogroup.it', 'Paolo Serra'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('thierry.lambert@meridian.fr', 'Thierry Lambert'), status: 'sent', resolvedAt: isoMinusDay(8) },
              { ...adhoc('kristin.engel@nordlys.no', 'Kristin Engel'), status: 'sent', resolvedAt: isoMinusDay(8) },
            ],
          },
          // ── Batch 7: Webinar invite — large, with hero image preview ──
          {
            id: `batch-${now.toString(36)}${demoMarker}7`,
            sentAt: isoMinusDay(11),
            subject: 'Live next Thursday — RevOps automation playbook',
            bodyPreview:
              "Hi {{firstName}}, we're hosting a 30-min live walk-through next Thursday on the automation patterns that have been working for teams at {{company}}'s scale. Spots are limited to keep the Q&A useful — saving one for you…",
            templateName: 'Cold intro',
            attachments: [
              {
                id: 'att-webinar-flyer',
                name: 'webinar-flyer.png',
                size: 524_000,
                mimeType: 'image/png',
                previewUrl: screenshotPreview,
              },
            ],
            recipients: Array.from({ length: 18 }).map((_, i) => {
              const seedNames: Array<[string, string]> = [
                ['nadia.khan@brightline.capital', 'Nadia Khan'],
                ['michael.obrien@cascadepartners.com', 'Michael O’Brien'],
                ['emi.sato@orca-labs.jp', 'Emi Sato'],
                ['liam.fitzgerald@redfern.ie', 'Liam Fitzgerald'],
                ['sara.gonzalez@oasisventures.ae', 'Sara Gonzalez'],
                ['fatima.alami@meridian.fr', 'Fatima Alami'],
                ['conrad.weiss@firstline.com', 'Conrad Weiss'],
                ['maria.svensson@nordlys.no', 'Maria Svensson'],
                ['vivian.zhao@horizonbio.com', 'Vivian Zhao'],
                ['benji.cohen@cascadeventures.com', 'Benji Cohen'],
                ['yuki.matsumoto@kobe-systems.jp', 'Yuki Matsumoto'],
                ['stefan.huber@altweg.ch', 'Stefan Huber'],
                ['naomi.adler@firstround.angels', 'Naomi Adler'],
                ['carlos.mendes@portoharbor.pt', 'Carlos Mendes'],
                ['ravi.nair@kestrelai.com', 'Ravi Nair'],
                ['olivia.dubois@meridian.fr', 'Olivia Dubois'],
                ['hugo.larsson@nordlys.no', 'Hugo Larsson'],
                ['elena.dimitriou@trevisogroup.it', 'Elena Dimitriou'],
              ];
              const [email, name] = seedNames[i];
              return { ...adhoc(email, name), status: 'sent' as const, resolvedAt: isoMinusDay(11) };
            }),
          },
          // ── Batch 8: Renewal reminder — small, no template ────────────
          {
            id: `batch-${now.toString(36)}${demoMarker}8`,
            sentAt: isoMinusHr(3),
            subject: 'Your {{company}} subscription renews next week — quick check-in',
            bodyPreview:
              "Hi {{firstName}}, your annual plan is set to renew on the 18th. Wanted to make sure everything's still on track and answer any questions before it processes — feel free to ping me directly…",
            templateName: undefined,
            recipients: [
              { ...adhoc('billing@kestrelai.com', 'Aiden Brooks'), status: 'sent', resolvedAt: isoMinusHr(3) },
              { ...adhoc('finance@northwind.io', 'Imani Bello'), status: 'sent', resolvedAt: isoMinusHr(3) },
              { ...adhoc('ops@delftworks.nl', 'Joris van Dam'), status: 'sent', resolvedAt: isoMinusHr(3) },
              { ...adhoc('admin@cascadepartners.com', 'Renee Solano'), status: 'sent', resolvedAt: isoMinusHr(3) },
              { ...adhoc('contact@orca-labs.jp', 'Hina Watanabe'), status: 'sent', resolvedAt: isoMinusHr(3) },
              { ...adhoc('billing@helixhealth.com', 'Tomas Acker'), status: 'sent', resolvedAt: isoMinusHr(3) },
            ],
          },
          // ── Batch 9: Re-engagement — older, mixed delivery ───────────
          // Cold list = realistic 6.5% bounce rate. Tests the
          // multi-failure card layout in the detail panel.
          {
            id: `batch-${now.toString(36)}${demoMarker}9`,
            sentAt: isoMinusDay(15),
            subject: "Haven't heard from you in a while, {{firstName}} — still want updates?",
            bodyPreview:
              "Hi {{firstName}}, you signed up for our updates a while back and we've been quiet on your end — totally understand if priorities shifted. Quick yes/no: keep you on the list, or let you go?…",
            templateName: undefined,
            recipients: [
              { ...adhoc('isaac.rivera@brightline.capital', 'Isaac Rivera'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('priya.menon@quantbridge.io', 'Priya Menon'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('greta.weber@oberland.de', 'Greta Weber'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('lapsed@old-domain.example', 'Stale Address'), status: 'failed', resolvedAt: isoMinusDay(15), error: 'No such mailbox' },
              { ...adhoc('mateo.silva@portoharbor.pt', 'Mateo Silva'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('changedjobs@no-longer-here.test', 'Stale Address'), status: 'failed', resolvedAt: isoMinusDay(15), error: 'Mailbox disabled' },
              { ...adhoc('hilde.berg@nordlys.no', 'Hilde Berg'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('javier.ortiz@meridian.fr', 'Javier Ortiz'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('connor.wallace@firstline.com', 'Connor Wallace'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('lina.tran@cascadeventures.com', 'Lina Tran'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('archive@bouncing-domain.example', 'Stale Address'), status: 'failed', resolvedAt: isoMinusDay(15), error: 'DNS lookup failed' },
              { ...adhoc('emiko.fukuda@kobe-systems.jp', 'Emiko Fukuda'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('andre.lefevre@meridian.fr', 'Andre Lefevre'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('siobhan.murphy@redfern.ie', 'Siobhan Murphy'), status: 'sent', resolvedAt: isoMinusDay(15) },
              { ...adhoc('felix.dubois@altweg.ch', 'Felix Dubois'), status: 'sent', resolvedAt: isoMinusDay(15) },
            ],
          },
          // ── Batch 10: Survey — short copy, hero image ────────────────
          {
            id: `batch-${now.toString(36)}${demoMarker}10`,
            sentAt: isoMinusDay(6),
            subject: '60-second survey — help shape what we build next',
            bodyPreview:
              "Hi {{firstName}}, six questions, sixty seconds — would mean a lot. We're using the answers to decide between three big bets for next quarter and want to bet on what {{company}} actually needs…",
            templateName: undefined,
            attachments: [
              {
                id: 'att-survey-banner',
                name: 'survey-banner.png',
                size: 312_000,
                mimeType: 'image/png',
                previewUrl: screenshotPreview,
              },
            ],
            recipients: [
              { ...adhoc('amir.zaki@oasisventures.ae', 'Amir Zaki'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('camille.rousseau@meridian.fr', 'Camille Rousseau'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('dimitri.popov@brightline.capital', 'Dimitri Popov'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('eva.hartmann@oberland.de', 'Eva Hartmann'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('finn.murphy@redfern.ie', 'Finn Murphy'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('grace.oduya@northstar.vc', 'Grace Oduya'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('hiro.tanaka@orca-labs.jp', 'Hiro Tanaka'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('iris.delaney@firstround.angels', 'Iris Delaney'), status: 'sent', resolvedAt: isoMinusDay(6) },
              { ...adhoc('jonas.svensson@nordlys.no', 'Jonas Svensson'), status: 'sent', resolvedAt: isoMinusDay(6) },
            ],
          },
          // ── Batch 11: Personal nudge — single recipient ──────────────
          // Single-recipient bulk happens in HubSpot/Outreach when a user
          // sends from a "send to selected" filtered view of one row. We
          // include it so the analytics aren't skewed toward bulk-sized.
          {
            id: `batch-${now.toString(36)}${demoMarker}11`,
            sentAt: isoMinusHr(50),
            subject: 'Tomorrow at 2pm still good for the {{company}} review?',
            bodyPreview:
              "Hi {{firstName}}, just confirming our 2pm tomorrow — I'll send a meet link 5 min before. Bringing the latest pipeline numbers + the comp benchmarks you asked about…",
            templateName: 'Meeting request',
            recipients: [
              { ...adhoc('priya.shah@northwind.io', 'Priya Shah'), status: 'sent', resolvedAt: isoMinusHr(50) },
            ],
          },
          // ── Batch 12: Newsletter — large, with PDF + image ───────────
          {
            id: `batch-${now.toString(36)}${demoMarker}12`,
            sentAt: isoMinusDay(20),
            subject: 'Roadrunner monthly — April highlights, May previews',
            bodyPreview:
              "Hi {{firstName}}, monthly roundup is here. Three product wins, two customer wins, one big bet for May. Plus an early look at what's shipping next week…",
            templateName: undefined,
            attachments: [
              {
                id: 'att-newsletter-banner',
                name: 'april-highlights.png',
                size: 612_000,
                mimeType: 'image/png',
                previewUrl: chartPreview,
              },
              {
                id: 'att-newsletter-pdf',
                name: 'roadrunner-monthly-april.pdf',
                size: 2_840_000,
                mimeType: 'application/pdf',
                previewUrl: recapPreview,
              },
            ],
            recipients: Array.from({ length: 14 }).map((_, i) => {
              const seedNames: Array<[string, string]> = [
                ['anika.iyer@kestrelai.com', 'Anika Iyer'],
                ['benji.cohen@cascadeventures.com', 'Benji Cohen'],
                ['caroline.dubois@meridian.fr', 'Caroline Dubois'],
                ['dean.fitzgerald@redfern.ie', 'Dean Fitzgerald'],
                ['elena.popescu@trevisogroup.it', 'Elena Popescu'],
                ['felipe.santos@portoharbor.pt', 'Felipe Santos'],
                ['gretchen.bauer@oberland.de', 'Gretchen Bauer'],
                ['hassan.malik@oasisventures.ae', 'Hassan Malik'],
                ['ines.martin@meridian.fr', 'Inès Martin'],
                ['johan.eriksson@nordlys.no', 'Johan Eriksson'],
                ['kenji.nishimura@kobe-systems.jp', 'Kenji Nishimura'],
                ['lily.donovan@firstround.angels', 'Lily Donovan'],
                ['marco.bianchi@trevisogroup.it', 'Marco Bianchi'],
                ['nora.steinberg@altweg.ch', 'Nora Steinberg'],
              ];
              const [email, name] = seedNames[i];
              return { ...adhoc(email, name), status: 'sent' as const, resolvedAt: isoMinusDay(20) };
            }),
          },
          // ── Batch 13: Welcome series — onboarding sequence ────────────
          // First-touch from a triggered onboarding cadence. Common
          // pattern in HubSpot's "Welcome" automation.
          {
            id: `batch-${now.toString(36)}${demoMarker}13`,
            sentAt: isoMinusHr(14),
            subject: 'Welcome aboard, {{firstName}} — let me show you around',
            bodyPreview:
              "Hi {{firstName}}, thrilled to have {{company}} in the family. Quick orientation: here's where to find your team's pipeline, where to set up Gmail sync, and the shortest path to your first automated sequence…",
            templateName: undefined,
            attachments: [
              {
                id: 'att-welcome-guide',
                name: 'getting-started-guide.pdf',
                size: 1_640_000,
                mimeType: 'application/pdf',
                previewUrl: slidePreview,
              },
            ],
            recipients: [
              { ...adhoc('mira.cho@quantbridge.io', 'Mira Cho'), status: 'sent', resolvedAt: isoMinusHr(14) },
              { ...adhoc('kofi.boateng@cascadeventures.com', 'Kofi Boateng'), status: 'sent', resolvedAt: isoMinusHr(14) },
              { ...adhoc('arjun.rao@kestrelai.com', 'Arjun Rao'), status: 'sent', resolvedAt: isoMinusHr(14) },
              { ...adhoc('anya.petrova@nordlys.no', 'Anya Petrova'), status: 'sent', resolvedAt: isoMinusHr(14) },
            ],
          },
          // ── Batch 14: Customer milestone — "happy birthday" send ─────
          // Anniversary congrats — relationship-building send. Outreach
          // and Apollo pitch this as a high-impact retention play.
          {
            id: `batch-${now.toString(36)}${demoMarker}14`,
            sentAt: isoMinusHr(28),
            subject: 'One year with Roadrunner — thank you, {{firstName}}',
            bodyPreview:
              "Hi {{firstName}}, this week marks one year since {{company}} joined Roadrunner. Wanted to say thanks for sticking with us through the rough early bits — your team has shaped a lot of what we've built since…",
            templateName: 'Thanks after call',
            recipients: [
              { ...adhoc('priya.shah@northwind.io', 'Priya Shah'), status: 'sent', resolvedAt: isoMinusHr(28) },
              { ...adhoc('alistair.penrose@penroseco.com', 'Alistair Penrose'), status: 'sent', resolvedAt: isoMinusHr(28) },
              { ...adhoc('m.delacroix@helixhealth.com', 'Margot Delacroix'), status: 'sent', resolvedAt: isoMinusHr(28) },
              { ...adhoc('jamal.okafor@fairwind.co', 'Jamal Okafor'), status: 'sent', resolvedAt: isoMinusHr(28) },
              { ...adhoc('ben.andrews@cascadepartners.com', 'Ben Andrews'), status: 'sent', resolvedAt: isoMinusHr(28) },
              { ...adhoc('rachel.koh@northstar.vc', 'Rachel Koh'), status: 'sent', resolvedAt: isoMinusHr(28) },
              { ...adhoc('felix.schroeder@oberland.de', 'Felix Schröder'), status: 'sent', resolvedAt: isoMinusHr(28) },
            ],
          },
          // ── Batch 15: Event invite — happy hour at conference ────────
          {
            id: `batch-${now.toString(36)}${demoMarker}15`,
            sentAt: isoMinusDay(3),
            subject: "Drinks at SaaSConnect Thursday — you'll be there?",
            bodyPreview:
              "Hi {{firstName}}, hosting an off-the-record happy hour at the rooftop bar Thursday 7pm — small group, no agenda, just folks who've been kind enough to take our calls this year. Save you a spot?…",
            templateName: undefined,
            attachments: [
              {
                id: 'att-event-flyer',
                name: 'happy-hour-invite.png',
                size: 384_000,
                mimeType: 'image/png',
                previewUrl: screenshotPreview,
              },
            ],
            recipients: [
              { ...adhoc('declan.murphy@redfern.ie', 'Declan Murphy'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('amelia.cho@quantbridge.io', 'Amelia Cho'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('thierry.lambert@meridian.fr', 'Thierry Lambert'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('kristin.engel@nordlys.no', 'Kristin Engel'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('paolo.serra@trevisogroup.it', 'Paolo Serra'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('hannah.weiss@firstline.com', 'Hannah Weiss'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('omar.haddad@oasisventures.ae', 'Omar Haddad'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('sayuri.tanaka@orca-labs.jp', 'Sayuri Tanaka'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('lena.vogel@altweg.ch', 'Lena Vogel'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('arjun.iyer@kestrelai.com', 'Arjun Iyer'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('rohan.bhatt@oakridge.partners', 'Rohan Bhatt'), status: 'sent', resolvedAt: isoMinusDay(3) },
              { ...adhoc('haruto.morimoto@kobe-systems.jp', 'Haruto Morimoto'), status: 'pending' },
            ],
          },
        ];

        // Replace any prior-version demo batches with the new ones,
        // preserve user-created batches untouched, and re-sort the
        // combined list newest-first to match `sentAt`.
        set((s) => {
          const userBatches = s.batches.filter((b) => !b.id.includes('-demo-'));
          return {
            batches: [...batches, ...userBatches].sort(
              (a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt),
            ),
          };
        });
      },
    }),
    { name: 'roadrunner.bulkBatches', version: 1 },
  ),
);

/** Quick-summary helpers used by the /sent feed. */
export function summarizeBatch(batch: BulkBatch): {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number; // 0..1
} {
  let sent = 0;
  let failed = 0;
  let pending = 0;
  for (const r of batch.recipients) {
    if (r.status === 'sent') sent += 1;
    else if (r.status === 'failed') failed += 1;
    else pending += 1;
  }
  const total = batch.recipients.length;
  const successRate = total === 0 ? 0 : sent / total;
  return { total, sent, failed, pending, successRate };
}
