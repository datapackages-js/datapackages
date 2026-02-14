import type { Dataset, DatasetMiddleware } from "@datapackages/dataset";
import type { CacheDriver } from "./types";
import { MemoryDriver } from "./drivers/memory";

export * from "./types";
export * from "./drivers/memory";
export * from "./drivers/local-storage";
export * from "./drivers/indexed-db";

export interface CacheOptions {
  /**
   * Cache driver to use.
   * Defaults to MemoryDriver.
   */
  driver?: CacheDriver;
  /**
   * Time to live in milliseconds.
   * If not provided, items don't expire.
   */
  ttl?: number;
  /**
   * Use a specific key for this dataset.
   * Defaults to dataset.constructor.name (service name).
   */
  key?: string;
}

/**
 * Wraps an AsyncIterable with transparent caching.
 * Yields items one-by-one as they arrive from the source stream,
 * while accumulating them internally. After the stream completes,
 * the full buffer is persisted to the cache driver.
 *
 * On error, partial data is discarded — only complete datasets are cached.
 */
async function* createCachingIterable<T>(
  source: AsyncIterable<T>,
  driver: CacheDriver,
  key: string,
  ttl?: number,
): AsyncIterable<T> {
  const buffer: T[] = [];
  try {
    for await (const item of source) {
      buffer.push(item);
      yield item;
    }
    // Stream completed successfully — persist to cache
    await driver.set(key, buffer, ttl);
  } catch (error) {
    // Don't cache partial data on error
    throw error;
  }
}

/** Methods added to the dataset by `withCache`. */
export interface CacheMethods {
  /** Clears the cached data for this dataset. Next `init()` will re-fetch. */
  clearCache(): Promise<void>;
}

/**
 * Middleware to provide persistent caching for datasets.
 *
 * When combined with `withStream`, the caching is **chunked**: items are yielded
 * one-by-one as they stream in, and the full result is cached after the stream
 * completes. Subsequent loads return the cached array directly.
 *
 * > [!IMPORTANT]
 * > **Ordering matters**: `withCache()` should generally be applied **after**
 * > `withStream()` (i.e., listed after it in the code) so it can intercept
 * > the stream return value from the original load.
 */
export function withCache<TItem>(
  options: CacheOptions = {},
): DatasetMiddleware<TItem, CacheMethods> {
  const driver = options.driver || new MemoryDriver();
  let cacheKey: string | null = options.key || null;

  return {
    name: "cache",
    async onInit(dataset: Dataset<TItem>) {
      if (!cacheKey) {
        // Use class name or a generic key
        cacheKey = (dataset as any).constructor.name || "generic-dataset";
      }
    },
    methods: {
      /**
       * Overrides the default load method to check cache first.
       */
      async load() {
        if (!cacheKey) {
          // No cache key — delegate to original load without caching
          return (this as any)._load();
        }

        const cached = await driver.get<TItem[]>(cacheKey);
        if (cached) {
          return cached;
        }

        const data = await (this as any)._load();

        // Handle both Array and AsyncIterable results
        if (Array.isArray(data)) {
          await driver.set(cacheKey, data, options.ttl);
          return data;
        }

        // Wrap AsyncIterable with caching — yields items as they stream,
        // caches the full result after the stream completes
        if (data && typeof data[Symbol.asyncIterator] === "function") {
          return createCachingIterable(
            data as AsyncIterable<TItem>,
            driver,
            cacheKey,
            options.ttl,
          );
        }

        return data;
      },

      /**
       * Clear the cached data for this dataset.
       * Next `init()` call will re-fetch from the source.
       */
      async clearCache() {
        if (cacheKey) {
          await driver.delete(cacheKey);
        }
      },
    },
  };
}
