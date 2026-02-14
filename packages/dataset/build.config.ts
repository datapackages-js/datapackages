import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/cli"],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: ["citty", "jiti", "@datapackages/plugin-search", "@orama/orama"],
});
