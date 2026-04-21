/**
 * Tiny LRU cache with TTL for public-source responses.
 *
 * Lives in server memory (used inside the Next.js route handlers), so it
 * resets on redeploy. That's fine — these APIs are mostly read-only and
 * a few-minute staleness window is acceptable for autocomplete.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T = unknown> {
  private store = new Map<string, Entry<T>>();
  constructor(private max = 500, private ttlMs = 60 * 60 * 1000) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // LRU: move to end
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.store.size > this.max) {
      // Evict oldest
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
  }
}

// Shared global caches (one per provider keeps keyspace clean)
const globalCaches = new Map<string, TtlCache<unknown>>();

export function getCache<T = unknown>(provider: string, max = 500, ttlMs = 60 * 60 * 1000): TtlCache<T> {
  let c = globalCaches.get(provider);
  if (!c) {
    c = new TtlCache<unknown>(max, ttlMs);
    globalCaches.set(provider, c);
  }
  return c as TtlCache<T>;
}
