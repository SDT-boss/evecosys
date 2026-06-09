import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname),
        'server-only': path.resolve(__dirname, 'test/__mocks__/server-only.ts'),
      },
    },
    test: {
      name: 'integration',
      environment: 'node',
      globals: true,
      include: ['test/integration/tenant-provisioning.test.ts'],
      exclude: ['node_modules/**', 'e2e/**'],
      env: {
        NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  }
})
