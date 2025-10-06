import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/index.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@cargoexpress/prisma': path.resolve(__dirname, './libs/prisma/src'),
      '@cargoexpress/shared': path.resolve(__dirname, './libs/shared/src')
    }
  }
});