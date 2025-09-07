import type { RawSpecifier } from '@webpm/types'
import parseNpmTarballUrl from 'parse-npm-tarball-url'
import getVersionSelectorType from 'version-selector-type'
export interface NormalizeSpecifierOptions {
  registry: string
  defaultTag: string
  alias: string
  rawSpecifier: RawSpecifier
}

export type RegistryPackageSpecifierType = 'tag' | 'version' | 'range'
export interface RegistryPackageSpecifier {
  type: RegistryPackageSpecifierType
  name: string
  fetchSpec: string
  normalizedBareSpecifier?: string // Tarball URL
}

export function normalizeSpecifier({
  registry,
  defaultTag,
  alias,
  rawSpecifier,
}: NormalizeSpecifierOptions) {
  return rawSpecifier
    ? parseBareSpecifier(rawSpecifier, alias, defaultTag, registry)
    : defaultTagForAlias(alias, defaultTag)
}

export function defaultTagForAlias(
  alias: string,
  defaultTag: string
): RegistryPackageSpecifier {
  return {
    fetchSpec: defaultTag,
    name: alias,
    type: 'tag',
  }
}

export function parseBareSpecifier(
  bareSpecifier: string,
  alias: string | undefined,
  defaultTag: string,
  registry: string
): RegistryPackageSpecifier | null {
  let name = alias
  if (bareSpecifier.startsWith('npm:')) {
    bareSpecifier = bareSpecifier.slice(4)
    const index = bareSpecifier.lastIndexOf('@')
    if (index < 1) {
      name = bareSpecifier
      bareSpecifier = defaultTag
    } else {
      name = bareSpecifier.slice(0, index)
      bareSpecifier = bareSpecifier.slice(index + 1)
    }
  }
  if (name) {
    const selector = getVersionSelectorType(bareSpecifier)
    if (selector != null) {
      return {
        fetchSpec: selector.normalized,
        name,
        type: selector.type,
      } satisfies RegistryPackageSpecifier
    }
  }
  if (bareSpecifier.startsWith(registry)) {
    const pkg = parseNpmTarballUrl(bareSpecifier)
    if (pkg != null) {
      return {
        fetchSpec: pkg.version,
        name: pkg.name,
        normalizedBareSpecifier: bareSpecifier,
        type: 'version',
      } satisfies RegistryPackageSpecifier
    }
  }
  return null
}
