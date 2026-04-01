import { beforeAll, afterAll, afterEach } from "vitest";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

// Global test timeout
beforeAll(() => {
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  // Cleanup after each test
});

afterAll(() => {
  // Final cleanup
});
