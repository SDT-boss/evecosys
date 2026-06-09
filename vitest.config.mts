import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      // server-only throws in non-Next.js environments (including Vitest).
      // Replace it with an empty shim so server-marked modules can be unit-tested.
      'server-only': path.resolve(__dirname, 'test/__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    globals: true,
    exclude: ['node_modules/**', 'e2e/**'],
  },
})
