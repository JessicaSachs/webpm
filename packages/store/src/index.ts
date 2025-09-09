import { NPMRegistry, type PackageMetadata, type PackageVersions } from '@webpm/registry'
import { logger } from '@webpm/logger'
import semver from 'semver'

// Types for dependency resolution
export interface WantedDependency {
  alias: string
  bareSpecifier: string // package reference (e.g., "^3.0.0", "latest", "1.2.3")
  dev: boolean
  optional: boolean
  nodeExecPath?: string
  saveCatalogName?: string
  updateSpec?: boolean
  prevSpecifier?: string
}

export interface ResolvedPackage {
  id: string // e.g., "nuxt@3.8.4"
  name: string
  version: string
  resolution: {
    type: 'npm'
    tarball: string
    integrity?: string
    shasum?: string
  }
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
  manifest: PackageMetadata
}

export interface DependencyTreeNode {
  package: ResolvedPackage
  children: Map<string, DependencyTreeNode>
  depth: number
  installable: boolean
}

export interface ResolutionContext {
  registry: NPMRegistry
  resolvedPackages: Map<string, ResolvedPackage>
  dependencyTree: Map<string, DependencyTreeNode>
  maxDepth: number
  currentDepth: number
  parentIds: string[]
}

export interface RequestPackageOptions {
  currentDepth?: number
  parentIds?: string[]
  maxDepth?: number
  preferWorkspacePackages?: boolean
  updateToLatest?: boolean
}

/**
 * Request a package from the registry and resolve its version
 */
export async function requestPackage(
  wantedDependency: WantedDependency,
  context: ResolutionContext,
  _options: RequestPackageOptions = {}
): Promise<ResolvedPackage | null> {
  const { alias, bareSpecifier } = wantedDependency
  const { registry, resolvedPackages, maxDepth = 10, currentDepth = 0, parentIds = [] } = context

  // Check if we've already resolved this package
  const existingPackage = resolvedPackages.get(alias)
  if (existingPackage) {
    logger.debug(`Package ${alias} already resolved: ${existingPackage.version}`)
    return existingPackage
  }

  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    logger.warn(`Maximum depth ${maxDepth} reached for package ${alias}`)
    return null
  }

  // Check for circular dependencies
  if (parentIds.includes(alias)) {
    logger.warn(`Circular dependency detected for package ${alias}`)
    return null
  }

  try {
    logger.info(`Resolving package: ${alias}@${bareSpecifier}`)

    // Fetch package metadata from registry
    const packageVersions = await registry.getPackageVersions(alias)
    
    if (!packageVersions) {
      logger.error(`Package ${alias} not found in registry`)
      return null
    }

    // Resolve the specific version based on the bare specifier
    const resolvedVersion = resolveVersion(bareSpecifier, packageVersions)
    
    if (!resolvedVersion) {
      logger.error(`No version found for ${alias}@${bareSpecifier}`)
      return null
    }

    // Get the specific version metadata
    const versionMetadata = packageVersions.versions[resolvedVersion]
    
    if (!versionMetadata) {
      logger.error(`Version ${resolvedVersion} not found for package ${alias}`)
      return null
    }

    // Create resolved package object
    const resolvedPackage: ResolvedPackage = {
      id: `${alias}@${resolvedVersion}`,
      name: alias,
      version: resolvedVersion,
      resolution: {
        type: 'npm',
        tarball: versionMetadata.dist.tarball,
        integrity: versionMetadata.dist.integrity,
        shasum: versionMetadata.dist.shasum,
      },
      dependencies: versionMetadata.dependencies || {},
      devDependencies: versionMetadata.devDependencies || {},
      peerDependencies: versionMetadata.peerDependencies || {},
      optionalDependencies: versionMetadata.optionalDependencies || {},
      manifest: versionMetadata,
    }

    // Cache the resolved package
    resolvedPackages.set(alias, resolvedPackage)
    
    logger.info(`Resolved package: ${resolvedPackage.id}`)
    return resolvedPackage

  } catch (error) {
    logger.error(`Failed to resolve package ${alias}:`, error)
    return null
  }
}

/**
 * Extract non-dev dependencies from a package manifest
 */
export function getNonDevWantedDependencies(packageManifest: PackageMetadata): WantedDependency[] {
  const dependencies: WantedDependency[] = []

  // Add regular dependencies
  if (packageManifest.dependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageManifest.dependencies)) {
      dependencies.push({
        alias,
        bareSpecifier: String(bareSpecifier),
        dev: false,
        optional: false,
      })
    }
  }

  // Add optional dependencies
  if (packageManifest.optionalDependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageManifest.optionalDependencies)) {
      dependencies.push({
        alias,
        bareSpecifier: String(bareSpecifier),
        dev: false,
        optional: true,
      })
    }
  }

  return dependencies
}

