/**
 * Core types for the WebPM registry system
 */

export interface RegistryConfig {
  /** Registry URL (e.g., 'https://registry.npmjs.org') */
  url: string
  /** Authentication token for private registries */
  token?: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Cache TTL in milliseconds */
  cacheTtl?: number
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Rate limiting configuration */
  rateLimit?: {
    /** Maximum requests per minute */
    requestsPerMinute: number
    /** Burst allowance */
    burstLimit?: number
  }
}

export interface PackageMetadata {
  /** Package name */
  name: string
  /** Package version */
  version: string
  /** Package description */
  description?: string
  /** Package homepage */
  homepage?: string
  /** Package repository */
  repository?: {
    type: string
    url: string
  }
  /** Package author */
  author?: string | { name: string; email?: string; url?: string }
  /** Package license */
  license?: string
  /** Package keywords */
  keywords?: string[]
  /** Package dependencies */
  dependencies?: Record<string, string>
  /** Package dev dependencies */
  devDependencies?: Record<string, string>
  /** Package peer dependencies */
  peerDependencies?: Record<string, string>
  /** Package optional dependencies */
  optionalDependencies?: Record<string, string>
  /** Package dist information */
  dist: {
    /** Tarball URL */
    tarball: string
    /** Package integrity hash */
    integrity?: string
    /** Package shasum */
    shasum?: string
    /** Package size in bytes */
    size?: number
  }
  /** Package publish time */
  publishTime?: string
  /** Package creation time */
  created?: string
  /** Package modification time */
  modified?: string
}

export interface PackageVersions {
  /** Package name */
  name: string
  /** Available versions */
  versions: Record<string, PackageMetadata>
  /** Latest version */
  'dist-tags': {
    latest: string
    [tag: string]: string
  }
  /** Package creation time */
  time: {
    created: string
    modified: string
    [version: string]: string
  }
  /** Package author */
  author?: string | { name: string; email?: string; url?: string }
  /** Package description */
  description?: string
  /** Package homepage */
  homepage?: string
  /** Package repository */
  repository?: {
    type: string
    url: string
  }
  /** Package license */
  license?: string
  /** Package keywords */
  keywords?: string[]
  /** Package readme */
  readme?: string
  /** Package readme filename */
  readmeFilename?: string
}

export interface RegistryError extends Error {
  /** HTTP status code */
  statusCode?: number
  /** Registry response body */
  body?: unknown
  /** Whether the error is retryable */
  retryable?: boolean
}

export interface CacheEntry<T = unknown> {
  /** Cached data */
  data: T
  /** Cache timestamp */
  timestamp: number
  /** Cache TTL in milliseconds */
  ttl: number
  /** Whether the entry is expired */
  expired: boolean
}

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay between retries in milliseconds */
  baseDelay: number
  /** Maximum delay between retries in milliseconds */
  maxDelay: number
  /** Exponential backoff multiplier */
  backoffMultiplier: number
  /** Jitter factor for randomization */
  jitter: boolean
}

export interface RateLimitState {
  /** Current request count */
  requestCount: number
  /** Window start time */
  windowStart: number
  /** Last request time */
  lastRequest: number
  /** Burst allowance remaining */
  burstAllowance: number
}
