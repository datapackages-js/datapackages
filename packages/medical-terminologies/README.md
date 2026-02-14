# Medical Terminologies

This package provides a treeshakable namespace system for medical terminologies.

## Structure

- `France`: Root namespace for French terminologies.
    - `Profession`: High-level professions (e.g., Médecin), includes related expertises. (Source: `TRE_G15`)
    - `Expertise`: Medical specialties (e.g., Cardiologie), includes related professions. (Source: `TRE_A02`)
    - `Sources`: Official terminologies organized by folder:
        - `TRE_G15-ProfessionSante/`: Contains `data.json` and `meta.json`.
        - `TRE_A02-ProfessionSavFaire-CISIS/`: Contains `data.json` and `meta.json`.

Each source folder contains:
- `data.json`: The exact FHIR JSON resource.
- `meta.json`: Metadata including `url`, `lastUpdate`, and `lastVersion`.
To update the source terminologies from the official ANS (Agence du Numérique en Santé) website, run:

```bash
npm run update-sources
```

## Usage

```typescript
import { France, withSearch } from 'medical-terminologies';

// Initialize Profession Manager with search capabilities
const professionManager = await new France.Profession()
  .use(withSearch())
  .init();

// Access all professions (Record keyed by code)
const professions = await professionManager.all();
const medecin = professions['10']; 
console.log(medecin.display); // "Médecin"

// Get by Code
const sageFemme = await professionManager.getByCode('50');

// Get by Label
const infirmier = await professionManager.getByLabel('Infirmier');

// Search (typed after .use())
const results = await professionManager.search('Cardio');

// Cleanup
await professionManager.dispose();
```
