# Browser-First Development

## Constraints
- **No Node.js APIs** - Use browser-compatible alternatives only
- **Memory Efficiency** - Implement streaming for large operations
- **Network Resilience** - Always include retry mechanisms with exponential backoff
- **CORS Handling** - Design for npm registry CORS limitations

## Storage Strategy
- IndexedDB for persistent caching (metadata, tarballs)
- Memory storage for virtual filesystem
- Implement storage abstraction for testing with in-memory backends

## Performance Requirements
- Parallel downloads with concurrency limits
- Streaming tarball processing
- Lazy loading of package contents
- Cache-first strategies with TTL

## Browser Compatibility

### Target Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Polyfills
- Use core-js for missing features
- Polyfill IndexedDB in older browsers
- Provide WebAssembly fallbacks if needed

## Bundle Size
- Keep browser bundle under 100KB gzipped
- Use tree-shaking friendly exports
- Lazy load non-critical functionality
- Provide ESM and CommonJS builds
