//    "id": "registry.npmjs.org/is-positive/1.0.0",
//    "latest": "3.1.0",
//    "package": {
//      "name": "is-positive",
//      "version": "1.0.0",
//      "devDependencies": {
//        "ava": "^0.0.4"
//      },
//      "_hasShrinkwrap": false,
//      "directories": {},
//      "dist": {
//        "shasum": "88009856b64a2f1eb7d8bb0179418424ae0452cb",
//        "tarball": "https://registry.npmjs.org/is-positive/-/is-positive-1.0.0.tgz"
//      },
//      "engines": {
//        "node": ">=0.10.0"
//      }
//    },
//    "resolution": {
//      "integrity": "sha1-iACYVrZKLx632LsBeUGEJK4EUss=",
//      "registry": "https://registry.npmjs.org/",
//      "tarball": "https://registry.npmjs.org/is-positive/-/is-positive-1.0.0.tgz"
//    },
//    "resolvedVia": "npm-registry"
//  }

export type BareSpecifier = string
export type Package = {
  name: string
  version: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
  directories: Record<string, string>
  _hasShrinkwrap: boolean
  dist: {
    shasum: string
    tarball: string
  }
  engines: Record<string, string>
}

// export type Resolution = {
//   integrity: string
//   registry: string
//   tarball: string
// }

export type ResolvedVia = 'npm-registry'

export type PackageResolution = {
  id: string // registry.npmjs.org/is-positive/1.0.0
  latest: BareSpecifier
  package: Package
  resolution: Resolution
  resolvedVia: ResolvedVia
}

/// -------

export interface PrepareExecutionEnvOptions {
  extraBinPaths?: string[]
  executionEnv: ExecutionEnv | undefined
}

export interface PrepareExecutionEnvResult {
  extraBinPaths: string[]
}

export type PrepareExecutionEnv = (
  options: PrepareExecutionEnvOptions
) => Promise<PrepareExecutionEnvResult>

export interface ExecutionEnv {
  nodeVersion?: string
}

export type Dependencies = Record<string, string>

export type PackageBin = string | { [commandName: string]: string }

export type PackageScripts = {
  [name: string]: string
} & {
  prepublish?: string
  prepare?: string
  prepublishOnly?: string
  prepack?: string
  postpack?: string
  publish?: string
  postpublish?: string
  preinstall?: string
  install?: string
  postinstall?: string
  preuninstall?: string
  uninstall?: string
  postuninstall?: string
  preversion?: string
  version?: string
  postversion?: string
  pretest?: string
  test?: string
  posttest?: string
  prestop?: string
  stop?: string
  poststop?: string
  prestart?: string
  start?: string
  poststart?: string
  prerestart?: string
  restart?: string
  postrestart?: string
  preshrinkwrap?: string
  shrinkwrap?: string
  postshrinkwrap?: string
}

export interface PeerDependenciesMeta {
  [dependencyName: string]: {
    optional?: boolean
  }
}

export interface DependenciesMeta {
  [dependencyName: string]: {
    injected?: boolean
    node?: string
    patch?: string
  }
}

export interface DevEngineDependency {
  name: string
  version?: string
  onFail?: 'ignore' | 'warn' | 'error' | 'download'
}

export interface DevEngines {
  os?: DevEngineDependency | DevEngineDependency[]
  cpu?: DevEngineDependency | DevEngineDependency[]
  libc?: DevEngineDependency | DevEngineDependency[]
  runtime?: DevEngineDependency | DevEngineDependency[]
  packageManager?: DevEngineDependency | DevEngineDependency[]
}

export interface PublishConfig extends Record<string, unknown> {
  directory?: string
  linkDirectory?: boolean
  executableFiles?: string[]
  registry?: string
}

type Version = string
type Pattern = string
export interface TypesVersions {
  [version: Version]: {
    [pattern: Pattern]: string[]
  }
}

