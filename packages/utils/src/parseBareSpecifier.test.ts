import { describe, it, expect } from 'vitest'
import {
  parseBareSpecifier,
  normalizeSpecifier,
  defaultTagForAlias,
} from './parseBareSpecifier'

describe('normalizeSpecifier', () => {
  const defaultTag = 'latest'
  const registry = 'https://registry.npmjs.org/'

  it('should parse raw specifier with alias', () => {
    const result = normalizeSpecifier({
      registry,
      defaultTag,
      alias: 'react',
      rawSpecifier: '^18.0.0',
    })

    expect(result).toEqual({
      type: 'range',
      name: 'react',
      fetchSpec: '>=18.0.0 <19.0.0-0',
    })
  })

  it('should parse npm: prefixed specifier', () => {
    const result = normalizeSpecifier({
      registry,
      defaultTag,
      alias: 'my-alias',
      rawSpecifier: 'npm:react@^18.0.0',
    })

    expect(result).toEqual({
      type: 'range',
      name: 'react',
      fetchSpec: '>=18.0.0 <19.0.0-0',
    })
  })

  it('should return default tag for alias when no raw specifier', () => {
    const result = normalizeSpecifier({
      registry,
      defaultTag,
      alias: 'react',
      rawSpecifier: '',
    })

    expect(result).toEqual({
      type: 'tag',
      name: 'react',
      fetchSpec: 'latest',
    })
  })

  it('should handle empty raw specifier', () => {
    const result = normalizeSpecifier({
      registry,
      defaultTag,
      alias: 'test-package',
      rawSpecifier: '',
    })

    expect(result).toEqual({
      type: 'tag',
      name: 'test-package',
      fetchSpec: 'latest',
    })
  })

  it('should handle custom default tag', () => {
    const customTag = 'beta'
    const result = normalizeSpecifier({
      registry,
      defaultTag: customTag,
      alias: 'react',
      rawSpecifier: '',
    })

    expect(result).toEqual({
      type: 'tag',
      name: 'react',
      fetchSpec: 'beta',
    })
  })

  it('should handle scoped package alias', () => {
    const result = normalizeSpecifier({
      registry,
      defaultTag,
      alias: '@types/node',
      rawSpecifier: '^20.0.0',
    })

    expect(result).toEqual({
      type: 'range',
      name: '@types/node',
      fetchSpec: '>=20.0.0 <21.0.0-0',
    })
  })
})

describe('defaultTagForAlias', () => {
  it('should return tag type with default tag for alias', () => {
    const result = defaultTagForAlias('react', 'latest')

    expect(result).toEqual({
      type: 'tag',
      name: 'react',
      fetchSpec: 'latest',
    })
  })

  it('should handle custom default tag', () => {
    const result = defaultTagForAlias('react', 'beta')

    expect(result).toEqual({
      type: 'tag',
      name: 'react',
      fetchSpec: 'beta',
    })
  })

  it('should handle scoped package alias', () => {
    const result = defaultTagForAlias('@types/node', 'latest')

    expect(result).toEqual({
      type: 'tag',
      name: '@types/node',
      fetchSpec: 'latest',
    })
  })

  it('should handle empty alias', () => {
    const result = defaultTagForAlias('', 'latest')

    expect(result).toEqual({
      type: 'tag',
      name: '',
      fetchSpec: 'latest',
    })
  })
})

