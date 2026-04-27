/**
 * Demo-account configuration.
 *
 * Roadrunner is both a real CRM (used by Paul and any other live users to
 * manage their actual Gmail-sourced contacts) AND a portfolio case-study
 * piece. Those two use-cases want opposite things from the contact grid:
 *
 *   • Real users: empty grid until they connect Gmail or add contacts
 *     manually. Showing 170 fake people in their contact list would be
 *     deeply confusing — it's the equivalent of opening Gmail to find
 *     someone else's inbox.
 *
 *   • Portfolio visitors: a populated grid that shows off the design.
 *     Empty state is honest but doesn't sell the product.
 *
 * The compromise: one specific email is the "demo account" — it sees the
 * full seed dataset (170 contacts, notes, tasks, relationships). Every
 * other email starts empty and grows from real data only.
 *
 * Implementation: AuthGate inspects the signed-in email after a successful
 * auth event. If it matches `DEMO_EMAILS`, it dispatches `seedDemoData()`
 * on the contact store. Otherwise it dispatches `clearAll()` and leans on
 * `/api/contacts` to hydrate any cloud-backed data.
 *
 * The credentials below are intentionally checked into source: this is the
 * shared demo login, not a secret. The portfolio site needs to advertise
 * them anyway (or trigger the auto-fill button in AuthGate that uses
 * them). Treating them as secret would break the whole point of the demo.
 */

/**
 * Whitelist of emails that get seeded with demo data on sign-in.
 *
 * Add additional addresses here if we ever want internal team accounts to
 * see populated data for screenshot/marketing purposes. Keep the list
 * short — every entry is one more way for stale demo contacts to leak
 * into a real user's grid.
 */
export const DEMO_EMAILS: readonly string[] = ['demo@roadrunner.app'];

/**
 * Pre-shared credentials used by the "Try the demo" button on AuthGate.
 * Password meets our own complexity rules (12+ chars, mixed case, digit,
 * symbol) so signing in via this constant exercises the same Supabase
 * password validation a real user would hit.
 *
 * The corresponding Supabase user must exist — create it once via the
 * dashboard:  Authentication → Users → Add user → Create new user.
 */
export const DEMO_CREDENTIALS = {
  email: 'demo@roadrunner.app',
  password: 'RoadRunner2026!Demo',
} as const;

/** Case-insensitive whitelist check. Trims + lowercases for safety. */
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_EMAILS.includes(email.trim().toLowerCase());
}
