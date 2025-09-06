/**
 * Example: Environment Variable Management Pattern for Monorepos
 *
 * This example demonstrates how to use @webpm/environment across
 * different packages in a monorepo with proper configuration and
 * type safety.
 */

import { EnvironmentManager, env, type Environment } from '../src/index'

// ============================================================================
// 1. SHARED ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Shared environment configuration that can be used across packages
 */
export const createSharedEnvConfig = () => ({
  // Common environment variables
  prefix: 'WEBPM_',
  strict: false, // Set to true in production
  defaults: {
    // Logging
    LOG_LEVEL: '3',
    LOG_FORMAT: 'pretty',

    // Network
    TIMEOUT: '30000',
    RETRIES: '3',
    CONCURRENCY: '5',

    // Registry
    REGISTRY: 'https://registry.npmjs.org',

    // Cache
    CACHE: 'true',
    CACHE_TTL: '3600000', // 1 hour
  },
  required: [
    // Add required variables here
    // 'API_KEY',
    // 'DATABASE_URL'
  ],
})

// ============================================================================
// 2. PACKAGE-SPECIFIC CONFIGURATIONS
// ============================================================================

/**
 * Logger package environment configuration
 */
export const createLoggerEnv = () => {
  const manager = new EnvironmentManager({
    ...createSharedEnvConfig(),
    defaults: {
      ...createSharedEnvConfig().defaults,
      // Logger-specific defaults
      LOG_LEVEL: '3', // info level
      LOG_FORMAT: 'pretty',
      LOG_COLOR: 'true',
    },
  })

  return manager
}

/**
 * WebPM package environment configuration
 */
export const createWebpmEnv = () => {
  const manager = new EnvironmentManager({
    ...createSharedEnvConfig(),
    defaults: {
      ...createSharedEnvConfig().defaults,
      // WebPM-specific defaults
      REGISTRY: 'https://registry.npmjs.org',
      CACHE: 'true',
      CONCURRENCY: '5',
      RETRIES: '3',
      TIMEOUT: '30000',
    },
  })

  return manager
}

/**
 * Registry package environment configuration
 */
export const createRegistryEnv = () => {
  const manager = new EnvironmentManager({
    ...createSharedEnvConfig(),
    defaults: {
      ...createSharedEnvConfig().defaults,
      // Registry-specific defaults
      REGISTRY_TIMEOUT: '10000',
      REGISTRY_RETRIES: '3',
      REGISTRY_CACHE_TTL: '300000', // 5 minutes
    },
  })

  return manager
}

// ============================================================================
// 3. TYPE-SAFE CONFIGURATION INTERFACES
// ============================================================================

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: number
  format: 'pretty' | 'json'
  color: boolean
  environment: Environment
}

/**
 * WebPM configuration interface
 */
export interface WebpmConfig {
  registry: string
  cache: boolean
  concurrency: number
  retries: number
  timeout: number
  environment: Environment
}

/**
 * Registry configuration interface
 */
export interface RegistryConfig {
  timeout: number
  retries: number
  cacheTtl: number
  environment: Environment
}

// ============================================================================
// 4. CONFIGURATION BUILDERS
// ============================================================================

/**
 * Build logger configuration from environment
 */
export const buildLoggerConfig = (): LoggerConfig => {
  const env = createLoggerEnv()

  return {
    level: env.getNumber('LOG_LEVEL', 3),
    format: env.get('LOG_FORMAT', 'pretty') as 'pretty' | 'json',
    color: env.getBoolean('LOG_COLOR', true),
    environment: env.getEnvironment(),
  }
}

/**
 * Build WebPM configuration from environment
 */
export const buildWebpmConfig = (): WebpmConfig => {
  const env = createWebpmEnv()

  return {
    registry: env.get('REGISTRY', 'https://registry.npmjs.org'),
    cache: env.getBoolean('CACHE', true),
    concurrency: env.getNumber('CONCURRENCY', 5),
    retries: env.getNumber('RETRIES', 3),
    timeout: env.getNumber('TIMEOUT', 30000),
    environment: env.getEnvironment(),
  }
}

/**
 * Build registry configuration from environment
 */
export const buildRegistryConfig = (): RegistryConfig => {
  const env = createRegistryEnv()

  return {
    timeout: env.getNumber('REGISTRY_TIMEOUT', 10000),
    retries: env.getNumber('REGISTRY_RETRIES', 3),
    cacheTtl: env.getNumber('REGISTRY_CACHE_TTL', 300000),
    environment: env.getEnvironment(),
  }
}