describe('parseBareSpecifier', () => {
  const defaultTag = 'latest'
  const registry = 'https://registry.npmjs.org/'

  describe('npm: prefix handling', () => {
    it('should parse npm: prefixed specifier with version', () => {
      const result = parseBareSpecifier(
        'npm:react@^18.0.0',
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: 'react',
        fetchSpec: '>=18.0.0 <19.0.0-0',
      })
    })

    it('should parse npm: prefixed specifier with exact version', () => {
      const result = parseBareSpecifier(
        'npm:lodash@4.17.21',
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'version',
        name: 'lodash',
        fetchSpec: '4.17.21',
      })
    })

    it('should parse npm: prefixed specifier with tag', () => {
      const result = parseBareSpecifier(
        'npm:react@beta',
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'react',
        fetchSpec: 'beta',
      })
    })

    it('should parse npm: prefixed specifier without version (uses default tag)', () => {
      const result = parseBareSpecifier(
        'npm:react',
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'react',
        fetchSpec: 'latest',
      })
    })

    it('should handle npm: prefixed specifier with @ at start (invalid)', () => {
      const result = parseBareSpecifier(
        'npm:@react',
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: '@react',
        fetchSpec: 'latest',
      })
    })

    it('should handle npm: prefixed specifier with scoped package', () => {
      const result = parseBareSpecifier(
        'npm:@types/node@^20.0.0',
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: '@types/node',
        fetchSpec: '>=20.0.0 <21.0.0-0',
      })
    })
  })

  describe('alias handling', () => {
    it('should use alias when provided', () => {
      const result = parseBareSpecifier(
        '^18.0.0',
        'react',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: 'react',
        fetchSpec: '>=18.0.0 <19.0.0-0',
      })
    })

    it('should use alias with npm: prefix', () => {
      const result = parseBareSpecifier(
        'npm:^18.0.0',
        'react',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: '^18.0.0',
        fetchSpec: 'latest',
      })
    })

    it('should handle alias with scoped package', () => {
      const result = parseBareSpecifier(
        '^20.0.0',
        '@types/node',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: '@types/node',
        fetchSpec: '>=20.0.0 <21.0.0-0',
      })
    })
  })

  describe('version selector types', () => {
    it('should detect exact version', () => {
      const result = parseBareSpecifier(
        '1.2.3',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'version',
        name: 'test-package',
        fetchSpec: '1.2.3',
      })
    })

    it('should detect caret range', () => {
      const result = parseBareSpecifier(
        '^1.2.3',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: 'test-package',
        fetchSpec: '>=1.2.3 <2.0.0-0',
      })
    })

    it('should detect tilde range', () => {
      const result = parseBareSpecifier(
        '~1.2.3',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: 'test-package',
        fetchSpec: '>=1.2.3 <1.3.0-0',
      })
    })

    it('should detect tag', () => {
      const result = parseBareSpecifier(
        'latest',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'test-package',
        fetchSpec: 'latest',
      })
    })

    it('should detect beta tag', () => {
      const result = parseBareSpecifier(
        'beta',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'test-package',
        fetchSpec: 'beta',
      })
    })

    it('should detect alpha tag', () => {
      const result = parseBareSpecifier(
        'alpha',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'test-package',
        fetchSpec: 'alpha',
      })
    })

    it('should detect next tag', () => {
      const result = parseBareSpecifier(
        'next',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'test-package',
        fetchSpec: 'next',
      })
    })
  })

  describe('registry URL handling', () => {
    it('should parse registry tarball URL', () => {
      const tarballUrl = 'https://registry.npmjs.org/react/-/react-18.2.0.tgz'
      const result = parseBareSpecifier(
        tarballUrl,
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'version',
        name: 'react',
        fetchSpec: '18.2.0',
        normalizedBareSpecifier: tarballUrl,
      })
    })

    it('should parse scoped package tarball URL', () => {
      const tarballUrl =
        'https://registry.npmjs.org/@types/node/-/node-20.10.0.tgz'
      const result = parseBareSpecifier(
        tarballUrl,
        undefined,
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'version',
        name: '@types/node',
        fetchSpec: '20.10.0',
        normalizedBareSpecifier: tarballUrl,
      })
    })

    it('should handle non-registry URL (returns null)', () => {
      const nonRegistryUrl = 'https://github.com/user/repo/archive/main.tar.gz'
      const result = parseBareSpecifier(
        nonRegistryUrl,
        undefined,
        defaultTag,
        registry
      )

      expect(result).toBeNull()
    })

    it('should handle invalid tarball URL', () => {
      const invalidUrl = 'https://registry.npmjs.org/invalid-url'
      const result = parseBareSpecifier(
        invalidUrl,
        undefined,
        defaultTag,
        registry
      )

      expect(result).toBeNull()
    })
  })

  describe('edge cases and error conditions', () => {
    it('should return null when no name is provided and no npm: prefix', () => {
      const result = parseBareSpecifier(
        '^1.0.0',
        undefined,
        defaultTag,
        registry
      )
      expect(result).toBeNull()
    })

    it('should return range type for empty string with name', () => {
      const result = parseBareSpecifier(
        '',
        'test-package',
        defaultTag,
        registry
      )
      expect(result).toEqual({
        type: 'range',
        name: 'test-package',
        fetchSpec: '*',
      })
    })

    it('should return tag type for invalid version with name', () => {
      const result = parseBareSpecifier(
        'invalid-version',
        'test-package',
        defaultTag,
        registry
      )
      expect(result).toEqual({
        type: 'tag',
        name: 'test-package',
        fetchSpec: 'invalid-version',
      })
    })

    it('should handle npm: with empty specifier', () => {
      const result = parseBareSpecifier('npm:', undefined, defaultTag, registry)
      expect(result).toBeNull()
    })

    it('should handle npm: with only @ symbol', () => {
      const result = parseBareSpecifier(
        'npm:@',
        undefined,
        defaultTag,
        registry
      )
      expect(result).toEqual({
        type: 'tag',
        name: '@',
        fetchSpec: 'latest',
      })
    })

    it('should handle npm: with @ at the end', () => {
      const result = parseBareSpecifier(
        'npm:react@',
        undefined,
        defaultTag,
        registry
      )
      expect(result).toEqual({
        type: 'range',
        name: 'react',
        fetchSpec: '*',
      })
    })

    it('should handle custom default tag', () => {
      const customTag = 'beta'
      const result = parseBareSpecifier(
        'npm:react',
        undefined,
        customTag,
        registry
      )

      expect(result).toEqual({
        type: 'tag',
        name: 'react',
        fetchSpec: 'beta',
      })
    })

    it('should handle different registry URLs', () => {
      const customRegistry = 'https://custom-registry.com/'
      const tarballUrl = 'https://custom-registry.com/react/-/react-18.2.0.tgz'
      const result = parseBareSpecifier(
        tarballUrl,
        undefined,
        defaultTag,
        customRegistry
      )

      expect(result).toEqual({
        type: 'version',
        name: 'react',
        fetchSpec: '18.2.0',
        normalizedBareSpecifier: tarballUrl,
      })
    })

    it('should handle complex version ranges', () => {
      const result = parseBareSpecifier(
        '>=1.0.0 <2.0.0',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'range',
        name: 'test-package',
        fetchSpec: '>=1.0.0 <2.0.0',
      })
    })

    it('should handle pre-release versions', () => {
      const result = parseBareSpecifier(
        '1.0.0-beta.1',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'version',
        name: 'test-package',
        fetchSpec: '1.0.0-beta.1',
      })
    })

    it('should handle build metadata versions (strips build metadata)', () => {
      const result = parseBareSpecifier(
        '1.0.0+build.1',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toEqual({
        type: 'version',
        name: 'test-package',
        fetchSpec: '1.0.0',
      })
    })
  })

  describe('return type validation', () => {
    it('should return RegistryPackageSpec with all required fields for version type', () => {
      const result = parseBareSpecifier(
        '1.2.3',
        'test-package',
        defaultTag,
        registry
      )

      expect(result).toHaveProperty('type', 'version')
      expect(result).toHaveProperty('name', 'test-package')
      expect(result).toHaveProperty('fetchSpec', '1.2.3')
      expect(result).not.toHaveProperty('normalizedBareSpecifier')
    })

    it('should return RegistryPackageSpec with normalizedBareSpecifier for tarball URLs', () => {
      const tarballUrl = 'https://registry.npmjs.org/react/-/react-18.2.0.tgz'
      const result = parseBareSpecifier(
        tarballUrl,
        undefined,
        defaultTag,
        registry
      )

      expect(result).toHaveProperty('type', 'version')
      expect(result).toHaveProperty('name', 'react')
      expect(result).toHaveProperty('fetchSpec', '18.2.0')
      expect(result).toHaveProperty('normalizedBareSpecifier', tarballUrl)
    })
  })
})
