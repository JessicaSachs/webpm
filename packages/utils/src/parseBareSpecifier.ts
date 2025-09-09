import type {
  NormalizeSpecifierOptions,
  RegistryPackageSpecifier,
} from '@webpm/types'
import parseNpmTarballUrl from 'parse-npm-tarball-url'
import getVersionSelectorType from 'version-selector-type'

export function toRaw(spec: RegistryPackageSpecifier): string {
  return `${spec.name}@${spec.fetchSpec}`
}

export function normalizeSpecifier({
  registry,
  defaultTag,
  alias,
  bareSpecifier,
}: NormalizeSpecifierOptions) {
  return bareSpecifier
    ? parseBareSpecifier(bareSpecifier, alias, defaultTag, registry)
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
