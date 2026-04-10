import redis from '../config/redis';

/**
 * Non-blocking SCAN-based pattern deletion
 * Replaces deprecated redis.keys() for production use
 */
export async function deleteByPattern(pattern: string): Promise<void> {
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
    }

  } while (cursor !== '0');
}

/**
 * Stable deterministic cache key generation
 * Replaces JSON.stringify(filters) for consistent keys
 */
export function buildCacheKey(base: string, params: Record<string, any>): string {
  const serialized = Object.entries(params || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');

  return `${base}:${serialized}`;
}

/**
 * Modern Redis SET with TTL
 * Replaces deprecated redis.setex()
 */
export async function setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
  await redis.set(key, value, 'EX', ttlSeconds);
}
