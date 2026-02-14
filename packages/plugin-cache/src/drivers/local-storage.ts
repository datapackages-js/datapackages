import type { CacheDriver } from "../types";

export class LocalStorageDriver implements CacheDriver {
  private prefix: string;

  constructor(prefix = "dp-cache:") {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof localStorage === "undefined") return null;

    const raw = localStorage.getItem(this.getKey(key));
    if (!raw) return null;

    try {
      const item = JSON.parse(raw);
      if (item.expires && item.expires < Date.now()) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }
      return item.value as T;
    } catch (e) {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (typeof localStorage === "undefined") return;

    const expires = ttl ? Date.now() + ttl : undefined;
    const item = { value, expires };
    localStorage.setItem(this.getKey(key), JSON.stringify(item));
  }

  async has(key: string): Promise<boolean> {
    if (typeof localStorage === "undefined") return false;
    const raw = localStorage.getItem(this.getKey(key));
    if (!raw) return false;
    try {
      const item = JSON.parse(raw);
      if (item.expires && item.expires < Date.now()) {
        localStorage.removeItem(this.getKey(key));
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.prefix))
      .forEach((k) => localStorage.removeItem(k));
  }
}
