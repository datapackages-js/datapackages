/**
 * Helper to flatten FHIR property array into top-level fields
 */
export const flattenConcept = <T>(concept: any): T | null => {
  if (!concept) return null;
  const { property, ...rest } = concept;
  const properties = (property || []).reduce((acc: any, p: any) => {
    const valueKey = Object.keys(p).find((k) => k.startsWith("value"));
    if (valueKey) {
      acc[p.code] = p[valueKey];
    }
    return acc;
  }, {});
  return { ...rest, ...properties } as T;
};

import { Dataset } from "@datapackages/dataset";

export abstract class TerminologyBase<
  T extends { code: string; display: string },
  C extends string = string,
  D extends string = string,
> extends Dataset<T> {
  protected _codeMap: Record<string, T> = {};

  /**
   * Subclasses must implement this to load and process their specific dataset as a Map
   */
  protected abstract loadData(): Promise<Record<string, T>>;

  /**
   * Dataset implementation: loads data via loadData() and returns array
   */
  protected async load(): Promise<T[]> {
    const map = await this.loadData();
    // Store map for O(1) lookups
    this._codeMap = map;
    return Object.values(map);
  }

  /**
   * Returns all items indexed by code
   */
  async all(): Promise<Record<string, T>> {
    await this.ensureReady();
    return this._codeMap;
  }

  /**
   * Returns an item by its official code
   */
  async getByCode(code: C | (string & {})): Promise<T | undefined> {
    await this.ensureReady();
    return this._codeMap[code as string];
  }

  /**
   * Returns an item by its display label (exact match)
   */
  async getByLabel(label: D | (string & {})): Promise<T | undefined> {
    await this.ensureReady();
    // Use the array stack for iteration
    return this._dataStack.find((p) => p.display === (label as string));
  }

  /**
   * Subclasses should override this to return the NDJSON stream URL
   */
  protected getStreamURL(): string | null {
    return null;
  }

  /**
   * Subclasses should override this to return the remote source URL
   */
  protected getSourceURL(): string | null {
    return null;
  }

  /**
   * Subclasses should override this if they want to support Orama search
   */
  protected async loadIndex(): Promise<any> {
    return null;
  }
}
