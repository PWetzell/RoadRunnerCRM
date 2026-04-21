/**
 * Gravatar — email → public profile (name, avatar, bio, socials) via md5(email).
 *
 * Docs: https://docs.gravatar.com/api/profiles/rest-api/
 * Cost: free, no auth.
 */

import crypto from 'node:crypto';
import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalPerson } from './types';

interface GravatarEntry {
  hash?: string;
  displayName?: string;
  preferredUsername?: string;
  name?: { formatted?: string; givenName?: string; familyName?: string };
  aboutMe?: string;
  currentLocation?: string;
  thumbnailUrl?: string;
  profileUrl?: string;
  urls?: { value: string; title: string }[];
}

// We cache a sentinel for "lookup returned nothing" so we don't hammer the API.
const NEG = { __negative: true } as unknown as GravatarEntry;
const cache = getCache<GravatarEntry>('gravatar', 500, 24 * 60 * 60 * 1000);

export async function lookupGravatar(email: string): Promise<ExternalPerson | null> {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return null;

  const hash = crypto.createHash('md5').update(clean).digest('hex');
  const cached = cache.get(hash);
  let entry: GravatarEntry | undefined = cached;
  if (entry && (entry as { __negative?: boolean }).__negative) return null;

  if (!entry) {
    try {
      const res = await fetchWithTimeout(`${PROVIDER_CONFIG.gravatar.baseUrl}/${hash}.json`);
      if (!res.ok) {
        cache.set(hash, NEG);
        return null;
      }
      const json = (await res.json()) as { entry?: GravatarEntry[] };
      entry = json.entry?.[0];
      cache.set(hash, entry || NEG);
    } catch {
      return null;
    }
  }
  if (!entry || (entry as { __negative?: boolean }).__negative) return null;

  return {
    id: `gravatar:${hash}`,
    source: 'gravatar',
    sourceUrl: entry.profileUrl,
    name: entry.displayName || entry.name?.formatted || entry.preferredUsername || email,
    firstName: entry.name?.givenName,
    lastName: entry.name?.familyName,
    email: clean,
    avatarUrl: entry.thumbnailUrl ? `${entry.thumbnailUrl}?s=128` : undefined,
    bio: entry.aboutMe,
    location: entry.currentLocation,
    identifiers: { gravatar: hash },
    confidence: 95,     // exact email match
    matchedFields: ['email'],
  };
}
