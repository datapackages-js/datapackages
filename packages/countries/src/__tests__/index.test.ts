import { describe, it, expect, beforeAll } from "vitest";
import { countryService } from "../index";
import { withSearch } from "@datapackages/plugin-search";
import type { CountryCode } from "../types";

describe("Country Data", () => {
  beforeAll(async () => {
    await countryService.init();
  });

  it("should load countries", async () => {
    expect((await countryService.getCountries()).length).toBeGreaterThan(0);
  });

  it("should retrieve France by cca2", async () => {
    const fr = await countryService.getCountry("FR");
    expect(fr).toBeDefined();
    expect(fr?.name.common).toBe("France");
    expect(fr?.cca2).toBe("FR");
    expect(fr?.currencies?.EUR).toBeDefined();
  });

  it("should retrieve France by cca3", async () => {
    const fr = await countryService.getCountry("FR");
    expect(fr).toBeDefined();
    expect(fr?.name.common).toBe("France");
  });

  it("should retrieve United States by cca2", async () => {
    const us = await countryService.getCountry("US");
    expect(us).toBeDefined();
    expect(us?.name.common).toBe("United States");
    expect(us?.currencies?.USD).toBeDefined();
  });

  it("should return undefined for invalid code", async () => {
    // @ts-expect-error - Testing runtime behavior for invalid code
    const invalid = await countryService.getCountry("ZZ");
    expect(invalid).toBeUndefined();
  });

  it("should search by currency", async () => {
    const euroCountries = await countryService.getCountriesByCurrency("EUR");
    expect(euroCountries.length).toBeGreaterThan(15);
    expect(euroCountries.find((c) => c.cca2 === "FR")).toBeDefined();

    expect(
      (await countryService.getCountriesByCurrency("USD")).find(
        (c) => c.cca2 === "US",
      ),
    ).toBeDefined();
  });

  it("should search by TLD", async () => {
    // With dot
    const frDot = await countryService.getCountriesByTLD(".fr");
    expect(frDot).toBeDefined();
    expect(frDot.length).toBeGreaterThan(0);
    expect(frDot[0].name.common).toBe("France");

    // Without dot
    const frNoDot = await countryService.getCountriesByTLD("fr");
    expect(frNoDot).toBeDefined();
    expect(frNoDot.length).toBeGreaterThan(0);
    expect(frNoDot[0].name.common).toBe("France");
  });

  it("should search by phone code", async () => {
    const fr = await countryService.getCountriesByPhone("33");
    expect(fr.find((c) => c.cca2 === "FR")).toBeDefined();

    const us = await countryService.getCountriesByPhone("+1");
    expect(us.find((c) => c.cca2 === "US")).toBeDefined();
  });

  it("should fuzzy search by name", async () => {
    const res = await countryService.searchByName("korea");
    expect(res.length).toBeGreaterThan(0);
    expect(res.find((c) => c.cca2 === "KR")).toBeDefined(); // South Korea
    expect(res.find((c) => c.cca2 === "KP")).toBeDefined(); // North Korea

    expect(
      (await countryService.searchByName("France")).length,
    ).toBeGreaterThan(0);

    // Translation search: 'Alemania' (Germany in Spanish)
    const germany = await countryService.searchByName("Alemania");
    expect(germany.find((c) => c.cca2 === "DE")).toBeDefined();

    // Translation search: 'Francia' (France in Spanish/Italian)
    const francia = await countryService.searchByName("Francia");
    expect(francia.find((c) => c.cca2 === "FR")).toBeDefined();
  });

  it("should use Orama search", async () => {
    countryService.reset();
    await countryService.use(withSearch());
    await countryService.init();

    // Search for France
    const fr = await countryService.search("France");
    expect(fr.length).toBeGreaterThan(0);
    expect(fr[0].cca2).toBe("FR");

    // Search for Germany
    const de = await countryService.search("Germany");
    expect(de.length).toBeGreaterThan(0);
    expect(de[0].cca2).toBe("DE");

    // Search for partial match (assuming Orama default config supports it)
    // Default Orama setup uses prefix search?
    const fra = await countryService.search("Franc");
    expect(fra.length).toBeGreaterThan(0);
    expect(fra[0].name.common).toBe("France");
  });
});
