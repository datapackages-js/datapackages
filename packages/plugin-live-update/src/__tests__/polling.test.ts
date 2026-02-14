import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Dataset } from "@datapackages/dataset";
import { withLiveUpdate } from "../index";

// Mock Dataset class
class TestDataset extends Dataset<any> {
  protected async load(): Promise<any[]> {
    return [];
  }
}

describe("withLiveUpdate Polling", () => {
  let dataset: TestDataset;

  beforeEach(() => {
    vi.useFakeTimers();
    dataset = new TestDataset();
  });

  afterEach(() => {
    // Ensure any running intervals are stopped to prevent pollution
    if (dataset && (dataset as any).dispose) {
      (dataset as any).dispose();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should start polling if enabled", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }],
    } as any);

    await dataset.use(
      withLiveUpdate({ url: "http://test.com", interval: 1000, enabled: true }),
    );
    await dataset.init();

    // Initial fetch
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Fast forward time
    await vi.advanceTimersByTimeAsync(1100);

    // Should receive another call
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should not poll if enabled is false", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    await dataset.use(
      withLiveUpdate({
        url: "http://test.com",
        interval: 1000,
        enabled: false,
      }),
    );
    await dataset.init();

    expect(fetchSpy).toHaveBeenCalledTimes(1); // Initial load

    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchSpy).toHaveBeenCalledTimes(1); // No extra calls
  });

  it("should pause and resume polling", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    const plugin = withLiveUpdate({ url: "http://test.com", interval: 1000 });
    await dataset.use(plugin);
    await dataset.init(); // 1 call

    // Pause
    (dataset as any).pauseLiveUpdate();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1

    // Resume
    (dataset as any).resumeLiveUpdate();

    await vi.advanceTimersByTimeAsync(1100);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // New call
  });

  it("should dispose and stop polling", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    await dataset.use(
      withLiveUpdate({ url: "http://test.com", interval: 1000 }),
    );
    await dataset.init();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Dispose
    (dataset as any).dispose();

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // No new calls
  });
});
