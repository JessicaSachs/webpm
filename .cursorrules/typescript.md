# TypeScript & Code Standards

## TypeScript
- Use strict TypeScript configuration with `moduleResolution: "Bundler"`
- Prefer explicit return types for public APIs
- Use branded types for domain concepts (PackageId, VersionRange, etc.)
- Implement proper error handling with custom error classes from `@webpm/core`
- Use `as const` assertions for constant objects and arrays
- Enable `allowImportingTsExtensions` for better development experience
- Always use proper types instead of `any` or `Record<string, any>`
- Prefer interfaces over types for object shapes
- Use proper generic constraints

## File Organization
- Use barrel exports (`index.ts`) for clean package interfaces
- Group related functionality in directories
- Keep test files adjacent to source files or in `__tests__/` directories
- Use consistent naming: `kebab-case` for files, `PascalCase` for classes, `camelCase` for functions

## Error Handling
- Create domain-specific error classes in `@webpm/core/errors`
- Use Result/Either pattern for operations that can fail
- Always provide meaningful error messages with context
- Include error codes for programmatic handling

## Async Operations
- Use async/await consistently
- Implement proper cancellation with AbortController
- Use Promise pools for controlled concurrency
- Handle timeouts explicitly

## Configuration
- Use JSON Schema for configuration validation
- Support environment variables and file-based config
- Provide sensible defaults
- Make all timeouts and limits configurable
