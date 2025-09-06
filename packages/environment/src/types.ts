/**
 * Environment variable types and interfaces
 */

// Supported environment names
export type Environment = 'development' | 'test' | 'production' | 'staging'

// Environment variable source types
export type EnvSource = 'node' | 'browser' | 'build-time' | 'default'

// Environment variable configuration
export interface EnvConfig {
  /** The current environment */
  environment?: Environment
  /** Whether to use strict mode (throw on missing required vars) */
  strict?: boolean
  /** Default values for environment variables */
  defaults?: Record<string, string>
  /** Required environment variables */
  required?: string[]
  /** Environment variable prefix (e.g., 'WEBPM_') */
  prefix?: string
}

// Environment variable metadata
export interface EnvVarInfo {
  /** The variable name */
  name: string
  /** The resolved value */
  value: string | undefined
  /** Where the value was sourced from */
  source: EnvSource
  /** Whether the variable is required */
  required: boolean
  /** The original key used to look up the variable */
  originalKey: string
}

// Browser environment extensions
export interface BrowserEnvWindow extends Window {
  __ENV__?: Record<string, string>
  __WEBPM_ENV__?: Record<string, string>
}

// Node.js environment extensions
export interface NodeEnvProcess extends NodeJS.Process {
  env: NodeJS.ProcessEnv & {
    NODE_ENV?: Environment
    WEBPM_ENV?: Environment
  }
}

// Test framework globals
export interface TestFrameworkGlobals {
  vitest?: unknown
  jest?: unknown
}

// Global environment interface
export interface GlobalEnv {
  process?: NodeEnvProcess
  window?: BrowserEnvWindow
}
