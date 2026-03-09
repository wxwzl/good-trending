import { faker } from "@faker-js/faker";

export interface ProductFixture {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sourceUrl: string;
  discoveredFrom: "X_PLATFORM" | "AMAZON" | "REDDIT";
  amazonId: string;
  price: string | null;
  currency: string;
  firstSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicFixture {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  searchKeywords?: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrendFixture {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  productPrice: string | null;
  periodType: string;
  statDate: string;
  rank: number;
  score: number;
  redditMentions: number;
  xMentions: number;
}

/**
 * Generate a random product fixture
 */
export function createProductFixture(overrides: Partial<ProductFixture> = {}): ProductFixture {
  const name = overrides.name || faker.commerce.productName();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    name,
    slug,
    description: faker.commerce.productDescription(),
    image: faker.image.url(),
    sourceUrl: faker.internet.url(),
    discoveredFrom: faker.helpers.arrayElement(["X_PLATFORM", "AMAZON", "REDDIT"]),
    amazonId: faker.string.alphanumeric(10).toUpperCase(),
    price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }).toFixed(2),
    currency: "USD",
    firstSeenAt: now.split("T")[0],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generate multiple product fixtures
 */
export function createProductFixtures(
  count: number,
  overrides: Partial<ProductFixture> = {}
): ProductFixture[] {
  return Array.from({ length: count }, () => createProductFixture(overrides));
}

/**
 * Generate a random topic fixture
 */
export function createTopicFixture(overrides: Partial<TopicFixture> = {}): TopicFixture {
  const name = overrides.name || faker.word.words(2);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    name,
    slug,
    description: faker.lorem.sentence(),
    imageUrl: faker.image.url(),
    searchKeywords: faker.word.words(3).replace(/ /g, ", "),
    productCount: faker.number.int({ min: 0, max: 1000 }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generate multiple topic fixtures
 */
export function createTopicFixtures(
  count: number,
  overrides: Partial<TopicFixture> = {}
): TopicFixture[] {
  return Array.from({ length: count }, () => createTopicFixture(overrides));
}

/**
 * Generate a random trend fixture
 */
export function createTrendFixture(overrides: Partial<TrendFixture> = {}): TrendFixture {
  const productName = faker.commerce.productName();

  return {
    id: faker.string.uuid(),
    productId: faker.string.uuid(),
    productSlug: productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    productName,
    productImage: faker.image.url(),
    productPrice: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }).toFixed(2),
    periodType: faker.helpers.arrayElement(["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "LAST_7_DAYS", "LAST_15_DAYS", "LAST_30_DAYS"]),
    statDate: new Date().toISOString().split("T")[0],
    rank: faker.number.int({ min: 1, max: 100 }),
    score: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    redditMentions: faker.number.int({ min: 0, max: 10000 }),
    xMentions: faker.number.int({ min: 0, max: 10000 }),
    ...overrides,
  };
}

/**
 * Generate multiple trend fixtures
 */
export function createTrendFixtures(
  count: number,
  overrides: Partial<TrendFixture> = {}
): TrendFixture[] {
  return Array.from({ length: count }, (_, index) =>
    createTrendFixture({
      rank: index + 1,
      ...overrides,
    })
  );
}

/**
 * Generate pagination params
 */
export function createPaginationParams(overrides = {}) {
  return {
    page: 1,
    limit: 10,
    ...overrides,
  };
}

/**
 * Generate mock API response (new format with 'items' instead of 'data')
 */
export function createPaginatedResponse<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  };
}
