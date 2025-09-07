/**
 * Browser adapter for Node.js-specific functionality
 */

import { NetworkError, TimeoutError } from './errors'

export interface FetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | FormData
  timeout?: number
  signal?: AbortSignal
}

export interface FetchResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  json(): Promise<unknown>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * Browser-compatible fetch implementation with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResponse> {
  const { timeout = 30000, signal, ...fetchOptions } = options

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  // Combine signals if provided
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    })

    clearTimeout(timeoutId)

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      json: () => response.json(),
      text: () => response.text(),
      arrayBuffer: () => response.arrayBuffer(),
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(
          `Request to ${url} timed out after ${timeout}ms`,
          timeout
        )
      }

      if (error.message.includes('fetch')) {
        throw new NetworkError(`Network error: ${error.message}`, error)
      }
    }

    throw new NetworkError(`Failed to fetch ${url}: ${error}`, error as Error)
  }
}

/**
 * Browser-compatible URL parsing
 */
export function parseUrl(url: string): URL {
  try {
    return new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
}

/**
 * Browser-compatible query string building
 */
export function buildQueryString(
  params: Record<string, string | number | boolean>
): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  }

  return searchParams.toString()
}

/**
 * Browser-compatible HTTP headers
 */
export class WebPMHeaders {
  private headers = new Map<string, string>()

  constructor(init?: Record<string, string> | WebPMHeaders) {
    if (init) {
      if (init instanceof WebPMHeaders) {
        for (const [key, value] of init.headers) {
          this.headers.set(key.toLowerCase(), value)
        }
      } else {
        for (const [key, value] of Object.entries(init)) {
          this.headers.set(key.toLowerCase(), value)
        }
      }
    }
  }

  get(name: string): string | undefined {
    return this.headers.get(name.toLowerCase())
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value)
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase())
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase())
  }

  forEach(callback: (value: string, key: string) => void): void {
    for (const [key, value] of this.headers) {
      callback(value, key)
    }
  }

  entries(): IterableIterator<[string, string]> {
    return this.headers.entries()
  }

  keys(): IterableIterator<string> {
    return this.headers.keys()
  }

  values(): IterableIterator<string> {
    return this.headers.values()
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.headers.entries()
  }
}

/**
 * Browser-compatible environment detection
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined
}

/**
 * Browser-compatible storage interface
 */
export interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

/**
 * Get appropriate storage implementation
 */
export function getStorage(): Storage | null {
  if (isBrowser()) {
    try {
      return localStorage
    } catch {
      return null
    }
  }

  return null
}
