import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: { resolve: { conditions: ['module', 'node'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // Testerna delar databas – kör filerna efter varandra, inte parallellt.
    fileParallelism: false,
    testTimeout: 10000,
  },
});