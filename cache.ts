const MAX_CACHE_SIZE = 500;
const cache = new Map<string, { value: any; expires: number }>();

function evictExpired(): number {
  const now = Date.now();
  let evicted = 0;
  for (const [key, entry] of cache) {
    if (entry.expires <= now) {
      cache.delete(key);
      evicted++;
    }
  }
  return evicted;
}

export function setCache<T>(key: string, value: T, ttl: number) {
  if (cache.size >= MAX_CACHE_SIZE) {
    evictExpired();
  }
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  const expires = Date.now() + ttl;
  cache.set(key, { value, expires });
}

export function getCache<T>(key:string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.value as T;
  }
  cache.delete(key);
  return null;
}

export function invalidateCache(key: string) {
  cache.delete(key);
}
