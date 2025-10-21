/**
 * Generic filesystem abstraction types for webpm persistence layer
 * 
 * This module provides a standardized interface for filesystem operations
 * that can be implemented by various filesystem libraries like lightning-fs,
 * node's fs module, or other browser-compatible filesystem implementations.
 */

/**
 * File statistics interface - simplified version of Node.js fs.Stats
 */
export interface FileStats {
  /** File type: 'file', 'directory', or 'symlink' */
  type: 'file' | 'directory' | 'symlink'
  /** File size in bytes */
  size: number
  /** File mode/permissions */
  mode: number
  /** Inode number */
  ino: number | string | bigint
  /** Modification time in milliseconds */
  mtimeMs: number
  /** Creation time in milliseconds (optional) */
  ctimeMs?: number
  /** User ID (optional) */
  uid?: number
  /** Group ID (optional) */
  gid?: number
  /** Device ID (optional) */
  dev?: number

  /** Check if this is a file */
  isFile(): boolean
  /** Check if this is a directory */
  isDirectory(): boolean
  /** Check if this is a symbolic link */
  isSymbolicLink(): boolean
}

/**
 * Options for file operations
 */
export interface FileOperationOptions {
  /** Text encoding (only 'utf8' is commonly supported) */
  encoding?: 'utf8'
  /** File mode/permissions for creation operations */
  mode?: number
  /** Additional flags or options specific to the implementation */
  [key: string]: any
}

/**
 * Directory entry information
 */
export interface DirectoryEntry {
  /** Entry name */
  name: string
  /** Entry type */
  type: 'file' | 'directory' | 'symlink'
}

/**
 * Generic filesystem interface that can be implemented by various filesystem libraries
 * 
 * This interface provides the core filesystem operations needed by webpm for
 * dependency persistence. It's designed to be compatible with both lightning-fs
 * and other filesystem implementations.
 */
export interface FileSystemInterface {
  /**
   * Initialize the filesystem (if needed)
   * @param name Optional name for the filesystem instance
   * @param options Optional configuration options
   */
  init?(name?: string, options?: any): Promise<void>

  /**
   * Read a file's contents
   * @param filepath Path to the file
   * @param options Read options
   * @returns File contents as Uint8Array or string (if encoding specified)
   */
  readFile(filepath: string, options?: FileOperationOptions): Promise<Uint8Array | string>

  /**
   * Write data to a file
   * @param filepath Path to the file
   * @param data Data to write (string or Uint8Array)
   * @param options Write options
   */
  writeFile(filepath: string, data: string | Uint8Array, options?: FileOperationOptions): Promise<void>

  /**
   * Delete a file
   * @param filepath Path to the file
   * @param options Delete options
   */
  unlink(filepath: string, options?: FileOperationOptions): Promise<void>

  /**
   * Read directory contents
   * @param filepath Path to the directory
   * @param options Read options
   * @returns Array of entry names or DirectoryEntry objects
   */
  readdir(filepath: string, options?: FileOperationOptions): Promise<string[] | DirectoryEntry[]>

  /**
   * Create a directory
   * @param filepath Path to the directory
   * @param options Creation options
   */
  mkdir(filepath: string, options?: FileOperationOptions): Promise<void>

  /**
   * Remove a directory
   * @param filepath Path to the directory
   * @param options Removal options
   */
  rmdir(filepath: string, options?: FileOperationOptions): Promise<void>

  /**
   * Get file/directory statistics
   * @param filepath Path to the file or directory
   * @param options Stat options
   * @returns File statistics
   */
  stat(filepath: string, options?: FileOperationOptions): Promise<FileStats>

  /**
   * Get file/directory statistics (don't follow symlinks)
   * @param filepath Path to the file or directory
   * @param options Stat options
   * @returns File statistics
   */
  lstat?(filepath: string, options?: FileOperationOptions): Promise<FileStats>

  /**
   * Rename/move a file or directory
   * @param oldPath Current path
   * @param newPath New path
   */
  rename?(oldPath: string, newPath: string): Promise<void>

  /**
   * Create a symbolic link
   * @param target Target path
   * @param filepath Link path
   */
  symlink?(target: string, filepath: string): Promise<void>

  /**
   * Read a symbolic link
   * @param filepath Path to the symbolic link
   * @param options Read options
   * @returns Target path
   */
  readlink?(filepath: string, options?: FileOperationOptions): Promise<string>

  /**
   * Get disk usage for a path
   * @param filepath Path to check
   * @returns Size in bytes
   */
  du?(filepath: string): Promise<number>

  /**
   * Back a file with HTTP (lightning-fs specific feature)
   * @param filepath Path to the file
   * @param options Backing options
   */
  backFile?(filepath: string, options?: FileOperationOptions): Promise<void>

  /**
   * Clean up resources (if needed)
   */
  destroy?(): Promise<void>
}

/**
 * Configuration options for filesystem implementations
 */
export interface FileSystemConfig {
  /** Filesystem type identifier */
  type: 'lightning-fs' | 'memory' | 'indexeddb' | 'node-fs' | 'custom'
  /** Optional name for the filesystem instance */
  name?: string
  /** Implementation-specific options */
  options?: Record<string, any>
}

/**
 * Error codes that filesystem implementations should use
 */
export const FileSystemErrorCodes = {
  ENOENT: 'ENOENT', // No such file or directory
  EEXIST: 'EEXIST', // File exists
  ENOTDIR: 'ENOTDIR', // Not a directory
  EISDIR: 'EISDIR', // Is a directory
  ENOTEMPTY: 'ENOTEMPTY', // Directory not empty
  EPERM: 'EPERM', // Operation not permitted
  EACCES: 'EACCES', // Permission denied
} as const

/**
 * Custom error class for filesystem operations
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public errno?: number,
    public path?: string,
    public syscall?: string
  ) {
    super(message)
    this.name = 'FileSystemError'
  }
}
