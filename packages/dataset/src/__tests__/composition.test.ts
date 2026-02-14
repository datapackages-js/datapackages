import { describe, it, expect } from "vitest";
import { Dataset } from "../index";
import { withSearch } from "@datapackages/plugin-search";

describe("Dataset Composition", () => {
  interface TestItem {
    id: number;
    name: string;
  }

  class TestDataset extends Dataset<TestItem> {
    protected async load(): Promise<TestItem[]> {
      return [
        { id: 1, name: "France" },
        { id: 2, name: "Germany" },
      ];
    }
  }

  it("should support middleware via .use()", async () => {
    let onInitCalled = false;
    let onLoadCalled = false;

    const dataset = new TestDataset();
    await dataset.use({
      onInit: () => {
        onInitCalled = true;
      },
      onLoad: () => {
        onLoadCalled = true;
      },
      methods: {
        customMethod: () => "foo",
      },
    });

    await dataset.init();
    expect(onInitCalled).toBe(true);
    expect(onLoadCalled).toBe(true);
    expect((dataset as any).customMethod()).toBe("foo");
  });

  it("should support withSearch middleware (auto-detection, no index)", async () => {
    const dataset = new TestDataset();
    (dataset as any).loadIndex = async () => null;
    await dataset.use(withSearch() as any);

    await dataset.init();
    // Without an index, search should throw
    await expect(dataset.search("France")).rejects.toThrow(
      "Search index not loaded",
    );
  });

  it("should throw on search without middleware", async () => {
    const dataset = new TestDataset();
    await dataset.init();
    await expect(dataset.search("France")).rejects.toThrow(
      "search() requires a search middleware",
    );
  });
});
