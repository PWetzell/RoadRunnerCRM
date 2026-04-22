'use client';

import { useEffect, useRef, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

export type GeocodeState = Coords | null | undefined;

const CACHE_KEY = 'geocode-cache-v1';

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
 * Geocode a free-form address string using OpenStreetMap's Nominatim service.
 * Results are cached in localStorage, so each unique address is looked up once
 * per browser. Returns undefined while loading, null if not found / no address.
 */
export function useGeocode(address: string | null): GeocodeState {
  const [coords, setCoords] = useState<GeocodeState>(undefined);
  const cacheRef = useRef<Record<string, Coords | null>>({});

  useEffect(() => {
    cacheRef.current = loadCache();
  }, []);

  useEffect(() => {
    if (!address) {
      setCoords(null);
      return;
    }
    const key = address.trim().toLowerCase();
    const cached = cacheRef.current[key];
    if (cached !== undefined) {
      setCoords(cached);
      return;
    }

    setCoords(undefined);
    let cancelled = false;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((r) => r.json())
      .then((results: Array<{ lat: string; lon: string }>) => {
        if (cancelled) return;
        const first = results?.[0];
        const result: Coords | null = first
          ? { lat: parseFloat(first.lat), lng: parseFloat(first.lon) }
          : null;
        cacheRef.current[key] = result;
        saveCache(cacheRef.current);
        setCoords(result);
      })
      .catch(() => {
        if (!cancelled) setCoords(null);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return coords;
}
