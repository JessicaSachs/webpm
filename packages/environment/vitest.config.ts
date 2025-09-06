import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'environment',
    environment: 'node',
    globals: true,
  },
})
