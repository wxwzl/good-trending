import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupMockServer } from "../mocks/server";

describe("Health API", () => {
  setupMockServer();

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await fetch("/api/v1/health");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeDefined();
    });

    it("should return valid timestamp format", async () => {
      const response = await fetch("/api/v1/health");
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should return uptime as a number", async () => {
      const response = await fetch("/api/v1/health");
      const data = await response.json();

      expect(typeof data.uptime).toBe("number");
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
