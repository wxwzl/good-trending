import { faker } from "@faker-js/faker";

export interface ProductFixture {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  sourceType: "TWITTER" | "AMAZON";
  sourceId: string;
  price: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  viewCount: number;
  trendingScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicFixture {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrendFixture {
  id: string;
  productId: string;
  date: Date;
  rank: number;
  mentions: number;
  sentiment: number;
  score: number;
  createdAt: Date;
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

  return {
    id: faker.string.uuid(),
    name,
    slug,
    description: faker.commerce.productDescription(),
    imageUrl: faker.image.url(),
    sourceUrl: faker.internet.url(),
    sourceType: faker.helpers.arrayElement(["TWITTER", "AMAZON"]),
    sourceId: faker.string.alphanumeric(10),
    price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
    currency: "USD",
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    reviewCount: faker.number.int({ min: 0, max: 10000 }),
    viewCount: faker.number.int({ min: 0, max: 1000000 }),
    trendingScore: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
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

  return {
    id: faker.string.uuid(),
    name,
    slug,
    description: faker.lorem.sentence(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
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
  return {
    id: faker.string.uuid(),
    productId: faker.string.uuid(),
    date: faker.date.recent(),
    rank: faker.number.int({ min: 1, max: 100 }),
    mentions: faker.number.int({ min: 0, max: 10000 }),
    sentiment: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
    score: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    createdAt: faker.date.recent(),
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
 * Generate mock API response
 */
export function createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  };
}