/**
 * Resolve a version from a bare specifier using semver
 */
function resolveVersion(bareSpecifier: string, packageVersions: PackageVersions): string | null {
  const availableVersions = Object.keys(packageVersions.versions)
  
  // Handle special cases
  if (bareSpecifier === 'latest') {
    return packageVersions['dist-tags'].latest
  }

  // Handle exact version
  if (semver.valid(bareSpecifier)) {
    return availableVersions.includes(bareSpecifier) ? bareSpecifier : null
  }

  // Handle version ranges
  if (semver.validRange(bareSpecifier)) {
    const maxSatisfying = semver.maxSatisfying(availableVersions, bareSpecifier)
    return maxSatisfying
  }

  // Handle dist-tags
  if (packageVersions['dist-tags'][bareSpecifier]) {
    return packageVersions['dist-tags'][bareSpecifier]
  }

  return null
}

/**
 * Recursively resolve dependencies for a package
 */
export async function resolveDependencies(
  packageName: string,
  packageVersion: string,
  context: ResolutionContext,
  options: RequestPackageOptions = {}
): Promise<DependencyTreeNode | null> {
  const { currentDepth = 0, parentIds = [] } = options
  const { dependencyTree, maxDepth = 10 } = context

  // Check if we've already built this part of the tree
  const nodeId = `${packageName}@${packageVersion}`
  const existingNode = dependencyTree.get(nodeId)
  if (existingNode) {
    return existingNode
  }

  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    logger.warn(`Maximum depth ${maxDepth} reached for package ${packageName}`)
    return null
  }

  // Check for circular dependencies
  if (parentIds.includes(packageName)) {
    logger.warn(`Circular dependency detected for package ${packageName}`)
    return null
  }

  try {
    // Get the resolved package
    const resolvedPackage = context.resolvedPackages.get(packageName)
    if (!resolvedPackage) {
      logger.error(`Package ${packageName} not found in resolved packages`)
      return null
    }

    // Create the dependency tree node
    const node: DependencyTreeNode = {
      package: resolvedPackage,
      children: new Map(),
      depth: currentDepth,
      installable: true,
    }

    // Cache the node
    dependencyTree.set(nodeId, node)

    // Get dependencies to resolve
    const wantedDependencies = getNonDevWantedDependencies(resolvedPackage.manifest)
    
    logger.info(`Resolving ${wantedDependencies.length} dependencies for ${packageName}@${packageVersion}`)

    // Resolve each dependency
    const newParentIds = [...parentIds, packageName]
    const childPromises = wantedDependencies.map(async (wantedDep) => {
      // Request the package
      const childPackage = await requestPackage(wantedDep, context, {
        currentDepth: currentDepth + 1,
        parentIds: newParentIds,
        maxDepth,
      })

      if (!childPackage) {
        logger.warn(`Failed to resolve dependency ${wantedDep.alias}`)
        return null
      }

      // Recursively resolve the child's dependencies
      const childNode = await resolveDependencies(
        childPackage.name,
        childPackage.version,
        context,
        {
          currentDepth: currentDepth + 1,
          parentIds: newParentIds,
          maxDepth,
        }
      )

      return { alias: wantedDep.alias, node: childNode }
    })

    // Wait for all child dependencies to resolve
    const childResults = await Promise.all(childPromises)
    
    // Add resolved children to the node
    for (const result of childResults) {
      if (result && result.node) {
        node.children.set(result.alias, result.node)
      }
    }

    logger.info(`Resolved ${node.children.size} dependencies for ${packageName}@${packageVersion}`)
    return node

  } catch (error) {
    logger.error(`Failed to resolve dependencies for ${packageName}:`, error)
    return null
  }
}

/**
 * Create a new resolution context
 */
export function createResolutionContext(registry: NPMRegistry, maxDepth = 10): ResolutionContext {
  return {
    registry,
    resolvedPackages: new Map(),
    dependencyTree: new Map(),
    maxDepth,
    currentDepth: 0,
    parentIds: [],
  }
}

/**
 * Main function to resolve a package and all its dependencies
 */
export async function resolvePackageTree(
  packageName: string,
  packageVersion: string,
  registry: NPMRegistry,
  options: RequestPackageOptions = {}
): Promise<DependencyTreeNode | null> {
  const context = createResolutionContext(registry, options.maxDepth)
  
  // First, request the root package
  const rootPackage = await requestPackage(
    {
      alias: packageName,
      bareSpecifier: packageVersion,
      dev: false,
      optional: false,
    },
    context,
    options
  )

  if (!rootPackage) {
    logger.error(`Failed to resolve root package ${packageName}@${packageVersion}`)
    return null
  }

  // Then resolve all its dependencies
  const rootNode = await resolveDependencies(
    packageName,
    packageVersion,
    context,
    options
  )

  return rootNode
}
