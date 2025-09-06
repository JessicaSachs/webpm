# Testing Standards

## Unit Tests
- Test files: `*.test.ts` or in `__tests__/` directory
- Use **Vitest** (not Jest) as the testing framework
- Mock external dependencies and I/O
- Achieve >90% code coverage for core logic
- Use property-based testing for complex algorithms
- Configure per-project in `vitest.config.ts` with appropriate environments

## Integration Tests
- Test cross-package interactions
- Use real npm packages in test fixtures
- Test browser compatibility with headless browsers
- Performance benchmarks for key operations

## Test Data
- Create realistic package fixtures in `tests/fixtures/`
- Mock npm registry responses
- Test edge cases (missing packages, malformed data, network errors)

## Testing Framework
- **Vitest**: Primary testing framework (not Jest)
- **Coverage**: Use `@vitest/coverage-v8` provider
- **UI**: Use `@vitest/ui` for test visualization
- **Environments**: 
  - `node` for server-side packages
  - `happy-dom` for browser/UI packages
- **Projects**: Multi-project configuration in root `vitest.config.ts`
