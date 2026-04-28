'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Email template store. Templates are reusable subject + body pairs with
 * `{{merge}}` placeholders that auto-fill from the selected contact at
 * send time. Saved drafts the user reaches for repeatedly — intro
 * outreach, follow-ups, scheduling pings — graduate from "I retype this
 * every week" to one-click.
 *
 * Industry pattern: every CRM with email integration has templates as
 * a top-level concept. HubSpot calls them "Snippets" + "Templates,"
 * Salesforce "Email Templates," Pipedrive "Email Templates," Close
 * "Templates." Roadrunner's flavor stays simple: client-side only for
 * now, persisted to localStorage so they survive reloads. Promote to
 * a `email_templates` Supabase table when multi-device sync becomes
 * a real need (probably the same time we add team accounts).
 *
 * Supported merge fields (case-insensitive):
 *   {{firstName}}    — first word of contact.name (for persons)
 *   {{lastName}}     — last word of contact.name (for persons)
 *   {{fullName}}     — contact.name as-is
 *   {{company}}      — orgName (person) or name (org)
 *   {{title}}        — contact.title (person)
 *   {{email}}        — primary email address
 *   {{senderName}}   — current user's display name
 *   {{senderEmail}}  — current user's email
 *
 * Unrecognized {{tokens}} are left in place rather than blanked — keeps
 * accidental typos visible instead of silently dropping characters.
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  /** Created/updated timestamps for sort + future "last used" tracking. */
  createdAt: string;
  updatedAt: string;
  /** Total times this template was applied to a draft (single or bulk).
   *  Drives the "Used N times" badge in the picker so popular templates
   *  surface to the top — same UX pattern as HubSpot's "most used"
   *  template sort and Outreach's template performance leaderboard. */
  usageCount?: number;
  /** ISO timestamp of the last apply. Lets us show "Used 2 days ago"
   *  and stale-template warnings later. */
  lastUsedAt?: string;
}

interface TemplateStore {
  templates: EmailTemplate[];
  addTemplate: (t: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => EmailTemplate;
  updateTemplate: (id: string, patch: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'body'>>) => void;
  deleteTemplate: (id: string) => void;
  /** Increment usageCount + stamp lastUsedAt. Called every time a user
   *  applies the template — single composer, bulk composer, or sequence
   *  step builder. */
  trackUsage: (id: string, delta?: number) => void;
  /** Seed-once: only fires when the store is empty so we don't clobber user edits. */
  seedDefaultsIfEmpty: () => void;
}

/**
 * Starter templates that ship with the app. Calibrated to recruiting +
 * sales-handoff use cases since that's Roadrunner's audience. Users
 * can edit, delete, or add their own — these just exist so the
 * picker isn't empty on first open.
 */
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl-intro',
    name: 'Cold intro',
    subject: 'Quick intro — {{senderName}} at Roadrunner',
    body:
      'Hi {{firstName}},\n\n' +
      "I noticed your work at {{company}} and wanted to reach out — we're working on something I think you'd find relevant.\n\n" +
      'Open to a 15-minute call this week or next?\n\n' +
      'Best,\n{{senderName}}',
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
  },
  {
    id: 'tmpl-followup',
    name: 'Follow-up after no reply',
    subject: 'Following up — {{firstName}}',
    body:
      'Hi {{firstName}},\n\n' +
      "Just floating this back to the top of your inbox in case it got buried. Still happy to chat whenever works on your end.\n\n" +
      'Thanks,\n{{senderName}}',
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
  },
  {
    id: 'tmpl-meeting-request',
    name: 'Meeting request',
    subject: '15 min next week, {{firstName}}?',
    body:
      'Hi {{firstName}},\n\n' +
      "Would you be open to a 15-minute call next week? I'd love to walk you through how we're thinking about the {{company}} use case.\n\n" +
      'A few times that work for me — happy to send a calendar link if any of these are good:\n' +
      '  • Tue 10:00 ET\n' +
      '  • Wed 14:00 ET\n' +
      '  • Thu 09:30 ET\n\n' +
      'Best,\n{{senderName}}',
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
  },
  {
    id: 'tmpl-thanks',
    name: 'Thanks after call',
    subject: 'Thanks for the time, {{firstName}}',
    body:
      'Hi {{firstName}},\n\n' +
      "Thanks for the call today — really appreciated the context on {{company}}. I'll follow up with what we discussed in the next day or two.\n\n" +
      'Best,\n{{senderName}}',
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
  },
];

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `tmpl-${Date.now().toString(36)}-${_idCounter}`;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (input) => {
        const now = new Date().toISOString();
        const t: EmailTemplate = {
          id: input.id ?? nextId(),
          name: input.name,
          subject: input.subject,
          body: input.body,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ templates: [...s.templates, t] }));
        return t;
      },

      updateTemplate: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: now } : t,
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
      },

      trackUsage: (id, delta = 1) => {
        const now = new Date().toISOString();
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id
              ? { ...t, usageCount: (t.usageCount ?? 0) + delta, lastUsedAt: now }
              : t,
          ),
        }));
      },

      seedDefaultsIfEmpty: () => {
        const cur = get().templates;
        if (cur.length > 0) return;
        set({ templates: DEFAULT_TEMPLATES });
      },
    }),
    {
      name: 'roadrunner.templates',
      version: 1,
    },
  ),
);

/**
 * Substitutes {{merge}} tokens in a string using the supplied context.
 * Case-insensitive. Unknown tokens are left in place so typos surface
 * instead of silently disappearing.
 */
export function applyTemplateVariables(
  text: string,
  ctx: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    company?: string;
    title?: string;
    email?: string;
    senderName?: string;
    senderEmail?: string;
  },
): string {
  return text.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, raw: string) => {
    const key = raw.toLowerCase();
    const map: Record<string, string | undefined> = {
      firstname: ctx.firstName,
      lastname: ctx.lastName,
      fullname: ctx.fullName,
      company: ctx.company,
      title: ctx.title,
      email: ctx.email,
      sendername: ctx.senderName,
      senderemail: ctx.senderEmail,
    };
    const value = map[key];
    return value ?? match;
  });
}

/**
 * Build the merge-field context from a contact + the signed-in user.
 * Keeps the substitution logic unaware of the contact shape — passes
 * just the strings it needs.
 */
export function buildTemplateContext(args: {
  contactName?: string;
  contactType?: 'person' | 'org';
  orgName?: string;
  title?: string;
  email?: string;
  userName?: string;
  userEmail?: string;
}): Parameters<typeof applyTemplateVariables>[1] {
  const { contactName, contactType, orgName, title, email, userName, userEmail } = args;
  const isPerson = contactType !== 'org';
  const parts = (contactName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = isPerson ? parts[0] || '' : '';
  const lastName = isPerson && parts.length > 1 ? parts[parts.length - 1] : '';
  return {
    firstName,
    lastName,
    fullName: contactName || '',
    company: isPerson ? (orgName || '') : (contactName || ''),
    title: title || '',
    email: email || '',
    senderName: userName || '',
    senderEmail: userEmail || '',
  };
}
