/**
 * Filesystem abstraction layer for webpm
 * 
 * This module provides a unified interface for filesystem operations that can be
 * backed by different implementations (lightning-fs, memory, etc.) depending on
 * the environment and requirements.
 */

export * from './types.js'
export * from './lightning-fs-impl.js'
export * from './memory-fs-impl.js'

import { 
  FileSystemInterface, 
  FileSystemConfig,
  FileSystemError,
  FileSystemErrorCodes 
} from './types.js'
import { LightningFileSystem, createLightningFileSystem, type LightningFSOptions } from './lightning-fs-impl.js'
import { MemoryFileSystem, createMemoryFileSystem } from './memory-fs-impl.js'

/**
 * Filesystem factory that creates appropriate filesystem implementations
 * based on configuration and environment
 */
export class FileSystemFactory {
  private static instances = new Map<string, FileSystemInterface>()

  /**
   * Create or get a filesystem instance
   * @param config Filesystem configuration
   * @returns Filesystem interface implementation
   */
  static async create(config: FileSystemConfig): Promise<FileSystemInterface> {
    const key = this.getInstanceKey(config)
    
    // Return existing instance if available
    if (this.instances.has(key)) {
      return this.instances.get(key)!
    }

    let fs: FileSystemInterface

    switch (config.type) {
      case 'lightning-fs':
        fs = createLightningFileSystem(config.options as LightningFSOptions)
        break

      case 'memory':
        fs = createMemoryFileSystem()
        break

      case 'custom':
        if (!config.options?.implementation) {
          throw new Error('Custom filesystem type requires implementation in options')
        }
        fs = config.options.implementation
        break

      default:
        throw new Error(`Unsupported filesystem type: ${config.type}`)
    }

    // Initialize the filesystem
    await fs.init?.(config.name, config.options)

    // Cache the instance
    this.instances.set(key, fs)

    return fs
  }

  /**
   * Get an existing filesystem instance
   * @param config Filesystem configuration
   * @returns Filesystem interface implementation or null if not found
   */
  static get(config: FileSystemConfig): FileSystemInterface | null {
    const key = this.getInstanceKey(config)
    return this.instances.get(key) || null
  }

  /**
   * Destroy a filesystem instance
   * @param config Filesystem configuration
   */
  static async destroy(config: FileSystemConfig): Promise<void> {
    const key = this.getInstanceKey(config)
    const fs = this.instances.get(key)
    
    if (fs) {
      await fs.destroy?.()
      this.instances.delete(key)
    }
  }

  /**
   * Destroy all filesystem instances
   */
  static async destroyAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(fs => fs.destroy?.())
    await Promise.all(promises)
    this.instances.clear()
  }

  /**
   * Generate a unique key for filesystem instances
   */
  private static getInstanceKey(config: FileSystemConfig): string {
    return `${config.type}:${config.name || 'default'}`
  }

  /**
   * Detect the best filesystem implementation for the current environment
   */
  static detectBestImplementation(): FileSystemConfig {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      return {
        type: 'lightning-fs',
        name: 'webpm-fs',
        options: {
          defer: false
        }
      }
    }

    // Fallback to memory filesystem
    return {
      type: 'memory',
      name: 'webpm-memory-fs'
    }
  }
}

/**
 * Default filesystem configuration
 */
export const DEFAULT_FS_CONFIG: FileSystemConfig = {
  type: 'lightning-fs',
  name: 'webpm-fs',
  options: {
    defer: false
  }
}

/**
 * Create a filesystem instance with automatic implementation detection
 * @param config Optional filesystem configuration (will detect best implementation if not provided)
 * @returns Promise resolving to filesystem interface
 */
export async function createFileSystem(config?: Partial<FileSystemConfig>): Promise<FileSystemInterface> {
  const finalConfig = config 
    ? { ...DEFAULT_FS_CONFIG, ...config }
    : FileSystemFactory.detectBestImplementation()

  return FileSystemFactory.create(finalConfig)
}

/**
 * Utility functions for common filesystem operations
 */
