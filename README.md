# Data Packages Monorepo

This monorepo contains shared data packages and a composable plugin system for building typed datasets.

## Packages

### Core
| Package                                                             | Description                                          |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| [`@datapackages/dataset`](./packages/dataset)                       | Base `Dataset<T>` class, middleware system, and CLI  |
| [`@datapackages/plugin-cache`](./packages/plugin-cache)             | Caching middleware (Memory, LocalStorage, IndexedDB) |
| [`@datapackages/plugin-live-update`](./packages/plugin-live-update) | Polling-based live data refresh                      |
| [`@datapackages/plugin-search`](./packages/plugin-search)           | Full-text search via Orama                           |
| [`@datapackages/plugin-stream`](./packages/plugin-stream)           | NDJSON streaming loader                              |

### Datasets
| Package                                                                   | Description                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`@datapackages/countries`](./packages/countries)                         | 250+ countries with codes, currencies, TLDs, phone codes |
| [`@datapackages/medical-terminologies`](./packages/medical-terminologies) | FHIR-based medical terminologies (multi-country)         |

## Development

```bash
npm install          # Install all dependencies
npm run build        # Build all packages
npm run test         # Run tests across all packages
npm run update-sources  # Regenerate datasets from upstream
```
