import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'store',
    environment: 'node',
    globals: true,
  },
})
