import { describe, it, expect, vi } from "vitest";
import { withStream } from "../index";
import { Dataset } from "@datapackages/dataset";

// Mock implementation of Dataset for testing
class TestDataset extends Dataset<{ id: number; name: string }> {
  protected async load() {
    // Should be handled by withStream middleware
    return [];
  }
}

describe("plugin-stream", () => {
  it("should stream NDJSON and trigger onLoad hook with all items", async () => {
    const mockData = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ];
    const ndjson = mockData.map((d) => JSON.stringify(d)).join("\n");

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          const chunks = [encoder.encode(ndjson)];
          let i = 0;
          return {
            read: async () => {
              if (i < chunks.length) {
                return { done: false, value: chunks[i++] };
              }
              return { done: true, value: undefined };
            },
            releaseLock: () => {},
          };
        },
      },
    });

    const dataset = new TestDataset();
    const loadedItems: any[] = [];
    const onLoadHook = vi.fn().mockImplementation((ds, data) => {
      loadedItems.push(...data);
    });

    await dataset.use(withStream("http://example.com/data.ndjson"));
    await dataset.use({ onLoad: onLoadHook });

    await dataset.init();

    expect(onLoadHook).toHaveBeenCalledTimes(1);
    expect(loadedItems).toEqual(mockData);
    expect(await dataset.getAll()).toEqual(mockData);
  });

  it("should auto-detect URL from dataset with zero-config", async () => {
    const mockData = [{ id: 1, name: "Auto Item" }];
    const ndjson = JSON.stringify(mockData[0]);

    // Mock implementation of Dataset with getStreamURL
    class AutoDataset extends Dataset<{ id: number; name: string }> {
      public getStreamURL() {
        return "http://auto.com/data.ndjson";
      }
      protected async load() {
        return [];
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          let i = 0;
          return {
            read: async () => {
              if (i === 0) {
                i++;
                return { done: false, value: encoder.encode(ndjson) };
              }
              return { done: true };
            },
            releaseLock: () => {},
          };
        },
      },
    });

    const dataset = new AutoDataset();
    await dataset.use(withStream()); // Zero config
    await dataset.init();

    expect(global.fetch).toHaveBeenCalledWith("http://auto.com/data.ndjson");
    expect(await dataset.getAll()).toEqual(mockData);
  });

  it("should NOT call the original load method when using withStream", async () => {
    // We want to ensure that the dataset's standard load() (which preloads data)
    // is completely bypassed by the stream middleware.
    class PreloadDataset extends Dataset<{ id: number }> {
      public loadCalled = false;
      protected async load() {
        this.loadCalled = true;
        return [{ id: 1 }];
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          let i = 0;
          return {
            read: async () => {
              if (i === 0) {
                i++;
                return {
                  done: false,
                  value: encoder.encode(JSON.stringify({ id: 99 })),
                };
              }
              return { done: true };
            },
            releaseLock: () => {},
          };
        },
      },
    });

    const dataset = new PreloadDataset();
    await dataset.use(withStream("http://example.com/stream.ndjson"));
    await dataset.init();

    // Verify stream data was used (id 99) not preload data (id 1)
    expect(await dataset.getAll()).toEqual([{ id: 99 }]);
    // Verify the original load was never called
    expect(dataset.loadCalled).toBe(false);
  });
});
