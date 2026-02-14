import {
  getTRE_G15_ProfessionSante,
  getTRE_A02_ProfessionSavFaire_CISIS,
  TRE_G15_ProfessionSante,
  TRE_A02_ProfessionSavFaire_CISIS,
} from "../sources";
import { TerminologyBase, flattenConcept } from "../shared";

export interface ProfessionItem
  extends TRE_G15_ProfessionSante.FlattenedConcept {
  code: TRE_G15_ProfessionSante.Code;
  display: TRE_G15_ProfessionSante.Display;
  expertises: Array<
    TRE_A02_ProfessionSavFaire_CISIS.FlattenedConcept & { shortDisplay: string }
  >;
}

export class Profession extends TerminologyBase<
  ProfessionItem,
  TRE_G15_ProfessionSante.Code,
  TRE_G15_ProfessionSante.Display
> {
  protected async loadData(): Promise<Record<string, ProfessionItem>> {
    const [TRE_G15_Module, TRE_A02_Module] = await Promise.all([
      getTRE_G15_ProfessionSante() as any,
      getTRE_A02_ProfessionSavFaire_CISIS() as any,
    ]);
    const [TRE_G15, TRE_A02] = await Promise.all([
      TRE_G15_Module.loadData(),
      TRE_A02_Module.loadData(),
    ]);

    const allExpertises = (TRE_A02.concept || []).map((c: any) =>
      flattenConcept<TRE_A02_ProfessionSavFaire_CISIS.FlattenedConcept>(c),
    );

    return (TRE_G15.concept || []).reduce(
      (acc: Record<string, ProfessionItem>, concept: any) => {
        const flattened =
          flattenConcept<TRE_G15_ProfessionSante.FlattenedConcept>(concept);
        if (!flattened) return acc;

        const expertises = allExpertises
          .filter(
            (e: any): e is NonNullable<typeof e> =>
              !!e &&
              (e.code.startsWith(`G15_${concept.code}/`) ||
                e.code === `G15_${concept.code}`),
          )
          .map((e: any) => {
            let shortDisplay: string = e.display;
            if (
              flattened.display &&
              e.display.startsWith(`${flattened.display} - `)
            ) {
              shortDisplay = e.display.substring(flattened.display.length + 3);
            }
            return { ...e, shortDisplay };
          });

        acc[concept.code] = {
          ...flattened,
          expertises,
        } as ProfessionItem;
        return acc;
      },
      {},
    );
  }

  protected async loadIndex(): Promise<any> {
    try {
      const module = await import(
        "../sources/TRE_G15-ProfessionSante/search.index.json",
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
      "../sources/TRE_G15-ProfessionSante/data.ndjson",
      import.meta.url,
    ).href;
  }

  protected getSourceURL(): string {
    return TRE_G15_ProfessionSante.getSourceURL();
  }
}

export default Profession;
