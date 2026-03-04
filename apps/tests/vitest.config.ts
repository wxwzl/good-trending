import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/api/**/*.test.ts', 'src/api/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'src/e2e/**/*'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/api/**/*.ts'],
      exclude: [
        'src/api/**/*.test.ts',
        'src/api/**/*.spec.ts',
        'src/api/types/**',
        'src/api/mocks/**',
        'src/api/fixtures/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@good-trending/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@good-trending/database': path.resolve(__dirname, '../../packages/database/src'),
    },
  },
})
