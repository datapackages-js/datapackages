import {
  getTRE_G15_ProfessionSante,
  getTRE_A02_ProfessionSavFaire_CISIS,
  TRE_A02_ProfessionSavFaire_CISIS,
  TRE_G15_ProfessionSante,
} from "../sources";
import { TerminologyBase, flattenConcept } from "../shared";

export interface ExpertiseItem
  extends TRE_A02_ProfessionSavFaire_CISIS.FlattenedConcept {
  shortDisplay: string;
  professions: Array<TRE_G15_ProfessionSante.FlattenedConcept>;
}

export class Expertise extends TerminologyBase<
  ExpertiseItem,
  TRE_A02_ProfessionSavFaire_CISIS.Code,
  TRE_A02_ProfessionSavFaire_CISIS.Display
> {
  protected async loadData(): Promise<Record<string, ExpertiseItem>> {
    const [TRE_G15_Module, TRE_A02_Module] = await Promise.all([
      getTRE_G15_ProfessionSante() as any,
      getTRE_A02_ProfessionSavFaire_CISIS() as any,
    ]);
    const [TRE_G15, TRE_A02] = await Promise.all([
      TRE_G15_Module.loadData(),
      TRE_A02_Module.loadData(),
    ]);

    const allProfessions = (TRE_G15.concept || []).reduce(
      (acc: any, p: any) => {
        acc[p.code] =
          flattenConcept<TRE_G15_ProfessionSante.FlattenedConcept>(p);
        return acc;
      },
      {},
    );

    return (TRE_A02.concept || []).reduce(
      (acc: Record<string, ExpertiseItem>, concept: any) => {
        const flattened =
          flattenConcept<TRE_A02_ProfessionSavFaire_CISIS.FlattenedConcept>(
            concept,
          );
        if (!flattened) return acc;

        const profMatch = concept.code.match(/^G15_(\d+)/);
        const profCode = profMatch ? profMatch[1] : null;
        const profession = profCode ? allProfessions[profCode] : null;

        let shortDisplay: string = flattened.display;
        if (
          profession?.display &&
          flattened.display.startsWith(`${profession.display} - `)
        ) {
          shortDisplay = flattened.display.substring(
            profession.display.length + 3,
          );
        }

        acc[concept.code] = {
          ...flattened,
          shortDisplay,
          professions: profession ? [profession] : [],
        } as ExpertiseItem;
        return acc;
      },
      {},
    );
  }

  protected async loadIndex(): Promise<any> {
    try {
      const module = await import(
        "../sources/TRE_A02-ProfessionSavFaire-CISIS/search.index.json",
        {
          with: { type: "json" },
        }
      );
      return module.default || module;
    } catch (e) {
      return null;
    }
  }

  protected getStreamURL(): string {
    return new URL(
      "../sources/TRE_A02-ProfessionSavFaire-CISIS/data.ndjson",
      import.meta.url,
    ).href;
  }

  protected getSourceURL(): string {
    return TRE_A02_ProfessionSavFaire_CISIS.getSourceURL();
  }
}

export default Expertise;
