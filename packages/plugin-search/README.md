# @datapackages/plugin-search

Full-text search middleware for `@datapackages/dataset`, powered by [Orama](https://github.com/oramasearch/orama).

## Usage

```typescript
import { withSearch } from "@datapackages/plugin-search";

dataset.use(withSearch());

await dataset.init();
const results = await dataset.search("query");
```

## Index Generation

Search indices are generated at build time via `datasets.config.ts`:

```typescript
export default defineDatasets({
  search: {
    fields: ["name.common", "cca2", "cca3"],
  },
});
```

## API

### `buildIndex(options)`

Pre-builds a serialized Orama index for embedding in packages.

### `SearchService`

Internal service that loads and queries a serialized index.
