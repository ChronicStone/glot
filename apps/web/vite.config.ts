import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/server.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 240_000,
  },
})
