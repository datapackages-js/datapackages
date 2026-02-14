import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import * as France from "../index";
import { withSearch } from "@datapackages/plugin-search";

describe("Medical Terminologies - France", () => {
  describe("Profession", () => {
    let profession: France.Profession;

    beforeEach(async () => {
      profession = new France.Profession();
      await profession.use(withSearch());
    });

    it("should load all professions", async () => {
      const all = await profession.all();
      expect(Object.keys(all).length).toBeGreaterThan(0);
      expect(all["10"]).toBeDefined();
      expect(all["10"].display).toBe("Médecin");
    });

    it("should get profession by code", async () => {
      const medecin = await profession.getByCode("10");
      expect(medecin).toBeDefined();
      expect(medecin?.display).toBe("Médecin");
      expect(medecin?.status).toBe("active");
    });

    it("should get profession by label", async () => {
      const pharmacien = await profession.getByLabel("Pharmacien");
      expect(pharmacien).toBeDefined();
      expect(pharmacien?.code).toBe("21");
    });

    it("should search professions", async () => {
      const results = await profession.search("Infirmier");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.display === "Infirmier")).toBe(true);
    });

    it("should include expertises for Médecin", async () => {
      const medecin = await profession.getByCode("10");
      expect(medecin?.expertises.length).toBeGreaterThan(0);
      expect(medecin?.expertises[0]).toHaveProperty("shortDisplay");
    });
  });

  describe("Expertise", () => {
    let expertise: France.Expertise;

    beforeEach(async () => {
      expertise = new France.Expertise();
      await expertise.use(withSearch());
    });

    it("should get expertise by code with shortDisplay", async () => {
      const cardio = await expertise.getByCode("G15_10/SM04");
      expect(cardio).toBeDefined();
      expect(cardio?.display).toContain("Médecin - Cardiologie");
      expect(cardio?.shortDisplay).toBe(
        "Cardiologie et maladies vasculaires (SM)",
      );
    });

    it("should link back to professions", async () => {
      const cardio = await expertise.getByCode("G15_10/SM04");
      expect(cardio?.professions.length).toBe(1);
      expect(cardio?.professions[0].display).toBe("Médecin");
    });
  });

  describe("ActeSpecifique", () => {
    let acte: France.ActeSpecifique;

    beforeEach(async () => {
      acte = new France.ActeSpecifique();
      await acte.use(withSearch());
    });

    it("should get acte by code", async () => {
      const a = await acte.getByCode("0001");
      expect(a).toBeDefined();
      expect(a?.display).toBeDefined();
    });
  });
});
