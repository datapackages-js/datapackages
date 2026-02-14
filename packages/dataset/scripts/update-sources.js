import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);

import { createConsola } from "consola";
const consola = createConsola({ level: 3 });

/**
 * Infers TypeScript types from a value.
 */
export function inferType(value, indentLevel = 0) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'any[]';
    const types = new Set(value.map(v => inferType(v, indentLevel)));
    const typesArray = Array.from(types);
    if (typesArray.length === 1) return `${typesArray[0]}[]`;
    return `(${typesArray.join(' | ')})[]`;
  }

  if (typeof value === 'object') {
    const indent = '  '.repeat(indentLevel);
    const props = Object.entries(value).map(([key, val]) => {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      return `${indent}  ${safeKey}: ${inferType(val, indentLevel + 1)};`;
    }).join('\n');
    return `{\n${props}\n${indent}}`;
  }

  return typeof value;
}

/**
 * Generates a TypeScript interface definition from a list of objects.
 */
export function generateTypeDefinition(objects, interfaceName) {
  const properties = {};
  const allKeys = new Set();

  objects.forEach(obj => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(k => allKeys.add(k));
    }
  });

  allKeys.forEach(key => {
    const values = [];
    let seenCount = 0;

    objects.forEach(obj => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj) && Object.prototype.hasOwnProperty.call(obj, key)) {
        values.push(obj[key]);
        seenCount++;
      }
    });

    const isOptional = seenCount < objects.length;
    const types = new Set();
    const objectValues = values.filter(v => v && typeof v === 'object' && !Array.isArray(v));
    const arrayValues = values.filter(v => Array.isArray(v));
    const primitiveValues = values.filter(v => (!v || typeof v !== 'object') && !Array.isArray(v));

    if (objectValues.length > 0) {
      const nestedType = generateTypeBody(objectValues);
      types.add(nestedType);
    }

    if (arrayValues.length > 0) {
      const allElements = arrayValues.flat();
      if (allElements.length === 0) {
        types.add('any[]');
      } else {
        const firstElem = allElements[0];
        if (firstElem && typeof firstElem === 'object') {
          const nestedType = generateTypeBody(allElements);
          types.add(`Array<${nestedType}>`);
        } else {
          const elemTypes = new Set(allElements.map(e => typeof e));
          types.add(`Array<${Array.from(elemTypes).join(' | ')}>`);
        }
      }
    }

    primitiveValues.forEach(v => {
      if (v === null) types.add('null');
      else types.add(typeof v);
    });

    // Heuristics for Records (Maps)
    if (['currencies', 'languages', 'translations', 'dialling_codes', 'nativeName'].includes(key) || key === 'nativeName') {
      if (objectValues.length > 0) {
        const sample = objectValues[0];
        const sampleValue = Object.values(sample)[0];
        if (sampleValue && typeof sampleValue === 'object') {
          const allValues = objectValues.flatMap(o => Object.values(o));
          const nestedType = generateTypeBody(allValues);
          types.clear();
          types.add(`Record<string, ${nestedType}>`);
        } else {
          types.clear();
          types.add('Record<string, string>');
        }
      }
    }

    properties[key] = {
      types: Array.from(types),
      optional: isOptional
    };
  });

  return properties;
}

