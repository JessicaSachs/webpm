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

// IndexedDB File Content Store
export interface StoredFileContent {
  id: string // packageName@version/filePath
  packageName: string
  packageVersion: string
  filePath: string
  content: string
  size: number
  mtime?: Date
  contentType: string
}

export class FileContentStore {
  private dbName = 'webpm-file-store'
  private dbVersion = 1
  private storeName = 'file-contents'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })

          // Create indexes for efficient querying
          store.createIndex('packageName', 'packageName', { unique: false })
          store.createIndex('packageVersion', 'packageVersion', { unique: false })
          store.createIndex('filePath', 'filePath', { unique: false })
          store.createIndex('contentType', 'contentType', { unique: false })
        }
      }
    })
  }

  async storeFileContent(fileContent: StoredFileContent): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(fileContent)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getFileContent(id: string): Promise<StoredFileContent | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getPackageFiles(packageName: string, packageVersion?: string): Promise<StoredFileContent[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('packageName')
      const request = index.getAll(packageName)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let results = request.result

        if (packageVersion) {
          results = results.filter(file => file.packageVersion === packageVersion)
        }

        resolve(results)
      }
    })
  }

  async clearPackageFiles(packageName: string, packageVersion?: string): Promise<void> {
    if (!this.db) await this.init()

    const filesToDelete = await this.getPackageFiles(packageName, packageVersion)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      let completed = 0
      const total = filesToDelete.length

      if (total === 0) {
        resolve()
        return
      }

      for (const file of filesToDelete) {
        const request = store.delete(file.id)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          completed++
          if (completed === total) resolve()
        }
      }
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getAllFiles(): Promise<StoredFileContent[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getFilesByType(contentType: string): Promise<StoredFileContent[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('contentType')
      const request = index.getAll(contentType)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getTypeScriptFiles(): Promise<StoredFileContent[]> {
    const allFiles = await this.getAllFiles()
    return allFiles.filter(file =>
      file.contentType === 'application/typescript' ||
      file.filePath.endsWith('.ts') ||
      file.filePath.endsWith('.tsx') ||
      file.filePath.endsWith('.d.ts')
    )
  }

  async getJavaScriptFiles(): Promise<StoredFileContent[]> {
    const allFiles = await this.getAllFiles()
    return allFiles.filter(file =>
      file.contentType === 'application/javascript' ||
      file.filePath.endsWith('.js') ||
      file.filePath.endsWith('.jsx') ||
      file.filePath.endsWith('.mjs') ||
      file.filePath.endsWith('.cjs')
    )
  }
}

// Global file content store instance
export const fileContentStore = new FileContentStore()

/**
 * Helper function to determine content type from file extension
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'application/javascript'
    case 'ts':
    case 'tsx':
      return 'application/typescript'
    case 'json':
      return 'application/json'
    case 'css':
      return 'text/css'
    case 'html':
    case 'htm':
      return 'text/html'
    case 'md':
      return 'text/markdown'
    case 'txt':
      return 'text/plain'
    case 'yml':
    case 'yaml':
      return 'application/yaml'
    case 'xml':
      return 'application/xml'
    case 'vue':
      return 'text/x-vue'
    default:
      return 'text/plain'
  }
}

/**
 * Helper function to check if a file should be stored (text files only)
 */
function shouldStoreFile(filePath: string, size: number): boolean {
  return true
  const ext = filePath.split('.').pop()?.toLowerCase()
  const textExtensions = [
    'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
    'mts', 'cts', 'json5', 'toml',
    'json', 'css', 'scss', 'sass', 'less',
    'html', 'htm', 'xml', 'svg',
    'md', 'txt', 'yml', 'yaml',
    'vue', 'svelte',
    'd.ts', 'map'
  ]

  return textExtensions.includes(ext || '')
}

/**
 * Store extracted file contents in IndexedDB
 */
async function storeExtractedFiles(fetchedPackage: FetchedPackage): Promise<void> {
  try {
    const packageName = fetchedPackage.package.name
    const packageVersion = fetchedPackage.package.version

    for (const file of fetchedPackage.extractedFiles.files) {
      if (!shouldStoreFile(file.name, file.size)) continue

      try {
        const content = file.buffer.toString('utf-8')
        const fileContent: StoredFileContent = {
          id: `${packageName}@${packageVersion}/${file.name}`,
          packageName,
          packageVersion,
          filePath: file.name,
          content,
          size: file.size,
          mtime: file.mtime,
          contentType: getContentType(file.name)
        }

        await fileContentStore.storeFileContent(fileContent)
      } catch {
        // Skip files that can't be converted to UTF-8
        logger.debug(`Skipping non-text file: ${file.name}`)
      }
    }

    logger.debug(`Stored file contents for ${packageName}@${packageVersion}`)
  } catch (error) {
    logger.warn(`Failed to store file contents for ${fetchedPackage.package.id}:`, error)
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

export interface PackageJsonManifest {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  dependenciesMeta?: Record<string, { injected?: boolean, node?: string, patch?: string }>
  // ... other package.json fields can be added as needed
}

export interface ResolvePackageJsonOptions {
  includeDevDependencies?: boolean
  includePeerDependencies?: boolean
  includeOptionalDependencies?: boolean
  autoInstallPeers?: boolean
  maxConcurrent?: number
  onResult?: (result: FetchedDependencyTree) => void
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
  autoInstallPeers?: boolean
  onResult?: (result: FetchedDependencyTree) => void
}

export interface RequestPackageOptions {
  currentDepth?: number
  parentIds?: string[]
  maxDepth?: number
  preferWorkspacePackages?: boolean
  updateToLatest?: boolean
  autoInstallPeers?: boolean
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
  // _options parameter is reserved for future use
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
export function getNonDevWantedDependencies(
  packageManifest: PackageMetadata,
  options: { autoInstallPeers?: boolean } = {}
): WantedDependency[] {
  const { autoInstallPeers = false } = options
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

  // Auto-install peers if requested
  if (autoInstallPeers && packageManifest.peerDependencies) {
    logger.info(`🔍 Auto-installing peers for ${packageManifest.name}:`, Object.keys(packageManifest.peerDependencies))
    for (const [alias, bareSpecifier] of Object.entries(packageManifest.peerDependencies)) {
      // Only add if not already in dependencies
      if (!packageManifest.dependencies?.[alias] && !dependencies.some(dep => dep.alias === alias)) {
        logger.info(`➕ Adding peer dependency: ${alias}@${bareSpecifier}`)
        dependencies.push({
          alias,
          bareSpecifier: String(bareSpecifier),
          dev: false,
          optional: false,
        })
      } else {
        logger.info(`⏭️  Skipping peer dependency ${alias} (already exists)`)
      }
    }
  } else if (autoInstallPeers) {
    logger.info(`🔍 Auto-install peers requested but no peer dependencies found for ${packageManifest.name}`)
  } else {
    logger.info(`🔍 Auto-install peers not requested for ${packageManifest.name}`)
  }

  return dependencies
}

/**
 * Extract wanted dependencies from a package.json manifest (similar to pnpm's getWantedDependencies)
 */
export function getWantedDependenciesFromPackageJson(
  packageJson: PackageJsonManifest,
  options: ResolvePackageJsonOptions = {}
): WantedDependency[] {
  const {
    includeDevDependencies = false,
    includePeerDependencies = false,
    includeOptionalDependencies = true,
    autoInstallPeers = false
  } = options

  const wantedDeps: WantedDependency[] = []

  // Add regular dependencies
  if (packageJson.dependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageJson.dependencies)) {
      wantedDeps.push({
        alias,
        bareSpecifier,
        dev: false,
        optional: false,
        prevSpecifier: bareSpecifier
      })
    }
  }

  // Add dev dependencies if requested
  if (includeDevDependencies && packageJson.devDependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageJson.devDependencies)) {
      wantedDeps.push({
        alias,
        bareSpecifier,
        dev: true,
        optional: false,
        prevSpecifier: bareSpecifier
      })
    }
  }

  // Add peer dependencies if requested
  if (includePeerDependencies && packageJson.peerDependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageJson.peerDependencies)) {
      wantedDeps.push({
        alias,
        bareSpecifier,
        dev: false,
        optional: false,
        prevSpecifier: bareSpecifier
      })
    }
  }

  // Add optional dependencies if requested
  if (includeOptionalDependencies && packageJson.optionalDependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageJson.optionalDependencies)) {
      wantedDeps.push({
        alias,
        bareSpecifier,
        dev: false,
        optional: true,
        prevSpecifier: bareSpecifier
      })
    }
  }

  // Auto-install peers if requested
  if (autoInstallPeers && packageJson.peerDependencies) {
    for (const [alias, bareSpecifier] of Object.entries(packageJson.peerDependencies)) {
      // Only add if not already in dependencies
      if (!packageJson.dependencies?.[alias] && !wantedDeps.some(dep => dep.alias === alias)) {
        wantedDeps.push({
          alias,
          bareSpecifier,
          dev: false,
          optional: false,
          prevSpecifier: bareSpecifier
        })
      }
    }
  }

  return wantedDeps
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
    logger.info(`🔍 Resolving dependencies for ${packageName}@${packageVersion} with autoInstallPeers: ${context.autoInstallPeers}`)
    const wantedDependencies = getNonDevWantedDependencies(resolvedPackage.manifest, {
      autoInstallPeers: context.autoInstallPeers
    })
    logger.info(`🔍 Found ${wantedDependencies.length} dependencies to resolve for ${packageName}@${packageVersion}`)

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
export function createResolutionContext(
  registry: NPMRegistry,
  maxDepth = 16,
  autoInstallPeers = false
): ResolutionContext {
  console.log(`🔍 Creating resolution context with autoInstallPeers: ${autoInstallPeers}`)
  return {
    registry,
    resolvedPackages: new Map(),
    dependencyTree: new Map(),
    maxDepth,
    currentDepth: 0,
    parentIds: [],
    autoInstallPeers,
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
  const context = createResolutionContext(registry, options.maxDepth, options.autoInstallPeers)

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
    const visitedPackages = new Set<string>();

    const collectPackages = (node: DependencyTreeNode, parentIds: string[] = []) => {
      const packageId = `${node.package.name}@${node.package.version}`;

      // Check for circular dependencies
      if (parentIds.includes(node.package.name)) {
        logger.warn(`Circular dependency detected for package ${node.package.name} in collectPackages`);
        return;
      }

      // Avoid processing the same package multiple times
      if (visitedPackages.has(packageId)) {
        return;
      }

      packagesToFetch.push(node.package);
      visitedPackages.add(packageId);

      // Create new parent chain for children
      const newParentIds = [...parentIds, node.package.name];

      for (const childNode of node.children.values()) {
        collectPackages(childNode, newParentIds);
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

          // Store file contents in IndexedDB
          await storeExtractedFiles(fetched);

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
    const visitedNodes = new Set<string>();

    const updateTreeWithFetched = (node: DependencyTreeNode, parentIds: string[] = []) => {
      const nodeId = `${node.package.name}@${node.package.version}`;

      // Check for circular dependencies
      if (parentIds.includes(node.package.name)) {
        logger.warn(`Circular dependency detected for package ${node.package.name} in updateTreeWithFetched`);
        return;
      }

      // Avoid processing the same node multiple times
      if (visitedNodes.has(nodeId)) {
        return;
      }

      visitedNodes.add(nodeId);

      const fetched = allFetchedPackages.get(node.package.id);
      if (fetched) {
        node.fetched = fetched;
      }

      // Create new parent chain for children
      const newParentIds = [...parentIds, node.package.name];

      for (const childNode of node.children.values()) {
        updateTreeWithFetched(childNode, newParentIds);
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
 * Resolve and fetch multiple packages from wanted dependencies
 */
export async function resolveAndFetchWantedDependencies(
  wantedDependencies: WantedDependency[],
  registry: NPMRegistry,
  options: { maxConcurrent?: number, autoInstallPeers?: boolean, onResult?: (result: FetchedDependencyTree) => void } = {}
): Promise<FetchedDependencyTree[]> {
  const { maxConcurrent = 5, autoInstallPeers = false, onResult } = options

  logger.info(`Resolving ${wantedDependencies.length} wanted dependencies`)

  // Process packages in batches to control concurrency
  const results: FetchedDependencyTree[] = []
  const batches: WantedDependency[][] = []

  for (let i = 0; i < wantedDependencies.length; i += maxConcurrent) {
    batches.push(wantedDependencies.slice(i, i + maxConcurrent))
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (wantedDep) => {
      try {
        const depType = wantedDep.dev ? 'dev' : (wantedDep.optional ? 'optional' : 'prod')
        logger.info(`Resolving ${depType} dependency: ${wantedDep.alias}@${wantedDep.bareSpecifier}`)

        const result = await resolveAndFetchPackage(
          wantedDep.alias,
          wantedDep.bareSpecifier,
          registry,
          {
            maxConcurrent,
            autoInstallPeers
            // Don't pass onResult here, we'll call it after each result
          }
        )

        if (result) {
          logger.info(`Successfully resolved ${wantedDep.alias}@${wantedDep.bareSpecifier} with ${result.totalPackages} packages`)

          // Call the onResult callback with the fetched tree
          if (onResult) {
            onResult(result)
          }

          return result
        } else {
          logger.warn(`Failed to resolve ${wantedDep.alias}@${wantedDep.bareSpecifier}`)
          return null
        }
      } catch (error) {
        if (wantedDep.optional) {
          logger.warn(`Optional dependency ${wantedDep.alias}@${wantedDep.bareSpecifier} failed:`, error)
          return null
        } else {
          logger.error(`Error resolving ${wantedDep.alias}@${wantedDep.bareSpecifier}:`, error)
          throw error
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults.filter((result): result is FetchedDependencyTree => result !== null))
  }

  logger.info(`Successfully resolved ${results.length} wanted dependencies`)
  return results
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
    console.log(`🔍 resolveAndFetchPackage: autoInstallPeers = ${options.autoInstallPeers}`)
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
    const fetchedTree = await fetchDependencyTree(dependencyTree, {
      maxConcurrent: options.maxConcurrent
      // Don't pass onResult here, we'll call it after the tree is complete
    });

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

    // Call the onResult callback with the complete fetched tree
    if (options.onResult) {
      options.onResult(fetchedTree);
    }

    return fetchedTree;

  } catch (error) {
    timings.totalTime = totalTimer.stop();
    logger.error(`Failed to resolve and fetch package ${packageName}@${packageVersion}:`, error);
    logger.error(`Failed after ${timings.totalTime.toFixed(2)}ms`);
    return null;
  }
}

export * from './tarball-fetcher';
