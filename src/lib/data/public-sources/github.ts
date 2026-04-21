/**
 * GitHub REST API — people + organizations search.
 *
 * Docs: https://docs.github.com/en/rest/search
 * Cost: free. 60 req/hr unauth. 5000 req/hr with a free Personal Access Token
 *       (set GITHUB_TOKEN in .env.local to upgrade).
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany, ExternalPerson } from './types';

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Organization';
}

interface GithubUserDetail extends GithubUser {
  name?: string;
  company?: string;
  blog?: string;
  email?: string;
  bio?: string;
  location?: string;
}

interface GithubOrgDetail {
  id: number;
  login: string;
  name?: string;
  avatar_url: string;
  blog?: string;
  description?: string;
  location?: string;
  html_url: string;
}

const peopleCache = getCache<GithubUser[]>('github-people', 200, 60 * 60 * 1000);
const orgCache = getCache<GithubUser[]>('github-orgs', 200, 60 * 60 * 1000);
const detailCache = getCache<GithubUserDetail | GithubOrgDetail | null>('github-detail', 500, 60 * 60 * 1000);

function authHeaders(): HeadersInit {
  const t = PROVIDER_CONFIG.github.token;
  return t ? { Authorization: `Bearer ${t}`, 'X-GitHub-Api-Version': '2022-11-28' } : { 'X-GitHub-Api-Version': '2022-11-28' };
}

async function detail(login: string, type: 'User' | 'Organization'): Promise<GithubUserDetail | GithubOrgDetail | null> {
  const key = `${type}:${login}`;
  const cached = detailCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const url = `${PROVIDER_CONFIG.github.baseUrl}/${type === 'Organization' ? 'orgs' : 'users'}/${encodeURIComponent(login)}`;
    const res = await fetchWithTimeout(url, { headers: authHeaders() });
    if (!res.ok) { detailCache.set(key, null); return null; }
    const json = await res.json();
    detailCache.set(key, json);
    return json;
  } catch {
    detailCache.set(key, null);
    return null;
  }
}

export async function searchGithubPeople(query: string): Promise<ExternalPerson[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let list = peopleCache.get(key);
  if (!list) {
    try {
      const url = `${PROVIDER_CONFIG.github.baseUrl}/search/users?q=${encodeURIComponent(q)}+type:user&per_page=5`;
      const res = await fetchWithTimeout(url, { headers: authHeaders() });
      if (!res.ok) return [];
      const json = (await res.json()) as { items?: GithubUser[] };
      list = (json.items || []).slice(0, 5);
      peopleCache.set(key, list);
    } catch { return []; }
  }

  // Hydrate top 3 with full details in parallel (cheaper than serial)
  const tops = list.slice(0, 3);
  const details = await Promise.all(tops.map((u) => detail(u.login, 'User')));

  return tops.map((u, i): ExternalPerson => {
    const d = details[i] as GithubUserDetail | null;
    const full = d?.name?.trim() || u.login;
    const [first, ...rest] = full.split(/\s+/);
    return {
      id: `github:${u.id}`,
      source: 'github',
      sourceUrl: u.html_url,
      name: full,
      firstName: rest.length ? first : undefined,
      lastName: rest.length ? rest.join(' ') : undefined,
      email: d?.email || undefined,
      avatarUrl: u.avatar_url,
      bio: d?.bio,
      company: d?.company?.replace(/^@/, ''),
      location: d?.location,
      identifiers: { github: u.login },
      confidence: Math.max(40, 80 - i * 10),
      matchedFields: ['name'],
    };
  });
}

export async function searchGithubOrgs(query: string): Promise<ExternalCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let list = orgCache.get(key);
  if (!list) {
    try {
      const url = `${PROVIDER_CONFIG.github.baseUrl}/search/users?q=${encodeURIComponent(q)}+type:org&per_page=5`;
      const res = await fetchWithTimeout(url, { headers: authHeaders() });
      if (!res.ok) return [];
      const json = (await res.json()) as { items?: GithubUser[] };
      list = (json.items || []).slice(0, 5);
      orgCache.set(key, list);
    } catch { return []; }
  }

  const tops = list.slice(0, 3);
  const details = await Promise.all(tops.map((u) => detail(u.login, 'Organization')));

  return tops.map((u, i): ExternalCompany => {
    const d = details[i] as GithubOrgDetail | null;
    const blog = d?.blog?.trim();
    const domain = blog ? blog.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined;
    return {
      id: `github:${u.id}`,
      source: 'github',
      sourceUrl: u.html_url,
      name: d?.name || u.login,
      logoUrl: u.avatar_url,
      description: d?.description,
      website: blog,
      domain,
      hq: d?.location,
      identifiers: { github: u.login },
      confidence: Math.max(40, 75 - i * 10),
      matchedFields: ['name'],
    };
  });
}
