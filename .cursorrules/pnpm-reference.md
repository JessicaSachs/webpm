# PNPM Ecosystem Reference

This document outlines the key PNPM packages and utilities that are useful for building a browser-side package manager (resolver + fetcher + lockfile + manifest + workspace graph).

## Spec Parsing & Resolution

- **@pnpm/default-resolver** – PNPM's umbrella resolver (drives npm/git/tarball/local specifiers)
- **@pnpm/npm-resolver** – resolves npm-hosted specs (tags, ranges, aliases, etc.)
- **@pnpm/git-resolver** – resolves git-hosted deps
- **@pnpm/tarball-resolver** – resolves direct tarball URLs
- **@pnpm/local-resolver** – resolves `file:`/workspace-local deps
- **@pnpm/types** – shared TS types you'll see across resolver/fetcher/lockfile utils

## Fetching from Registries / Sources

- **@pnpm/default-fetcher** – default fetcher wiring (wraps the specific fetchers)
- **@pnpm/tarball-fetcher** – downloads tarballs (HTTP(S) registry or direct)
- **@pnpm/git-fetcher** – fetches git-hosted deps
- **@pnpm/package-requester** – concurrency-aware downloader for npm-compatible packages (nice building block for "queue + cache" logic)
- **@pnpm/server** – installer server used by PNPM; useful to study how they pipeline resolve→fetch→store

## Lockfile Read/Write/Ops (pnpm-lock.yaml)

- **@pnpm/lockfile.fs** – current read/write layer for lockfiles
- **@pnpm/lockfile.utils** – shared helpers for dealing with lockfile structure
- **@pnpm/lockfile.merger** – merges lockfiles / fixes conflicts
- **@pnpm/lockfile.walker** – iterate deps in a lockfile (great for building graphs)
- **@pnpm/lockfile.filtering** / **@pnpm/lockfile.pruner** – subset/prune a lockfile

## Package.json / Manifest Handling

- **@pnpm/manifest-utils** – small utilities around reading/normalizing package manifests
- PNPM docs on manifests + supported formats (JSON/JSON5/YAML) if you mirror their behavior

## Workspace & Graph Helpers

- **find-packages** – discover packages in a monorepo/workspace
- **pkgs-graph** – turn discovered packages into a dependency graph
- **dependencies-hierarchy** – builds a deps tree for PNPM's symlinked layout
- **@pnpm/dependency-path** – utilities for PNPM's symlinked `node_modules` layout (handy if you emulate/store paths)

## Logging & Misc Plumbing

- **@pnpm/logger** – consistent logger used across PNPM packages
- **@pnpm/outdated** – example of querying registry metadata + comparing semver; good reference for "what version should I pick?"

## Behavior Docs to Mirror (for Spec/Peers Semantics)

- **How peers are resolved** (edge cases you'll hit reproducing PNPM's semantics)
- **.pnpmfile.cjs hooks** – lets PNPM swap fetchers; useful to understand their abstraction boundaries
- **fetch command docs** – shows lockfile-driven, resolution-free fetching (good mental model for your offline layer)

## Minimum Viable Toolkit

For a browser package manager, focus on these core packages:

- **Parse & resolve**: `@pnpm/default-resolver` + `@pnpm/npm-resolver` (+ git/tarball/local as needed)
- **Fetch**: `@pnpm/default-fetcher` + `@pnpm/tarball-fetcher` (and git fetcher if you care)
- **Manifest**: `@pnpm/manifest-utils`
- **Lockfile I/O + ops**: `@pnpm/lockfile.fs` + `@pnpm/lockfile.utils` (add walker if you need traversal)
- **Graph/workspace**: `find-packages` + `pkgs-graph` (optional but nice)

## Implementation Notes

- Create browser adapters for Node.js-specific functionality
- Use IndexedDB for persistent storage instead of filesystem
- Handle CORS and security limitations
- Implement proper error handling for network issues
- Consider creating a "browser fetcher + resolver" spike wired to `@pnpm/*` packages for yanking tarballs from npm and unpacking in-memory
