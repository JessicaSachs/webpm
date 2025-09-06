# Tooling & Build System

## Package Manager
- **Use pnpm** for all package management operations
- **Version Management**: Use `mise.toml` for tool versions (Node.js, pnpm)
- **Workspace**: Configured via `pnpm-workspace.yaml` with `apps/*` and `packages/*`
- **Catalog**: Use pnpm catalog for shared dependency versions

## Build System
- **Turborepo**: Primary build orchestration with `turbo.json` configuration
- **Bunchee**: For library bundling (ESM + CJS outputs)
- **Vite**: For application development and preview apps
- **TypeScript**: Strict configuration with composite builds

## Testing Framework
- **Vitest**: Primary testing framework (not Jest)
- **Coverage**: Use `@vitest/coverage-v8` provider
- **UI**: Use `@vitest/ui` for test visualization
- **Environments**: 
  - `node` for server-side packages
  - `happy-dom` for browser/UI packages
- **Projects**: Multi-project configuration in root `vitest.config.ts`

## Linting & Formatting
- **ESLint**: Flat config with TypeScript support
- **Prettier**: Code formatting with shared configuration
- **Turbo Plugin**: ESLint plugin for Turborepo-specific rules
- **Only Warn**: Convert errors to warnings for better DX
