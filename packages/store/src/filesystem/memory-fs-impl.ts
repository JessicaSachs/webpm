/**
 * Memory-based filesystem implementation
 * 
 * This module provides an in-memory filesystem implementation that can be used
 * for testing, development, or as a fallback when IndexedDB is not available.
 */

import { 
  FileSystemInterface, 
  FileStats, 
  FileOperationOptions, 
  FileSystemError,
  FileSystemErrorCodes 
} from './types.js'

/**
 * In-memory file entry
 */
interface MemoryFileEntry {
  type: 'file'
  content: Uint8Array
  mode: number
  mtime: number
  ctime: number
}

/**
 * In-memory directory entry
 */
interface MemoryDirectoryEntry {
  type: 'directory'
  children: Map<string, MemoryFileEntry | MemoryDirectoryEntry | MemorySymlinkEntry>
  mode: number
  mtime: number
  ctime: number
}

/**
 * In-memory symlink entry
 */
interface MemorySymlinkEntry {
  type: 'symlink'
  target: string
  mode: number
  mtime: number
  ctime: number
}

type MemoryEntry = MemoryFileEntry | MemoryDirectoryEntry | MemorySymlinkEntry

/**
 * Memory filesystem stats implementation
 */
class MemoryFileStats implements FileStats {
  constructor(
    private entry: MemoryEntry,
    private path: string,
    private inode: number
  ) {}

  get type(): 'file' | 'directory' | 'symlink' {
    return this.entry.type
  }

  get size(): number {
    if (this.entry.type === 'file') {
      return this.entry.content.length
    }
    return 0
  }

  get mode(): number {
    return this.entry.mode
  }

  get ino(): number {
    return this.inode
  }

  get mtimeMs(): number {
    return this.entry.mtime
  }

  get ctimeMs(): number {
    return this.entry.ctime
  }

  get uid(): number {
    return 1
  }

  get gid(): number {
    return 1
  }

  get dev(): number {
    return 1
  }

  isFile(): boolean {
    return this.entry.type === 'file'
  }

  isDirectory(): boolean {
    return this.entry.type === 'directory'
  }

  isSymbolicLink(): boolean {
    return this.entry.type === 'symlink'
  }
}

/**
 * Memory-based filesystem implementation
 * 
 * This provides a complete in-memory filesystem that implements the FileSystemInterface.
 * It's useful for testing, development, or as a fallback when persistent storage is not available.
 */
export class MemoryFileSystem implements FileSystemInterface {
  private root: MemoryDirectoryEntry
  private nextInode = 1
  private inodeMap = new Map<string, number>()

  constructor() {
    this.root = {
      type: 'directory',
      children: new Map(),
      mode: 0o755,
      mtime: Date.now(),
      ctime: Date.now()
    }
    this.inodeMap.set('/', this.nextInode++)
  }

  /**
   * Initialize the filesystem (no-op for memory filesystem)
   */
  async init(): Promise<void> {
    // Memory filesystem doesn't need initialization
  }

  /**
   * Read a file's contents
   */
  async readFile(filepath: string, options: FileOperationOptions = {}): Promise<Uint8Array | string> {
    const entry = this.getEntry(filepath)
    
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, open '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'open')
    }

    if (entry.type === 'directory') {
      throw new FileSystemError(`EISDIR: illegal operation on a directory, read`, FileSystemErrorCodes.EISDIR, -21, filepath, 'read')
    }

    if (entry.type === 'symlink') {
      // Follow the symlink
      const target = this.resolveSymlink(filepath, entry.target)
      return this.readFile(target, options)
    }

    if (options.encoding === 'utf8') {
      return new TextDecoder('utf-8').decode(entry.content)
    }

