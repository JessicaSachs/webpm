import { logger } from '@webpm/logger'
import { env } from '@webpm/environment'

// Core types and interfaces
export interface PackageInfo {
  name: string
  description: string
  version: string
  license: string
  homepage?: string
  repository?: {
    type: string
    url: string
  }
  keywords?: string[]
  author?: {
    name: string
    email?: string
  }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export interface PackageVersion {
  version: string
  dist: {
    tarball: string
    shasum: string
    integrity?: string
  }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export interface InstallOptions {
  version?: string
  dev?: boolean
  peer?: boolean
  cache?: boolean
  registry?: string
}

export interface WebpmConfig {
  registry: string
  cache: boolean
  concurrency: number
  retries: number
  timeout: number
}

// Internal types for npm registry responses
interface NpmRegistryResponse {
  name: string
  description?: string
  'dist-tags': {
    latest: string
  }
  license?: string
  homepage?: string
  repository?: {
    type: string
    url: string
  }
  keywords?: string[]
  author?: {
    name: string
    email?: string
  }
  versions: Record<
    string,
    {
      version: string
      dist: {
        tarball: string
        shasum: string
        integrity?: string
      }
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
  >
}

// Configure environment for webpm
env.updateConfig({
  prefix: 'WEBPM_',
  defaults: {
    REGISTRY: 'https://registry.npmjs.org',
    CACHE: 'true',
    CONCURRENCY: '5',
    RETRIES: '3',
    TIMEOUT: '30000',
  },
})

// Default configuration with environment variable support
const DEFAULT_CONFIG: WebpmConfig = {
  registry: env.get('REGISTRY', 'https://registry.npmjs.org'),
  cache: env.getBoolean('CACHE', true),
  concurrency: env.getNumber('CONCURRENCY', 5),
  retries: env.getNumber('RETRIES', 3),
  timeout: env.getNumber('TIMEOUT', 30000),
}

/**
 * WebPM - Web Package Manager
 * A browser-first package manager for npm packages
 */
export class WebPM {
  private config: WebpmConfig
  private cache = new Map<string, PackageInfo>()

  constructor(config: Partial<WebpmConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    logger.info('WebPM initialized', { config: this.config })
  }

  /**
   * Get package information from npm registry
   * @param packageName - The name of the package to fetch
   * @returns Promise resolving to package information
   */
  async getPackageInfo(packageName: string): Promise<PackageInfo> {
    if (!packageName.trim()) {
      throw new Error('Package name cannot be empty')
    }

    // Check cache first
    if (this.config.cache && this.cache.has(packageName)) {
      logger.debug('Package info found in cache', { packageName })
      return this.cache.get(packageName)!
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.config.registry}/${packageName}`
      )
      const data = (await response.json()) as NpmRegistryResponse

      const packageInfo: PackageInfo = {
        name: data.name,
        description: data.description || 'No description available',
        version: data['dist-tags']?.latest || 'unknown',
        license: data.license || 'Unknown',
        homepage: data.homepage,
        repository: data.repository,
        keywords: data.keywords,
        author: data.author,
        dependencies: data.versions?.[data['dist-tags']?.latest]?.dependencies,
        devDependencies:
          data.versions?.[data['dist-tags']?.latest]?.devDependencies,
        peerDependencies:
          data.versions?.[data['dist-tags']?.latest]?.peerDependencies,
      }

      // Cache the result
      if (this.config.cache) {
        this.cache.set(packageName, packageInfo)
      }

      logger.info('Package info fetched successfully', {
        packageName,
        version: packageInfo.version,
      })
      return packageInfo
    } catch (error) {
      logger.error('Failed to fetch package info', { packageName, error })
      throw error
    }
  }

  /**
   * Get specific version information for a package
   * @param packageName - The name of the package
   * @param version - The version to fetch (defaults to latest)
   * @returns Promise resolving to version information
   */
  async getPackageVersion(
    packageName: string,
    version?: string
  ): Promise<PackageVersion> {
    if (!packageName.trim()) {
      throw new Error('Package name cannot be empty')
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.config.registry}/${packageName}`
      )
      const data = (await response.json()) as NpmRegistryResponse

      const targetVersion = version || data['dist-tags']?.latest
      const versionData = data.versions?.[targetVersion]

      if (!versionData) {
        throw new Error(
          `Version ${targetVersion} not found for package ${packageName}`
        )
      }

      const packageVersion: PackageVersion = {
        version: versionData.version,
        dist: versionData.dist,
        dependencies: versionData.dependencies,
        devDependencies: versionData.devDependencies,
        peerDependencies: versionData.peerDependencies,
      }

      logger.info('Package version fetched successfully', {
        packageName,
        version: targetVersion,
      })
      return packageVersion
    } catch (error) {
      logger.error('Failed to fetch package version', {
        packageName,
        version,
        error,
      })
      throw error
    }
  }

  /**
   * Install a package (placeholder for future implementation)
   * @param packageName - The name of the package to install
   * @param options - Installation options
   */
  async install(
    packageName: string,
    options: InstallOptions = {}
  ): Promise<void> {
    logger.info('Installing package', { packageName, options })

    // This is a placeholder for the actual installation logic
    // In a real implementation, this would:
    // 1. Fetch the package tarball
    // 2. Extract it to a virtual filesystem
    // 3. Resolve dependencies
    // 4. Update package.json

    throw new Error('Package installation not yet implemented')
  }

  /**
   * Validate a package name format
   * @param packageName - The package name to validate
   * @returns True if valid, false otherwise
   */
  validatePackageName(packageName: string): boolean {
    const npmPackageNameRegex =
      /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
    return npmPackageNameRegex.test(packageName)
  }

  /**
   * Get multiple packages in parallel
   * @param packageNames - Array of package names to fetch
   * @returns Promise resolving to array of package information
   */
  async getMultiplePackages(packageNames: string[]): Promise<PackageInfo[]> {
    const promises = packageNames.map((name) => this.getPackageInfo(name))
    return Promise.all(promises)
  }

  /**
   * Clear the package cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.info('Package cache cleared')
  }

  /**
   * Update configuration
   * @param newConfig - Partial configuration to merge
   */
  updateConfig(newConfig: Partial<WebpmConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('Configuration updated', { config: this.config })
  }

  /**
   * Get current configuration
   * @returns Current configuration object
   */
  getConfig(): WebpmConfig {
    return { ...this.config }
  }

  /**
   * Fetch with retry logic and exponential backoff
   * @param url - URL to fetch
   * @returns Promise resolving to Response
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        )

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Package not found: ${url}`)
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (attempt < this.config.retries) {
          const delay = Math.pow(2, attempt - 1) * 1000 // Exponential backoff
          logger.warn(
            `Fetch attempt ${attempt} failed, retrying in ${delay}ms`,
            {
              url,
              error: lastError.message,
            }
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }
}

// Export a default instance for convenience
export const webpm = new WebPM()
