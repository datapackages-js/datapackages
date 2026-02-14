# @datapackages/countries

Country data package with 250+ countries, built on `@datapackages/dataset`.

## Features

- **Lookup by code** — `getCountry("FR")` supports both ISO 3166-1 alpha-2 and alpha-3
- **Currency search** — `getCountriesByCurrency("EUR")`
- **TLD search** — `getCountriesByTLD(".fr")` or `getCountriesByTLD("fr")`
- **Phone code search** — `getCountriesByPhone("+33")`
- **Fuzzy name search** — matches common, official, native, and translated names
- **Full-text search** — via `@datapackages/plugin-search` (Orama)

## Usage

```typescript
import { countryService, withSearch } from "@datapackages/countries";

// Add search capabilities and initialize
await countryService
  .use(withSearch())
  .init();

// Lookup
const fr = await countryService.getCountry("FR");
console.log(fr?.name.common); // "France"

// Access data
const all = await countryService.getAll();

// Search (directly available on service after .use())
const results = await countryService.search("korea");

// Cleanup
await countryService.dispose();
```

## Data Source

[mledoze/countries](https://github.com/mledoze/countries) — updated via `npm run update-sources`.
