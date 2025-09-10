import { NPMRegistry, type PackageMetadata, type PackageVersions } from '@webpm/registry'
import { logger } from '@webpm/logger'
import semver from 'semver'
import { tarballFetcher, type FetchedPackage } from './tarball-fetcher'

// Timing utilities
class Timer {
  private startTime: number
  private endTime?: number

  constructor() {
    this.startTime = performance.now()
  }

  stop(): number {
    this.endTime = performance.now()
    return this.endTime - this.startTime
  }

  getElapsed(): number {
    return (this.endTime || performance.now()) - this.startTime
  }
}

function createTimings(): InstallationTimings {
  return {
    totalTime: 0,
    resolutionTime: 0,
    fetchingTime: 0,
    extractionTime: 0,
    phases: {
      dependencyResolution: 0,
      packageFetching: 0,
      tarballExtraction: 0,
      treeBuilding: 0,
    }
  }
}

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
  fetched?: FetchedPackage
}

export interface FetchedDependencyTree {
  root: DependencyTreeNode
  allFetchedPackages: Map<string, FetchedPackage>
  totalPackages: number
  totalFiles: number
  timings: InstallationTimings
}

export interface InstallationTimings {
  totalTime: number
  resolutionTime: number
  fetchingTime: number
  extractionTime: number
  phases: {
    dependencyResolution: number
    packageFetching: number
    tarballExtraction: number
    treeBuilding: number
  }
}

export interface ResolutionContext {
  registry: NPMRegistry
  resolvedPackages: Map<string, ResolvedPackage>
  dependencyTree: Map<string, DependencyTreeNode>
  maxDepth: number
  currentDepth: number
  parentIds: string[]
  onResult?: (result: FetchedDependencyTree) => void
}