function generateTypeBody(objects) {
  const schema = generateTypeDefinition(objects, 'Nested');
  const lines = Object.entries(schema).map(([key, meta]) => {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
    const typeStr = meta.types.join(' | ');
    return `  ${safeKey}${meta.optional ? '?' : ''}: ${typeStr};`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

/**
 * Generates Types for FHIR ValueSet/CodeSystem
 */
function generateFHIRTypes(data) {
  const codes = (data.concept || []).map(c => c.code).filter(Boolean);
  const codeUnion = codes.length > 0
    ? codes.map(c => `  | '${c.replace(/'/g, "\\'")}'`).join('\n')
    : '  | string';

  const displays = (data.concept || []).map(c => c.display).filter(Boolean);
  const displayUnion = displays.length > 0
    ? Array.from(new Set(displays)).map(d => `  | '${d.replace(/'/g, "\\'")}'`).join('\n')
    : '  | string';

  // Collect unique property codes for the flattened interface
  const propertyCodes = new Set();
  (data.concept || []).forEach(c => {
    (c.property || []).forEach(p => {
      if (p.code) propertyCodes.add(p.code);
    });
  });

  const propertyFields = Array.from(propertyCodes)
    .map(code => `  ${code}?: string;`)
    .join('\n');

  return `export type Code = \n${codeUnion};\n\nexport type Display = \n${displayUnion};\n\nexport interface FlattenedConcept {\n  code: Code;\n  display: Display;\n${propertyFields}\n}\n\nexport interface TerminologyData {\n  resourceType: string;\n  url: string;\n  version: string;\n  name: string;\n  status: string;\n  experimental: boolean;\n  date: string;\n  publisher: string;\n  description: string;\n  concept: Array<{\n    code: Code;\n    display: Display;\n    property?: Array<{\n      code: string;\n      valueCode?: string;\n      valueDateTime?: string;\n      valueString?: string;\n      valueBoolean?: boolean;\n    }>;\n  }>;\n}\n\nexport type Data = TerminologyData;\n`;
}

/**
 * Main update function that reads configuration and executes update
 */
// No content here, moved to top

// ... (rest of imports)

// ... (type generation functions)

/**
 * Main update function that reads configuration and executes update
 */
export async function runUpdate(configOrPath, baseDir) {
  let configs;
  let configDir;

  if (typeof configOrPath === 'string') {
    const cwd = path.resolve(configOrPath);
    const tsConfig = path.resolve(cwd, "datasets.config.ts");
    const jsConfig = path.resolve(cwd, "datasets.config.js");

    const configPath = fs.existsSync(tsConfig)
      ? tsConfig
      : fs.existsSync(jsConfig)
        ? jsConfig
        : null;

    if (!configPath) {
      throw new Error(`datasets.config.ts or datasets.config.js not found in ${cwd}`);
    } else {
      configDir = path.dirname(configPath);
      try {
        const mod = await jiti.import(configPath, { default: true });
        const rawConfig = mod.default || mod;
        configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
      } catch (err) {
        consola.error(`Failed to load config from ${configPath}:`, err);
        throw err;
      }
    }
  } else {
    configs = Array.isArray(configOrPath) ? configOrPath : [configOrPath];
    configDir = baseDir || process.cwd();
  }

  for (const config of configs) {
    const srcName = config.srcDir || 'src';
    const sourceLog = consola.withTag(srcName);
    sourceLog.start(`Updating source...`);

    // Default to src directory relative to config
    const SRC_DIR = path.resolve(configDir, srcName);

    if (!fs.existsSync(SRC_DIR)) {
      fs.mkdirSync(SRC_DIR, { recursive: true });
    }


    let data = [];
    if (config.sourceUrl) {
      try {
        sourceLog.start(`├─ Fetching from ${config.sourceUrl}`);
        const response = await fetch(config.sourceUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        data = await response.json();
      } catch (e) {
        sourceLog.error(`├─ Failed to fetch:`, e.message);
        continue;
      }
    } else {
      sourceLog.warn("├─ No sourceUrl provided.");
    }

    // Update meta.json
    const metaPath = path.join(SRC_DIR, 'meta.json');
    try {
      const meta = fs.existsSync(metaPath)
        ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
        : { name: srcName };

      meta.lastUpdate = new Date().toISOString();
      if (data && typeof data === 'object' && data.version) {
        meta.lastVersion = data.version;
      }
      if (config.sourceUrl) {
        meta.sourceUrl = config.sourceUrl;
      }
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
      sourceLog.success(`├─ Updated meta.json`);
    } catch (e) {
      sourceLog.warn(`├─ Failed to update meta.json:`, e.message);
    }

    // Save Data (NDJSON)
    if (config.saveData) {
      const dataPath = path.join(SRC_DIR, 'data.ndjson');
      // If FHIR, we want to stream the concepts
      let items = (Array.isArray(data) ? data : [data]);

      if (config.strategy === 'fhir-valueset') {
        const concepts = data.concept || (data.compose?.include?.[0]?.concept);
        if (concepts) {
          items = concepts;
        }
      }

      const ndjson = items
        .map(item => JSON.stringify(item))
        .join('\n');
      fs.writeFileSync(dataPath, ndjson);
    }

    const banner = `// @generated - DO NOT EDIT BY HAND\n// To update this file, run: npm run update-sources\n\n`;

    // Generate Types
    if (config.generateTypes) {
      let typesContent = banner;

      if (config.strategy === 'fhir-valueset') {
        typesContent += generateFHIRTypes(data);
      } else {
        // Default Inference Strategy
        const dataForInference = Array.isArray(data) ? data : [data];
        const schema = generateTypeDefinition(dataForInference, config.interfaceName || 'Data');

        let extraUnions = '';
        if (config.enumeratedFields && Array.isArray(config.enumeratedFields)) {
          // Helper to collect values by path strings e.g. "cca2" or "concept.code"
          const collectValues = (obj, pathParts) => {
            if (obj === null || obj === undefined) return [];

            // If we're at the end of the path, return the value
            if (pathParts.length === 0) {
              return [obj];
            }

            // If the current object is an array, map over each item
            // BUT only if we still have path parts to traverse
            if (Array.isArray(obj)) {
              return obj.flatMap(item => collectValues(item, pathParts));
            }

            const currentKey = pathParts[0];
            const rest = pathParts.slice(1);

            if (typeof obj === 'object' && currentKey in obj) {
              return collectValues(obj[currentKey], rest);
            }

            return [];
          };

          config.enumeratedFields.forEach(def => {
            // Support simple string "fieldName" or object { path: "a.b", name: "TypeName" }
            const pathStr = typeof def === 'string' ? def : def.path;
            const typeName = typeof def === 'string' ? (def.charAt(0).toUpperCase() + def.slice(1)) : def.name;

            if (!pathStr || !typeName) return;

            const parts = pathStr.split('.');
            // Initial call: if root data is array, we need to handle it. 
            // Our collectValues handles array at any level, including root.
            // We flatten the result to handle cases where the leaf value itself is an array (e.g. tld: [".fr"])
            const values = collectValues(data, parts).flat();

            const uniqueValues = new Set();
            values.forEach(v => {
              if (def.transform && typeof def.transform === 'function') {
                try {
                  v = def.transform(v);
                } catch (e) {
                  sourceLog.warn(`├─ Transform failed for value: ${v}`, e);
                }
              }
              if (typeof v === 'string' || typeof v === 'number') {
                uniqueValues.add(v);
              }
            });

            const union = Array.from(uniqueValues)
              .sort()
              .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : v)
              .join('\n  | ');

            extraUnions += `export type ${typeName} = \n  | ${union || 'string'};\n`;
          });
        }

        let typeDef = `export interface ${config.interfaceName || 'Data'} {\n`;
        Object.entries(schema).forEach(([key, meta]) => {
          const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
          let typeStr = meta.types.join(' | ');

          // Apply custom type overrides from config
          if (config.typeOverrides && config.typeOverrides[key]) {
            typeStr = config.typeOverrides[key];
          }

          typeDef += `  ${safeKey}${meta.optional ? '?' : ''}: ${typeStr};\n`;
        });
        typeDef += `}\n`;

        if (config.preTypeContent) {
          typesContent += config.preTypeContent + '\n';
        }

        if (extraUnions) {
          typesContent += extraUnions + '\n';
        }

        typesContent += typeDef;
      }

      fs.writeFileSync(path.join(SRC_DIR, 'types.ts'), typesContent);
    }

    // Generate Index (Optional)
    if (config.generateIndex) {
      let indexContent = banner;
      if (config.strategy === 'fhir-valueset') {
        indexContent += `import type { TerminologyData } from './types';

/**
 * Loads the dataset from NDJSON.
 */
export async function loadData(): Promise<TerminologyData> {
  const url = new URL('./data.ndjson', import.meta.url);
  let text: string;

  if (url.protocol === 'file:' && typeof process !== 'undefined') {
    const fs = await import('node:fs/promises');
    text = await fs.readFile(url, 'utf-8');
  } else {
    const response = await fetch(url.href);
    text = await response.text();
  }

  const concepts = text.split('\\n').filter(l => l.trim()).map(l => JSON.parse(l));
  return { concept: concepts };
}

/**
 * Returns the URL for NDJSON streaming.
 */
export async function getStreamURL(): Promise<string> {
  return new URL('./data.ndjson', import.meta.url).href;
}

/**
 * Returns the remote source URL from meta.json.
 */
export async function getSourceURL(): Promise<string | null> {
  const url = new URL('./meta.json', import.meta.url);
  let meta: any;

  if (url.protocol === 'file:' && typeof process !== 'undefined') {
    const fs = await import('node:fs/promises');
    const text = await fs.readFile(url, 'utf-8');
    meta = JSON.parse(text);
  } else {
    const response = await fetch(url.href);
    meta = await response.json();
  }

  return meta.sourceUrl || null;
}

export default { loadData, getStreamURL, getSourceURL };
export * from './types';
`;
      } else {
        // Default dataset class generation (CountryService style)
        // We can disable this if generateIndex is false, or make it configurable templating
      }

      // Only write if we have content and requested
      if (config.strategy === 'fhir-valueset') {
        fs.writeFileSync(path.join(SRC_DIR, 'index.ts'), indexContent);
      }
    }

    // Generate Search Index
    if (config.search) {
      sourceLog.start('├─ Generating Orama search index...');
      const { buildIndex } = await import('@datapackages/plugin-search');

      const searchSchema = {};
      const configSchema = config.search.schema || config.search.fields.reduce((acc, field) => {
        acc[field] = 'string';
        return acc;
      }, {});

      Object.keys(configSchema).forEach(key => {
        const safeKey = key.replace(/\./g, '_');
        searchSchema[safeKey] = configSchema[key];
      });

      // Flatten data for search if necessary
      const itemsToSearch = (config.strategy === 'fhir-valueset')
        ? (data.concept || (data.data && data.data.concept) || [])
        : (Array.isArray(data) ? data : [data]);

      const searchData = itemsToSearch.map((doc, idx) => {
        const flatDoc = {
          id: String(idx)
        };

        // Helper to get nested value
        const getNestedValue = (obj, path) => {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };

        // Flatten fields defined in search config
        config.search.fields.forEach(field => {
          const safeKey = field.replace(/\./g, '_');
          // Always extract value from doc
          const val = getNestedValue(doc, field);
          if (val !== undefined && val !== null) {
            flatDoc[safeKey] = val;
          }
        });

        return flatDoc;
      });

      const serializedIndex = await buildIndex({
        schema: searchSchema,
        documents: searchData,
      });

      const indexPath = config.search.path
        ? path.resolve(configDir, config.search.path)
        : path.join(SRC_DIR, 'search.index.json');

      fs.writeFileSync(indexPath, serializedIndex);
      sourceLog.success(`├─ Search index generated`);

      // Automatically expose in package.json if it exists in expected location
      const packageJsonPath = path.resolve(configDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          pkg.exports = pkg.exports || {};

          // Ensure search index is exposed
          const searchKey = "./search.index.json";
          const relativeIndexPath = './' + path.relative(path.dirname(packageJsonPath), indexPath);

          if (pkg.exports[searchKey] !== relativeIndexPath) {
            sourceLog.info(`├─ Exposing search index in exports`);
            pkg.exports[searchKey] = relativeIndexPath;
          }

          // Ensure data.ndjson is exposed
          if (config.saveData) {
            const dataNDJSONKey = "./data.ndjson";
            const relativeDataPath = './' + path.relative(path.dirname(packageJsonPath), path.join(SRC_DIR, 'data.ndjson'));
            if (pkg.exports[dataNDJSONKey] !== relativeDataPath) {
              sourceLog.info(`└─ Exposing data.ndjson in exports`);
              pkg.exports[dataNDJSONKey] = relativeDataPath;
            }
          }

          fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        } catch (e) {
          sourceLog.warn('└─ Failed to update package.json exports:', e.message);
        }
      }
    }

    sourceLog.success(`Update complete.`);
  }

  return configs;
}

