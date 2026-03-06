import { describe, it, expect } from "vitest";
import { setupMockServer } from "../mocks/server";

const BASE_URL = "http://localhost:3005";

describe("Health API", () => {
  setupMockServer();

  describe("GET /health", () => {
    it("should_return_health_status", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Updated to match real API response format: { data: { status, timestamp, uptime } }
      expect(data.data.status).toBe("ok");
      expect(data.data.timestamp).toBeDefined();
      expect(data.data.uptime).toBeDefined();
    });

    it("should_return_valid_timestamp_format", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      // Assert
      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should_return_uptime_as_a_number", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      // Assert
      expect(typeof data.data.uptime).toBe("number");
      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should_return_json_content_type", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/health`);

      // Assert
      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("GET /api/v1/health", () => {
    it("should_return_health_status_at_api_path", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/api/v1/health`);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.status).toBe("ok");
    });
  });
});
