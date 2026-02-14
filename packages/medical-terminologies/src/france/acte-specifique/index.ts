import {
  getTRE_R210_ActeSpecifique,
  TRE_R210_ActeSpecifique,
} from "../sources";
import { TerminologyBase, flattenConcept } from "../shared";

export interface ActeSpecifiqueItem
  extends TRE_R210_ActeSpecifique.FlattenedConcept {}

export class ActeSpecifique extends TerminologyBase<
  ActeSpecifiqueItem,
  TRE_R210_ActeSpecifique.Code,
  TRE_R210_ActeSpecifique.Display
> {
  protected async loadData(): Promise<Record<string, ActeSpecifiqueItem>> {
    const TRE_R210_Module = (await getTRE_R210_ActeSpecifique()) as any;
    const TRE_R210 = await TRE_R210_Module.loadData();

    return (TRE_R210.concept || []).reduce(
      (acc: Record<string, ActeSpecifiqueItem>, concept: any) => {
        const flattened =
          flattenConcept<TRE_R210_ActeSpecifique.FlattenedConcept>(concept);
        if (!flattened) return acc;

        acc[concept.code] = flattened as ActeSpecifiqueItem;
        return acc;
      },
      {},
    );
  }

  protected async loadIndex(): Promise<any> {
    try {
      const module = await import(
        "../sources/TRE_R210-ActeSpecifique/search.index.json",
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
      "../sources/TRE_R210-ActeSpecifique/data.ndjson",
      import.meta.url,
    ).href;
  }
}

export default ActeSpecifique;
