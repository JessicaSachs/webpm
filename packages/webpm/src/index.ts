import { logger } from '@webpm/logger'
import { env } from '@webpm/environment'
import { NPMRegistry } from '@webpm/registry'
import type { PackageMetadata } from '@webpm/registry'
import {
  resolvePackageTree,
  resolveAndFetchPackage,
  resolveAndFetchWantedDependencies,
  getWantedDependenciesFromPackageJson,
  type DependencyTreeNode,
  type FetchedDependencyTree,
  type FetchedPackage,
  type PackageJsonManifest,
  type ResolvePackageJsonOptions
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
  onResult?: (result: FetchedDependencyTree) => void
}

export interface UntarProgressEvent {
  type: 'package-extracted' | 'batch-complete' | 'installation-complete'
  packageName?: string
  packageVersion?: string
  extractedFiles?: number
  currentProgress: {
    totalPackages: number
    totalFiles: number
    totalSize: number
    completedPackages: number
  }
  batchInfo?: {
    batchIndex: number
    batchTotal: number
    packagesInBatch: number
  }
}

export interface UntarHandler {
  onProgress?: (event: UntarProgressEvent) => void
  onComplete?: (result: InstallationResult) => void
  onError?: (error: Error) => void
}

export interface InstallationResult {
  success: boolean
  totalPackages: number
  totalFiles: number
  totalSize: number
  allPackages: FetchedPackage[]
  timings: {
    totalTime: number
    resolutionTime: number
    fetchingTime: number
    extractionTime: number
  }
  statistics: {
    averageExtractionTime: number
    fastestExtraction: number
    slowestExtraction: number
    largestPackage: { name: string; size: number }
    smallestPackage: { name: string; size: number }
  }
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

  // Track the number of active operations
  private _activeOperations: number = 0

  constructor(config: Partial<WebpmConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.registry = new NPMRegistry({
      ...this.config,
    })
  }

  /**
   * Returns true if WebPM is currently busy (performing one or more async operations)
   */
  get isBusy(): boolean {
    return this._activeOperations > 0
  }

  /**
   * For advanced use: get number of active async operations
   */
  get activeOperations(): number {
    return this._activeOperations
  }

  private _wrapBusy<T>(promiseFactory: () => Promise<T>): Promise<T> {
    this._activeOperations++
    const maybePromise = promiseFactory()
    // In case promiseFactory throws synchronously, handle accordingly:
    const onDone = () => { this._activeOperations = Math.max(0, this._activeOperations - 1) }
    if (!(maybePromise && typeof maybePromise.then === "function")) {
      // Not a promise; decrement count and rethrow
      onDone()
      throw new Error('Operation did not return a promise.')
    }
    return maybePromise.finally(onDone)
  }

  init(): Promise<void> {
    return this._wrapBusy(() => this.registry.init().then((registry) => {
      logger.info('WebPM initialized', { config: this.config, registry })
    }))
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

    return this._wrapBusy(() =>
      this.registry
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
    )
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

    return this._wrapBusy(async () => {
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
    })
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
    return this._wrapBusy(async () => {
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
    })
  }

  /**
   * Install a package, resolve dependencies, and fetch all tarballs
   * @param packageName - The name of the package to install
   * @param options - Installation options
   */
  async installAndFetch(
    packageName: string,
    options: InstallOptions & { maxConcurrent?: number } = {}
  ): Promise<FetchedDependencyTree | null> {
    return this._wrapBusy(async () => {
      logger.info('Installing and fetching package', { packageName, options })

      try {
        // Create registry instance
        const registry = new NPMRegistry({
          url: options.registry || this.config.registry,
          timeout: this.config.timeout,
          maxRetries: this.config.retries,
        })

        // Resolve, fetch, and extract all packages
        const fetchedTree = await resolveAndFetchPackage(
          packageName,
          options.version || 'latest',
          registry,
          {
            maxDepth: 10,
            maxConcurrent: options.maxConcurrent || this.config.concurrency,
          }
        )

        if (!fetchedTree) {
          logger.error(`Failed to resolve and fetch dependencies for ${packageName}`)
          return null
        }

        logger.info(`Successfully installed and fetched ${packageName} with ${fetchedTree.totalPackages} packages and ${fetchedTree.totalFiles} files`)

        // Log timing summary
        const { timings } = fetchedTree;
        logger.info(`Installation timing summary:`);
        logger.info(`  Total time: ${timings.totalTime.toFixed(2)}ms`);
        logger.info(`  Resolution: ${timings.resolutionTime.toFixed(2)}ms`);
        logger.info(`  Fetching: ${timings.fetchingTime.toFixed(2)}ms`);
        logger.info(`  Extraction: ${timings.extractionTime.toFixed(2)}ms`);
        logger.info(`  Average per package: ${(timings.fetchingTime / fetchedTree.totalPackages).toFixed(2)}ms`);

        return fetchedTree

      } catch (error) {
        logger.error(`Failed to install and fetch package ${packageName}:`, error)
        throw error
      }
    })
  }

