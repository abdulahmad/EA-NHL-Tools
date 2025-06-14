import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable globals so you don't need to import test functions
    globals: false,
    // Environment for running tests
    environment: 'node',
    // Test file patterns
    include: ['**/*.test.js', '**/*.spec.js'],    // Reporter options
    // reporter: ['verbose', 'json'],
    reporter: ['verbose'],
    // Coverage options (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
