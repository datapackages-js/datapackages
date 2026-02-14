import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { consola } from 'consola';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');

function getSubpaths(dir, prefix = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      if (['sources', '__tests__', 'shared'].includes(item.name)) continue;

      const subDirPath = path.join(dir, item.name);
      if (fs.existsSync(path.join(subDirPath, 'index.ts'))) {
        const subpath = prefix ? `${prefix}/${item.name}` : `./${item.name}`;
        results.push(subpath);
        results.push(...getSubpaths(subDirPath, subpath));
      }
    }
  }
  return results;
}

// 1. Generate subpaths by scanning the entire src directory
const subpaths = [
  '.',
  ...getSubpaths(SRC_DIR)
];

// Remove duplicates and clean up
const uniqueSubpaths = Array.from(new Set(subpaths)).sort();

// 2. Build exports object
const exportsMap = {};
for (const sub of uniqueSubpaths) {
  const distBase = sub === '.' ? './dist/index' : `./dist${sub.slice(1)}/index`;
  exportsMap[sub] = {
    types: `${distBase}.d.ts`,
    import: `${distBase}.mjs`,
    require: `${distBase}.cjs`
  };
}

// 3. Update package.json
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
pkg.exports = exportsMap;

fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');

consola.success('package.json exports synchronized!');
consola.info('Subpaths detected:', uniqueSubpaths.join(', '));
