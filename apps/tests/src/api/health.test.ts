import { describe, it, expect } from "vitest";

const BASE_URL = process.env.API_URL || "http://localhost:3015";

describe("Health API", () => {
  describe("GET /health", () => {
    it("should_return_200_with_ok_status", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.status).toBe("ok");
    });

    it("should_return_valid_iso_timestamp", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      // Assert
      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should_return_uptime_as_non_negative_number", async () => {
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
    it("should_return_404_at_versioned_path_since_health_is_excluded_from_api_prefix", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/api/v1/health`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_have_404_response_for_versioned_health_path", async () => {
      // Arrange & Act
      const response = await fetch(`${BASE_URL}/api/v1/health`);

      // Assert
      expect(response.status).toBe(404);
    });
  });
});
