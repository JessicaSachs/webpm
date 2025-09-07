/**
 * Base registry class with common functionality
 */

import type { RegistryConfig, PackageMetadata, PackageVersions } from './types'
import { MemoryCache, IndexedDBCache } from './cache'
import { RetryManager } from './retry'
import { RateLimiter } from './rate-limiter'
import { fetchWithTimeout, isBrowser } from './browser-adapter'

export abstract class BaseRegistry {
  protected config: RegistryConfig
  protected cache: MemoryCache | IndexedDBCache
  protected retryManager: RetryManager
  protected rateLimiter?: RateLimiter

  constructor(config: RegistryConfig) {
    this.config = {
      timeout: 30000,
      cacheTtl: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      ...config,
    }

    // Initialize cache based on environment
    if (isBrowser()) {
      this.cache = new IndexedDBCache(
        'webpm-registry',
        'cache',
        this.config.cacheTtl
      )
    } else {
      this.cache = new MemoryCache(this.config.cacheTtl)
    }

    // Initialize retry manager
    this.retryManager = new RetryManager({
      maxRetries: this.config.maxRetries,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
    })

    // Initialize rate limiter if configured
    if (this.config.rateLimit) {
      this.rateLimiter = new RateLimiter(
        this.config.rateLimit.requestsPerMinute,
        this.config.rateLimit.burstLimit
      )
    }
  }

  /**
   * Initialize the registry (async setup)
   */
  async init(): Promise<void> {
    if (this.cache instanceof IndexedDBCache) {
      await this.cache.init()
    }
  }

  /**
   * Get package metadata for a specific version
   */
  abstract getPackageMetadata(
    name: string,
    version: string
  ): Promise<PackageMetadata>

  /**
   * Get all available versions for a package
   */
  abstract getPackageVersions(name: string): Promise<PackageVersions>

  /**
   * Search for packages
   */
  abstract searchPackages(
    _query: string,
    _options?: { limit?: number; offset?: number }
  ): Promise<void | {
    objects: Array<{
      package: PackageMetadata
      score: {
        final: number
        detail: { quality: number; popularity: number; maintenance: number }
      }
      searchScore: number
    }>
    total: number
    time: string
  }>

  /**
   * Download package tarball
   */
  abstract downloadTarball(url: string): Promise<ArrayBuffer>

  /**
   * Make an HTTP request with retry logic and rate limiting
   */
  protected async makeRequest<T>(
    url: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: string
      timeout?: number
    } = {}
  ): Promise<T> {
    // Apply rate limiting
    if (this.rateLimiter) {
      await this.rateLimiter.checkRateLimit()
    }

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${this.config.url}${url}`

    // Prepare headers
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'webpm/1.0.0',
      ...options.headers,
    }

    // Add authentication if configured
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`
    }

    // Execute request with retry logic
    return this.retryManager.execute(async () => {
      const response = await fetchWithTimeout(fullUrl, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        timeout: options.timeout || this.config.timeout,
      })

      if (!response.ok) {
        const errorBody = await this.parseErrorResponse(response)
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${JSON.stringify(errorBody)}`
        )
      }

      return response.json() as Promise<T>
    }, `Request to ${fullUrl}`)
  }

  /**
   * Parse error response from registry
   */
  private async parseErrorResponse(response: {
    headers: { get: (name: string) => string | null }
    json(): Promise<unknown>
    text(): Promise<string>
  }): Promise<unknown> {
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text()
      }
    } catch {
      return null
    }
  }

  /**
   * Get cached value or fetch and cache
   */
  protected async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.cache.get<T>(key)
    if (cached !== null) {
      console.debug(`Cache hit for key: ${key}`)
      return cached
    }

    // Fetch and cache
    console.debug(`Cache miss for key: ${key}, fetching...`)
    const data = await fetcher()
    await this.cache.set(key, data, ttl)

    return data
  }

  /**
   * Generate cache key for package metadata
   */
  protected getPackageMetadataCacheKey(name: string, version: string): string {
    return `package:${name}@${version}`
  }

  /**
   * Generate cache key for package versions
   */
  protected getPackageVersionsCacheKey(name: string): string {
    return `versions:${name}`
  }

  /**
   * Generate cache key for search results
   */
  protected getSearchCacheKey(
    query: string,
    limit?: number,
    offset?: number
  ): string {
    return `search:${query}:${limit ?? 'default'}:${offset ?? 0}`
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    if (this.cache instanceof MemoryCache) {
      return this.cache.getStats()
    }
    // IndexedDBCache doesn't have getStats method
    return { size: 0, entries: [] }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter?.getStatus()
  }
}
