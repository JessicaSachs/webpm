# @webpm/environment

Universal environment variable management for TypeScript libraries that work across Node.js and browser environments.

## Features

- **Universal Support**: Works in Node.js, browsers, and build tools
- **Type Safety**: Full TypeScript support with proper types
- **Environment Detection**: Automatic detection of development, test, production environments
- **Validation**: Built-in validation for required variables and type conversion
- **Caching**: Efficient caching of environment variable lookups
- **Prefix Support**: Namespace environment variables with prefixes
- **Fallbacks**: Support for default values and multiple fallback sources

## Installation

```bash
pnpm add @webpm/environment
```

## Basic Usage

```typescript
import { env, getEnvironment, isDevelopment } from '@webpm/environment'

// Get environment variables
const apiUrl = env.get('API_URL', 'https://api.example.com')
const debugMode = env.getBoolean('DEBUG', false)
const port = env.getNumber('PORT', 3000)
const features = env.getArray('FEATURES', ['default'])

// Environment detection
const environment = getEnvironment() // 'development' | 'test' | 'production' | 'staging'
const isDev = isDevelopment()

// Type-safe environment checks
if (env.isProduction()) {
  // Production-specific logic
}
```

## Advanced Configuration

```typescript
import { EnvironmentManager } from '@webpm/environment'

// Create a custom environment manager
const customEnv = new EnvironmentManager({
  prefix: 'MY_APP_',
  strict: true,
  required: ['API_KEY', 'DATABASE_URL'],
  defaults: {
    LOG_LEVEL: 'info',
    TIMEOUT: '5000'
  }
})

// Use the custom manager
const apiKey = customEnv.get('API_KEY') // Looks for MY_APP_API_KEY
const logLevel = customEnv.get('LOG_LEVEL') // Uses default 'info'
```

## Environment Variable Sources

The library checks for environment variables in this order:

1. **Node.js**: `process.env.VARIABLE_NAME`
2. **Browser Build-time**: `window.__WEBPM_ENV__.VARIABLE_NAME`
3. **Browser Common**: `window.__ENV__.VARIABLE_NAME`
4. **Defaults**: Configured default values

## Browser Setup

For browser environments, you need to inject environment variables at build time:

```typescript
// In your build configuration (Vite, Webpack, etc.)
const buildConfig = {
  define: {
    '__WEBPM_ENV__': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      API_URL: JSON.stringify(process.env.API_URL),
      DEBUG: JSON.stringify(process.env.DEBUG)
    }
  }
}
```

## Type Safety

```typescript
import type { Environment, EnvConfig } from '@webpm/environment'

// Environment types
const env: Environment = 'production' // ✅ Valid
const invalid: Environment = 'invalid' // ❌ TypeScript error

// Configuration types
const config: EnvConfig = {
  environment: 'development',
  strict: true,
  required: ['API_KEY'],
  prefix: 'APP_',
  defaults: {
    TIMEOUT: '5000'
  }
}
```

## Best Practices

### 1. Use Prefixes for Namespacing

```typescript
// Good: Prevents conflicts
const webpmEnv = new EnvironmentManager({ prefix: 'WEBPM_' })
const apiEnv = new EnvironmentManager({ prefix: 'API_' })
```

### 2. Validate Required Variables

```typescript
const env = new EnvironmentManager({
  strict: true,
  required: ['DATABASE_URL', 'API_KEY']
})

// This will throw if required variables are missing
env.validate()
```

### 3. Use Type-Safe Getters

```typescript
// Good: Type-safe with fallbacks
const port = env.getNumber('PORT', 3000)
const debug = env.getBoolean('DEBUG', false)

// Avoid: Manual parsing
const port = parseInt(process.env.PORT || '3000', 10) // ❌ Error-prone
```

### 4. Environment-Specific Configuration

```typescript
const env = new EnvironmentManager()

if (env.isDevelopment()) {
  // Development-specific setup
  env.updateConfig({
    defaults: { LOG_LEVEL: 'debug' }
  })
} else if (env.isProduction()) {
  // Production-specific setup
  env.updateConfig({
    defaults: { LOG_LEVEL: 'warn' }
  })
}
```

## API Reference

### EnvironmentManager

#### Constructor

```typescript
new EnvironmentManager(config?: EnvConfig)
```

#### Methods

- `get(key: string, defaultValue?: string): string | undefined`
- `getNumber(key: string, defaultValue?: number): number | undefined`
- `getBoolean(key: string, defaultValue?: boolean): boolean | undefined`
- `getArray(key: string, defaultValue?: string[]): string[] | undefined`
- `getEnvironment(): Environment`
- `isEnvironment(env: Environment): boolean`
- `isDevelopment(): boolean`
- `isProduction(): boolean`
- `isTest(): boolean`
- `updateConfig(config: Partial<EnvConfig>): void`
- `validate(): void`

### Convenience Functions

- `getEnvironment(): Environment`
- `isDevelopment(): boolean`
- `isProduction(): boolean`
- `isTest(): boolean`
- `get(key: string, defaultValue?: string): string | undefined`
- `getNumber(key: string, defaultValue?: number): number | undefined`
- `getBoolean(key: string, defaultValue?: boolean): boolean | undefined`
- `getArray(key: string, defaultValue?: string[]): string[] | undefined`

## Migration Guide

### From Manual Environment Detection

```typescript
// Before
const getEnvironment = () => {
  if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV) {
    return globalThis.process.env.NODE_ENV
  }
  // ... more detection logic
}

// After
import { getEnvironment } from '@webpm/environment'
const environment = getEnvironment()
```

### From Direct process.env Access

```typescript
// Before
const apiUrl = process.env.API_URL || 'https://api.example.com'
const debug = process.env.DEBUG === 'true'

// After
import { env } from '@webpm/environment'
const apiUrl = env.get('API_URL', 'https://api.example.com')
const debug = env.getBoolean('DEBUG', false)
```
