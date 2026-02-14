const fs = require('fs');
const path = require('path');
const { consola } = require('consola');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const SUMMARY_PATH = path.join(ROOT_DIR, 'coverage/coverage-summary.json');
const DOCS_PATH = path.join(ROOT_DIR, 'docs/content/2.core/2.quality.md');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

if (!fs.existsSync(SUMMARY_PATH)) {
  consola.error('Coverage summary not found. Run npm run test:coverage first.');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf-8'));

function getBadgeColor(pct) {
  if (pct >= 90) return 'green';
  if (pct >= 80) return 'yellowgreen';
  if (pct >= 70) return 'yellow';
  if (pct >= 50) return 'orange';
  return 'red';
}

function getBadge(label, pct) {
  const color = getBadgeColor(pct);
  const value = encodeURIComponent(pct + '%');
  return `![${label}](https://img.shields.io/badge/${label}-${value}-${color})`;
}

function getStatBadge(pct) {
  const color = getBadgeColor(pct);
  const value = encodeURIComponent(pct + '%');
  return `![${pct}%](https://img.shields.io/badge/${value}-${color})`;
}

function formatPkgName(name) {
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Group by package
const groups = {
  'CORE': {},
  'DATASETS': {}
};

// Dynamically find packages
const packageFolders = fs.readdirSync(PACKAGES_DIR).filter(f => fs.statSync(path.join(PACKAGES_DIR, f)).isDirectory());

packageFolders.forEach(folder => {
  const pkgPath = `packages/${folder}`;
  // Use full package name
  const display = `@datapackages/${folder}`;

  if (folder.includes('plugin') || folder === 'dataset') {
    groups['CORE'][display] = pkgPath;
  } else {
    groups['DATASETS'][display] = pkgPath;
  }
});

const stats = {};
Object.values(groups).forEach(pkgMap => {
  Object.keys(pkgMap).forEach(pkg => {
    stats[pkg] = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
    };
  });
});

Object.entries(summary).forEach(([file, data]) => {
  if (file === 'total') return;

  let pkgName;
  Object.values(groups).forEach(pkgMap => {
    const found = Object.keys(pkgMap).find(name => file.includes(pkgMap[name]));
    if (found) pkgName = found;
  });

  if (!pkgName) return;

  ['lines', 'statements', 'functions', 'branches'].forEach(key => {
    if (data[key]) {
      stats[pkgName][key].total += data[key].total;
      stats[pkgName][key].covered += data[key].covered;
    }
  });
});

// Calculate percentages
Object.keys(stats).forEach(pkg => {
  ['lines', 'statements', 'functions', 'branches'].forEach(key => {
    const s = stats[pkg][key];
    s.pct = s.total === 0 ? 0 : parseFloat(((s.covered / s.total) * 100).toFixed(2));
  });
});

const total = summary.total;

let md = fs.readFileSync(DOCS_PATH, 'utf-8');

// Replace content between markers
const startMarker = '<!-- COVERAGE_START -->';
const endMarker = '<!-- COVERAGE_END -->';

const startIndex = md.indexOf(startMarker);
const endIndex = md.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const before = md.substring(0, startIndex + startMarker.length);
  const after = md.substring(endIndex);

  let newContent = '\n';

  // Overall Coverage (Summary)
  newContent += `| Package | Statements | Branches | Functions | Lines |\n`;
  newContent += `| :--- | :--- | :--- | :--- | :--- |\n`;
  newContent += `| **Overall** | ${getStatBadge(total.statements.pct)} | ${getStatBadge(total.branches.pct)} | ${getStatBadge(total.functions.pct)} | ${getStatBadge(total.lines.pct)} |\n\n`;

  // Add Package Rows by Group
  Object.entries(groups).forEach(([groupName, pkgMap]) => {
    // Convert CORE -> Core, DATASETS -> Datasets
    const title = groupName.charAt(0) + groupName.slice(1).toLowerCase();

    newContent += `### ${title}\n\n`;
    newContent += `| Package | Statements | Branches | Functions | Lines |\n`;
    newContent += `| :--- | :--- | :--- | :--- | :--- |\n`;

    Object.keys(pkgMap).forEach(pkg => {
      const s = stats[pkg];
      // pkg is already full name like @datapackages/dataset
      newContent += `| \`${pkg}\` | ${getStatBadge(s.statements.pct)} | ${getStatBadge(s.branches.pct)} | ${getStatBadge(s.functions.pct)} | ${getStatBadge(s.lines.pct)} |\n`;
    });
    newContent += '\n';
  });

  md = before + newContent + after;

  fs.writeFileSync(DOCS_PATH, md);
  consola.success('Successfully updated docs/content/2.core/2.quality.md with dynamic grouped metrics.');
} else {
  consola.error('Could not find COVERAGE_START/COVERAGE_END markers in docs/content/2.core/2.quality.md');
  process.exit(1);
}
