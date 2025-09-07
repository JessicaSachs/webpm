/**
 * @webpm/registry - NPM registry API communication
 *
 * Provides a browser-compatible interface for communicating with NPM registries,
 * including caching, retry logic, rate limiting, and authentication support.
 */

import { NPMRegistry } from './npm-registry'
import type { RegistryConfig } from './types'

// Core types
export type {
  RegistryConfig,
  PackageMetadata,
  PackageVersions,
  RegistryError,
  CacheEntry,
  RetryOptions,
  RateLimitState,
} from './types'

// Error classes
export {
  NetworkError,
  TimeoutError,
  RateLimitError,
  AuthenticationError,
  NotFoundError,
  CacheError,
} from './errors'

// Cache implementations
export { MemoryCache, IndexedDBCache } from './cache'

// Retry logic
export { RetryManager, createRetryManager } from './retry'

// Rate limiting
export { RateLimiter } from './rate-limiter'

// Browser adapter utilities
export {
  fetchWithTimeout,
  parseUrl,
  buildQueryString,
  WebPMHeaders,
  isBrowser,
  isNode,
  getStorage,
  type Storage,
} from './browser-adapter'

// Base registry class
export { BaseRegistry } from './base-registry'

// Registry implementations
export { NPMRegistry } from './npm-registry'

// Convenience factory function
export function createRegistry(config?: Partial<RegistryConfig>) {
  return new NPMRegistry(config)
}
