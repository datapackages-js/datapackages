# @datapackages/plugin-live-update

Live update middleware for `@datapackages/dataset`. Polls a remote URL at intervals and refreshes dataset data automatically.

## Usage

```typescript
import { withLiveUpdate } from "@datapackages/plugin-live-update";

dataset.use(
  withLiveUpdate({
    interval: 30_000,     // Poll every 30s
    enabled: true,        // Start polling immediately
    format: "ndjson",     // "json" | "ndjson"
  })
);

await dataset.init();

// Control polling
dataset.pauseLiveUpdate();
dataset.resumeLiveUpdate();
dataset.refresh(); // Force immediate refresh
```

## Options

| Option         | Type          | Default       | Description            |
| -------------- | ------------- | ------------- | ---------------------- |
| `url`          | `string`      | Auto-detected | Remote data URL        |
| `interval`     | `number`      | `30000`       | Poll interval in ms    |
| `enabled`      | `boolean`     | `true`        | Start polling on init  |
| `format`       | `string`      | `"json"`      | `"json"` or `"ndjson"` |
| `fetchOptions` | `RequestInit` | `undefined`   | Custom fetch options   |
