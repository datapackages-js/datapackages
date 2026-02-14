import {
  create,
  insert,
  save,
  load,
  type Orama,
  type TypedDocument,
  type Results,
  search,
  insertMultiple,
} from "@orama/orama";

export * from "./middleware";

/**
 * Configuration for building a search index at build time.
 */
export interface SearchConfig {
  /** Orama schema mapping field names to their types. */
  schema: Record<string, "string" | "number" | "boolean">;
  /** Documents to index, each keyed by schema fields. */
  documents: Record<string, unknown>[];
  /** Optional output file name for the serialized index. */
  fileName?: string;
}

/** Parameters passed to {@link SearchService.search}. */
export interface SearchParams {
  /** Maximum number of results to return. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
  [key: string]: unknown;
}

/**
 * Builds an Orama index from a list of documents and returns the serialized JSON.
 */
export async function buildIndex(config: SearchConfig): Promise<string> {
  const db = await create({
    schema: config.schema,
  });

  await insertMultiple(db, config.documents as any);

  const serialized = await save(db);
  return JSON.stringify({
    schema: config.schema,
    index: serialized,
  });
}

/**
 * A wrapper class for loading and searching an index.
 */
export class SearchService<T extends TypedDocument<any>> {
  private db: Orama<any> | null = null;

  /**
   * Load the index from a JSON string or object.
   * Expects { schema: ..., index: ... } structure.
   */
  async load(data: string | object): Promise<void> {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;

    if (!parsed.schema || !parsed.index) {
      throw new Error("Invalid index data: missing schema or index property.");
    }

    this.db = await create({
      schema: parsed.schema,
    });

    await load(this.db, parsed.index);
  }

  /**
   * Search the loaded index for the given term.
   * @param term - The search query string.
   * @param config - Optional Orama search parameters (limit, offset, etc.).
   * @returns Search results including hits and metadata.
   */
  async search(term: string, config: SearchParams = {}): Promise<Results<T>> {
    if (!this.db) {
      throw new Error("Index not loaded. Call load() first.");
    }

    return search(this.db, {
      term,
      ...config,
    });
  }
}
