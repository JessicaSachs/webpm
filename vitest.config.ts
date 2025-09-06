import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // Node.js packages
      'packages/logger',
      'packages/registry',
      // Browser/React packages with inline configuration
      {
        test: {
          name: 'ui',
          include: [
            'packages/ui/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
          ],
          environment: 'happy-dom',
          globals: true,
        },
      },
    ],
    // Global configuration that applies to all projects
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
})
