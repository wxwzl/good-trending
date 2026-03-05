/**
 * ESLint configuration for Next.js applications
 */

const baseConfig = require("./base");

module.exports = [
  ...baseConfig,
  {
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "max-lines-per-function": "off",
    },
  },
];
