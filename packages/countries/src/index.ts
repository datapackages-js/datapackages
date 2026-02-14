// @generated - DO NOT EDIT BY HAND
// To update this file, run: npm run update-sources

import { Dataset } from "@datapackages/dataset";

import type {
  Country,
  CountryCode,
  CountryCode2,
  CountryCode3,
  TLD,
} from "./types";

export class CountryService extends Dataset<Country> {
  private static instance: CountryService;
  private _byCca2 = new Map<CountryCode2, Country>();
  private _byCca3 = new Map<CountryCode3, Country>();
  private _byCurrency = new Map<string, Country[]>();
  private _byTLD = new Map<string, Country[]>();
  private _byPhoneCode = new Map<string, Country[]>();

  protected constructor() {
    super();
  }

  /** Returns the shared singleton instance. */
  public static getInstance(): CountryService {
    if (!CountryService.instance) {
      CountryService.instance = new CountryService();
    }
    return CountryService.instance;
  }

  /** Creates a new independent instance (useful for testing/DI). */
  public static create(): CountryService {
    return new CountryService();
  }

  /**
   * Loads the country data from NDJSON.
   */
  protected async load(): Promise<Country[]> {
    const url = new URL("./data.ndjson", import.meta.url);
    const items: Country[] = [];

    if (url.protocol === "file:" && typeof process !== "undefined") {
      const { createReadStream } = await import("node:fs");
      const { createInterface } = await import("node:readline");
      const rl = createInterface({
        input: createReadStream(url, "utf-8"),
        crlfDelay: Infinity,
      });
      for await (const line of rl) {
        if (line.trim()) items.push(JSON.parse(line));
      }
    } else {
      const response = await fetch(url.href);
      const text = await response.text();
      for (const line of text.split("\n")) {
        if (line.trim()) items.push(JSON.parse(line));
      }
    }

    return items;
  }

  /**
   * Returns the URL for NDJSON streaming.
   */
  protected async getStreamURL(): Promise<string> {
    return new URL("./data.ndjson", import.meta.url).href;
  }

  /**
   * Returns the remote source URL from meta.json.
   */
  protected async getSourceURL(): Promise<string | null> {
    const url = new URL("./meta.json", import.meta.url);
    let meta: any;

    if (url.protocol === "file:" && typeof process !== "undefined") {
      const fs = await import("node:fs/promises");
      const text = await fs.readFile(url, "utf-8");
      meta = JSON.parse(text);
    } else {
      const response = await fetch(url.href);
      meta = await response.json();
    }

    return meta.sourceUrl || null;
  }

  /**
   * Implement this method to load the pre-built search index
   */
  protected async loadIndex(): Promise<any> {
    try {
      const module = await import("./search.index.json", {
        with: { type: "json" },
      });
      return module.default || module;
    } catch (e) {
      return null;
    }
  }

  /**
   * Build indices after loading
   */
  protected async index(data: Country[]): Promise<void> {
    this._byCca2.clear();
    this._byCca3.clear();
    this._byCurrency.clear();
    this._byTLD.clear();
    this._byPhoneCode.clear();

    for (const c of data) {
      if (c.cca2) this._byCca2.set(c.cca2 as CountryCode2, c);
      if (c.cca3) this._byCca3.set(c.cca3 as CountryCode3, c);

      // Index by currency
      if (c.currencies) {
        for (const code of Object.keys(c.currencies)) {
          const key = code.toUpperCase();
          const arr = this._byCurrency.get(key) || [];
          arr.push(c);
          this._byCurrency.set(key, arr);
        }
      }

      // Index by TLD
      if (c.tld) {
        for (const tld of c.tld) {
          const key = tld.toLowerCase();
          const arr = this._byTLD.get(key) || [];
          arr.push(c);
          this._byTLD.set(key, arr);
        }
      }

      // Index by phone code
      if (c.idd?.root) {
        const root = c.idd.root;
        if (c.idd.suffixes) {
          for (const s of c.idd.suffixes) {
            const full = root + s;
            const arr = this._byPhoneCode.get(full) || [];
            arr.push(c);
            this._byPhoneCode.set(full, arr);
          }
        } else {
          const arr = this._byPhoneCode.get(root) || [];
          arr.push(c);
          this._byPhoneCode.set(root, arr);
        }
      }
    }
  }

