# Package Architecture

## @webpm/core
- **Purpose**: Shared foundation for all packages
- **Contains**: Base classes, common types, errors, validation, configuration schemas
- **Rules**: 
  - No external dependencies except essential utilities (semver, etc.)
  - All error classes inherit from base `WebPMError`
  - Use branded types for domain concepts
  - Provide validation utilities for all data structures

## @webpm/registry
- **Purpose**: NPM registry API communication
- **Rules**:
  - **Consider adapting `@pnpm/npm-resolver`** for browser fetch API
  - Abstract base registry class for extensibility
  - Implement retry logic with exponential backoff
  - Cache metadata responses with appropriate TTL
  - Handle rate limiting gracefully
  - Support authentication for private registries
  - Use proven npm registry response parsing from pnpm ecosystem

## @webpm/npm-resolver
- **Purpose**: Dependency resolution with semver support
- **Rules**:
  - Implement SAT solver or similar for conflict resolution
  - Handle peer dependencies correctly
  - Support optional dependencies
  - Cache resolution results
  - Detect and break circular dependencies

## @webpm/store
- **Purpose**: Virtual filesystem and package storage
- **Rules**:
  - Implement Node.js fs API compatibility for esbuild
  - Use memory-efficient data structures
  - Support streaming operations
  - Implement proper garbage collection
  - Provide debugging utilities for filesystem inspection

## @webpm/webpm (Main Package)
- **Purpose**: Public API and orchestration
- **Rules**:
  - Provide simple, intuitive public API
  - Handle all cross-package coordination
  - Implement progress reporting for long operations
  - Support configuration and plugin systems
  - Provide comprehensive TypeScript types for consumers

## Development Approach

### Phase 1: Foundation with pnpm Packages
1. **Setup monorepo** with proven pnpm packages as dependencies
2. **Create browser adapters** for Node.js-specific functionality
3. **Implement core resolution** using `@pnpm/default-resolver`
4. **Add basic fetching** with adapted `@pnpm/tarball-fetcher`

### Phase 2: Virtual Filesystem
1. **Build virtual fs** that mimics Node.js fs API
2. **Integrate package extraction** using browser-compatible tar libraries
3. **Implement caching layer** with IndexedDB
4. **Add lockfile support** using adapted pnpm lockfile utilities

### Phase 3: Advanced Features
1. **Add workspace support** using `find-packages` and `pkgs-graph`
2. **Implement peer dependency resolution** following pnpm semantics
3. **Add git and local resolver support**
4. **Optimize performance** with streaming and lazy loading

### Browser Compatibility Strategy
For each pnpm package, create a browser adapter that:
- Replaces Node.js APIs with browser equivalents
- Maintains the same interface and behavior
- Handles CORS and security limitations
- Uses IndexedDB for persistent storage
- Implements proper error handling for network issues
