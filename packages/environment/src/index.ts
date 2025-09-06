/**
 * @webpm/environment - Universal environment variable management
 *
 * A TypeScript library for managing environment variables across
 * Node.js and browser environments with type safety and validation.
 */

// Export types
export type {
  Environment,
  EnvSource,
  EnvConfig,
  EnvVarInfo,
  BrowserEnvWindow,
  NodeEnvProcess,
  GlobalEnv,
} from './types'

// Export detector utilities
export {
  detectEnvironment,
  getEnvVar,
  isValidEnvironment,
  getEnvironmentSource,
  isBrowser,
  isNode,
} from './detector'

// Export main manager class
export { EnvironmentManager } from './manager'

// Create and export default instance
import { EnvironmentManager } from './manager'

/**
 * Default environment manager instance
 * Configure this instance for your application's needs
 */
export const env = new EnvironmentManager()

// Convenience functions using the default instance
export const getEnvironment = () => env.getEnvironment()
export const isDevelopment = () => env.isDevelopment()
export const isProduction = () => env.isProduction()
export const isTest = () => env.isTest()
export const get = (key: string, defaultValue?: string) =>
  env.get(key, defaultValue)
export const getNumber = (key: string, defaultValue?: number) =>
  env.getNumber(key, defaultValue)
export const getBoolean = (key: string, defaultValue?: boolean) =>
  env.getBoolean(key, defaultValue)
export const getArray = (key: string, defaultValue?: string[]) =>
  env.getArray(key, defaultValue)
