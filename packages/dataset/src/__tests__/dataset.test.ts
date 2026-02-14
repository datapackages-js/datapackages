import { describe, it, expect } from "vitest";
import { Dataset } from "../index";

describe("Dataset", () => {
  interface TestItem {
    id: number;
    name: string;
  }

  class TestDataset extends Dataset<TestItem> {
    public loadCalled = 0;

    protected async load(): Promise<TestItem[]> {
      this.loadCalled++;
      return [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
    }
  }

  it("should initialize and load data", async () => {
    const dataset = new TestDataset();
    await dataset.init();

    expect(dataset.loadCalled).toBe(1);

    const data = await dataset.getAll();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Item 1");
  });

  it("should be idempotent (load only once)", async () => {
    const dataset = new TestDataset();
    await dataset.init();
    await dataset.init();
    await dataset.getAll();

    expect(dataset.loadCalled).toBe(1);
  });

  it("getAll should auto-initialize if not called", async () => {
    const dataset = new TestDataset();
    // dataset.init() not called explicitly
    const data = await dataset.getAll();

    expect(dataset.loadCalled).toBe(1);
    expect(data).toHaveLength(2);
  });
});
