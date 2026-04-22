'use client';

import { useEffect, useRef, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

export type GeocodeState = Coords | null | undefined;

export interface AddressParts {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

const CACHE_KEY = 'geocode-cache-v2';

function loadCache(): Record<string, Coords | null> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, Coords | null>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Strip suite/unit/apartment designators from a street address so geocoders
 * can match the base street address. Nominatim chokes on things like
 * "100 Cummings Center Ste-230-G" but handles "100 Cummings Center".
 */
function stripUnit(street: string): string {
  return street
    .replace(/,?\s*(ste\.?|suite|unit|apt\.?|apartment|#)\s*[-\w/]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build a list of geocoding queries, most specific first. We try the full
 * address, then progressively coarser fallbacks so every real address at
 * least pins somewhere in the right city/ZIP.
 */
function buildQueries(parts: AddressParts): string[] {
  const { street, city, state, zip } = parts;
  const queries: string[] = [];
  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');
  const cityState = [city, state].filter(Boolean).join(', ');

  if (street && cityStateZip) {
    queries.push([street, cityStateZip].filter(Boolean).join(', '));
    const bare = stripUnit(street);
    if (bare && bare !== street) {
      queries.push([bare, cityStateZip].filter(Boolean).join(', '));
    }
  }
  if (cityStateZip) queries.push(cityStateZip);
  if (zip) queries.push(zip);
  if (cityState) queries.push(cityState);

  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
}

async function geocodeOne(query: string): Promise<Coords | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data: Array<{ lat: string; lon: string }> = await res.json();
    const first = data?.[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch {
    return null;
  }
}

/**
 * Geocode an address using OpenStreetMap Nominatim with progressive fallback.
 * Pass structured parts so we can strip suite info and fall back to
 * city/state/ZIP when the street isn't resolvable. Results are cached in
 * localStorage keyed on the first (most specific) query we try.
 */
export function useGeocode(parts: AddressParts | null): GeocodeState {
  const [coords, setCoords] = useState<GeocodeState>(undefined);
  const cacheRef = useRef<Record<string, Coords | null>>({});

  useEffect(() => {
    cacheRef.current = loadCache();
  }, []);

  const queries = parts ? buildQueries(parts) : [];
  const cacheKey = queries[0] || null;
  const queriesJson = JSON.stringify(queries);

  useEffect(() => {
    if (!cacheKey || queries.length === 0) {
      setCoords(null);
      return;
    }
    const key = cacheKey.toLowerCase();
    const cached = cacheRef.current[key];
    if (cached !== undefined) {
      setCoords(cached);
      return;
    }

    setCoords(undefined);
    let cancelled = false;

    (async () => {
      for (const q of queries) {
        if (cancelled) return;
        const hit = await geocodeOne(q);
        if (cancelled) return;
        if (hit) {
          cacheRef.current[key] = hit;
          saveCache(cacheRef.current);
          setCoords(hit);
          return;
        }
      }
      cacheRef.current[key] = null;
      saveCache(cacheRef.current);
      setCoords(null);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queriesJson]);

  return coords;
}
