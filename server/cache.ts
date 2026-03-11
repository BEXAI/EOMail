const cache = new Map<string, { value: any; expires: number }>();

export function setCache<T>(key: string, value: T, ttl: number) {
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
