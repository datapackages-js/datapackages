import { defineBuildConfig } from "unbuild";
import fs from "node:fs";
import path from "node:path";

const entries = [
  "src/index",
  ...getEntryFiles(path.resolve("src"), "src")
];

function getEntryFiles(dir: string, prefix: string): string[] {
  const result: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      if (["sources", "__tests__", "dist", "node_modules"].includes(item.name)) continue;
      // Skip the root src directory logic to avoid infinite loops if prefixing incorrectly
      result.push(...getEntryFiles(path.join(dir, item.name), path.join(prefix, item.name)));
    } else if (item.name === "index.ts") {
      result.push(path.join(prefix, "index"));
    }
  }
  return result;
}

export default defineBuildConfig({
  entries: Array.from(new Set(entries)),
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
