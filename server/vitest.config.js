import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    testTimeout: 20_000,
    // Database tests share one database: some files write rows while others count them, so
    // files run one at a time to keep counts and paging stable.
    fileParallelism: false,
  },
})
