import type {
  Environment,
  EnvSource,
  BrowserEnvWindow,
  GlobalEnv,
  TestFrameworkGlobals,
} from './types'

/**
 * Universal environment detection utilities
 */

// Type-safe global access
const getGlobal = (): GlobalEnv => {
  if (typeof globalThis !== 'undefined') {
    return globalThis as GlobalEnv
  }
  if (typeof global !== 'undefined') {
    return global as GlobalEnv
  }
  if (typeof window !== 'undefined') {
    return { window: window as BrowserEnvWindow }
  }
  return {}
}

// Type-safe test framework detection
const hasTestFramework = (): boolean => {
  if (typeof globalThis === 'undefined') {
    return false
  }

  // Type-safe access to test framework globals
  const testGlobals = globalThis as TestFrameworkGlobals
  return testGlobals.vitest !== undefined || testGlobals.jest !== undefined
}

/**
 * Detect the current environment from various sources
 */
export const detectEnvironment = (): Environment | undefined => {
  const global = getGlobal()

  // 1. Check Node.js process.env.NODE_ENV
  if (global.process?.env?.NODE_ENV) {
    const env = global.process.env.NODE_ENV as Environment
    if (isValidEnvironment(env)) {
      return env
    }
  }

  // 2. Check custom WEBPM_ENV variable
  if (global.process?.env?.WEBPM_ENV) {
    const env = global.process.env.WEBPM_ENV as Environment
    if (isValidEnvironment(env)) {
      return env
    }
  }

  // 3. Check browser build-time variables
  if (global.window) {
    // Check __WEBPM_ENV__ first (custom)
    if (global.window.__WEBPM_ENV__?.NODE_ENV) {
      const env = global.window.__WEBPM_ENV__.NODE_ENV as Environment
      if (isValidEnvironment(env)) {
        return env
      }
    }

    // Check __ENV__ (common build tool pattern)
    if (global.window.__ENV__?.NODE_ENV) {
      const env = global.window.__ENV__.NODE_ENV as Environment
      if (isValidEnvironment(env)) {
        return env
      }
    }
  }

  return undefined
}

/**
 * Get environment variable from various sources
 */
export const getEnvVar = (
  key: string,
  source?: EnvSource
): { value: string | undefined; source: EnvSource } => {
  const global = getGlobal()

  // Try Node.js process.env first
  if (global.process?.env?.[key]) {
    return {
      value: global.process.env[key],
      source: 'node',
    }
  }

  // Try browser environment variables
  if (global.window) {
    // Check custom __WEBPM_ENV__ first
    if (global.window.__WEBPM_ENV__?.[key]) {
      return {
        value: global.window.__WEBPM_ENV__[key],
        source: 'browser',
      }
    }

    // Check common __ENV__ pattern
    if (global.window.__ENV__?.[key]) {
      return {
        value: global.window.__ENV__[key],
        source: 'browser',
      }
    }
  }

  return {
    value: undefined,
    source: source || 'default',
  }
}

/**
 * Validate if a string is a valid environment name
 */
export const isValidEnvironment = (env: string): env is Environment => {
  return ['development', 'test', 'production', 'staging'].includes(env)
}

/**
 * Get the environment source information
 */
export const getEnvironmentSource = (): EnvSource => {
  const global = getGlobal()

  if (global.process?.env?.NODE_ENV) {
    return 'node'
  }

  if (global.window?.__WEBPM_ENV__ || global.window?.__ENV__) {
    return 'browser'
  }

  return 'default'
}

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Check if we're running in a Node.js environment
 */
export const isNode = (): boolean => {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.versions?.node !== undefined
  )
}

/**
 * Check if we're running in a test environment
 */
export const isTest = (): boolean => {
  const env = detectEnvironment()
  return env === 'test' || hasTestFramework()
}