// ============================================================================
// 5. ENVIRONMENT-SPECIFIC OVERRIDES
// ============================================================================

/**
 * Apply environment-specific configuration overrides
 */
export const applyEnvironmentOverrides = (
  manager: EnvironmentManager
): void => {
  const environment = manager.getEnvironment()

  switch (environment) {
    case 'development':
      manager.updateConfig({
        defaults: {
          LOG_LEVEL: '4', // debug level
          LOG_COLOR: 'true',
          CACHE: 'false', // Disable cache in development
        },
      })
      break

    case 'test':
      manager.updateConfig({
        defaults: {
          LOG_LEVEL: '1', // error only
          LOG_COLOR: 'false',
          CACHE: 'false',
          TIMEOUT: '5000', // Shorter timeout for tests
        },
      })
      break

    case 'production':
      manager.updateConfig({
        defaults: {
          LOG_LEVEL: '2', // warn and error only
          LOG_COLOR: 'false',
          CACHE: 'true',
          TIMEOUT: '60000', // Longer timeout for production
        },
        strict: true, // Enable strict mode in production
      })
      break

    case 'staging':
      manager.updateConfig({
        defaults: {
          LOG_LEVEL: '3', // info level
          LOG_COLOR: 'false',
          CACHE: 'true',
        },
      })
      break
  }
}

// ============================================================================
// 6. USAGE EXAMPLES
// ============================================================================

/**
 * Example: Logger package usage
 */
export const exampleLoggerUsage = () => {
  const loggerEnv = createLoggerEnv()
  applyEnvironmentOverrides(loggerEnv)

  const config = buildLoggerConfig()

  console.log('Logger Configuration:', {
    level: config.level,
    format: config.format,
    color: config.color,
    environment: config.environment,
  })

  // Use the configuration
  if (config.environment === 'development') {
    console.log('Development mode: Enhanced logging enabled')
  }
}

/**
 * Example: WebPM package usage
 */
export const exampleWebpmUsage = () => {
  const webpmEnv = createWebpmEnv()
  applyEnvironmentOverrides(webpmEnv)

  const config = buildWebpmConfig()

  console.log('WebPM Configuration:', {
    registry: config.registry,
    cache: config.cache,
    concurrency: config.concurrency,
    retries: config.retries,
    timeout: config.timeout,
    environment: config.environment,
  })

  // Use the configuration
  if (config.environment === 'production') {
    console.log('Production mode: Using optimized settings')
  }
}

/**
 * Example: Registry package usage
 */
export const exampleRegistryUsage = () => {
  const registryEnv = createRegistryEnv()
  applyEnvironmentOverrides(registryEnv)

  const config = buildRegistryConfig()

  console.log('Registry Configuration:', {
    timeout: config.timeout,
    retries: config.retries,
    cacheTtl: config.cacheTtl,
    environment: config.environment,
  })

  // Use the configuration
  if (config.environment === 'test') {
    console.log('Test mode: Using fast, non-cached settings')
  }
}

// ============================================================================
// 7. VALIDATION AND ERROR HANDLING
// ============================================================================

/**
 * Validate all package configurations
 */
export const validateAllConfigurations = (): void => {
  try {
    const loggerEnv = createLoggerEnv()
    const webpmEnv = createWebpmEnv()
    const registryEnv = createRegistryEnv()

    // Apply environment overrides
    applyEnvironmentOverrides(loggerEnv)
    applyEnvironmentOverrides(webpmEnv)
    applyEnvironmentOverrides(registryEnv)

    // Validate configurations
    loggerEnv.validate()
    webpmEnv.validate()
    registryEnv.validate()

    console.log('✅ All configurations are valid')
  } catch (error) {
    console.error('❌ Configuration validation failed:', error)
    throw error
  }
}

// ============================================================================
// 8. EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the default environment manager for quick access
 */
export const getDefaultEnv = () => env

/**
 * Create a new environment manager with shared defaults
 */
export const createEnv = (
  overrides?: Partial<ReturnType<typeof createSharedEnvConfig>>
) => {
  return new EnvironmentManager({
    ...createSharedEnvConfig(),
    ...overrides,
  })
}

// Export all the builders for easy access
export {
  buildLoggerConfig,
  buildWebpmConfig,
  buildRegistryConfig,
  applyEnvironmentOverrides,
  validateAllConfigurations,
}
