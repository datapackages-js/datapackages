# @datapackages/plugin-cache

Caching middleware for `@datapackages/dataset`. Caches `load()` results using a pluggable driver system.

## Drivers

| Driver               | Storage       | Environment |
| -------------------- | ------------- | ----------- |
| `MemoryDriver`       | In-memory Map | Universal   |
| `LocalStorageDriver` | localStorage  | Browser     |
| `IndexedDBDriver`    | IndexedDB     | Browser     |

## Usage

```typescript
import { withCache, MemoryDriver } from "@datapackages/plugin-cache";

dataset.use(
  withCache({
    driver: new MemoryDriver(),
    ttl: 60_000, // 1 minute
    key: "my-dataset",
  })
);
```

## Options

| Option   | Type          | Default          | Description        |
| -------- | ------------- | ---------------- | ------------------ |
| `driver` | `CacheDriver` | `MemoryDriver`   | Storage backend    |
| `ttl`    | `number`      | `undefined`      | Time-to-live in ms |
| `key`    | `string`      | Constructor name | Cache key          |

## API

### `clearCache()`

Available on the dataset instance after `.use(withCache())`. Clears the cached data for this dataset.

```typescript
await dataset.clearCache();
```

## Ordering Importance

When using with `@datapackages/plugin-stream`, ensure `withCache()` is applied **after** `withStream()`:

```typescript
await dataset
  .use(withStream())
  .use(withCache()); // Correct order
```
