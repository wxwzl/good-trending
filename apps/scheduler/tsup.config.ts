import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: [],
  esbuildOptions(options) {
    options.platform = "node";
  },
});
