import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
  test: {
    include: ['prerender/hydration.test.tsx'],
    environment: 'jsdom',
  },
});
