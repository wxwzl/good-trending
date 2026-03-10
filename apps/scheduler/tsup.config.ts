import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: [
    "playwright",
    "playwright-core",
    "@good-trending/crawler",
    "@good-trending/database",
    "@good-trending/shared",
    "bullmq",
    "ioredis",
    "drizzle-orm",
    "winston",
    "node-cron",
  ],
  esbuildOptions(options) {
    options.platform = "node";
  },
});
