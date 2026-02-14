import type { Dataset } from "./index";

/**
 * Hook-based middleware interface for extending Dataset behavior.
 *
 * @typeParam TItem - The type of items in the dataset.
 * @typeParam TMethods - The methods this middleware adds to the dataset.
 *   When using `dataset.use()`, the return type compounds: `this & TMethods`.
 *
 * @example
 * ```typescript
 * interface MyMethods {
 *   greet(): string;
 * }
 *
 * const myMiddleware: DatasetMiddleware<MyItem, MyMethods> = {
 *   onInit(dataset) { console.log("Initialized"); },
 *   onLoad(dataset, data) { console.log(`Loaded ${data.length} items`); },
 *   methods: { greet() { return "hello"; } },
 * };
 *
 * const ds = await dataset.use(myMiddleware);
 * ds.greet(); // ✅ fully typed
 * ```
 */
export interface DatasetMiddleware<TItem, TMethods = {}> {
  /** Unique name of the middleware (used for ordering validation). */
  name?: string;

  /** Names of middlewares that must be applied BEFORE this one (closer to source). */
  after?: string[];

  /** Names of middlewares that must be applied AFTER this one (closer to user). */
  before?: string[];

  /** Called once during `init()`, before data is loaded. Use for setup. */
  onInit?: (dataset: Dataset<TItem>) => void | Promise<void>;
  /** Called after all data is loaded with the complete dataset. Use for batch processing. */
  onLoad?: (dataset: Dataset<TItem>, data: TItem[]) => void | Promise<void>;
  /** Called during `dispose()` for resource cleanup. */
  dispose?: (dataset: Dataset<TItem>) => void | Promise<void>;
  /**
   * Methods to mix into the dataset instance.
   * If a method with the same name exists, the original is preserved as `_methodName`.
   *
   * `ThisType` ensures `this` inside methods refers to `Dataset<TItem> & TMethods`,
   * giving full type access to both the base dataset and the added methods.
   */
  methods?: (TMethods & Record<string, Function>) &
    ThisType<Dataset<TItem> & TMethods>;
}
