# @datapackages/dataset

Base `Dataset<T>` class and middleware system for building typed, pluggable data packages.

## Features

- **Lifecycle hooks** — `load()`, `init()`, `index()`, `dispose()`
- **Middleware system** — composable plugins via `.use(middleware)`
- **Idempotent init** — safe to call `init()` multiple times
- **CLI** — `datapackage update-source` to sync data from remote URLs
- **Type generation** — infers TypeScript interfaces from source data

## Usage

```typescript
import { Dataset } from "@datapackages/dataset";

class MyDataset extends Dataset<MyItem> {
  async load() {
    return fetch("/api/data").then((r) => r.json());
  }
}

const ds = await new MyDataset()
  .use(withCache({ ttl: 60_000 }));

await ds.init();
const items = await ds.getAll();
```

## Middleware Interface

```typescript
interface DatasetMiddleware<TItem, TMethods = {}> {
  onInit?(dataset: Dataset<TItem>): void | Promise<void>;
  onLoad?(dataset: Dataset<TItem>, data: TItem[]): void | Promise<void>;
  dispose?(dataset: Dataset<TItem>): void | Promise<void>;
  methods?: TMethods & ThisType<Dataset<TItem> & TMethods>;
}
```

## Dataset API

- `init()` — Initialize the dataset and run middleware hooks.
- `getAll()` — Returns a shallow copy of the data.
- `use(middleware)` — Attach a plugin; returns `this & TMethods` for type-safe accumulation.
- `dispose()` — Cleanup resources and trigger middleware `dispose` hooks.


## CLI

```bash
npx datapackage update-source --cwd ./packages/countries
```

Reads `datasets.config.ts` from the target directory and fetches/generates all configured data.
