/**
 * @webpm/resolver - Dependency resolver for browser environments.
 */
import { parseBareSpecifier } from '@webpm/utils'

export function resolveFromNpm({
  alias,
  rawSpecifier,
}: {
  alias: string
  rawSpecifier: string
}) {
  return parseBareSpecifier(
    rawSpecifier,
    alias,
    'latest',
    'https://registry.npmjs.org'
  )
}