  /**
   * Install packages with proper untar handling and accurate metrics
   * @param packageJson - The package.json manifest object
   * @param handler - Untar handler for progress and completion callbacks
   * @param options - Resolution options
   */
  async installWithUntarHandler(
    packageJson: PackageJsonManifest,
    handler: UntarHandler = {},
    options: ResolvePackageJsonOptions = {}
  ): Promise<InstallationResult> {
    return this._wrapBusy(async () => {
      const startTime = performance.now()

      try {
        logger.info('Starting installation with untar handler', {
          packageName: packageJson.name,
          options
        })

        // Create registry instance
        const registry = new NPMRegistry({
          url: this.config.registry,
          timeout: this.config.timeout,
          maxRetries: this.config.retries,
        })

        // Extract wanted dependencies from package.json
        const wantedDependencies = getWantedDependenciesFromPackageJson(packageJson, options)

        if (wantedDependencies.length === 0) {
          const result: InstallationResult = {
            success: true,
            totalPackages: 0,
            totalFiles: 0,
            totalSize: 0,
            allPackages: [],
            timings: {
              totalTime: performance.now() - startTime,
              resolutionTime: 0,
              fetchingTime: 0,
              extractionTime: 0
            },
            statistics: {
              averageExtractionTime: 0,
              fastestExtraction: 0,
              slowestExtraction: 0,
              largestPackage: { name: '', size: 0 },
              smallestPackage: { name: '', size: 0 }
            }
          }

          handler.onComplete?.(result)
          return result
        }

        // Collect all packages from all dependency trees
        const allPackages: FetchedPackage[] = []
        let totalResolutionTime = 0
        let totalFetchingTime = 0
        let totalExtractionTime = 0

        // Process dependencies with progress tracking
        for (let i = 0; i < wantedDependencies.length; i++) {
          const wantedDep = wantedDependencies[i]
          const depType = wantedDep.dev ? 'dev' : (wantedDep.optional ? 'optional' : 'prod')

          logger.info(`Processing ${depType} dependency: ${wantedDep.alias}@${wantedDep.bareSpecifier}`)

          try {
            console.log(`🔍 installWithUntarHandler: calling resolveAndFetchPackage with autoInstallPeers = ${options.autoInstallPeers}`)
            const result = await resolveAndFetchPackage(
              wantedDep.alias,
              wantedDep.bareSpecifier,
              registry,
              {
                maxConcurrent: options.maxConcurrent || this.config.concurrency,
                autoInstallPeers: options.autoInstallPeers
              }
            )

            if (result && result.allFetchedPackages) {
              const packages = Array.from(result.allFetchedPackages.values())
              allPackages.push(...packages)

              // Accumulate timing
              totalResolutionTime += result.timings.resolutionTime
              totalFetchingTime += result.timings.fetchingTime
              totalExtractionTime += result.timings.extractionTime

              // Send progress event for each package
              for (const pkg of packages) {
                const currentProgress = this.calculateCurrentProgress(allPackages)

                handler.onProgress?.({
                  type: 'package-extracted',
                  packageName: pkg.package.name,
                  packageVersion: pkg.package.version,
                  extractedFiles: pkg.extractedFiles.files.length,
                  currentProgress
                })
              }

              // Send batch complete event
              handler.onProgress?.({
                type: 'batch-complete',
                currentProgress: this.calculateCurrentProgress(allPackages),
                batchInfo: {
                  batchIndex: i + 1,
                  batchTotal: wantedDependencies.length,
                  packagesInBatch: packages.length
                }
              })
            }
          } catch (error) {
            if (wantedDep.optional) {
              logger.warn(`Optional dependency ${wantedDep.alias}@${wantedDep.bareSpecifier} failed:`, error)
            } else {
              throw error
            }
          }
        }

        // Calculate final statistics
        const totalTime = performance.now() - startTime
        const statistics = this.calculateStatistics(allPackages)
        const currentProgress = this.calculateCurrentProgress(allPackages)

        const installationResult: InstallationResult = {
          success: true,
          totalPackages: currentProgress.totalPackages,
          totalFiles: currentProgress.totalFiles,
          totalSize: currentProgress.totalSize,
          allPackages,
          timings: {
            totalTime,
            resolutionTime: totalResolutionTime,
            fetchingTime: totalFetchingTime,
            extractionTime: totalExtractionTime
          },
          statistics
        }

        // Send final completion event
        handler.onProgress?.({
          type: 'installation-complete',
          currentProgress
        })

        handler.onComplete?.(installationResult)

        logger.info(`Installation complete: ${installationResult.totalPackages} packages, ${installationResult.totalFiles} files`)
        return installationResult

      } catch (error) {
        const installationError = error instanceof Error ? error : new Error('Unknown installation error')
        handler.onError?.(installationError)
        throw installationError
      }
    })
  }

