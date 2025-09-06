import type { Environment, EnvConfig, EnvVarInfo } from './types'
import { detectEnvironment, getEnvVar } from './detector'

/**
 * Environment variable manager with universal support
 */
export class EnvironmentManager {
  private config: Required<EnvConfig>
  private cache = new Map<string, EnvVarInfo>()

  constructor(config: EnvConfig = {}) {
    this.config = {
      environment: config.environment || detectEnvironment() || 'development',
      strict: config.strict || false,
      defaults: config.defaults || {},
      required: config.required || [],
      prefix: config.prefix || '',
    }
  }

  /**
   * Get an environment variable with type safety and fallbacks
   */
  get(key: string): string | undefined
  get(key: string, defaultValue: string): string
  get(key: string, defaultValue?: string): string | undefined {
    // Check cache first
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!
      return cached.value ?? defaultValue
    }

    // Build the full key with prefix
    const fullKey = this.config.prefix ? `${this.config.prefix}${key}` : key

    // Get the environment variable
    const { value, source } = getEnvVar(fullKey)

    // Check defaults
    const finalValue = value ?? this.config.defaults[key] ?? defaultValue

    // Cache the result
    const info: EnvVarInfo = {
      name: key,
      value: finalValue,
      source,
      required: this.config.required.includes(key),
      originalKey: fullKey,
    }
    this.cache.set(key, info)

    // Validate required variables
    if (
      this.config.strict &&
      this.config.required.includes(key) &&
      !finalValue
    ) {
      throw new Error(`Required environment variable '${key}' is not set`)
    }

    return finalValue
  }

  /**
   * Get an environment variable as a number
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key)
    if (!value) return defaultValue

    const parsed = Number(value)
    if (isNaN(parsed)) {
      throw new Error(
        `Environment variable '${key}' is not a valid number: ${value}`
      )
    }

    return parsed
  }

  /**
   * Get an environment variable as a boolean
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key)
    if (!value) return defaultValue

    const lowerValue = value.toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return true
    }
    if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return false
    }

    throw new Error(
      `Environment variable '${key}' is not a valid boolean: ${value}`
    )
  }

  /**
   * Get an environment variable as an array (comma-separated)
   */
  getArray(key: string, defaultValue: string[] = []): string[] {
    const value = this.get(key)
    if (!value) return defaultValue ?? []

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  /**
   * Get the current environment
   */
  getEnvironment(): Environment {
    return this.config.environment
  }

  /**
   * Check if we're in a specific environment
   */
  isEnvironment(env: Environment): boolean {
    return this.config.environment === env
  }

  /**
   * Check if we're in development
   */
  isDevelopment(): boolean {
    return this.isEnvironment('development')
  }

  /**
   * Check if we're in production
   */
  isProduction(): boolean {
    return this.isEnvironment('production')
  }

  /**
   * Check if we're in test
   */
  isTest(): boolean {
    return this.isEnvironment('test')
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EnvConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      environment: newConfig.environment || this.config.environment,
      strict: newConfig.strict ?? this.config.strict,
      defaults: { ...this.config.defaults, ...newConfig.defaults },
      required: newConfig.required || this.config.required,
      prefix: newConfig.prefix ?? this.config.prefix,
    }

    // Clear cache when config changes
    this.cache.clear()
  }

  /**
   * Get all environment variable information
   */
  getAllVars(): EnvVarInfo[] {
    return Array.from(this.cache.values())
  }

  /**
   * Get configuration
   */
  getConfig(): Required<EnvConfig> {
    return { ...this.config }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Validate all required environment variables
   */
  validate(): void {
    const missing: string[] = []

    for (const key of this.config.required) {
      const value = this.get(key)
      if (!value) {
        missing.push(key)
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      )
    }
  }
}
