export interface CacheDriver {
  /**
   * Get an item from the cache.
   */
  get<T>(key: string): Promise<T | null>;
  /**
   * Set an item in the cache.
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  /**
   * Check if an item exists in the cache.
   */
  has(key: string): Promise<boolean>;
  /**
   * Remove an item from the cache.
   */
  delete(key: string): Promise<void>;
  /**
   * Clear all items from the cache.
   */
  clear(): Promise<void>;
}
