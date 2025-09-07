/**
 * @webpm/resolver - Dependency resolver for browser environments.
 */
import { normalizeSpecifier } from '@webpm/utils'
import { LRUCache } from 'lru-cache'
import { pickPackage } from './pickPackage'
import type { PackageMeta, PackageMetaCache } from '@webpm/types'

/**
 * Encode package name for URL (handles scoped packages)
 */
function encodePackageName(packageName: string): string {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/')
    return `@${encodeURIComponent(scope.slice(1))}%2F${encodeURIComponent(name)}`
  }
  return encodeURIComponent(packageName)
}

/**
 * Enhanced fetch function with proper headers, error handling, and caching
 */
async function enhancedFetch(
  pkgName: string,
  registry: string,
  authHeaderValue?: string
): Promise<PackageMeta> {
  const encodedName = encodePackageName(pkgName)
  const url = `${registry}/${encodedName}`

  try {
    const response = await fetch(url, {
      headers: {
        Accept:
          'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
        'User-Agent': 'webpm-resolver/1.0.0',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package "${pkgName}" not found in NPM registry`)
      }
      throw new Error(
        `Failed to fetch ${pkgName}: ${response.status} ${response.statusText}`
      )
    }

    const packageMeta: PackageMeta = await response.json()
    return packageMeta
  } catch (error) {
    console.error(`Error fetching manifest for ${pkgName}:`, error)
    throw error
  }
}

/**
 * Download tarball from URL
 */
async function downloadTarball(tarballUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(tarballUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to download tarball: ${response.status} ${response.statusText}`
    )
  }
  return response.arrayBuffer()
}

const metaCache = new LRUCache<string, PackageMeta>({
  max: 10000,
  ttl: 120 * 1000, // 2 minutes
})

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

  if (!spec) {
    throw new Error(
      `Unable to normalize specifier: ${rawSpecifier} for alias: ${alias}`
    )
  }

  return pickPackage(
    {
      fetch: enhancedFetch,
      metaDir: 'meta',
      metaCache,
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

/**
 * Clear the global metadata cache
 */
export function clearCache(): void {
  metaCache.clear()
}

/**
 * Export the downloadTarball function for external use
 */
export { downloadTarball }

/**
 * Get package version information (similar to demo NpmClient.getPackageVersion)
 */
export async function getPackageVersion(
  packageName: string,
  version: string = 'latest',
  registry: string = 'https://registry.npmjs.org'
): Promise<PackageMeta['versions'][string]> {
  const cacheKey = `${packageName}@${registry}`

  // Check cache first
  let manifest = metaCache.get(cacheKey)

  if (!manifest) {
    // Fetch from registry
    manifest = await enhancedFetch(packageName, registry)
    metaCache.set(cacheKey, manifest)
  }

  // Resolve version tag to actual version
  const resolvedVersion =
    version === 'latest'
      ? manifest['dist-tags'].latest
      : manifest['dist-tags'][version] || version

  const packageVersion = manifest.versions[resolvedVersion]
  if (!packageVersion) {
    throw new Error(`Version ${version} not found for package ${packageName}`)
  }

  return packageVersion
}

/**
 * Fetch package manifest (similar to demo NpmClient.fetchManifest)
 */
export async function fetchManifest(
  packageName: string,
  registry: string = 'https://registry.npmjs.org'
): Promise<PackageMeta> {
  const cacheKey = `${packageName}@${registry}`

  // Check cache first
  let manifest = metaCache.get(cacheKey)

  if (!manifest) {
    // Fetch from registry
    manifest = await enhancedFetch(packageName, registry)
    metaCache.set(cacheKey, manifest)
  }

  return manifest
}
