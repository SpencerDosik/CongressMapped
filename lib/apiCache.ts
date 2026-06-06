// Simple in-memory cache for server-side API route responses.
// TTL: 1 hour. Prevents redundant upstream calls for the same districtId/bioguide.

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  // Evict old entries if store grows large
  if (store.size > 1000) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now > v.expiresAt) store.delete(k);
    }
  }
}
