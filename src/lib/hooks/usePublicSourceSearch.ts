'use client';

/**
 * Client-side hooks for the public-source aggregator.
 *
 * Debounces input, deduplicates concurrent requests, and aborts in-flight
 * calls when the query changes so the UI never renders stale results.
 */

import { useEffect, useState } from 'react';
import type { ExternalCompany, ExternalPerson } from '@/lib/data/public-sources/types';

export function usePublicCompanySearch(query: string, enabled: boolean = true): {
  results: ExternalCompany[];
  loading: boolean;
} {
  const [results, setResults] = useState<ExternalCompany[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ctl = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public-sources/search-companies?q=${encodeURIComponent(query)}`, {
          signal: ctl.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [query, enabled]);

  return { results, loading };
}

export function usePublicPeopleSearch(query: string, email?: string, enabled: boolean = true): {
  results: ExternalPerson[];
  loading: boolean;
} {
  const [results, setResults] = useState<ExternalPerson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hasQ = query.trim().length >= 2;
    const hasEmail = !!email && email.includes('@');
    if (!enabled || (!hasQ && !hasEmail)) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ctl = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (hasQ) params.set('q', query);
        if (hasEmail) params.set('email', email!);
        const res = await fetch(`/api/public-sources/search-people?${params.toString()}`, {
          signal: ctl.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [query, email, enabled]);

  return { results, loading };
}

export function useCompanyEnrichment(domainOrName: string, enabled: boolean = true): {
  candidates: ExternalCompany[];
  employees: ExternalPerson[];
  loading: boolean;
} {
  const [data, setData] = useState<{ candidates: ExternalCompany[]; employees: ExternalPerson[] }>({
    candidates: [],
    employees: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !domainOrName.trim()) {
      setData({ candidates: [], employees: [] });
      setLoading(false);
      return;
    }

    const ctl = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const key = domainOrName.includes('.') ? 'domain' : 'name';
        const res = await fetch(`/api/public-sources/enrich-company?${key}=${encodeURIComponent(domainOrName)}`, {
          signal: ctl.signal,
        });
        if (!res.ok) {
          setData({ candidates: [], employees: [] });
          return;
        }
        const json = await res.json();
        setData({
          candidates: Array.isArray(json.candidates) ? json.candidates : [],
          employees: Array.isArray(json.employees) ? json.employees : [],
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setData({ candidates: [], employees: [] });
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [domainOrName, enabled]);

  return { ...data, loading };
}
