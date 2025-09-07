/**
 * In-memory cache implementation with TTL support
 */

import type { CacheEntry } from './types'
import { CacheError } from './errors'

export class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private defaultTtl: number

  constructor(defaultTtl = 5 * 60 * 1000) {
    // 5 minutes default
    this.defaultTtl = defaultTtl
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      expired: false,
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
}

/**
 * IndexedDB-based cache for browser environments
 */
export class IndexedDBCache {
  private dbName: string
  private storeName: string
  private defaultTtl: number
  private db: IDBDatabase | null = null

  constructor(
    dbName = 'webpm-cache',
    storeName = 'registry',
    defaultTtl = 5 * 60 * 1000
  ) {
    this.dbName = dbName
    this.storeName = storeName
    this.defaultTtl = defaultTtl
  }

  /**
   * Initialize the IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => {
        reject(new CacheError('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onerror = () => {
        reject(new CacheError('Failed to get from IndexedDB'))
      }

      request.onsuccess = () => {
        const result = request.result as CacheEntry<T> | undefined

        if (!result) {
          resolve(null)
          return
        }

        if (this.isExpired(result)) {
          this.delete(key).catch(() => {}) // Clean up expired entry
          resolve(null)
          return
        }

        resolve(result.data)
      }
    })
  }

  /**
   * Set a value in the cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const entry: CacheEntry<T> & { key: string } = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      expired: false,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(entry)

      request.onerror = () => {
        reject(new CacheError('Failed to set in IndexedDB'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onerror = () => {
        reject(new CacheError('Failed to delete from IndexedDB'))
      }

      request.onsuccess = () => {
        resolve(true)
      }
    })
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => {
        reject(new CacheError('Failed to clear IndexedDB'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
}
