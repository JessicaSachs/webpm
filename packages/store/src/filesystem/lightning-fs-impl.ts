/**
 * Lightning-FS implementation of the filesystem abstraction
 * 
 * This module provides a lightning-fs based implementation of the FileSystemInterface
 * for browser-based filesystem operations using IndexedDB as the underlying storage.
 */

import FS from '@isomorphic-git/lightning-fs'
import { 
  FileSystemInterface, 
  FileStats, 
  FileOperationOptions, 
  DirectoryEntry,
  FileSystemError,
  FileSystemErrorCodes 
} from './types.js'

/**
 * Lightning-FS specific configuration options
 */
export interface LightningFSOptions {
  /** Database name for IndexedDB storage */
  name?: string
  /** Whether to defer initialization */
  defer?: boolean
  /** Custom database name for file data */
  fileDbName?: string
  /** Custom store name for file data */
  fileStoreName?: string
  /** Custom database name for lock mutex */
  lockDbName?: string
  /** Custom store name for lock mutex */
  lockStoreName?: string
  /** Custom backend implementation */
  backend?: any
  /** Custom database object */
  db?: any
}

/**
 * Adapter class that wraps lightning-fs Stat objects to match our FileStats interface
 */
class LightningFSStats implements FileStats {
  constructor(private lightningStats: any) {}

  get type(): 'file' | 'directory' | 'symlink' {
    return this.lightningStats.type
  }

  get size(): number {
    return this.lightningStats.size
  }

  get mode(): number {
    return this.lightningStats.mode
  }

  get ino(): number | string | bigint {
    return this.lightningStats.ino
  }

  get mtimeMs(): number {
    return this.lightningStats.mtimeMs
  }

  get ctimeMs(): number | undefined {
    return this.lightningStats.ctimeMs
  }

  get uid(): number | undefined {
    return this.lightningStats.uid
  }

  get gid(): number | undefined {
    return this.lightningStats.gid
  }

  get dev(): number | undefined {
    return this.lightningStats.dev
  }

  isFile(): boolean {
    return this.lightningStats.isFile()
  }

  isDirectory(): boolean {
    return this.lightningStats.isDirectory()
  }

  isSymbolicLink(): boolean {
    return this.lightningStats.isSymbolicLink()
  }
}

/**
 * Lightning-FS implementation of the filesystem interface
 * 
 * This class wraps lightning-fs to provide a standardized filesystem interface
 * that can be used interchangeably with other filesystem implementations.
 */
export class LightningFileSystem implements FileSystemInterface {
  private fs: FS
  private initialized = false

  constructor(private options: LightningFSOptions = {}) {
    this.fs = new FS(options.name || 'webpm-fs', options)
  }

  /**
   * Initialize the filesystem
   */
  async init(name?: string, options?: LightningFSOptions): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Re-initialize with new options if provided
      if (name || options) {
        const finalOptions = { ...this.options, ...options }
        this.fs = new FS(name || this.options.name || 'webpm-fs', finalOptions)
      }

