import type { CacheDriver } from "../types";

export interface IndexedDBOptions {
  dbName?: string;
  storeName?: string;
  /** Optional error handler called when IndexedDB operations fail silently. */
  onError?: (error: unknown) => void;
}

export class IndexedDBDriver implements CacheDriver {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private onError: ((error: unknown) => void) | null;

  constructor(options: IndexedDBOptions = {}) {
    this.dbName = options.dbName || "datapackages-cache";
    this.storeName = options.storeName || "items";
    this.onError = options.onError || null;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof indexedDB === "undefined") return null;

    try {
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result;
          if (!item) return resolve(null);

          if (item.expires && item.expires < Date.now()) {
            void this.delete(key); // Intentional fire-and-forget cleanup
            return resolve(null);
          }
          resolve(item.value as T);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      this.onError?.(e);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (typeof indexedDB === "undefined") return;

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const expires = ttl ? Date.now() + ttl : undefined;
        const request = store.put({ value, expires }, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      this.onError?.(e);
    }
  }

  async has(key: string): Promise<boolean> {
    if (typeof indexedDB === "undefined") return false;

    try {
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result;
          if (!item) return resolve(false);
          if (item.expires && item.expires < Date.now()) {
            void this.delete(key);
            return resolve(false);
          }
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      this.onError?.(e);
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof indexedDB === "undefined") return;

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      this.onError?.(e);
    }
  }

  async clear(): Promise<void> {
    if (typeof indexedDB === "undefined") return;

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      this.onError?.(e);
    }
  }
}
