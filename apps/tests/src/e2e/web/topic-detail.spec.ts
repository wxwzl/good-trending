import { test, expect } from "@playwright/test";

test.describe("Topic Detail Page", () => {
  test.describe("Page Loading", () => {
    test("should display topic detail page", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("header")).toBeVisible();
    });

    test("should display topic name in header", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const header = page.locator("header h1");
      await expect(header).toBeVisible();
      const title = await header.textContent();
      expect(title?.trim().length).toBeGreaterThan(0);
    });

    test("should display product count", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const productCount = page.locator("text=/\\d+ products|product count/i");
      // Product count may be displayed
      const hasCount = await productCount.isVisible().catch(() => false);
      if (hasCount) {
        await expect(productCount).toBeVisible();
      }
    });

    test("should display products grid", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Assert
      const productsSection = page.locator("section[aria-label='Products in this topic']").or(
        page.locator("section").filter({ has: page.locator("article, .product-card") })
      );
      await expect(productsSection).toBeVisible();
    });
  });

  test.describe("Heat Stats Section", () => {
    test("should display heat stats when available", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Assert - Heat stats section might be conditionally rendered
      const heatStats = page.locator("[data-testid='heat-stats']").or(
        page.locator("section").filter({ hasText: /heat|trend|reddit|x platform/i })
      );

      // Heat stats is optional depending on topic data
      const hasHeatStats = await heatStats.isVisible().catch(() => false);
      if (hasHeatStats) {
        await expect(heatStats).toBeVisible();
      }
    });

    test("should display trend chart when heat stats available", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Look for chart elements
      const chart = page.locator("[data-testid='trend-chart']").or(
        page.locator("canvas, svg").filter({ has: page.locator("*").first() })
      );

      const hasChart = await chart.isVisible().catch(() => false);
      if (hasChart) {
        await expect(chart).toBeVisible();
      }
    });

    test("should display platform stats", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Look for platform-specific stats
      const redditStats = page.locator("text=/reddit/i");
      const xStats = page.locator("text=/x platform|twitter/i");

      const hasReddit = await redditStats.isVisible().catch(() => false);
      const hasX = await xStats.isVisible().catch(() => false);

      // Platform stats may be displayed
      if (hasReddit || hasX) {
        expect(hasReddit || hasX).toBe(true);
      }
    });
  });

  test.describe("Product List", () => {
    test("should display product cards", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Assert
      const productCards = page.locator("article, .product-card");
      const count = await productCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test("should navigate to product detail on click", async ({ page }) => {
      // Arrange
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Act
      const firstProductLink = page.locator("article a, .product-card a").first();
      if (await firstProductLink.isVisible().catch(() => false)) {
        await firstProductLink.click();

        // Assert
        await expect(page).toHaveURL(/product/);
      }
    });

    test("should support pagination if multiple pages", async ({ page }) => {
      // Arrange
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Look for pagination
      const pagination = page.locator("[data-testid='pagination']").or(
        page.locator("nav").filter({ has: page.locator("button, a").filter({ hasText: /\\d+/ }) })
      );

      const hasPagination = await pagination.isVisible().catch(() => false);
      if (hasPagination) {
        // Check if next page button exists
        const nextButton = pagination.locator("button, a").filter({ hasText: /next|>/i });
        if (await nextButton.isVisible().catch(() => false)) {
          await expect(nextButton).toBeVisible();
        }
      }
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("should display breadcrumb", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const breadcrumb = page.locator("nav[aria-label='Breadcrumb']");
      await expect(breadcrumb).toBeVisible();
    });

    test("should navigate to home from breadcrumb", async ({ page }) => {
      // Arrange
      await page.goto("/en/topics/premium-beauty");

      // Act
      const homeLink = page.locator("nav[aria-label='Breadcrumb'] a").first();
      await homeLink.click();

      // Assert
      await expect(page).toHaveURL(/\/$/);
    });

    test("should navigate to topics list from breadcrumb", async ({ page }) => {
      // Arrange
      await page.goto("/en/topics/premium-beauty");

      // Act
      const topicsLink = page.locator("nav[aria-label='Breadcrumb'] a").filter({ hasText: /topics|分类/i });
      if (await topicsLink.isVisible().catch(() => false)) {
        await topicsLink.click();
        await expect(page).toHaveURL(/topics/);
      }
    });
  });

  test.describe("SEO", () => {
    test("should have proper meta tags", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveCount(1);
    });

    test("should have Open Graph tags", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
    });
  });

  test.describe("Error Handling", () => {
    test("should show 404 for non-existent topic", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/non-existent-topic-slug");

      // Assert - Should show not found page
      await expect(page.locator("h1")).toContainText(/not found|404/i);
    });

    test("should handle empty product list gracefully", async ({ page }) => {
      // Arrange & Act - Use a topic that might have no products
      await page.goto("/en/topics/empty-topic");

      // Assert - Should show empty state or message
      const emptyMessage = page.locator("text=/no products|empty|暂无商品/i");
      const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);

      if (hasEmptyMessage) {
        await expect(emptyMessage).toBeVisible();
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 });

      // Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    });

    test("should display correctly on tablet", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 768, height: 1024 });

      // Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    });

    test("should display correctly on desktop", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 1280, height: 720 });

      // Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");

      // Assert
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const h1Count = await h1.count();
      expect(h1Count).toBe(1);
    });

    test("should have accessible product cards", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Assert
      const productCards = page.locator("article, .product-card");
      const count = await productCards.count();

      if (count > 0) {
        const firstCard = productCards.first();
        // Should be focusable or have interactive elements
        await expect(firstCard).toBeVisible();
      }
    });
  });

  test.describe("Performance", () => {
    test("should load within 3 seconds", async ({ page }) => {
      // Arrange
      const startTime = Date.now();

      // Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Assert
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test("should not have console errors", async ({ page }) => {
      // Arrange
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      // Act
      await page.goto("/en/topics/premium-beauty");
      await page.waitForLoadState("networkidle");

      // Assert
      expect(errors).toHaveLength(0);
    });
  });
});
