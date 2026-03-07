const cache = new Map<string, { value: any; expiry: number }>();

export function getCache<T>(key: string): T | null {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    return item.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
    cache.set(key, {
        value,
        expiry: Date.now() + ttlMs,
    });
}

export function invalidateCache(key: string): void {
    cache.delete(key);
}
