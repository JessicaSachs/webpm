import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EnvironmentManager,
  env,
  detectEnvironment,
  isBrowser,
  isNode,
} from '../index'

describe('EnvironmentManager', () => {
  let manager: EnvironmentManager

  beforeEach(() => {
    manager = new EnvironmentManager()
    // Clear any global state
    vi.clearAllMocks()
  })

  describe('basic functionality', () => {
    it('should get environment variables with defaults', () => {
      const value = manager.get('NON_EXISTENT_VAR', 'default')
      expect(value).toBe('default')
    })

    it('should get numbers with type conversion', () => {
      const value = manager.getNumber('NON_EXISTENT_NUMBER', 42)
      expect(value).toBe(42)
    })

    it('should get booleans with type conversion', () => {
      const value = manager.getBoolean('NON_EXISTENT_BOOLEAN', true)
      expect(value).toBe(true)
    })

    it('should get arrays with type conversion', () => {
      const value = manager.getArray('NON_EXISTENT_ARRAY', ['a', 'b'])
      expect(value).toEqual(['a', 'b'])
    })
  })

  describe('configuration', () => {
    it('should use prefix for variable names', () => {
      const manager = new EnvironmentManager({ prefix: 'TEST_' })
      const value = manager.get('VAR', 'default')
      expect(value).toBe('default')
    })

    it('should use default values from config', () => {
      const manager = new EnvironmentManager({
        defaults: { TEST_VAR: 'from_defaults' },
      })
      const value = manager.get('TEST_VAR')
      expect(value).toBe('from_defaults')
    })

    it('should validate required variables', () => {
      const manager = new EnvironmentManager({
        required: ['REQUIRED_VAR'],
        strict: true,
      })

      expect(() => manager.validate()).toThrow(
        `Required environment variable 'REQUIRED_VAR' is not set`
      )
    })
  })

  describe('environment detection', () => {
    it('should detect development environment', () => {
      const manager = new EnvironmentManager({ environment: 'development' })
      expect(manager.isDevelopment()).toBe(true)
      expect(manager.isProduction()).toBe(false)
      expect(manager.isTest()).toBe(false)
    })

    it('should detect production environment', () => {
      const manager = new EnvironmentManager({ environment: 'production' })
      expect(manager.isDevelopment()).toBe(false)
      expect(manager.isProduction()).toBe(true)
      expect(manager.isTest()).toBe(false)
    })

    it('should detect test environment', () => {
      const manager = new EnvironmentManager({ environment: 'test' })
      expect(manager.isDevelopment()).toBe(false)
      expect(manager.isProduction()).toBe(false)
      expect(manager.isTest()).toBe(true)
    })
  })
})

describe('convenience functions', () => {
  it('should provide default environment manager', () => {
    expect(env).toBeInstanceOf(EnvironmentManager)
  })

  it('should detect environment', () => {
    const environment = detectEnvironment()
    expect([
      'development',
      'test',
      'production',
      'staging',
      undefined,
    ]).toContain(environment)
  })

  it('should detect runtime environment', () => {
    expect(typeof isBrowser()).toBe('boolean')
    expect(typeof isNode()).toBe('boolean')
  })
})
