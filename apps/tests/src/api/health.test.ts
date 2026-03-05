import { describe, it, expect } from "vitest";
import { setupMockServer } from "../mocks/server";

const BASE_URL = "http://localhost:3005";

describe("Health API", () => {
  setupMockServer();

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Updated to match real API response format: { data: { status, timestamp, uptime } }
      expect(data.data.status).toBe("ok");
      expect(data.data.timestamp).toBeDefined();
      expect(data.data.uptime).toBeDefined();
    });

    it("should return valid timestamp format", async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should return uptime as a number", async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      expect(typeof data.data.uptime).toBe("number");
      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
