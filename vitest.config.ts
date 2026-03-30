import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer'] }),
  ],
  define: {
    global: 'globalThis',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'test/unit/**/*.test.{ts,tsx}',
      'test/integration/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['test/setup.ts'],
  },
});
