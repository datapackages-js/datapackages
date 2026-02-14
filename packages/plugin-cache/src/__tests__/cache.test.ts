import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryDriver } from "../drivers/memory";
import { LocalStorageDriver } from "../drivers/local-storage";
import { IndexedDBDriver } from "../drivers/indexed-db";
import { withCache } from "../index";
import { Dataset } from "@datapackages/dataset";

// Dummy dataset for testing
class TestDataset extends Dataset<any> {
  public loadCallCount = 0;
  async load() {
    this.loadCallCount++;
    return [{ id: 1, name: "Test" }];
  }
}

describe("MemoryDriver", () => {
  it("should store and retrieve items", async () => {
    const driver = new MemoryDriver();
    await driver.set("foo", "bar");
    expect(await driver.get("foo")).toBe("bar");
  });

  it("should expire items", async () => {
    const driver = new MemoryDriver();
    await driver.set("foo", "bar", 10); // 10ms
    expect(await driver.get("foo")).toBe("bar");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await driver.get("foo")).toBeNull();
  });

  it("should check if item exists", async () => {
    const driver = new MemoryDriver();
    await driver.set("foo", "bar");
    expect(await driver.has("foo")).toBe(true);
    expect(await driver.has("bar")).toBe(false);
  });

  it("should delete items", async () => {
    const driver = new MemoryDriver();
    await driver.set("foo", "bar");
    await driver.delete("foo");
    expect(await driver.has("foo")).toBe(false);
  });

  it("should clear all items", async () => {
    const driver = new MemoryDriver();
    await driver.set("foo", "bar");
    await driver.clear();
    expect(await driver.has("foo")).toBe(false);
  });
});

describe("LocalStorageDriver", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      get length() {
        return Object.keys(mockStorage).length;
      },
      key: (index: number) => Object.keys(mockStorage)[index] || null,
    };

    const proxy = new Proxy(storageMock, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        if (typeof prop === "string") return mockStorage[prop];
        return undefined;
      },
      ownKeys() {
        return Object.keys(mockStorage);
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === "string" && prop in mockStorage) {
          return { enumerable: true, configurable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });

    vi.stubGlobal("localStorage", proxy);
  });

  it("should store and retrieve items", async () => {
    const driver = new LocalStorageDriver();
    await driver.set("foo", "bar");
    expect(await driver.get("foo")).toBe("bar");
    expect(mockStorage["dp-cache:foo"]).toBeDefined();
  });

  it("should expire items", async () => {
    const driver = new LocalStorageDriver();
    await driver.set("foo", "bar", 10);
    expect(await driver.get("foo")).toBe("bar");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await driver.get("foo")).toBeNull();
  });

  it("should clear items with prefix", async () => {
    const driver = new LocalStorageDriver();
    await driver.set("foo", "bar");
    localStorage.setItem("other", "data");

    await driver.clear();
    expect(await driver.get("foo")).toBeNull();
    expect(localStorage.getItem("other")).toBe("data");
  });

  it("should check if item exists", async () => {
    const driver = new LocalStorageDriver();
    await driver.set("foo", "bar");
    expect(await driver.has("foo")).toBe(true);
    expect(await driver.has("bar")).toBe(false);
  });

  it("should delete items", async () => {
    const driver = new LocalStorageDriver();
    await driver.set("foo", "bar");
    await driver.delete("foo");
    expect(await driver.has("foo")).toBe(false);
  });

  it("should handle invalid JSON in localStorage", async () => {
    const driver = new LocalStorageDriver();
    mockStorage["dp-cache:foo"] = "invalid-json";
    const val = await driver.get("foo");
    expect(val).toBeNull();
  });

  describe("when localStorage is undefined", () => {
    beforeEach(() => {
      vi.stubGlobal("localStorage", undefined);
    });

    it("should return null/void gracefully", async () => {
      const driver = new LocalStorageDriver();
      expect(await driver.get("foo")).toBeNull();
      await driver.set("foo", "bar");
      expect(await driver.has("foo")).toBe(false);
      await driver.delete("foo");
      await driver.clear();
    });
  });
});

