import type { DatasetMiddleware } from "@datapackages/dataset";
import { streamNDJSON } from "./ndjson";

export interface StreamOptions {
  url: string;
}

/**
 * Middleware to enable high-performance NDJSON streaming.
 */
export function withStream<TItem>(
  options?: StreamOptions | string,
): DatasetMiddleware<TItem> {
  let resolvedUrl: string | null = null;

  if (typeof options === "string") {
    resolvedUrl = options;
  } else if (options?.url) {
    resolvedUrl = options.url;
  }

  return {
    name: "stream",
    before: ["cache"],
    async onInit(dataset: any) {
      if (!resolvedUrl && typeof dataset.getStreamURL === "function") {
        resolvedUrl = await dataset.getStreamURL();
      }
    },
    methods: {
      async load(): Promise<AsyncIterable<TItem>> {
        if (!resolvedUrl) {
          throw new Error(
            "withStream: No URL provided and could not auto-detect from dataset.",
          );
        }
        return streamNDJSON<TItem>(resolvedUrl);
      },
    },
  };
}

export * from "./ndjson";
