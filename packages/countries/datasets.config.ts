import { defineDatasets } from "@datapackages/dataset";

export default defineDatasets({
  sourceUrl:
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json",
  srcDir: "src",
  saveData: true,
  generateTypes: true,
  interfaceName: "Country",
  typeOverrides: {
    cca2: "CountryCode2",
    cca3: "CountryCode3",
  },
  enumeratedFields: [
    {
      path: "cca2",
      name: "CountryCode2",
    },
    {
      path: "cca3",
      name: "CountryCode3",
    },
    {
      path: "tld",
      name: "TLD",
      transform: (value: string) => value.replace(/^\./, ""),
    },
  ],
  search: {
    fields: ["name.common", "name.official", "cca2", "cca3"],
    schema: {
      "name.common": "string",
      "name.official": "string",
      cca2: "string",
      cca3: "string",
    },
  },
  preTypeContent: "export type CountryCode = CountryCode2 | CountryCode3;",
});