    return entry.content
  }

  /**
   * Write data to a file
   */
  async writeFile(filepath: string, data: string | Uint8Array, options: FileOperationOptions = {}): Promise<void> {
    const normalizedPath = this.normalizePath(filepath)
    const parentPath = this.getParentPath(normalizedPath)
    const filename = this.getBasename(normalizedPath)

    // Ensure parent directory exists
    const parent = this.getEntry(parentPath)
    if (!parent) {
      throw new FileSystemError(`ENOENT: no such file or directory, open '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'open')
    }

    if (parent.type !== 'directory') {
      throw new FileSystemError(`ENOTDIR: not a directory, open '${filepath}'`, FileSystemErrorCodes.ENOTDIR, -20, filepath, 'open')
    }

    // Convert data to Uint8Array if needed
    let content: Uint8Array
    if (typeof data === 'string') {
      content = new TextEncoder().encode(data)
    } else {
      content = data
    }

    // Create or update the file
    const now = Date.now()
    const fileEntry: MemoryFileEntry = {
      type: 'file',
      content,
      mode: options.mode || 0o666,
      mtime: now,
      ctime: parent.children.has(filename) ? (parent.children.get(filename) as MemoryFileEntry).ctime : now
    }

    parent.children.set(filename, fileEntry)
    parent.mtime = now

    // Assign inode if new file
    if (!this.inodeMap.has(normalizedPath)) {
      this.inodeMap.set(normalizedPath, this.nextInode++)
    }
  }

  /**
   * Delete a file
   */
  async unlink(filepath: string, _options: FileOperationOptions = {}): Promise<void> {
    const normalizedPath = this.normalizePath(filepath)
    const parentPath = this.getParentPath(normalizedPath)
    const filename = this.getBasename(normalizedPath)

    const parent = this.getEntry(parentPath)
    if (!parent || parent.type !== 'directory') {
      throw new FileSystemError(`ENOENT: no such file or directory, unlink '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'unlink')
    }

    const entry = parent.children.get(filename)
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, unlink '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'unlink')
    }

    if (entry.type === 'directory') {
      throw new FileSystemError(`EISDIR: illegal operation on a directory, unlink '${filepath}'`, FileSystemErrorCodes.EISDIR, -21, filepath, 'unlink')
    }

    parent.children.delete(filename)
    parent.mtime = Date.now()
    this.inodeMap.delete(normalizedPath)
  }

  /**
   * Read directory contents
   */
  async readdir(filepath: string, options: FileOperationOptions = {}): Promise<string[]> {
    const entry = this.getEntry(filepath)
    
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, scandir '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'scandir')
    }

    if (entry.type !== 'directory') {
      throw new FileSystemError(`ENOTDIR: not a directory, scandir '${filepath}'`, FileSystemErrorCodes.ENOTDIR, -20, filepath, 'scandir')
    }

    return Array.from(entry.children.keys())
  }

  /**
   * Create a directory
   */
  async mkdir(filepath: string, options: FileOperationOptions = {}): Promise<void> {
    const normalizedPath = this.normalizePath(filepath)
    const parentPath = this.getParentPath(normalizedPath)
    const dirname = this.getBasename(normalizedPath)

    const parent = this.getEntry(parentPath)
    if (!parent) {
      throw new FileSystemError(`ENOENT: no such file or directory, mkdir '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'mkdir')
    }

    if (parent.type !== 'directory') {
      throw new FileSystemError(`ENOTDIR: not a directory, mkdir '${filepath}'`, FileSystemErrorCodes.ENOTDIR, -20, filepath, 'mkdir')
    }

    if (parent.children.has(dirname)) {
      throw new FileSystemError(`EEXIST: file already exists, mkdir '${filepath}'`, FileSystemErrorCodes.EEXIST, -17, filepath, 'mkdir')
    }

    const now = Date.now()
    const dirEntry: MemoryDirectoryEntry = {
      type: 'directory',
      children: new Map(),
      mode: options.mode || 0o755,
      mtime: now,
      ctime: now
    }

    parent.children.set(dirname, dirEntry)
    parent.mtime = now
    this.inodeMap.set(normalizedPath, this.nextInode++)
  }

  /**
   * Remove a directory
   */
  async rmdir(filepath: string, _options: FileOperationOptions = {}): Promise<void> {
    const normalizedPath = this.normalizePath(filepath)
    const parentPath = this.getParentPath(normalizedPath)
    const dirname = this.getBasename(normalizedPath)

    const parent = this.getEntry(parentPath)
    if (!parent || parent.type !== 'directory') {
      throw new FileSystemError(`ENOENT: no such file or directory, rmdir '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'rmdir')
    }

    const entry = parent.children.get(dirname)
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, rmdir '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'rmdir')
    }

    if (entry.type !== 'directory') {
      throw new FileSystemError(`ENOTDIR: not a directory, rmdir '${filepath}'`, FileSystemErrorCodes.ENOTDIR, -20, filepath, 'rmdir')
    }

    if (entry.children.size > 0) {
      throw new FileSystemError(`ENOTEMPTY: directory not empty, rmdir '${filepath}'`, FileSystemErrorCodes.ENOTEMPTY, -39, filepath, 'rmdir')
    }

    parent.children.delete(dirname)
    parent.mtime = Date.now()
    this.inodeMap.delete(normalizedPath)
  }

  /**
   * Get file/directory statistics
   */
  async stat(filepath: string, _options: FileOperationOptions = {}): Promise<FileStats> {
    const entry = this.getEntry(filepath, true) // Follow symlinks
    
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, stat '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'stat')
    }

    const normalizedPath = this.normalizePath(filepath)
    const inode = this.inodeMap.get(normalizedPath) || 0

    return new MemoryFileStats(entry, normalizedPath, inode)
  }

  /**
   * Get file/directory statistics (don't follow symlinks)
   */
  async lstat(filepath: string, _options: FileOperationOptions = {}): Promise<FileStats> {
    const entry = this.getEntry(filepath, false) // Don't follow symlinks
    
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, lstat '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'lstat')
    }

    const normalizedPath = this.normalizePath(filepath)
    const inode = this.inodeMap.get(normalizedPath) || 0

    return new MemoryFileStats(entry, normalizedPath, inode)
  }

  /**
   * Rename/move a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldNormalizedPath = this.normalizePath(oldPath)
    const newNormalizedPath = this.normalizePath(newPath)

    const oldEntry = this.getEntry(oldPath)
    if (!oldEntry) {
      throw new FileSystemError(`ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`, FileSystemErrorCodes.ENOENT, -2, oldPath, 'rename')
    }

    // Remove from old location
    const oldParentPath = this.getParentPath(oldNormalizedPath)
    const oldFilename = this.getBasename(oldNormalizedPath)
    const oldParent = this.getEntry(oldParentPath) as MemoryDirectoryEntry
    oldParent.children.delete(oldFilename)

    // Add to new location
    const newParentPath = this.getParentPath(newNormalizedPath)
    const newFilename = this.getBasename(newNormalizedPath)
    const newParent = this.getEntry(newParentPath)
    
    if (!newParent || newParent.type !== 'directory') {
      throw new FileSystemError(`ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`, FileSystemErrorCodes.ENOENT, -2, newPath, 'rename')
    }

    newParent.children.set(newFilename, oldEntry)
    
    // Update inode mapping
    const inode = this.inodeMap.get(oldNormalizedPath)
    if (inode) {
      this.inodeMap.delete(oldNormalizedPath)
      this.inodeMap.set(newNormalizedPath, inode)
    }

    // Update timestamps
    const now = Date.now()
    oldParent.mtime = now
    newParent.mtime = now
    oldEntry.mtime = now
  }

  /**
   * Create a symbolic link
   */
  async symlink(target: string, filepath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filepath)
    const parentPath = this.getParentPath(normalizedPath)
    const filename = this.getBasename(normalizedPath)

    const parent = this.getEntry(parentPath)
    if (!parent || parent.type !== 'directory') {
      throw new FileSystemError(`ENOENT: no such file or directory, symlink '${target}' -> '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'symlink')
    }

    if (parent.children.has(filename)) {
      throw new FileSystemError(`EEXIST: file already exists, symlink '${target}' -> '${filepath}'`, FileSystemErrorCodes.EEXIST, -17, filepath, 'symlink')
    }

    const now = Date.now()
    const symlinkEntry: MemorySymlinkEntry = {
      type: 'symlink',
      target,
      mode: 0o777,
      mtime: now,
      ctime: now
    }

    parent.children.set(filename, symlinkEntry)
    parent.mtime = now
    this.inodeMap.set(normalizedPath, this.nextInode++)
  }

  /**
   * Read a symbolic link
   */
  async readlink(filepath: string, _options: FileOperationOptions = {}): Promise<string> {
    const entry = this.getEntry(filepath, false) // Don't follow symlinks
    
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, readlink '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'readlink')
    }

    if (entry.type !== 'symlink') {
      throw new FileSystemError(`EINVAL: invalid argument, readlink '${filepath}'`, 'EINVAL', -22, filepath, 'readlink')
    }

    return entry.target
  }

  /**
   * Get disk usage for a path
   */
  async du(filepath: string): Promise<number> {
    const entry = this.getEntry(filepath)
    
    if (!entry) {
      throw new FileSystemError(`ENOENT: no such file or directory, du '${filepath}'`, FileSystemErrorCodes.ENOENT, -2, filepath, 'du')
    }

    return this.calculateSize(entry)
  }

  /**
   * Clean up resources (no-op for memory filesystem)
   */
  async destroy(): Promise<void> {
    this.root.children.clear()
    this.inodeMap.clear()
    this.nextInode = 1
  }

  /**
   * Get an entry from the filesystem
   */
  private getEntry(filepath: string, followSymlinks = true): MemoryEntry | null {
    const normalizedPath = this.normalizePath(filepath)
    
    if (normalizedPath === '/') {
      return this.root
    }

    const parts = normalizedPath.split('/').filter(part => part !== '')
    let current: MemoryEntry = this.root

    for (const part of parts) {
      if (current.type !== 'directory') {
        return null
      }

      const next = current.children.get(part)
      if (!next) {
        return null
      }

      if (next.type === 'symlink' && followSymlinks) {
        // Follow symlink
        const target = this.resolveSymlink(this.joinPath(parts.slice(0, parts.indexOf(part) + 1)), next.target)
        const targetEntry = this.getEntry(target, followSymlinks)
        if (!targetEntry) {
          return null
        }
        current = targetEntry
      } else {
        current = next
      }
    }

    return current
  }

  /**
   * Resolve a symlink target relative to the symlink's directory
   */
  private resolveSymlink(symlinkPath: string, target: string): string {
    if (target.startsWith('/')) {
      return target // Absolute path
    }

    const symlinkDir = this.getParentPath(symlinkPath)
    return this.joinPath([symlinkDir, target])
  }

  /**
   * Calculate the total size of an entry (recursive for directories)
   */
  private calculateSize(entry: MemoryEntry): number {
    if (entry.type === 'file') {
      return entry.content.length
    }

    if (entry.type === 'directory') {
      let total = 0
      for (const child of entry.children.values()) {
        total += this.calculateSize(child)
      }
      return total
    }

    return 0 // Symlinks have no size
  }

  /**
   * Normalize a file path
   */
  private normalizePath(filepath: string): string {
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

  /**
   * Get the parent directory path
   */
  private getParentPath(filepath: string): string {
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
  private getBasename(filepath: string): string {
    const normalized = this.normalizePath(filepath)
    const lastSlash = normalized.lastIndexOf('/')
    return normalized.substring(lastSlash + 1)
  }

  /**
   * Join path parts
   */
  private joinPath(parts: string[]): string {
    return this.normalizePath(parts.join('/'))
  }
}

/**
 * Factory function to create a new memory filesystem instance
 */
export function createMemoryFileSystem(): MemoryFileSystem {
  return new MemoryFileSystem()
}
