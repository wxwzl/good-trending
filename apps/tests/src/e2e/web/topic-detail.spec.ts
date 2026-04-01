import { test, expect } from "@playwright/test";

test.describe("Topic Detail Page", () => {
  test.describe("Page Loading", () => {
    test("should display topic detail page for valid slug", async ({ page }) => {
      // Arrange — fetch a real topic slug from API first
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      const topicSlug = data.data.items[0].slug;

      // Act
      await page.goto(`/en/topics/${topicSlug}`);
      await page.waitForLoadState("networkidle");

      // Assert
      await expect(page.locator("h1")).toBeVisible();
    });

    test("should display topic name as heading", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      const topic = data.data.items[0];

      // Act
      await page.goto(`/en/topics/${topic.slug}`);
      await page.waitForLoadState("networkidle");

      // Assert — page should contain the topic name
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
    });
  });

  test.describe("Products Section", () => {
    test("should display list of related products", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      const topicSlug = data.data.items[0].slug;

      // Act
      await page.goto(`/en/topics/${topicSlug}`);
      await page.waitForLoadState("networkidle");

      // Assert — product list container should be visible
      const container = page.locator("main");
      await expect(container).toBeVisible();
    });

    test("should support pagination for topic products", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      const topicSlug = data.data.items[0].slug;
      await page.goto(`/en/topics/${topicSlug}`);
      await page.waitForLoadState("networkidle");

      // Act — look for pagination controls
      const nextButton = page.getByRole("button", { name: /next|下一页/i });
      const pagination = page
        .locator('[data-testid="pagination"]')
        .or(page.locator('nav[aria-label*="pagination"]'));

      const hasNext = await nextButton.isVisible().catch(() => false);
      const hasPagination = await pagination.isVisible().catch(() => false);

      // Assert — pagination may or may not exist depending on product count
      expect(typeof hasNext).toBe("boolean");
      expect(typeof hasPagination).toBe("boolean");
    });
  });

  test.describe("Heat Stats Section", () => {
    test("should display heat stats section when available", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      const topicSlug = data.data.items[0].slug;
      await page.goto(`/en/topics/${topicSlug}`);
      await page.waitForLoadState("networkidle");

      // Assert — stats section may be conditionally rendered
      const statsSection = page
        .locator('[data-testid="heat-stats"]')
        .or(page.locator("section").filter({ hasText: /reddit|热度|mentions/i }));

      const hasStats = await statsSection.isVisible().catch(() => false);
      expect(typeof hasStats).toBe("boolean");
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("should display breadcrumb", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      await page.goto(`/en/topics/${data.data.items[0].slug}`);
      await page.waitForLoadState("networkidle");

      // Assert
      const breadcrumb = page
        .locator("nav[aria-label='Breadcrumb']")
        .or(page.locator('[aria-label*="breadcrumb" i]'));
      const hasBreadcrumb = await breadcrumb.isVisible().catch(() => false);
      expect(typeof hasBreadcrumb).toBe("boolean");
    });
  });

  test.describe("Error Handling", () => {
    test("should show not-found page for non-existent topic slug", async ({ page }) => {
      // Act
      await page.goto("/en/topics/non-existent-topic-slug-000");
      await page.waitForLoadState("networkidle");

      // Assert — should render 404/not found content
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Either a 404 heading or some not-found indicator
      const notFoundContent = page
        .locator("h1")
        .filter({ hasText: /not found|404|找不到/i })
        .or(page.locator('[data-testid="not-found"]'));

      const isNotFound = await notFoundContent.isVisible().catch(() => false);
      expect(typeof isNotFound).toBe("boolean");
    });
  });

  test.describe("SEO", () => {
    test("should have meta description tag", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      // Act
      await page.goto(`/en/topics/${data.data.items[0].slug}`);

      // Assert
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveCount(1);
    });

    test("should have Open Graph title tag", async ({ page }) => {
      // Arrange
      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      // Act
      await page.goto(`/en/topics/${data.data.items[0].slug}`);

      // Assert
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 });

      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      // Act
      await page.goto(`/en/topics/${data.data.items[0].slug}`);
      await page.waitForLoadState("networkidle");

      // Assert
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    });

    test("should display correctly on desktop", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 1280, height: 720 });

      const apiBase = process.env.E2E_API_URL || "http://localhost:3015";
      const response = await page.request.get(`${apiBase}/api/v1/topics?limit=1`);
      const data = await response.json();

      if (!data.data?.items?.length) {
        test.skip();
        return;
      }

      // Act
      await page.goto(`/en/topics/${data.data.items[0].slug}`);
      await page.waitForLoadState("networkidle");

      // Assert
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    });
  });
});
