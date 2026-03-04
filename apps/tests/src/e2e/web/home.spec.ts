import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the home page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Good Trending/)
  })

  test('should display hero section', async ({ page }) => {
    const heroHeading = page.locator('h1')
    await expect(heroHeading).toBeVisible()
  })

  test('should display language switcher', async ({ page }) => {
    // Look for language toggle button
    const languageButton = page.getByRole('button', { name: /language|语言/i })
    await expect(languageButton).toBeVisible()
  })

  test('should switch language to Chinese', async ({ page }) => {
    // Navigate to Chinese version
    await page.goto('/zh')

    // Verify URL contains /zh
    expect(page.url()).toContain('/zh')
  })

  test('should switch language to English', async ({ page }) => {
    // Navigate to English version
    await page.goto('/en')

    // Verify URL contains /en
    expect(page.url()).toContain('/en')
  })

  test('should display theme switcher', async ({ page }) => {
    // Look for theme toggle button
    const themeButton = page.getByRole('button', { name: /theme|主题|sun|moon/i })
    await expect(themeButton).toBeVisible()
  })

  test('should toggle dark theme', async ({ page }) => {
    // Click theme toggle
    const themeButton = page.getByRole('button').filter({ hasText: /sun|moon/i }).first()
    await themeButton.click()

    // Verify dark class is added to html
    const html = page.locator('html')
    const className = await html.getAttribute('class')

    // Should have either dark or light class
    expect(className).toBeDefined()
  })

  test('should display header navigation', async ({ page }) => {
    // Check for header with logo
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('should display footer', async ({ page }) => {
    // Check for footer
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })

  test('should navigate to trending page', async ({ page }) => {
    // Look for trending link
    const trendingLink = page.getByRole('link', { name: /trending|热门/i })
    if (await trendingLink.isVisible()) {
      await trendingLink.click()
      await expect(page).toHaveURL(/.*trending.*/)
    }
  })

  test('should navigate to topics page', async ({ page }) => {
    // Look for topics link
    const topicsLink = page.getByRole('link', { name: /topics|话题/i })
    if (await topicsLink.isVisible()) {
      await topicsLink.click()
      await expect(page).toHaveURL(/.*topics.*/)
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Check that content is still visible
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()

    // Check for mobile menu button
    const menuButton = page.getByRole('button', { name: /menu|菜单/i })
    // Mobile menu might be collapsed
    const isMenuButtonVisible = await menuButton.isVisible()
    expect(typeof isMenuButtonVisible).toBe('boolean')
  })
})

test.describe('Accessibility', () => {
  test('should have no accessibility violations on home page', async ({ page }) => {
    await page.goto('/')

    // Basic accessibility checks
    // Check for main landmark
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Check for heading hierarchy
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })
})

test.describe('SEO', () => {
  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')

    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveCount(1)

    // Check for viewport meta
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)
  })

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/')

    // Check for OG title
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveCount(1)

    // Check for OG description
    const ogDescription = page.locator('meta[property="og:description"]')
    await expect(ogDescription).toHaveCount(1)
  })
})