export interface BaseManifest {
  name?: string
  version?: string
  type?: string
  bin?: PackageBin
  description?: string
  directories?: {
    bin?: string
  }
  files?: string[]
  funding?: string
  dependencies?: Dependencies
  devDependencies?: Dependencies
  optionalDependencies?: Dependencies
  peerDependencies?: Dependencies
  peerDependenciesMeta?: PeerDependenciesMeta
  dependenciesMeta?: DependenciesMeta
  bundleDependencies?: string[] | boolean
  bundledDependencies?: string[] | boolean
  homepage?: string
  repository?: string | { url: string }
  bugs?:
    | string
    | {
        url?: string
        email?: string
      }
  scripts?: PackageScripts
  config?: object
  engines?: {
    node?: string
    npm?: string
    pnpm?: string
  }
  devEngines?: DevEngines
  cpu?: string[]
  os?: string[]
  libc?: string[]
  main?: string
  module?: string
  typings?: string
  types?: string
  publishConfig?: PublishConfig
  typesVersions?: TypesVersions
  readme?: string
  keywords?: string[]
  author?: string
  license?: string
  exports?: Record<string, string>
  imports?: Record<string, unknown>
}

export interface DependencyManifest extends BaseManifest {
  name: string
  version: string
}

export type PackageExtension = Pick<
  BaseManifest,
  | 'dependencies'
  | 'optionalDependencies'
  | 'peerDependencies'
  | 'peerDependenciesMeta'
>

export interface PeerDependencyRules {
  ignoreMissing?: string[]
  allowAny?: string[]
  allowedVersions?: Record<string, string>
}

export type AllowedDeprecatedVersions = Record<string, string>

export type ConfigDependencies = Record<string, string>

export interface AuditConfig {
  ignoreCves?: string[]
  ignoreGhsas?: string[]
}

export interface PnpmSettings {
  configDependencies?: ConfigDependencies
  neverBuiltDependencies?: string[]
  onlyBuiltDependencies?: string[]
  onlyBuiltDependenciesFile?: string
  ignoredBuiltDependencies?: string[]
  overrides?: Record<string, string>
  packageExtensions?: Record<string, PackageExtension>
  ignoredOptionalDependencies?: string[]
  peerDependencyRules?: PeerDependencyRules
  allowedDeprecatedVersions?: AllowedDeprecatedVersions
  allowNonAppliedPatches?: boolean // deprecated: use allowUnusedPatches instead
  allowUnusedPatches?: boolean
  ignorePatchFailures?: boolean
  patchedDependencies?: Record<string, string>
  updateConfig?: {
    ignoreDependencies?: string[]
  }
  auditConfig?: AuditConfig
  requiredScripts?: string[]
  supportedArchitectures?: SupportedArchitectures
  executionEnv?: ExecutionEnv
}

export interface ProjectManifest extends BaseManifest {
  packageManager?: string
  workspaces?: string[]
  pnpm?: PnpmSettings
  private?: boolean
  resolutions?: Record<string, string>
}

export interface PackageManifest extends DependencyManifest {
  deprecated?: string
}

export interface SupportedArchitectures {
  os?: string[]
  cpu?: string[]
  libc?: string[]
}

/// ------- pickPackage.ts

export interface PackageMeta {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, PackageInRegistry>
  time?: PackageMetaTime
  cachedAt?: number
}

export type PackageMetaTime = Record<string, string> & {
  unpublished?: {
    time: string
    versions: string[]
  }
}

export interface PackageMetaCache {
  get: (key: string) => PackageMeta | undefined
  set: (key: string, meta: PackageMeta) => void
  has: (key: string) => boolean
}

export interface PackageInRegistry extends PackageManifest {
  hasInstallScript?: boolean
  dist: {
    integrity?: string
    shasum: string
    tarball: string
  }
}

/// ------- resolver-base.ts

/**
 * tarball hosted remotely
 */
export interface TarballResolution {
  type?: undefined
  tarball: string
  integrity?: string
  path?: string
}

export interface BinaryResolution {
  type: 'binary'
  archive: 'tarball' | 'zip'
  url: string
  integrity: string
  bin: string
  prefix?: string
}

/**
 * directory on a file system
 */
export interface DirectoryResolution {
  type: 'directory'
  directory: string
}

export interface GitResolution {
  commit: string
  repo: string
  path?: string
  type: 'git'
}

export interface PlatformAssetTarget {
  os: string
  cpu: string
  libc?: 'musl'
}

export interface PlatformAssetResolution {
  resolution: AtomicResolution
  targets: PlatformAssetTarget[]
}

export type AtomicResolution =
  | TarballResolution
  | DirectoryResolution
  | GitResolution
  | BinaryResolution

export interface VariationsResolution {
  type: 'variations'
  variants: PlatformAssetResolution[]
}

