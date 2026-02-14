# @datapackages/plugin-stream

NDJSON streaming middleware for `@datapackages/dataset`. Replaces the default `load()` method with a streaming `AsyncIterable`.

## Usage

```typescript
import { withStream } from "@datapackages/plugin-stream";

dataset.use(withStream({ url: "https://example.com/data.ndjson" }));

await dataset.init();
// Data is streamed line-by-line from the NDJSON source
```

## Options

| Option | Type     | Default       | Description         |
| ------ | -------- | ------------- | ------------------- |
| `url`  | `string` | Auto-detected | NDJSON endpoint URL |

If no URL is provided, it auto-detects via `dataset.getStreamURL()`.
