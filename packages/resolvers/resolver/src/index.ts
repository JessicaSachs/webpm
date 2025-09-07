/**
 * @webpm/resolver - Dependency resolver for browser environments.
 */
import { normalizeSpecifier } from '@webpm/utils'
import { pickPackage } from './pickPackage'

export function resolveFromNpm({
  alias,
  rawSpecifier,
}: {
  alias: string
  rawSpecifier: string
}) {
  const spec = normalizeSpecifier({
    registry: 'https://registry.npmjs.org',
    defaultTag: 'latest',
    alias,
    rawSpecifier,
  })

  return pickPackage(
    {
      fetch: async (
        pkgName: string,
        registry: string,
        authHeaderValue?: string
      ) => {
        const response = await fetch(`${registry}/${pkgName}`, {
          headers: {
            Authorization: authHeaderValue ?? '',
          },
        })
        return response.json()
      },
      metaDir: 'meta',
      metaCache: new Map(),
      cacheDir: 'cache',
      offline: false,
      preferOffline: false,
      filterMetadata: false,
    },
    spec,
    {
      publishedBy: new Date(),
      preferredVersionSelectors: {},
      registry: 'https://registry.npmjs.org',
      dryRun: false,
      updateToLatest: false,
      authHeaderValue: undefined,
    }
  )
}
