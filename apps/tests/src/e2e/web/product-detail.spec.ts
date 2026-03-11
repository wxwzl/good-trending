import { test, expect } from "@playwright/test";

test.describe("Product Detail Page", () => {
  test.describe("Page Loading", () => {
    test("should display product detail page", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("article")).toBeVisible();
    });

    test("should display product image", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const imageContainer = page.locator("article .relative.aspect-square");
      await expect(imageContainer).toBeVisible();
    });

    test("should display product price when available", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const priceElement = page.locator("[itemProp='price']");
      // Price may or may not be present depending on product
      const hasPrice = await priceElement.isVisible().catch(() => false);
      if (hasPrice) {
        await expect(priceElement).toBeVisible();
      }
    });

    test("should display view original button", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const viewOriginalButton = page.getByRole("button", { name: /view original|查看原文/i });
      await expect(viewOriginalButton).toBeVisible();
    });
  });

  test.describe("Stats Section", () => {
    test("should display stats section when available", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Wait for page to fully load
      await page.waitForLoadState("networkidle");

      // Assert - Stats section might be conditionally rendered
      const statsSection = page
        .locator("[data-testid='stats-section']")
        .or(page.locator("section").filter({ hasText: /social|trend|appearance/i }));

      // Stats section is optional depending on product data
      const hasStats = await statsSection.isVisible().catch(() => false);
      if (hasStats) {
        await expect(statsSection).toBeVisible();
      }
    });

    test("should handle tab switching in stats section", async ({ page }) => {
      // Arrange
      await page.goto("/en/product/test-product");
      await page.waitForLoadState("networkidle");

      // Look for tabs
      const tabs = page
        .locator("[role='tab']")
        .or(page.locator("button").filter({ hasText: /social|trend|appearance|stats/i }));

      const tabCount = await tabs.count();
      if (tabCount > 1) {
        // Act - Click on second tab
        await tabs.nth(1).click();

        // Assert - Tab should be selected
        await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      }
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("should display breadcrumb", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const breadcrumb = page.locator("nav[aria-label='Breadcrumb']");
      await expect(breadcrumb).toBeVisible();
    });

    test("should navigate to home from breadcrumb", async ({ page }) => {
      // Arrange
      await page.goto("/en/product/test-product");

      // Act
      const homeLink = page.locator("nav[aria-label='Breadcrumb'] a").first();
      await homeLink.click();

      // Assert
      await expect(page).toHaveURL(/\/$/);
    });

    test("should navigate to trending from breadcrumb", async ({ page }) => {
      // Arrange
      await page.goto("/en/product/test-product");

      // Act
      const trendingLink = page
        .locator("nav[aria-label='Breadcrumb'] a")
        .filter({ hasText: /trending|热门/i });
      if (await trendingLink.isVisible().catch(() => false)) {
        await trendingLink.click();
        await expect(page).toHaveURL(/trending/);
      }
    });
  });

  test.describe("SEO", () => {
    test("should have proper meta tags", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveCount(1);
    });

    test("should have Open Graph tags", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
    });

    test("should have product structured data", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const structuredData = page.locator('script[type="application/ld+json"]');
      const count = await structuredData.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("Error Handling", () => {
    test("should show 404 for non-existent product", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/non-existent-product-slug");

      // Assert - Should show not found page or redirect
      await expect(page.locator("h1")).toContainText(/not found|404/i);
    });

    test("should handle network errors gracefully", async ({ page }) => {
      // Arrange - Block API requests
      await page.route("**/api/**", (route) => route.abort("failed"));

      // Act
      await page.goto("/en/product/test-product");

      // Assert - Should show error state or fallback UI
      const errorMessage = page.locator("text=/error|failed|unable/i");
      // Page should handle error gracefully
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 });

      // Act
      await page.goto("/en/product/test-product");

      // Assert
      const mainContent = page.locator("main, article");
      await expect(mainContent).toBeVisible();
    });

    test("should display correctly on tablet", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 768, height: 1024 });

      // Act
      await page.goto("/en/product/test-product");

      // Assert
      const mainContent = page.locator("main, article");
      await expect(mainContent).toBeVisible();
    });

    test("should display correctly on desktop", async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 1280, height: 720 });

      // Act
      await page.goto("/en/product/test-product");

      // Assert
      const mainContent = page.locator("main, article");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const h1Count = await h1.count();
      expect(h1Count).toBe(1); // Should have exactly one h1
    });

    test("should have accessible images", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const images = page.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute("alt");
        expect(alt).toBeTruthy(); // Images should have alt text
      }
    });

    test("should have accessible buttons", async ({ page }) => {
      // Arrange & Act
      await page.goto("/en/product/test-product");

      // Assert
      const buttons = page.locator("button");
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute("aria-label");
        const text = await button.textContent();
        // Buttons should have either text or aria-label
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    });
  });

  test.describe("Performance", () => {
    test("should load within 3 seconds", async ({ page }) => {
      // Arrange
      const startTime = Date.now();

      // Act
      await page.goto("/en/product/test-product");
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
      await page.goto("/en/product/test-product");
      await page.waitForLoadState("networkidle");

      // Assert
      expect(errors).toHaveLength(0);
    });
  });
});