  /**
   * Calculate current progress statistics
   */
  private calculateCurrentProgress(allPackages: FetchedPackage[]) {
    const totalFiles = allPackages.reduce((sum, pkg) => sum + pkg.extractedFiles.files.length, 0)
    const totalSize = allPackages.reduce((sum, pkg) => {
      return sum + pkg.extractedFiles.files.reduce((fileSum: number, file: any) => fileSum + file.size, 0)
    }, 0)

    return {
      totalPackages: allPackages.length,
      totalFiles,
      totalSize,
      completedPackages: allPackages.length
    }
  }

  /**
   * Calculate extraction statistics
   */
  private calculateStatistics(allPackages: FetchedPackage[]) {
    if (allPackages.length === 0) {
      return {
        averageExtractionTime: 0,
        fastestExtraction: 0,
        slowestExtraction: 0,
        largestPackage: { name: '', size: 0 },
        smallestPackage: { name: '', size: 0 }
      }
    }

    const extractionTimes = allPackages
      .map(pkg => pkg.timings.extractionTime)
      .filter(time => time > 0)

    const packageSizes = allPackages.map(pkg => ({
      name: `${pkg.package.name}@${pkg.package.version}`,
      size: pkg.extractedFiles.files.reduce((sum: number, file: any) => sum + file.size, 0)
    }))

    const sortedSizes = packageSizes.sort((a, b) => b.size - a.size)

    return {
      averageExtractionTime: extractionTimes.length > 0
        ? extractionTimes.reduce((sum, time) => sum + time, 0) / extractionTimes.length
        : 0,
      fastestExtraction: extractionTimes.length > 0 ? Math.min(...extractionTimes) : 0,
      slowestExtraction: extractionTimes.length > 0 ? Math.max(...extractionTimes) : 0,
      largestPackage: sortedSizes[0] || { name: '', size: 0 },
      smallestPackage: sortedSizes[sortedSizes.length - 1] || { name: '', size: 0 }
    }
  }

  /**
   * Resolve and fetch all dependencies from a package.json file
   * @param packageJson - The package.json manifest object
   * @param options - Resolution options
   */
  async resolveAndFetchPackageJson(
    packageJson: PackageJsonManifest,
    options: ResolvePackageJsonOptions = {}
  ): Promise<FetchedDependencyTree[]> {
    return this._wrapBusy(async () => {
      logger.info('Resolving and fetching package.json dependencies', {
        packageName: packageJson.name,
        options
      })

      try {
        // Create registry instance
        const registry = new NPMRegistry({
          url: this.config.registry,
          timeout: this.config.timeout,
          maxRetries: this.config.retries,
        })

        // Extract wanted dependencies from package.json
        const wantedDependencies = getWantedDependenciesFromPackageJson(packageJson, options)

        if (wantedDependencies.length === 0) {
          logger.info('No dependencies found in package.json')
          return []
        }

        logger.info(`Found ${wantedDependencies.length} dependencies to resolve:`)
        for (const dep of wantedDependencies) {
          const depType = dep.dev ? 'dev' : (dep.optional ? 'optional' : 'prod')
          logger.info(`  ${depType}: ${dep.alias}@${dep.bareSpecifier}`)
        }

        // Resolve and fetch all wanted dependencies
        const results = await resolveAndFetchWantedDependencies(
          wantedDependencies,
          registry,
          {
            maxConcurrent: options.maxConcurrent || this.config.concurrency,
            autoInstallPeers: options.autoInstallPeers
          }
        )

        // Calculate summary statistics
        const totalPackages = results.reduce((sum, result) => sum + result.totalPackages, 0)
        const totalFiles = results.reduce((sum, result) => sum + result.totalFiles, 0)
        const totalTime = results.reduce((max, result) => Math.max(max, result.timings.totalTime), 0)

        logger.info(`Successfully resolved and fetched package.json dependencies:`)
        logger.info(`  Root dependencies resolved: ${results.length}`)
        logger.info(`  Total packages: ${totalPackages}`)
        logger.info(`  Total files: ${totalFiles}`)
        logger.info(`  Total time: ${totalTime.toFixed(2)}ms`)

        // Log per-dependency summary
        for (const result of results) {
          logger.info(`  ${result.root.package.name}@${result.root.package.version}: ${result.totalPackages} packages, ${result.totalFiles} files`)
        }

        return results

      } catch (error) {
        logger.error(`Failed to resolve and fetch package.json dependencies:`, error)
        throw error
      }
    })
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
    for (const [, childNode] of node.children) {
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
    return this._wrapBusy(() => {
      const promises = packageNames.map((name) => this.getPackageInfo(name))
      return Promise.all(promises)
    })
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
    // This function itself may be called inside _wrapBusy, but never hurts to play nice
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

export * from '@webpm/store'
export type { PackageJsonManifest, ResolvePackageJsonOptions } from '@webpm/store'
