import type { Dataset, DatasetMiddleware } from "@datapackages/dataset";

/** Options for the search middleware. */
export interface SearchOptions {
  /** Function that loads the search index data (schema + serialized index). */
  loadIndex: () => Promise<object>;
}

/** Methods added to the dataset by `withSearch`. */
export interface SearchMethods<TItem> {
  /** Full-text search using the Orama index. */
  search(term: string, limit?: number): Promise<TItem[]>;
}

/**
 * Middleware to add Orama search capabilities to a dataset.
 */
export function withSearch<TItem>(
  options?: SearchOptions | (() => Promise<any>),
): DatasetMiddleware<TItem, SearchMethods<TItem>> {
  let searchService: any = null;

  return {
    name: "search",
    async onInit(dataset: Dataset<TItem>) {
      let indexData: object | null = null;

      if (typeof options === "function") {
        indexData = await options();
      } else if (options && typeof options.loadIndex === "function") {
        indexData = await options.loadIndex();
      } else {
        const ds = dataset as Dataset<TItem> & {
          loadIndex?: () => Promise<object | null>;
        };
        if (typeof ds.loadIndex === "function") {
          indexData = await ds.loadIndex();
        }
      }

      if (indexData) {
        const { SearchService } = await import("./index");
        searchService = new SearchService();
        await searchService.load(indexData);
        // Attach to dataset for external access
        (dataset as unknown as Record<string, unknown>)._searchService =
          searchService;
      }
    },
    methods: {
      async search(term: string, limit: number = 10): Promise<TItem[]> {
        const dataset = this as unknown as Dataset<TItem> & {
          ensureReady(): Promise<void>;
          _dataStack: TItem[];
        };
        await dataset.ensureReady();

        if (searchService) {
          const { hits } = await searchService.search(term, { limit });
          return hits
            .map((hit: any) => {
              const index = parseInt(hit.id, 10);
              return dataset._dataStack[index];
            })
            .filter(
              (item: TItem | undefined): item is TItem => item !== undefined,
            );
        }

        throw new Error(
          "Search index not loaded. Provide an index via withSearch({ loadIndex }) or dataset.loadIndex().",
        );
      },
    },
  };
}
