import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'ui',
    include: ['packages/ui/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'happy-dom',
    globals: true,
  },
})