      // Lightning-FS doesn't require explicit initialization in most cases,
      // but we'll mark as initialized after the first successful operation
      this.initialized = true
    } catch (error) {
      throw this.wrapError(error, 'init')
    }
  }

  /**
   * Read a file's contents
   */
  async readFile(filepath: string, options: FileOperationOptions = {}): Promise<Uint8Array | string> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const callback = (err: Error | null, data?: Uint8Array | string) => {
        if (err) {
          reject(this.wrapError(err, 'readFile', filepath))
        } else {
          resolve(data!)
        }
      }

      if (options.encoding === 'utf8') {
        this.fs.readFile(filepath, { encoding: 'utf8' }, callback)
      } else {
        this.fs.readFile(filepath, undefined, callback)
      }
    })
  }

  /**
   * Write data to a file
   */
  async writeFile(filepath: string, data: string | Uint8Array, options: FileOperationOptions = {}): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const callback = (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'writeFile', filepath))
        } else {
          resolve()
        }
      }

      const writeOptions: any = {}
      if (options.mode !== undefined) {
        writeOptions.mode = options.mode
      }
      if (options.encoding === 'utf8') {
        writeOptions.encoding = 'utf8'
      }

      this.fs.writeFile(filepath, data, writeOptions, callback)
    })
  }

  /**
   * Delete a file
   */
  async unlink(filepath: string, options: FileOperationOptions = {}): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.unlink(filepath, undefined, (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'unlink', filepath))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Read directory contents
   */
  async readdir(filepath: string, options: FileOperationOptions = {}): Promise<string[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.readdir(filepath, undefined, (err: Error | null, files?: string[]) => {
        if (err) {
          reject(this.wrapError(err, 'readdir', filepath))
        } else {
          resolve(files || [])
        }
      })
    })
  }

  /**
   * Create a directory
   */
  async mkdir(filepath: string, options: FileOperationOptions = {}): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const mkdirOptions = { mode: options.mode || 0o777, ...options }
      this.fs.mkdir(filepath, mkdirOptions, (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'mkdir', filepath))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Remove a directory
   */
  async rmdir(filepath: string, options: FileOperationOptions = {}): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.rmdir(filepath, undefined, (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'rmdir', filepath))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Get file/directory statistics
   */
  async stat(filepath: string, options: FileOperationOptions = {}): Promise<FileStats> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.stat(filepath, undefined, (err: Error | null, stats?: any) => {
        if (err) {
          reject(this.wrapError(err, 'stat', filepath))
        } else {
          resolve(new LightningFSStats(stats))
        }
      })
    })
  }

  /**
   * Get file/directory statistics (don't follow symlinks)
   */
  async lstat(filepath: string, options: FileOperationOptions = {}): Promise<FileStats> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.lstat(filepath, undefined, (err: Error | null, stats?: any) => {
        if (err) {
          reject(this.wrapError(err, 'lstat', filepath))
        } else {
          resolve(new LightningFSStats(stats))
        }
      })
    })
  }

  /**
   * Rename/move a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.rename(oldPath, newPath, (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'rename', oldPath))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Create a symbolic link
   */
  async symlink(target: string, filepath: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.symlink(target, filepath, (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'symlink', filepath))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Read a symbolic link
   */
  async readlink(filepath: string, options: FileOperationOptions = {}): Promise<string> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.readlink(filepath, undefined, (err: Error | null, target?: string) => {
        if (err) {
          reject(this.wrapError(err, 'readlink', filepath))
        } else {
          resolve(target || '')
        }
      })
    })
  }

  /**
   * Get disk usage for a path
   */
  async du(filepath: string): Promise<number> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.du(filepath, (err: Error | null, size?: number) => {
        if (err) {
          reject(this.wrapError(err, 'du', filepath))
        } else {
          resolve(size || 0)
        }
      })
    })
  }

  /**
   * Back a file with HTTP (lightning-fs specific feature)
   */
  async backFile(filepath: string, options: FileOperationOptions = {}): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.fs.backFile(filepath, undefined, (err: Error | null) => {
        if (err) {
          reject(this.wrapError(err, 'backFile', filepath))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Lightning-FS doesn't have an explicit destroy method
    // but we can mark as uninitialized
    this.initialized = false
  }

  /**
   * Ensure the filesystem is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }
  }

  /**
   * Wrap lightning-fs errors in our standardized error format
   */
  private wrapError(error: any, syscall: string, path?: string): FileSystemError {
    if (error instanceof FileSystemError) {
      return error
    }

    // Extract error information from lightning-fs errors
    const message = error.message || 'Unknown filesystem error'
    let code = error.code || 'UNKNOWN'
    
    // Map common error codes
    if (message.includes('ENOENT') || message.includes('not found')) {
      code = FileSystemErrorCodes.ENOENT
    } else if (message.includes('EEXIST') || message.includes('already exists')) {
      code = FileSystemErrorCodes.EEXIST
    } else if (message.includes('ENOTDIR') || message.includes('not a directory')) {
      code = FileSystemErrorCodes.ENOTDIR
    } else if (message.includes('EISDIR') || message.includes('is a directory')) {
      code = FileSystemErrorCodes.EISDIR
    } else if (message.includes('ENOTEMPTY') || message.includes('not empty')) {
      code = FileSystemErrorCodes.ENOTEMPTY
    }

    return new FileSystemError(message, code, error.errno, path, syscall)
  }
}

/**
 * Factory function to create a new Lightning-FS filesystem instance
 */
export function createLightningFileSystem(options: LightningFSOptions = {}): LightningFileSystem {
  return new LightningFileSystem(options)
}
