import { describe, it, expect, vi } from "vitest";
import { Dataset } from "../index";
import { DatasetMiddleware } from "../middleware";

class TestDataset extends Dataset<any> {
  protected async load() {
    return [];
  }
}

describe("Dataset Disposal", () => {
  it("should call dispose on all middlewares", async () => {
    const dataset = new TestDataset();
    const disposeFn = vi.fn();

    const middleware: DatasetMiddleware<any> = {
      dispose: disposeFn,
    };

    await dataset.use(middleware);
    await dataset.dispose();

    expect(disposeFn).toHaveBeenCalledWith(dataset);
  });

  it("should reset dataset state after dispose", async () => {
    const dataset = new TestDataset();

    // Simulate initialized state
    await dataset.use({
      onInit: () => {
        /* no-op */
      },
    });

    // Initialized starts false
    await dataset.init();

    await dataset.dispose();

    // Verify state reset via side effects on private properties (casted to any)
    const ds = dataset as any;
    expect(ds._middlewares).toEqual([]);
    expect(ds._initialized).toBe(false);
    expect(ds._dataStack).toEqual([]);
  });
});
