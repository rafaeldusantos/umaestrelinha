import { defineConfig } from 'vitest/config'
import path from 'path'

const root = path.resolve(__dirname, '../..')

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
  resolve: {
    // Mesmo alias dos apps: o pacote é consumido como source, sem build step.
    alias: {
      '@nanapin/supabase': path.resolve(root, 'packages/supabase/src'),
    },
  },
})
