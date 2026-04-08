/**
 * Cache Service
 * 
 * Abstraction layer for caching with Redis-ready design.
 * Currently uses in-memory Map with TTL support.
 * Can be easily swapped for Redis in production.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private store: Map<string, CacheEntry<unknown>>;
  private readonly defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    this.store = new Map();
    this.defaultTTL = defaultTTLSeconds * 1000; // Convert to milliseconds
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if expired/missing
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds TTL in seconds (optional, uses default if not provided)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = (ttlSeconds ?? this.defaultTTL / 1000) * 1000;
    const expiresAt = Date.now() + ttl;
    
    this.store.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Delete key from cache
   * @param key Cache key to delete
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Delete keys matching pattern
   * @param pattern Key pattern to match (e.g., "heatmap:123:*")
   */
  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cached values
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Global cache instance
export const cacheService = new CacheService(300); // 5 minutes default TTL

// Key generators for consistent cache key naming
export const cacheKeys = {
  heatmap: (studentId: number, batchId: number, startMonthISO: string): string => 
    `heatmap:${studentId}:${batchId}:${startMonthISO}`,
  
  batchStartMonth: (batchId: number): string => 
    `batch_start_month:${batchId}`,
    
  // NEW: Batch-level assigned dates (shared by all students in batch)
  batchAssignedDates: (batchId: number, startMonthISO: string): string =>
    `batch:assigned:${batchId}:${startMonthISO}`,
    
  // NEW: Batch-level submission counts cache (optional)
  studentSubmissionCounts: (studentId: number, startMonthISO: string): string =>
    `student:submissions:${studentId}:${startMonthISO}`
};

export default cacheService;
