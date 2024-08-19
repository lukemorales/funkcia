import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/vitest-setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      exclude: ['src/vitest-setup.ts', 'src/**/*.spec.ts', 'src/**/types.ts'],
    },
  },
});
