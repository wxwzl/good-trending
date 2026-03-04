# Test Application

This is the centralized testing application for the Good-Trending project.

## Structure

```
apps/tests/
├── src/
│   ├── api/                 # API integration tests (Vitest)
│   │   ├── health.test.ts
│   │   ├── products.test.ts
│   │   ├── trending.test.ts
│   │   ├── topics.test.ts
│   │   └── search.test.ts
│   ├── e2e/                 # E2E tests (Playwright)
│   │   ├── api/             # API E2E tests
│   │   │   └── products.spec.ts
│   │   └── web/             # Web E2E tests
│   │       ├── home.spec.ts
│   │       └── trending.spec.ts
│   ├── fixtures/            # Test fixtures and data generators
│   │   └── index.ts
│   ├── mocks/               # MSW mock handlers and server
│   │   ├── handlers.ts
│   │   └── server.ts
│   └── utils/               # Test utilities
│       ├── api-client.ts
│       ├── test-helpers.ts
│       └── index.ts
├── playwright.config.ts     # Playwright configuration
├── vitest.config.ts         # Vitest configuration
├── vitest.setup.ts          # Vitest setup file
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Available Scripts

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run E2E tests in debug mode
pnpm test:e2e:debug

# Run only web E2E tests
pnpm test:e2e:web

# Run only API E2E tests
pnpm test:e2e:api

# Install Playwright browsers
pnpm playwright:install

# Show Playwright report
pnpm playwright:report
```

### API Integration Tests (Vitest)

```bash
# Run API tests
pnpm test:api

# Run API tests in watch mode
pnpm test:api:watch

# Run API tests with coverage
pnpm test:api:coverage
```

### All Tests

```bash
# Run all tests (API + E2E)
pnpm test:all
```

## Test Categories

### 1. API Integration Tests (Vitest)

Located in `src/api/`, these tests:

- Test API endpoints in isolation
- Use MSW (Mock Service Worker) for API mocking
- Run quickly without browser
- Provide code coverage reports

### 2. E2E API Tests (Playwright)

Located in `src/e2e/api/`, these tests:

- Test full API stack
- Run against actual API server
- Validate real database interactions

### 3. E2E Web Tests (Playwright)

Located in `src/e2e/web/`, these tests:

- Test user-facing functionality
- Support multiple browsers (Chrome, Firefox, Safari)
- Include mobile viewport testing
- Validate accessibility and SEO

## Test Fixtures

The `src/fixtures/` directory provides test data generators using Faker:

```typescript
import { createProductFixture, createTopicFixture } from "../fixtures";

const product = createProductFixture({ name: "Custom Product" });
const products = createProductFixture(10);
```

## Mock Server

MSW is used for mocking API responses in integration tests:

```typescript
import { setupMockServer, resetMockData } from "../mocks/server";

describe("My API Test", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  // tests...
});
```

## Writing New Tests

### API Integration Test Example

```typescript
import { describe, it, expect } from "vitest";
import { setupMockServer } from "../mocks/server";

describe("My Feature", () => {
  setupMockServer();

  it("should work correctly", async () => {
    const response = await fetch("/api/v1/my-endpoint");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### E2E Web Test Example

```typescript
import { test, expect } from "@playwright/test";

test.describe("My Page", () => {
  test("should display correctly", async ({ page }) => {
    await page.goto("/my-page");

    await expect(page.locator("h1")).toBeVisible();
  });
});
```

## Environment Variables

Create a `.env.test` file in the root directory:

```env
E2E_WEB_URL=http://localhost:3000
E2E_API_URL=http://localhost:3001
DATABASE_URL="postgresql://user:password@localhost:5432/good_trending_test"
```

## CI/CD Integration

In CI environments:

- E2E tests run against deployed preview environments
- API tests run against test database
- Coverage reports are uploaded to codecov

## Best Practices

1. **Isolation**: Each test should be independent
2. **Fixtures**: Use test fixtures for consistent data
3. **Cleanup**: Reset mock data between tests
4. **Assertions**: Use meaningful assertions
5. **Performance**: Keep tests fast and focused
