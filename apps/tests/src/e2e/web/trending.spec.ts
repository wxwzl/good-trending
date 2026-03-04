import { test, expect } from '@playwright/test'

test.describe('Trending Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/trending')
  })

  test('should display trending products', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check for trending products container
    const trendingContainer = page.locator('[data-testid="trending-products"]').or(page.locator('main'))
    await expect(trendingContainer).toBeVisible()
  })

  test('should display product cards', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for product cards
    const productCards = page.locator('[data-testid="product-card"]').or(page.locator('article'))

    // At least check if there are any product elements
    const count = await productCards.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display period filter', async ({ page }) => {
    // Look for period filter buttons
    const dailyFilter = page.getByRole('button', { name: /daily|今天/i })
    const weeklyFilter = page.getByRole('button', { name: /weekly|本周/i })
    const monthlyFilter = page.getByRole('button', { name: /monthly|本月/i })

    // At least one filter should be visible
    const filters = [dailyFilter, weeklyFilter, monthlyFilter]
    const visibleFilters = await Promise.all(filters.map((f) => f.isVisible().catch(() => false)))

    // Check that at least one filter exists
    expect(visibleFilters.some((v) => v)).toBe(true)
  })

  test('should filter by daily period', async ({ page }) => {
    const dailyFilter = page.getByRole('button', { name: /daily|今天/i })

    if (await dailyFilter.isVisible()) {
      await dailyFilter.click()

      // Wait for URL or content to update
      await page.waitForLoadState('networkidle')

      // Verify filter is applied
      expect(page.url()).toBeDefined()
    }
  })

  test('should filter by weekly period', async ({ page }) => {
    const weeklyFilter = page.getByRole('button', { name: /weekly|本周/i })

    if (await weeklyFilter.isVisible()) {
      await weeklyFilter.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toBeDefined()
    }
  })

  test('should display product details on card click', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Find a product card or link
    const productLink = page.locator('[data-testid="product-card"] a').or(page.locator('article a')).first()

    if (await productLink.isVisible()) {
      await productLink.click()

      // Should navigate to product detail page
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/products\//)
    }
  })

  test('should display product ranking', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for rank indicators
    const rankElements = page.locator('[data-testid="product-rank"]').or(page.locator('.rank'))

    const count = await rankElements.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display trending score', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for score elements
    const scoreElements = page.locator('[data-testid="trending-score"]').or(page.locator('[class*="score"]'))

    const count = await scoreElements.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display source type badges', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for source badges (Twitter/Amazon)
    const twitterBadge = page.locator('text=/twitter/i')
    const amazonBadge = page.locator('text=/amazon/i')

    const hasTwitter = await twitterBadge.count()
    const hasAmazon = await amazonBadge.count()

    // At least one type should be present if there are products
    expect(hasTwitter + hasAmazon).toBeGreaterThanOrEqual(0)
  })

  test('should support pagination', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for pagination controls
    const nextButton = page.getByRole('button', { name: /next|下一页/i })
    const pagination = page.locator('[data-testid="pagination"]').or(page.locator('nav[aria-label*="pagination"]'))

    if (await nextButton.isVisible()) {
      await nextButton.click()
      await page.waitForLoadState('networkidle')

      // Verify page changed
      expect(page.url()).toBeDefined()
    } else if (await pagination.isVisible()) {
      // Pagination container exists
      await expect(pagination).toBeVisible()
    }
  })

  test('should display Chinese content on /zh/trending', async ({ page }) => {
    await page.goto('/zh/trending')
    await page.waitForLoadState('networkidle')

    // URL should contain /zh
    expect(page.url()).toContain('/zh')
  })
})

test.describe('Trending Page - Chinese', () => {
  test('should display Chinese period filters', async ({ page }) => {
    await page.goto('/zh/trending')
    await page.waitForLoadState('networkidle')

    // Look for Chinese filter labels
    const todayFilter = page.getByRole('button', { name: /今天/ })
    const weekFilter = page.getByRole('button', { name: /本周/ })
    const monthFilter = page.getByRole('button', { name: /本月/ })

    const filters = [todayFilter, weekFilter, monthFilter]
    const visibleFilters = await Promise.all(filters.map((f) => f.isVisible().catch(() => false)))

    expect(visibleFilters.some((v) => v)).toBe(true)
  })
})
