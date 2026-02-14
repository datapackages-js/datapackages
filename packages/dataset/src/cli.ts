import { defineCommand, runMain } from "citty";
import path from "node:path";
import { consola } from "consola";
import { runUpdate } from "../scripts/update-sources.js";

const updateSource = defineCommand({
  meta: {
    name: "update-source",
    description: "Update data package sources",
  },
  args: {
    cwd: {
      type: "string",
      description: "Working directory",
      default: process.cwd(),
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd);

    try {
      await runUpdate(cwd);
    } catch (err) {
      consola.error("Error during update:", err);
      process.exit(1);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "datapackage",
    version: "0.0.0",
    description: "Data package management CLI",
  },
  subCommands: {
    "update-source": updateSource,
  },
});

export const runDatapackageCLI = () => runMain(main);
