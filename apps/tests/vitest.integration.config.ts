import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/integration/**/*.test.ts"],
    exclude: ["node_modules", "dist", "src/e2e/**/*", "src/api/**/*"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 30000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true, // Run integration tests sequentially to avoid DB conflicts
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@good-trending/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@good-trending/database": path.resolve(__dirname, "../../packages/database/src"),
    },
  },
});
