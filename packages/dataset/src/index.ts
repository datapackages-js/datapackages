export * from "./config";
export * from "./middleware";
import type { DatasetMiddleware } from "./middleware";

/**
 * Base abstract class for async datasets
 */
export abstract class Dataset<TItem> {
  protected _loadingPromise: Promise<void> | null = null;
  protected _dataStack: TItem[] = [];
  protected _initialized = false;
  protected _middlewares: DatasetMiddleware<TItem, any>[] = [];
  private _appliedMiddlewareNames = new Set<string>();
  /** Tracks original methods before middleware overrides, for clean restoration. */
  private _originalMethods = new Map<string, Function>();

  /**
   * Implement this method to fetch raw data.
   * Can return a full array or an AsyncIterable for streaming.
   */
  protected abstract load(): Promise<TItem[] | AsyncIterable<TItem>>;

  /**
   * Install a middleware method on this dataset instance.
   * The previous implementation is preserved as `_methodName` for chaining.
   */
  private _installMethod(key: string, fn: Function): void {
    const self = this as Record<string, unknown>;
    const existing = self[key];

    // Save the original (pre-middleware) method only on first override
    if (!this._originalMethods.has(key) && typeof existing === "function") {
      this._originalMethods.set(key, existing as Function);
    }

    // Preserve the previous implementation for middleware chaining
    if (typeof existing === "function") {
      self[`_${key}`] = (existing as Function).bind(this);
    }

    // Install the new method
    self[key] = fn;
  }

  /**
   * Attach a middleware to the dataset.
   * Returns `this & TMethods` so that added methods are visible in the type system.
   *
   * @example
   * ```typescript
   * const ds = await dataset
   *   .use(withSearch())      // type includes search()
   *   .use(withLiveUpdate()); // type includes refresh(), pauseLiveUpdate(), etc.
   * ```
   */
  public async use<TMethods = {}>(
    middleware: DatasetMiddleware<TItem, TMethods>,
  ): Promise<this & TMethods> {
    const consola = (await import("consola")).consola;

    // Validate ordering requirements
    if (middleware.name) {
      if (middleware.after) {
        for (const req of middleware.after) {
          if (!this._appliedMiddlewareNames.has(req)) {
            consola.warn(
              `Middleware "${middleware.name}" should be applied AFTER "${req}". Check your .use() order.`,
            );
          }
        }
      }

      if (middleware.before) {
        for (const req of middleware.before) {
          if (this._appliedMiddlewareNames.has(req)) {
            consola.warn(
              `Middleware "${middleware.name}" should be applied BEFORE "${req}". Check your .use() order.`,
            );
          }
        }
      }

      this._appliedMiddlewareNames.add(middleware.name);
    }

    this._middlewares.push(middleware);
    if (middleware.methods) {
      for (const [key, fn] of Object.entries(
        middleware.methods as Record<string, Function>,
      )) {
        this._installMethod(key, fn);
      }
    }

    // If already initialized, trigger hooks immediately
    if (this._initialized) {
      if (middleware.onInit) await middleware.onInit(this);
      if (middleware.onLoad) await middleware.onLoad(this, this._dataStack);
    }

    return this as this & TMethods;
  }

  /**
   * Subclasses should override this to return the NDJSON stream URL
   */
  protected getStreamURL(): string | null | Promise<string | null> {
    return null;
  }

  /**
   * Subclasses should override this to return the remote source URL (JSON/NDJSON)
   */
  protected getSourceURL(): string | null | Promise<string | null> {
    return null;
  }
  /**
   * Optional hook to post-process data after load
   * (e.g., build indices)
   */
  protected async index(data: TItem[]): Promise<void> {
    // Overridden by subclasses or hooks
  }

  /**
   * Initialize the dataset (idempotent)
   */
  public async init(): Promise<void> {
    if (this._initialized) return;

    if (this._loadingPromise) {
      return this._loadingPromise;
    }

    this._loadingPromise = (async () => {
      try {
        // middleware onInit
        for (const mw of this._middlewares) {
          if (mw.onInit) await mw.onInit(this);
        }

        const raw = await this.load();

        // Handle both Array and AsyncIterable
        if (Symbol.asyncIterator in (raw as object)) {
          const stream = raw as AsyncIterable<TItem>;
          for await (const item of stream) {
            this._dataStack.push(item);
          }
        } else {
          this._dataStack = raw as TItem[];
        }

        // middleware onLoad
        for (const mw of this._middlewares) {
          if (mw.onLoad) await mw.onLoad(this, this._dataStack);
        }

        await this.index(this._dataStack);
        this._initialized = true;
      } finally {
        this._loadingPromise = null;
      }
    })();

    return this._loadingPromise;
  }

  /**
   * Ensure the dataset is initialized before proceeding
   */
  protected async ensureReady(): Promise<void> {
    if (!this._initialized) {
      await this.init();
    }
  }

  /**
   * Get all items in the dataset.
   * Returns a shallow copy to prevent mutation of internal state.
   */
  public async getAll(): Promise<readonly TItem[]> {
    await this.ensureReady();
    return this._dataStack.slice();
  }

  /**
   * Search requires a search middleware (e.g., withSearch).
   * Override this method or attach a search middleware before calling.
   */
  public async search(_term: string, _limit: number = 10): Promise<TItem[]> {
    await this.ensureReady();
    throw new Error(
      "search() requires a search middleware. Use dataset.use(withSearch()) to enable search.",
    );
  }

  /**
   * Reset only the data state (preserves middlewares).
   * Use this for re-loading data (e.g., refresh) without losing plugins.
   */
  public resetData(): void {
    this._initialized = false;
    this._dataStack = [];
    this._loadingPromise = null;
  }

  /**
   * Fully reset the dataset state including middlewares (used for tests).
   * Restores all original methods that were overridden by middleware.
   */
  public reset(): void {
    this.resetData();

    // Restore all original methods that were overridden
    const self = this as Record<string, unknown>;
    for (const [key, original] of this._originalMethods) {
      self[key] = original;
      delete self[`_${key}`];
    }
    this._originalMethods.clear();
    this._middlewares = [];
  }

  /**
   * Dispose the dataset and clean up resources.
   * Calls dispose hook on all middlewares.
   */
  public async dispose(): Promise<void> {
    for (const mw of this._middlewares) {
      if (mw.dispose) {
        await mw.dispose(this);
      }
    }
    this.reset();
  }
}
