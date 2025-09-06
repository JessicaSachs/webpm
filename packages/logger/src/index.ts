import { consola, type ConsolaInstance, type LogLevel } from 'consola/browser'
import { env, type Environment } from '@webpm/environment'

// Logger-specific environment configuration
const loggerEnv = env

// Configure logger environment with specific defaults
loggerEnv.updateConfig({
  prefix: 'WEBPM_',
  defaults: {
    LOG_LEVEL: '3', // Default to info level
    LOG_FORMAT: 'pretty',
  },
})

const getLogLevelFromEnv = (): LogLevel | undefined => {
  const logLevel = loggerEnv.getNumber('LOG_LEVEL')
  if (logLevel !== undefined && logLevel >= 0 && logLevel <= 5) {
    return logLevel as LogLevel
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
  const environment = globalConfig.environment || loggerEnv.getEnvironment()

  // Default levels based on environment
  switch (environment) {
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
  environment?: Environment
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
