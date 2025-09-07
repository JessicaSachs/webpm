/**
 * Basic tests for the registry package
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NPMRegistry, createRegistry } from '../index'

// Mock the logger to avoid console output during tests
vi.mock('@webpm/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('NPMRegistry', () => {
  let registry: NPMRegistry

  beforeEach(() => {
    registry = new NPMRegistry({
      url: 'https://registry.npmjs.org',
      timeout: 10000,
      cacheTtl: 60000,
    })
  })

  it('should create a registry instance', () => {
    expect(registry).toBeInstanceOf(NPMRegistry)
  })

  it('should initialize successfully', async () => {
    await expect(registry.init()).resolves.not.toThrow()
  })

  it('should have default configuration', () => {
    expect(registry.getCacheStats()).toBeDefined()
  })

  it('should handle rate limiting configuration', () => {
    const registryWithRateLimit = new NPMRegistry({
      rateLimit: {
        requestsPerMinute: 100,
        burstLimit: 10,
      },
    })

    expect(registryWithRateLimit.getRateLimitStatus()).toBeDefined()
  })
})

describe('createRegistry', () => {
  it('should create a registry instance with default config', () => {
    const registry = createRegistry()
    expect(registry).toBeInstanceOf(NPMRegistry)
  })

  it('should create a registry instance with custom config', () => {
    const registry = createRegistry({
      url: 'https://custom-registry.com',
      timeout: 5000,
    })
    expect(registry).toBeInstanceOf(NPMRegistry)
  })
})
