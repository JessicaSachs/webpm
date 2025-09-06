# WebPM Project Rules

This directory contains project-specific rules and guidelines for the WebPM browser-first package manager project.

## Quick Reference

- **Package Manager**: Use pnpm for all operations
- **Build System**: Turborepo + Bunchee + Vite
- **Testing**: Vitest (not Jest)
- **Frontend**: Vue 3 with Composition API
- **Target**: Browser-first, no Node.js APIs
- **Architecture**: Monorepo with `@webpm/*` packages

## Core Principles

- Browser-first development with no Node.js APIs
- Memory efficiency with streaming operations
- Network resilience with retry mechanisms
- Use proven pnpm packages as dependencies
- Implement browser adapters for Node.js functionality

## Project Structure

- `apps/*` - Applications (playground, demos)
- `packages/*` - Shared packages
- `@webpm/core` - Foundation classes and types
- `@webpm/registry` - NPM registry communication
- `@webpm/resolver` - Dependency resolution
- `@webpm/store` - Virtual filesystem
- `@webpm/webpm` - Main public API

See individual rule files for detailed guidelines by category.