describe("IndexedDBDriver", () => {
  let mockData: Record<string, any> = {};
  let dbMock: any;

  beforeEach(() => {
    mockData = {};
    dbMock = {
      objectStoreNames: {
        contains: vi.fn((name: string) => name === "items"),
      },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn((key: string) => {
            const req: any = { result: mockData[key] };
            process.nextTick(() => req.onsuccess && req.onsuccess());
            return req;
          }),
          put: vi.fn((val: any, key: string) => {
            mockData[key] = val;
            const req: any = {};
            process.nextTick(() => req.onsuccess && req.onsuccess());
            return req;
          }),
          delete: vi.fn((key: string) => {
            delete mockData[key];
            const req: any = {};
            process.nextTick(() => req.onsuccess && req.onsuccess());
            return req;
          }),
          clear: vi.fn(() => {
            mockData = {};
            const req: any = {};
            process.nextTick(() => req.onsuccess && req.onsuccess());
            return req;
          }),
        })),
      })),
    };

    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const req: any = { result: dbMock };
        process.nextTick(() => {
          if (
            req.onupgradeneeded &&
            !dbMock.objectStoreNames.contains("items")
          ) {
            req.onupgradeneeded();
          }
          req.onsuccess && req.onsuccess();
        });
        return req;
      }),
    });
  });

  it("should create object store on upgrade", async () => {
    dbMock.objectStoreNames.contains.mockReturnValue(false);
    const driver = new IndexedDBDriver();
    await (driver as any).getDB();
    expect(dbMock.createObjectStore).toHaveBeenCalledWith("items");
  });

  it("should handle request errors", async () => {
    dbMock.transaction.mockImplementation(() => ({
      objectStore: vi.fn(() => ({
        get: vi.fn(() => {
          const req: any = { error: new Error("IDB Error") };
          // We need to wait for the driver to assign `onerror`, then trigger it.
          // Using a proxy or getter/setter for 'onerror' is safer, but setTimeout works if delay is sufficient.
          // Let's use a small delay to allow the assignment in the microtask queue.
          setTimeout(() => {
            if (req.onerror) {
              req.onerror({ target: req } as any);
            }
          }, 0);
          return req;
        }),
      })),
    }));

    const driver = new IndexedDBDriver();
    const val = await driver.get("foo");
    expect(val).toBeNull();
  });

  it("should handle initialization errors", async () => {
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const req: any = { error: new Error("Open Error") };
        process.nextTick(() => req.onerror && req.onerror());
        return req;
      }),
    });

    const driver = new IndexedDBDriver();
    const val = await driver.get("foo");
    expect(val).toBeNull();
  });

  it("should store and retrieve items", async () => {
    const driver = new IndexedDBDriver();
    await driver.set("foo", "bar");
    expect(await driver.get("foo")).toBe("bar");
  });

  it("should expire items", async () => {
    const driver = new IndexedDBDriver();
    await driver.set("foo", "bar", 10);
    expect(await driver.get("foo")).toBe("bar");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await driver.get("foo")).toBeNull();
  });

  it("should check if item exists", async () => {
    const driver = new IndexedDBDriver();
    await driver.set("foo", "bar");
    expect(await driver.has("foo")).toBe(true);
    expect(await driver.has("bar")).toBe(false);
  });

  it("should delete items", async () => {
    const driver = new IndexedDBDriver();
    await driver.set("foo", "bar");
    await driver.delete("foo");
    expect(await driver.has("foo")).toBe(false);
  });

  it("should clear all items", async () => {
    const driver = new IndexedDBDriver();
    await driver.set("foo", "bar");
    await driver.clear();
    expect(await driver.has("foo")).toBe(false);
  });

  describe("when indexedDB is undefined", () => {
    beforeEach(() => {
      vi.stubGlobal("indexedDB", undefined);
    });

    it("should return null/void gracefully", async () => {
      const driver = new IndexedDBDriver();
      expect(await driver.get("foo")).toBeNull();
      await driver.set("foo", "bar");
      expect(await driver.has("foo")).toBe(false);
      await driver.delete("foo");
      await driver.clear();
    });
  });
});

describe("withCache integration", () => {
  it("should cache load results", async () => {
    const dataset = new TestDataset();
    const driver = new MemoryDriver();

    await dataset.use(withCache({ driver, key: "test-cache" }));

    await dataset.init();
    expect(dataset.loadCallCount).toBe(1);

    dataset.reset();
    await dataset.use(withCache({ driver, key: "test-cache" }));

    await dataset.init();
    // Should NOT call load again because it's cached in the driver
    expect(dataset.loadCallCount).toBe(1);
  });

  it("should use generic-dataset if no constructor name", async () => {
    const driver = new MemoryDriver();
    const dataset = new TestDataset();

    // Force empty constructor name
    Object.defineProperty(dataset.constructor, "name", { value: "" });

    await dataset.use(withCache({ driver }));
    await dataset.init();
    expect(dataset.loadCallCount).toBe(1);
  });

  it("should cache streamed AsyncIterable items and yield them one-by-one", async () => {
    // Dataset that returns an AsyncIterable instead of an array
    class StreamingDataset extends Dataset<any> {
      public loadCallCount = 0;
      async load(): Promise<AsyncIterable<any>> {
        this.loadCallCount++;
        async function* generate() {
          yield { id: 1, name: "Item 1" };
          yield { id: 2, name: "Item 2" };
          yield { id: 3, name: "Item 3" };
        }
        return generate();
      }
    }

    const driver = new MemoryDriver();
    const dataset = new StreamingDataset();
    await dataset.use(withCache({ driver, key: "stream-cache" }));

    // First load — should stream items and cache after completion
    await dataset.init();
    const items = await dataset.getAll();
    expect(items).toHaveLength(3);
    expect(items).toEqual([
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ]);
    expect(dataset.loadCallCount).toBe(1);

    // Verify cache was populated
    const cached = await driver.get("stream-cache");
    expect(cached).toEqual([
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ]);

    // Second load — should use cache, not re-stream
    dataset.reset();
    await dataset.use(withCache({ driver, key: "stream-cache" }));
    await dataset.init();
    expect(dataset.loadCallCount).toBe(1); // NOT incremented
    const cachedItems = await dataset.getAll();
    expect(cachedItems).toEqual([
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ]);
  });
});
