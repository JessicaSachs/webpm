import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'logger',
    environment: 'node',
    globals: true,
  },
})
