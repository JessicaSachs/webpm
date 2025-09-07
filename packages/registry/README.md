# @webpm/registry

NPM registry API communication for browser environments.

## Features

- **Browser-compatible**: Works in both Node.js and browser environments
- **Caching**: In-memory cache for Node.js, IndexedDB for browsers
- **Retry logic**: Exponential backoff with jitter
- **Rate limiting**: Configurable request rate limiting
- **Authentication**: Support for private registries with tokens
- **TypeScript**: Full TypeScript support with comprehensive types

## Installation

```bash
pnpm add @webpm/registry
```

## Usage

### Basic Usage

```typescript
import { createRegistry } from '@webpm/registry'

// Create a registry instance
const registry = createRegistry()

// Initialize the registry
await registry.init()

// Get package metadata
const metadata = await registry.getPackageMetadata('react', '18.2.0')

// Get all versions of a package
const versions = await registry.getPackageVersions('react')

// Search for packages
const searchResults = await registry.searchPackages('react')
```

### Advanced Configuration

```typescript
import { NPMRegistry } from '@webpm/registry'

const registry = new NPMRegistry({
  url: 'https://registry.npmjs.org',
  token: 'your-auth-token', // For private registries
  timeout: 30000,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10
  }
})

await registry.init()
```

### Custom Registry

```typescript
import { NPMRegistry } from '@webpm/registry'

const customRegistry = new NPMRegistry({
  url: 'https://your-private-registry.com',
  token: 'your-token',
  timeout: 10000
})

await customRegistry.init()
```

## API Reference

### RegistryConfig

```typescript
interface RegistryConfig {
  url: string
  token?: string
  timeout?: number
  cacheTtl?: number
  maxRetries?: number
  rateLimit?: {
    requestsPerMinute: number
    burstLimit?: number
  }
}
```

### Methods

#### `getPackageMetadata(name: string, version: string): Promise<PackageMetadata>`

Get metadata for a specific package version.

#### `getPackageVersions(name: string): Promise<PackageVersions>`

Get all available versions for a package.

#### `searchPackages(query: string, options?: { limit?: number; offset?: number }): Promise<SearchResults>`

Search for packages in the registry.

#### `downloadTarball(url: string): Promise<ArrayBuffer>`

Download a package tarball.

#### `getLatestVersion(name: string): Promise<PackageMetadata>`

Get the latest version of a package.

#### `packageExists(name: string): Promise<boolean>`

Check if a package exists in the registry.

## Error Handling

The registry throws specific error types for different scenarios:

```typescript
import { 
  RegistryError, 
  NetworkError, 
  TimeoutError, 
  RateLimitError,
  AuthenticationError,
  NotFoundError 
} from '@webpm/registry'

try {
  const metadata = await registry.getPackageMetadata('nonexistent', '1.0.0')
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Package not found')
  } else if (error instanceof NetworkError) {
    console.log('Network error occurred')
  }
}
```

## Caching

The registry automatically caches responses to improve performance:

```typescript
// Cache statistics
const stats = registry.getCacheStats()
console.log(`Cache size: ${stats.size}`)

// Clear cache
await registry.clearCache()
```

## Rate Limiting

Monitor and manage rate limiting:

```typescript
// Check rate limit status
const status = registry.getRateLimitStatus()
console.log(`Requests remaining: ${status.requestsRemaining}`)
```

## Browser Compatibility

The registry automatically detects the environment and uses appropriate storage:

- **Node.js**: Uses in-memory cache
- **Browser**: Uses IndexedDB for persistent caching

## License

MIT
