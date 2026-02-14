import { describe, it, expect, vi, beforeEach } from "vitest";
import { Dataset } from "@datapackages/dataset";
import { withLiveUpdate } from "../index";

// Mock Dataset for testing
class TestDataset extends Dataset<{ id: number; name: string }> {
  protected async load() {
    return [{ id: 1, name: "Local" }];
  }
  public getSourceURL() {
    return "https://api.example.com/data";
  }
}

describe("withLiveUpdate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should fetch JSON from remote URL", async () => {
    const mockData = [{ id: 1, name: "Remote" }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const dataset = new TestDataset();
    await dataset.use(withLiveUpdate({ url: "https://remote.com/data" }));
    await dataset.init();

    const data = await dataset.getAll();
    expect(data).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith("https://remote.com/data", undefined);
  });

  it("should auto-detect URL from dataset", async () => {
    const mockData = [{ id: 1, name: "Auto" }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const dataset = new TestDataset();
    await dataset.use(withLiveUpdate());
    await dataset.init();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/data",
      undefined,
    );
  });

  it("should pass fetchOptions", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const dataset = new TestDataset();
    const fetchOptions = { headers: { Authorization: "Bearer token" } };
    await dataset.use(
      withLiveUpdate({ url: "https://remote.com", fetchOptions }),
    );
    await dataset.init();

    expect(fetch).toHaveBeenCalledWith("https://remote.com", fetchOptions);
  });

  it("should support NDJSON streaming", async () => {
    const ndjson = '{"id":1}\n{"id":2}';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ndjson));
        controller.close();
      },
    });

    (fetch as any).mockResolvedValue({
      ok: true,
      body: stream,
    });

    const dataset = new TestDataset();
    await dataset.use(
      withLiveUpdate({
        url: "https://remote.com/data.ndjson",
        format: "ndjson",
      }),
    );

    const items: any[] = [];
    await dataset.use({
      onLoad: (_, data) => {
        items.push(...data);
      },
    });

    await dataset.init();

    expect(items).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("should support refresh()", async () => {
    const dataset = new TestDataset();

    // Initial load
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 1 }]),
    });

    await dataset.use(withLiveUpdate({ url: "https://remote.com" }));
    await dataset.init();
    expect(await dataset.getAll()).toEqual([{ id: 1 }]);

    // Update mock for refresh
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 2 }]),
    });

    await (dataset as any).refresh();
    expect(await dataset.getAll()).toEqual([{ id: 2 }]);
  });
});
