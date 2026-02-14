import type { Dataset, DatasetMiddleware } from "@datapackages/dataset";

export interface LiveUpdateOptions {
  /**
   * The remote URL to fetch data from.
   * If not provided, it will try to auto-detect via dataset.getSourceURL().
   */
  url?: string;
  /**
   * Data format: 'json' or 'ndjson'.
   * Defaults to 'json'.
   */
  format?: "json" | "ndjson";
  /**
   * Native fetch options (headers, cache, etc.)
   */
  fetchOptions?: RequestInit;
  /**
   * Polling interval in milliseconds.
   * Defaults to 30000 (30 seconds).
   */
  interval?: number;
  /**
   * Whether polling is enabled by default.
   * Defaults to true.
   */
  enabled?: boolean;
}

/** Methods added to the dataset by `withLiveUpdate`. */
export interface LiveUpdateMethods {
  /** Manually re-trigger a fetch of the data. */
  refresh(): Promise<void>;
  /** Pause the auto-polling. */
  pauseLiveUpdate(): void;
  /** Resume the auto-polling. */
  resumeLiveUpdate(): void;
}

/**
 * Middleware to fetch fresh data from a remote source at runtime.
 */
export function withLiveUpdate<TItem>(
  options: LiveUpdateOptions = {},
): DatasetMiddleware<TItem, LiveUpdateMethods> {
  const { interval = 30000, enabled = true } = options;
  let resolvedUrl = options.url || null;
  let timer: any = null;
  let isPaused = !enabled;

  let isRefreshing = false;

  const startPolling = (refreshFn: () => Promise<void>) => {
    stopPolling();
    if (isPaused) return;

    const poll = async () => {
      if (isPaused || isRefreshing) return;
      isRefreshing = true;
      try {
        await refreshFn();
      } catch (err) {
        console.error("withLiveUpdate: Polling failed", err);
      } finally {
        isRefreshing = false;
        if (!isPaused) {
          timer = setTimeout(poll, interval);
        }
      }
    };

    timer = setTimeout(poll, interval);
  };

  const stopPolling = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    name: "live-update",
    before: ["cache", "search"],
    async onInit(dataset: Dataset<TItem>) {
      if (!resolvedUrl) {
        const ds = dataset as Dataset<TItem> & {
          getSourceURL?: () => string | null | Promise<string | null>;
        };
        if (typeof ds.getSourceURL === "function") {
          resolvedUrl = await ds.getSourceURL();
        }
      }

      if (!resolvedUrl) {
        console.warn(
          "withLiveUpdate: No URL provided and could not auto-detect from dataset. Falling back to default load.",
        );
        return;
      }

      // Start polling if enabled
      if (!isPaused) {
        startPolling(async () => {
          const ds = dataset as unknown as Dataset<TItem> & LiveUpdateMethods;
          await ds.refresh();
        });
      }
    },
    methods: {
      /**
       * Overrides the default load method to fetch from remote.
       */
      async load() {
        if (!resolvedUrl) {
          // Fallback to original if we somehow got here without a URL
          // But usually we should have one.
          return [];
        }

        const response = await fetch(resolvedUrl, options.fetchOptions);
        if (!response.ok) {
          throw new Error(
            `withLiveUpdate: Failed to fetch from ${resolvedUrl} (${response.status})`,
          );
        }

        if (options.format === "ndjson") {
          return streamNDJSON<TItem>(response);
        }

        // Default to JSON
        return response.json();
      },

      /**
       * Manually re-trigger a fetch of the data.
       */
      async refresh() {
        const dataset = this as unknown as Dataset<TItem>;
        dataset.resetData();
        await dataset.init();
      },

      /**
       * Pause the auto-polling.
       */
      pauseLiveUpdate() {
        isPaused = true;
        stopPolling();
      },

      /**
       * Resume the auto-polling.
       */
      resumeLiveUpdate() {
        if (!isPaused) return; // Already running
        isPaused = false;

        const dataset = this as unknown as Dataset<TItem> & LiveUpdateMethods;
        startPolling(async () => {
          await dataset.refresh();
        });
      },
    },

    /**
     * Lifecycle hook to clean up resources when the dataset is disposed.
     */
    dispose() {
      stopPolling();
      isPaused = true;
    },
  };
}

/**
 * Helper to stream NDJSON from a Response body.
 */
async function* streamNDJSON<T>(response: Response): AsyncIterable<T> {
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let remainder = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = remainder + decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      remainder = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line) as T;
        }
      }
    }

    if (remainder.trim()) {
      yield JSON.parse(remainder) as T;
    }
  } finally {
    reader.releaseLock();
  }
}