  public async getCountries(): Promise<readonly Country[]> {
    return this.getAll();
  }

  public async getCountry(code: CountryCode): Promise<Country | undefined> {
    await this.ensureReady();
    if (!code) return undefined;
    const upper = code.toUpperCase();
    if (upper.length === 2) return this._byCca2.get(upper as CountryCode2);
    if (upper.length === 3) return this._byCca3.get(upper as CountryCode3);
    return undefined;
  }

  // Generic getter for raw property access if type allows
  public async getRaw(code: CountryCode): Promise<Country | undefined> {
    return this.getCountry(code);
  }

  public async getCountryName(code: CountryCode): Promise<string | undefined> {
    const country = await this.getCountry(code);
    return country?.name?.common;
  }

  public async getCountryCurrency(code: CountryCode) {
    const country = await this.getCountry(code);
    return country?.currencies;
  }

  /**
   * Search countries by currency code (e.g., "EUR", "USD")
   */
  public async getCountriesByCurrency(
    currencyCode: string,
  ): Promise<Country[]> {
    await this.ensureReady();
    if (!currencyCode) return [];
    return this._byCurrency.get(currencyCode.toUpperCase()) || [];
  }

  /**
   * Search countries by Top Level Domain (e.g., "fr" or ".fr")
   */
  public async getCountriesByTLD(tld: TLD | string): Promise<Country[]> {
    await this.ensureReady();
    if (!tld) return [];
    let target = tld.toLowerCase();
    if (!target.startsWith(".")) target = "." + target;
    return this._byTLD.get(target) || [];
  }

  /**
   * Search countries by Phone calling code suffix (e.g., "20", "33")
   * This checks the idd property root + suffixes
   */
  public async getCountriesByPhone(phoneInput: string): Promise<Country[]> {
    await this.ensureReady();
    if (!phoneInput) return [];
    let clean = phoneInput.replace(/[^0-9+]/g, "");
    if (!clean.startsWith("+")) clean = "+" + clean;

    // Exact match first (e.g., "+33" matches France root+suffix)
    const exact = this._byPhoneCode.get(clean);
    if (exact) return exact;

    // Prefix match: the input might be a root code (e.g., "+1") while
    // full keys are root+suffix (e.g., "+1201"). Check all entries whose
    // key starts with the input.
    const results: Country[] = [];
    const seen = new Set<string>();
    for (const [key, countries] of this._byPhoneCode) {
      if (key.startsWith(clean) || clean.startsWith(key)) {
        for (const c of countries) {
          if (!seen.has(c.cca2)) {
            seen.add(c.cca2);
            results.push(c);
          }
        }
      }
    }
    return results;
  }

  /**
   * Fuzzy search by name (common, official, native, or translations)
   * Case-insensitive substring match.
   */
  public async searchByName(query: string): Promise<Country[]> {
    await this.ensureReady();
    if (!query) return [];
    const q = query.toLowerCase().trim();

    interface NameTranslation {
      common: string;
      official: string;
    }

    return this._dataStack.filter((c) => {
      // 1. Common & Official
      if (c.name?.common?.toLowerCase().includes(q)) return true;
      if (c.name?.official?.toLowerCase().includes(q)) return true;

      // 2. Native Names
      if (c.name?.native) {
        if (
          Object.values(c.name.native as Record<string, NameTranslation>).some(
            (n) =>
              n.common.toLowerCase().includes(q) ||
              n.official.toLowerCase().includes(q),
          )
        )
          return true;
      }

      // 3. Translations
      if (c.translations) {
        if (
          Object.values(c.translations as Record<string, NameTranslation>).some(
            (t) =>
              t.common.toLowerCase().includes(q) ||
              t.official.toLowerCase().includes(q),
          )
        )
          return true;
      }

      return false;
    });
  }
}

export * from "./types";
export const countryService = CountryService.getInstance();