export interface RequestPackageOptions {
  currentDepth?: number
  parentIds?: string[]
  maxDepth?: number
  preferWorkspacePackages?: boolean
  updateToLatest?: boolean
  onResult?: (result: FetchedPackage) => void
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
  const { registry, resolvedPackages, maxDepth = 10, currentDepth = 0, parentIds = [], onResult } = context

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
  const { currentDepth = 0, parentIds = [], onResult } = options
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
          onResult,
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
export function createResolutionContext(registry: NPMRegistry, maxDepth = 16): ResolutionContext {
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

/**
 * Fetch a single package tarball and extract it
 */
export async function fetchPackage(resolvedPackage: ResolvedPackage): Promise<FetchedPackage | null> {
  return await tarballFetcher.fetchPackage(resolvedPackage);
}

/**
 * Fetch all packages in a dependency tree
 */
export async function fetchDependencyTree(
  dependencyTree: DependencyTreeNode,
  options: { maxConcurrent?: number, onResult?: (result: FetchedPackage) => void } = {}
): Promise<FetchedDependencyTree | null> {
  const { maxConcurrent = 5 } = options;
  const allFetchedPackages = new Map<string, FetchedPackage>();
  let totalFiles = 0;
  const timings = createTimings();
  const totalTimer = new Timer();

  try {
    logger.info(`Fetching packages for dependency tree with max concurrency: ${maxConcurrent}`);

    // Phase 1: Collect packages to fetch
    const collectTimer = new Timer();
    const packagesToFetch: ResolvedPackage[] = [];
    const collectPackages = (node: DependencyTreeNode) => {
      packagesToFetch.push(node.package);
      for (const childNode of node.children.values()) {
        collectPackages(childNode);
      }
    };
    collectPackages(dependencyTree);
    timings.phases.treeBuilding = collectTimer.stop();

    logger.info(`Found ${packagesToFetch.length} packages to fetch`);

    // Phase 2: Fetch packages in batches
    const fetchTimer = new Timer();
    const batches: ResolvedPackage[][] = [];
    for (let i = 0; i < packagesToFetch.length; i += maxConcurrent) {
      batches.push(packagesToFetch.slice(i, i + maxConcurrent));
    }

    // Process each batch with timing
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchTimer = new Timer();
      
      const batchPromises = batch.map(async (pkg) => {
        const packageTimer = new Timer();
        const fetched = await tarballFetcher.fetchPackage(pkg);
        const packageTime = packageTimer.stop();
        
        if (fetched) {
          options.onResult?.(fetched);
          allFetchedPackages.set(pkg.id, fetched);
          totalFiles += fetched.extractedFiles.files.length;
          logger.debug(`Fetched ${pkg.id} in ${packageTime.toFixed(2)}ms`);
        }
        return fetched;
      });

      await Promise.all(batchPromises);
      const batchTime = batchTimer.stop();
      logger.debug(`Completed batch ${batchIndex + 1}/${batches.length} (${batch.length} packages) in ${batchTime.toFixed(2)}ms`);
    }

    timings.phases.packageFetching = fetchTimer.stop();
    timings.fetchingTime = timings.phases.packageFetching;

    // Phase 3: Update tree with fetched packages
    const updateTimer = new Timer();
    const updateTreeWithFetched = (node: DependencyTreeNode) => {
      const fetched = allFetchedPackages.get(node.package.id);
      if (fetched) {
        node.fetched = fetched;
      }
      for (const childNode of node.children.values()) {
        updateTreeWithFetched(childNode);
      }
    };
    updateTreeWithFetched(dependencyTree);
    timings.phases.treeBuilding += updateTimer.stop();

    // Calculate total time
    timings.totalTime = totalTimer.stop();

    const result: FetchedDependencyTree = {
      root: dependencyTree,
      allFetchedPackages,
      totalPackages: allFetchedPackages.size,
      totalFiles,
      timings,
    };

    // Log detailed timing information
    logger.info(`Successfully fetched ${result.totalPackages} packages with ${result.totalFiles} total files`);
    logger.info(`Timing breakdown:`);
    logger.info(`  Total time: ${timings.totalTime.toFixed(2)}ms`);
    logger.info(`  Tree building: ${timings.phases.treeBuilding.toFixed(2)}ms`);
    logger.info(`  Package fetching: ${timings.phases.packageFetching.toFixed(2)}ms`);
    logger.info(`  Average per package: ${(timings.phases.packageFetching / result.totalPackages).toFixed(2)}ms`);

    return result;

  } catch (error) {
    timings.totalTime = totalTimer.stop();
    logger.error('Failed to fetch dependency tree:', error);
    logger.error(`Failed after ${timings.totalTime.toFixed(2)}ms`);
    return null;
  }
}

/**
 * Main function to resolve and fetch a package with all its dependencies
 */
export async function resolveAndFetchPackage(
  packageName: string,
  packageVersion: string,
  registry: NPMRegistry,
  options: RequestPackageOptions & { maxConcurrent?: number, onResult?: (result: FetchedDependencyTree) => void } = {}
): Promise<FetchedDependencyTree | null> {
  const totalTimer = new Timer();
  const timings = createTimings();

  try {
    logger.info(`Resolving and fetching package: ${packageName}@${packageVersion}`);

    // Phase 1: Resolve the dependency tree
    const resolutionTimer = new Timer();
    const dependencyTree = await resolvePackageTree(packageName, packageVersion, registry, options);
    timings.resolutionTime = resolutionTimer.stop();
    timings.phases.dependencyResolution = timings.resolutionTime;
    
    if (!dependencyTree) {
      logger.error(`Failed to resolve dependency tree for ${packageName}@${packageVersion}`);
      return null;
    }

    logger.info(`Dependency resolution completed in ${timings.resolutionTime.toFixed(2)}ms`);

    // Phase 2: Fetch all packages
    const fetchedTree = await fetchDependencyTree(dependencyTree, options);
    
    if (!fetchedTree) {
      logger.error(`Failed to fetch packages for ${packageName}@${packageVersion}`);
      return null;
    }

    // Merge timing information
    timings.fetchingTime = fetchedTree.timings.fetchingTime;
    timings.extractionTime = fetchedTree.timings.extractionTime;
    timings.phases.packageFetching = fetchedTree.timings.phases.packageFetching;
    timings.phases.tarballExtraction = fetchedTree.timings.phases.tarballExtraction;
    timings.phases.treeBuilding = fetchedTree.timings.phases.treeBuilding;

    // Calculate total time
    timings.totalTime = totalTimer.stop();

    // Update the fetched tree with complete timing information
    fetchedTree.timings = timings;

    // Log comprehensive timing summary
    logger.info(`Successfully resolved and fetched ${packageName}@${packageVersion} with ${fetchedTree.totalPackages} packages`);
    logger.info(`Complete timing breakdown:`);
    logger.info(`  Total time: ${timings.totalTime.toFixed(2)}ms`);
    logger.info(`  Resolution: ${timings.resolutionTime.toFixed(2)}ms (${((timings.resolutionTime / timings.totalTime) * 100).toFixed(1)}%)`);
    logger.info(`  Fetching: ${timings.fetchingTime.toFixed(2)}ms (${((timings.fetchingTime / timings.totalTime) * 100).toFixed(1)}%)`);
    logger.info(`  Extraction: ${timings.extractionTime.toFixed(2)}ms (${((timings.extractionTime / timings.totalTime) * 100).toFixed(1)}%)`);
    logger.info(`  Tree building: ${timings.phases.treeBuilding.toFixed(2)}ms`);
    logger.info(`  Average per package: ${(timings.fetchingTime / fetchedTree.totalPackages).toFixed(2)}ms`);

    return fetchedTree;

  } catch (error) {
    timings.totalTime = totalTimer.stop();
    logger.error(`Failed to resolve and fetch package ${packageName}@${packageVersion}:`, error);
    logger.error(`Failed after ${timings.totalTime.toFixed(2)}ms`);
    return null;
  }
}

export * from './tarball-fetcher';
