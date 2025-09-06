import { consola, type ConsolaInstance, type LogLevel } from 'consola/browser'

// Universal environment detection
const getEnvironment = (): string | undefined => {
  // Try to detect environment in a universal way
  if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV) {
    return globalThis.process.env.NODE_ENV
  }
  
  // Check for common environment indicators in browser
  if (typeof window !== 'undefined') {
    // Browser environment - could check for build-time variables
    const windowWithEnv = window as typeof window & { __ENV__?: string }
    return windowWithEnv.__ENV__ || undefined
  }
  
  return undefined
}

const getLogLevelFromEnv = (): LogLevel | undefined => {
  // Try to get LOG_LEVEL in a universal way
  if (typeof globalThis !== 'undefined' && globalThis.process?.env?.LOG_LEVEL) {
    const logLevel = globalThis.process.env.LOG_LEVEL
    const level = parseInt(logLevel, 10)
    if (!isNaN(level) && level >= 0 && level <= 5) {
      return level as LogLevel
    }
  }
  
  // Check for browser environment variables
  if (typeof window !== 'undefined') {
    const windowWithLogLevel = window as typeof window & { __LOG_LEVEL__?: string }
    const logLevel = windowWithLogLevel.__LOG_LEVEL__
    if (logLevel) {
      const level = parseInt(logLevel, 10)
      if (!isNaN(level) && level >= 0 && level <= 5) {
        return level as LogLevel
      }
    }
  }
  
  return undefined
}

// Environment-based log level configuration
const getLogLevel = (): LogLevel => {
  // Check global configuration first
  if (globalConfig.logLevel !== undefined) {
    return globalConfig.logLevel
  }

  // Check environment variables
  const logLevel = getLogLevelFromEnv()
  if (logLevel !== undefined) {
    return logLevel
  }

  // Check global environment configuration
  const env = globalConfig.environment || getEnvironment()

  // Default levels based on environment
  switch (env) {
    case 'production':
      return 2 // Only warn and error
    case 'test':
      return 1 // Only error
    default:
      return 3 // info, warn, error, and success
  }
}

// Global logger configuration
interface GlobalLoggerConfig {
  environment?: string
  logLevel?: LogLevel
}

// Logger configuration interface
interface LoggerConfig {
  tag?: string
  level?: LogLevel
  format?: 'pretty' | 'json'
}

// Global configuration storage
let globalConfig: GlobalLoggerConfig = {}

// Configuration functions
const configureLogger = (config: GlobalLoggerConfig): void => {
  globalConfig = { ...globalConfig, ...config }
}

const getGlobalConfig = (): GlobalLoggerConfig => {
  return { ...globalConfig }
}

// Main Logger class
class Logger {
  private logger: ConsolaInstance
  private readonly tag: string

  constructor(config: LoggerConfig = {}) {
    this.tag = config.tag || 'webpm'
    this.logger = consola.withTag(this.tag)

    // Set log level
    this.logger.level = config.level ?? getLogLevel()

    // Configure format if specified
    if (config.format === 'json') {
      // JSON format configuration would go here if supported
      // For now, we'll use the default formatting
    }
  }

  // Core logging methods
  log(message: string, ...args: unknown[]): void {
    this.logger.log(message, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args)
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      this.logger.error(message, error.message, error.stack, ...args)
    } else if (error) {
      this.logger.error(message, error, ...args)
    } else {
      this.logger.error(message, ...args)
    }
  }

  success(message: string, ...args: unknown[]): void {
    this.logger.success(message, ...args)
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args)
  }

  // Utility methods
  withTag(tag: string): Logger {
    return new Logger({ tag: `${this.tag}:${tag}` })
  }

  withLevel(level: LogLevel): Logger {
    return new Logger({ tag: this.tag, level })
  }

  // Performance timing
  time(label: string): void {
    console.time(`${this.tag}:${label}`)
  }

  timeEnd(label: string): void {
    console.timeEnd(`${this.tag}:${label}`)
  }

  // Create a child logger with additional context
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger({ tag: this.tag })
    childLogger.logger = this.logger.withDefaults({
      additional: Object.entries(context).map(
        ([key, value]) => `${key}=${value}`
      ),
    })
    return childLogger
  }
}

// Default logger instance
export const logger = new Logger()

// Logger factory for creating tagged loggers
export const createLogger = (config: LoggerConfig = {}): Logger => {
  return new Logger(config)
}

// Convenience function for quick logging (backward compatibility)
export const log = (...args: unknown[]): void => {
  logger.log('LOGGER:', ...args)
}

// Export types for consumers
export type { LoggerConfig, GlobalLoggerConfig, LogLevel }
export { Logger, configureLogger, getGlobalConfig }