export type Resolution = AtomicResolution | VariationsResolution

export interface ResolveResult {
  id: PkgResolutionId
  latest?: string
  publishedAt?: string
  manifest?: DependencyManifest
  resolution: Resolution
  resolvedVia: string
  normalizedBareSpecifier?: string
  alias?: string
}

export interface WorkspacePackage {
  rootDir: ProjectRootDir
  manifest: DependencyManifest
}

export type WorkspacePackagesByVersion = Map<string, WorkspacePackage>

export type WorkspacePackages = Map<string, WorkspacePackagesByVersion>

// This weight is set for selectors that are used on direct dependencies.
// It is important to give a bigger weight to direct dependencies.
export const DIRECT_DEP_SELECTOR_WEIGHT = 1000

export type VersionSelectorType = 'version' | 'range' | 'tag'

export interface VersionSelectors {
  [selector: string]: VersionSelectorWithWeight | VersionSelectorType
}

export interface VersionSelectorWithWeight {
  selectorType: VersionSelectorType
  weight: number
}

export interface PreferredVersions {
  [packageName: string]: VersionSelectors
}

export interface ResolveOptions {
  alwaysTryWorkspacePackages?: boolean
  defaultTag?: string
  pickLowestVersion?: boolean
  publishedBy?: Date
  projectDir: string
  lockfileDir: string
  preferredVersions: PreferredVersions
  preferWorkspacePackages?: boolean
  workspacePackages?: WorkspacePackages
  update?: false | 'compatible' | 'latest'
  injectWorkspacePackages?: boolean
  calcSpecifier?: boolean
  pinnedVersion?: PinnedVersion
}

export type WantedDependency = {
  injected?: boolean
  prevSpecifier?: string
} & (
  | {
      alias?: string
      bareSpecifier: string
    }
  | {
      alias: string
      bareSpecifier?: string
    }
)

export type ResolveFunction = (
  wantedDependency: WantedDependency,
  opts: ResolveOptions
) => Promise<ResolveResult>

/// ------- misc.ts

export type DependenciesField =
  | 'optionalDependencies'
  | 'dependencies'
  | 'devDependencies'

export type DependenciesOrPeersField = DependenciesField | 'peerDependencies'

// NOTE: The order in this array is important.
export const DEPENDENCIES_FIELDS: DependenciesField[] = [
  'optionalDependencies',
  'dependencies',
  'devDependencies',
]

export const DEPENDENCIES_OR_PEER_FIELDS: DependenciesOrPeersField[] = [
  ...DEPENDENCIES_FIELDS,
  'peerDependencies',
]

export interface Registries {
  default: string
  [scope: string]: string
}

export interface SslConfig {
  cert: string
  key: string
  ca?: string
}

export type HoistedDependencies = Record<
  DepPath | ProjectId,
  Record<string, 'public' | 'private'>
>

export type PkgResolutionId = string & { __brand: 'PkgResolutionId' }

export type PkgId = string & { __brand: 'PkgId' }

export type PkgIdWithPatchHash = string & { __brand: 'PkgIdWithPatchHash' }

export type DepPath = string & { __brand: 'DepPath' }

export type ProjectId = string & { __brand: 'ProjectId' }

export type PinnedVersion = 'none' | 'patch' | 'minor' | 'major'

/// ------- project.ts

export interface Project {
  rootDir: ProjectRootDir
  rootDirRealPath: ProjectRootDirRealPath
  modulesDir?: string
  manifest: ProjectManifest
  writeProjectManifest: (
    manifest: ProjectManifest,
    force?: boolean | undefined
  ) => Promise<void>
}

export type ProjectsGraph = Record<
  ProjectRootDir,
  { dependencies: ProjectRootDir[]; package: Project }
>

export type ProjectRootDir = string & { __brand: 'ProjectRootDir' }

export type ProjectRootDirRealPath = string & {
  __brand: 'ProjectRootDirRealPath'
}

/// ------- parseBareSpecifier.ts
export interface NormalizeSpecifierOptions {
  registry: string
  defaultTag: string
  alias?: string
  bareSpecifier?: BareSpecifier
}

export type RegistryPackageSpecifierType = 'tag' | 'version' | 'range'
export interface RegistryPackageSpecifier {
  type: RegistryPackageSpecifierType
  name: string
  fetchSpec: string
  normalizedBareSpecifier?: string // Tarball URL
}
