import { defineDatasets } from "@datapackages/dataset";

export default defineDatasets([
  {
    name: "TRE_A02-ProfessionSavFaire-CISIS",
    sourceUrl:
      "https://mos.esante.gouv.fr/NOS/TRE_A02-ProfessionSavFaire-CISIS/FHIR/TRE-A02-ProfessionSavFaire-CISIS/TRE_A02-ProfessionSavFaire-CISIS-FHIR.json",
    srcDir: "src/france/sources/TRE_A02-ProfessionSavFaire-CISIS",
    saveData: true,
    generateTypes: true,
    generateIndex: true,
    strategy: "fhir-valueset",
    enumeratedFields: [
      { path: "concept.code", name: "Code" },
      { path: "concept.display", name: "Display" },
    ],
    search: {
      fields: ["code", "display"],
    },
  },
  {
    name: "TRE_G15-ProfessionSante",
    sourceUrl:
      "https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante/TRE_G15-ProfessionSante-FHIR.json",
    srcDir: "src/france/sources/TRE_G15-ProfessionSante",
    saveData: true,
    generateTypes: true,
    generateIndex: true,
    strategy: "fhir-valueset",
    enumeratedFields: [
      { path: "concept.code", name: "Code" },
      { path: "concept.display", name: "Display" },
    ],
    search: {
      fields: ["code", "display"],
    },
  },
  {
    name: "TRE_R210-ActeSpecifique",
    sourceUrl:
      "https://interop.esante.gouv.fr/terminologies/CodeSystem-TRE-R210-ActeSpecifique.json",
    srcDir: "src/france/sources/TRE_R210-ActeSpecifique",
    saveData: true,
    generateTypes: true,
    generateIndex: true,
    strategy: "fhir-valueset",
    enumeratedFields: [
      { path: "concept.code", name: "Code" },
      { path: "concept.display", name: "Display" },
    ],
    search: {
      fields: ["code", "display"],
    },
  },
]);
