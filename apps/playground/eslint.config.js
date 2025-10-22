/** @type {import("eslint").Linter.Config} */
import { config } from '@webpm/eslint-config'

export default [
  ...config,
  { ignores: ['src/examples/**', 'dist/**'] }
]
