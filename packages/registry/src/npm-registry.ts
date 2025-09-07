/**
 * NPM registry implementation using @pnpm/npm-resolver
 */

import { BaseRegistry } from './base-registry'
import type { RegistryConfig, PackageMetadata, PackageVersions } from './types'
import { fetchWithTimeout } from './browser-adapter'

export class NPMRegistry extends BaseRegistry {
  constructor(config: Partial<RegistryConfig> = {}) {
    super({
      url: 'https://registry.npmjs.org',
      ...config,
    })
  }

  /**
   * Get package metadata for a specific version
   */
  async getPackageMetadata(
    name: string,
    version: string
  ): Promise<PackageMetadata> {
    const cacheKey = this.getPackageMetadataCacheKey(name, version)

    return this.getCachedOrFetch(cacheKey, async () => {
      console.debug(`Fetching package metadata for ${name}@${version}`)

      const response = await this.makeRequest<PackageVersions>(
        `/${encodeURIComponent(name)}`
      )

      if (!response.versions[version]) {
        throw new Error(`Version ${version} not found for package ${name}`)
      }

      return response.versions[version]
    })
  }

  /**
   * Get all available versions for a package
   */
  async getPackageVersions(name: string): Promise<PackageVersions> {
    const cacheKey = this.getPackageVersionsCacheKey(name)

    return this.getCachedOrFetch(cacheKey, async () => {
      console.debug(`Fetching package versions for ${name}`)

      const response = await this.makeRequest<PackageVersions>(
        `/${encodeURIComponent(name)}`
      )
      return response
    })
  }

  /**
   * Search for packages
   */
  async searchPackages(): Promise<void> {
    throw new Error('Search packages not implemented')
  }

  /**
   * Download package tarball
   */
  async downloadTarball(url: string): Promise<ArrayBuffer> {
    console.debug(`Downloading tarball from: ${url}`)

    const response = await fetchWithTimeout(url, {
      timeout: this.config.timeout,
    })

    if (!response.ok) {
      throw new Error(`Failed to download tarball: HTTP ${response.status}`)
    }

    return response.arrayBuffer()
  }

  /**
   * Get package metadata by name and version range
   */
  async getPackageByRange(
    name: string,
    range: string
  ): Promise<PackageMetadata> {
    const versions = await this.getPackageVersions(name)

    // Find the best matching version for the range
    const matchingVersions = Object.keys(versions.versions).filter(
      (version) => {
        try {
          // Simple semver range matching - in a real implementation,
          // you'd use a proper semver library
          return this.satisfiesVersion(version, range)
        } catch {
          return false
        }
      }
    )

    if (matchingVersions.length === 0) {
      throw new Error(`No version found for ${name} matching range ${range}`)
    }

    // Sort versions and pick the latest
    const sortedVersions = matchingVersions.sort((a, b) => {
      return this.compareVersions(b, a) // Descending order
    })

    return versions.versions[sortedVersions[0]]
  }

  /**
   * Get latest version of a package
   */
  async getLatestVersion(name: string): Promise<PackageMetadata> {
    const versions = await this.getPackageVersions(name)

    if (!versions['dist-tags']?.latest) {
      throw new Error(`No latest version found for package ${name}`)
    }

    const latestVersion = versions['dist-tags'].latest
    return versions.versions[latestVersion]
  }

  /**
   * Get package dependencies
   */
  async getPackageDependencies(
    name: string,
    version: string
  ): Promise<Record<string, string>> {
    const metadata = await this.getPackageMetadata(name, version)
    return metadata.dependencies || {}
  }

  /**
   * Check if a package exists
   */
  async packageExists(name: string): Promise<boolean> {
    try {
      await this.getPackageVersions(name)
      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return false
      }
      throw error
    }
  }

  /**
   * Simple version comparison (basic implementation)
   * In a real implementation, you'd use a proper semver library
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0

      if (aPart > bPart) return 1
      if (aPart < bPart) return -1
    }

    return 0
  }

  /**
   * Simple version range satisfaction (basic implementation)
   * Switch over the specifiers from pnpm 
   */
  private satisfiesVersion(version: string, range: string): boolean {
    // Very basic implementation - just handles exact versions and ^ ranges
    if (range === version) return true
    if (range.startsWith('^')) {
      const rangeVersion = range.slice(1)
      const [major] = rangeVersion.split('.')
      const [versionMajor] = version.split('.')
      return major === versionMajor
    }
    if (range.startsWith('~')) {
      const rangeVersion = range.slice(1)
      const [major, minor] = rangeVersion.split('.')
      const [versionMajor, versionMinor] = version.split('.')
      return major === versionMajor && minor === versionMinor
    }

    return false
  }
}
