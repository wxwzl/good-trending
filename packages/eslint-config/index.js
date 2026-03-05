/**
 * @good-trending/eslint-config
 *
 * Shared ESLint configurations for the Good-Trending monorepo.
 *
 * Available configurations:
 * - base: TypeScript base configuration
 * - next: Next.js applications (extends base)
 * - nest: NestJS applications (extends base)
 *
 * Usage in your eslint.config.js:
 *
 * // For Next.js apps
 * const nextConfig = require("@good-trending/eslint-config/next");
 * module.exports = nextConfig;
 *
 * // For NestJS apps
 * const nestConfig = require("@good-trending/eslint-config/nest");
 * module.exports = nestConfig;
 *
 * // For other TypeScript packages
 * const baseConfig = require("@good-trending/eslint-config/base");
 * module.exports = baseConfig;
 */

module.exports = {
  base: require("./base"),
  next: require("./next"),
  nest: require("./nest"),
};
