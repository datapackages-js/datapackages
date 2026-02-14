export interface EnumeratedField {
  path: string;
  name: string;
  transform?: (value: any) => string | number;
}

export interface DatasetConfig {
  name?: string; // Optional name for logging
  sourceUrl?: string; // Optional if data is fetched manually or local
  srcDir?: string;
  saveData?: boolean;
  generateTypes?: boolean;
  generateIndex?: boolean;
  interfaceName?: string;
  typeOverrides?: Record<string, string>;
  preTypeContent?: string;
  enumeratedFields?: (string | EnumeratedField)[];
  extraExports?: Record<string, string>;
  strategy?: "default" | "fhir-valueset";
  /**
   * Search Configuration
   */
  search?: {
    fields: string[];
    path?: string;
    schema?: Record<string, "string" | "number" | "boolean">;
  };
}

/**
 * Type helper to define configuration with intellisense
 */
export function defineDatasets(
  config: DatasetConfig | DatasetConfig[],
): DatasetConfig[] {
  return Array.isArray(config) ? config : [config];
}
