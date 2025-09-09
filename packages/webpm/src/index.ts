import { logger } from '@webpm/logger'
import { env } from '@webpm/environment'
import { NPMRegistry } from '@webpm/registry'
import type { PackageMetadata } from '@webpm/registry'
import { 
  resolvePackageTree, 
  type DependencyTreeNode, 
  type RequestPackageOptions 
} from '@webpm/store'

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

// Configure environment for webpm with environment-specific overrides
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

// Log the environment configuration being used
logger.debug('WebPM environment configuration', {
  environment: env.getEnvironment(),
  config: {
    registry: DEFAULT_CONFIG.registry,
    cache: DEFAULT_CONFIG.cache,
    concurrency: DEFAULT_CONFIG.concurrency,
    retries: DEFAULT_CONFIG.retries,
    timeout: DEFAULT_CONFIG.timeout,
  },
})

/**
 * WebPM - Web Package Manager
 * A browser-first package manager for npm packages
 */
export class WebPM {
  private config: WebpmConfig
  private registry: NPMRegistry

  constructor(config: Partial<WebpmConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.registry = new NPMRegistry({
      ...this.config,
    })
  }

  init(): Promise<void> {
    return Promise.all([this.registry.init()]).then(([registry]) => {
      logger.info('WebPM initialized', { config: this.config, registry })
    })
  }


  /**
   * Get package information from npm registry
   * @param packageName - The name of the package to fetch
   * @returns Promise resolving to package information
   */
  async getPackageInfo(packageName: string): Promise<PackageMetadata> {
    if (!packageName.trim()) {
      throw new Error('Package name cannot be empty')
    }

    return this.registry
      .getLatestVersion(packageName)
      .then((metadata) => {
        logger.info('Package info fetched successfully', {
          packageName,
          version: metadata.version,
        })
        return metadata
      })
      .catch((error) => {
        logger.error('Failed to fetch package info', { packageName, error })
        throw error
      })
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
   * Install a package and resolve all its dependencies
   * @param packageName - The name of the package to install
   * @param options - Installation options
   */
  async install(
    packageName: string,
    options: InstallOptions = {}
  ): Promise<DependencyTreeNode | null> {
    logger.info('Installing package', { packageName, options })

    try {
      // Create registry instance
      const registry = new NPMRegistry({
        url: options.registry || this.config.registry,
        timeout: this.config.timeout,
        maxRetries: this.config.retries,
      })

      // Determine package version
      const packageVersion = options.version || 'latest'

      // Resolve package and all its dependencies
      const dependencyTree = await resolvePackageTree(
        packageName,
        packageVersion,
        registry,
        {
          maxDepth: 10,
          currentDepth: 0,
          parentIds: [],
        }
      )

      if (!dependencyTree) {
        logger.error(`Failed to resolve package ${packageName}@${packageVersion}`)
        return null
      }

      logger.info(`Successfully resolved package tree for ${packageName}@${packageVersion}`)
      this.logDependencyTree(dependencyTree)

      return dependencyTree

    } catch (error) {
      logger.error(`Failed to install package ${packageName}:`, error)
      throw error
    }
  }

  /**
   * Log the dependency tree structure (for debugging)
   */
  private logDependencyTree(node: DependencyTreeNode, depth = 0): void {
    const indent = '  '.repeat(depth)
    const { name, version } = node.package
    const childCount = node.children.size
    
    logger.info(`${indent}${name}@${version} (${childCount} dependencies)`)
    
    // Log children
    for (const [alias, childNode] of node.children) {
      this.logDependencyTree(childNode, depth + 1)
    }
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
  async getMultiplePackages(
    packageNames: string[]
  ): Promise<PackageMetadata[]> {
    const promises = packageNames.map((name) => this.getPackageInfo(name))
    return Promise.all(promises)
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
   * Update environment configuration and refresh the config
   * @param envConfig - Environment configuration to update
   */
  updateEnvironmentConfig(
    envConfig: Parameters<typeof env.updateConfig>[0]
  ): void {
    env.updateConfig(envConfig)

    // Refresh the configuration from environment variables
    this.config = {
      registry: env.get('REGISTRY', 'https://registry.npmjs.org')!,
      cache: env.getBoolean('CACHE', true)!,
      concurrency: env.getNumber('CONCURRENCY', 5)!,
      retries: env.getNumber('RETRIES', 3)!,
      timeout: env.getNumber('TIMEOUT', 30000)!,
    }

    logger.info('Environment configuration updated and config refreshed', {
      config: this.config,
      environment: env.getEnvironment(),
    })
  }

  /**
   * Get current configuration
   * @returns Current configuration object
   */
  getConfig(): WebpmConfig {
    return { ...this.config }
  }

  /**
   * Get current environment information
   * @returns Environment information
   */
  getEnvironmentInfo(): {
    environment: string
    isDevelopment: boolean
    isProduction: boolean
    isTest: boolean
    envConfig: ReturnType<typeof env.getConfig>
  } {
    return {
      environment: env.getEnvironment(),
      isDevelopment: env.isDevelopment(),
      isProduction: env.isProduction(),
      isTest: env.isTest(),
      envConfig: env.getConfig(),
    }
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