export class FileSystemUtils {
  /**
   * Ensure a directory exists, creating it if necessary (recursive)
   */
  static async ensureDir(fs: FileSystemInterface, dirPath: string): Promise<void> {
    try {
      await fs.stat(dirPath)
      return // Directory already exists
    } catch (error) {
      if (error instanceof FileSystemError && error.code === FileSystemErrorCodes.ENOENT) {
        // Directory doesn't exist, create it
        const parent = this.getParentPath(dirPath)
        if (parent !== dirPath) {
          await this.ensureDir(fs, parent) // Recursive creation
        }
        await fs.mkdir(dirPath)
      } else {
        throw error
      }
    }
  }

  /**
   * Remove a directory and all its contents (recursive)
   */
  static async removeDir(fs: FileSystemInterface, dirPath: string): Promise<void> {
    try {
      const stats = await fs.stat(dirPath)
      
      if (stats.isFile() || stats.isSymbolicLink()) {
        await fs.unlink(dirPath)
        return
      }

      if (stats.isDirectory()) {
        const entries = await fs.readdir(dirPath)
        
        // Remove all children first
        for (const entry of entries) {
          const childPath = this.joinPath(dirPath, entry as string)
          await this.removeDir(fs, childPath)
        }
        
        // Remove the directory itself
        await fs.rmdir(dirPath)
      }
    } catch (error) {
      if (error instanceof FileSystemError && error.code === FileSystemErrorCodes.ENOENT) {
        // Directory doesn't exist, nothing to remove
        return
      }
      throw error
    }
  }

  /**
   * Copy a file or directory
   */
  static async copy(fs: FileSystemInterface, srcPath: string, destPath: string): Promise<void> {
    const stats = await fs.stat(srcPath)

    if (stats.isFile()) {
      const content = await fs.readFile(srcPath)
      await this.ensureDir(fs, this.getParentPath(destPath))
      await fs.writeFile(destPath, content)
    } else if (stats.isDirectory()) {
      await this.ensureDir(fs, destPath)
      const entries = await fs.readdir(srcPath)
      
      for (const entry of entries) {
        const srcChild = this.joinPath(srcPath, entry as string)
        const destChild = this.joinPath(destPath, entry as string)
        await this.copy(fs, srcChild, destChild)
      }
    } else if (stats.isSymbolicLink() && fs.readlink && fs.symlink) {
      const target = await fs.readlink(srcPath)
      await fs.symlink(target, destPath)
    }
  }

  /**
   * Check if a path exists
   */
  static async exists(fs: FileSystemInterface, path: string): Promise<boolean> {
    try {
      await fs.stat(path)
      return true
    } catch (error) {
      if (error instanceof FileSystemError && error.code === FileSystemErrorCodes.ENOENT) {
        return false
      }
      throw error
    }
  }

  /**
   * Get the parent directory of a path
   */
  static getParentPath(filepath: string): string {
    const normalized = this.normalizePath(filepath)
    if (normalized === '/') {
      return '/'
    }
    
    const lastSlash = normalized.lastIndexOf('/')
    return lastSlash === 0 ? '/' : normalized.substring(0, lastSlash)
  }

  /**
   * Get the basename of a path
   */
  static getBasename(filepath: string): string {
    const normalized = this.normalizePath(filepath)
    const lastSlash = normalized.lastIndexOf('/')
    return normalized.substring(lastSlash + 1)
  }

  /**
   * Join path segments
   */
  static joinPath(...segments: string[]): string {
    return this.normalizePath(segments.join('/'))
  }

  /**
   * Normalize a path
   */
  static normalizePath(filepath: string): string {
    if (!filepath.startsWith('/')) {
      filepath = '/' + filepath
    }
    
    // Remove duplicate slashes and resolve . and ..
    const parts = filepath.split('/').filter(part => part !== '' && part !== '.')
    const resolved: string[] = []
    
    for (const part of parts) {
      if (part === '..') {
        if (resolved.length > 0) {
          resolved.pop()
        }
      } else {
        resolved.push(part)
      }
    }
    
    return '/' + resolved.join('/')
  }
}

/**
 * Global filesystem instance for convenience
 * This will be initialized lazily when first accessed
 */
let globalFs: FileSystemInterface | null = null

/**
 * Get the global filesystem instance
 */
export async function getGlobalFileSystem(): Promise<FileSystemInterface> {
  if (!globalFs) {
    globalFs = await createFileSystem()
  }
  return globalFs
}

/**
 * Set a custom global filesystem instance
 */
export function setGlobalFileSystem(fs: FileSystemInterface): void {
  globalFs = fs
}
