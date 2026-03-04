import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * ESLint Flat Config for @good-trending/crawler
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */
export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.config.ts",
      "*.config.js",
      "*.config.mjs",
      "*.config.cjs",
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Prettier config (must be last to override conflicting rules)
  eslintConfigPrettier,

  // Custom rules for TypeScript files
  {
    files: ["**/*.ts"],
    plugins: {
      prettier,
    },
    rules: {
      // Prettier integration
      "prettier/prettier": "error",

      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-require-imports": "error",

      // Code quality rules
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // Best practices
      "no-throw-literal": "error",
      "no-return-await": "error",
      "prefer-promise-reject-errors": "error",
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
);