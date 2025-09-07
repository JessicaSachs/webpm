/**
 * Registry-specific error classes
 */

export class RegistryError extends Error {
  public readonly statusCode?: number
  public readonly body?: unknown
  public readonly retryable: boolean

  constructor(
    message: string,
    statusCode?: number,
    body?: unknown,
    retryable = false
  ) {
    super(message)
    this.name = 'RegistryError'
    this.statusCode = statusCode
    this.body = body
    this.retryable = retryable
  }
}

export class NetworkError extends RegistryError {
  constructor(message: string, originalError?: Error) {
    super(message, undefined, originalError, true)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends RegistryError {
  constructor(message: string, timeout: number) {
    super(message, 408, { timeout }, true)
    this.name = 'TimeoutError'
  }
}

export class RateLimitError extends RegistryError {
  public readonly retryAfter?: number

  constructor(message: string, retryAfter?: number) {
    super(message, 429, { retryAfter }, true)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class AuthenticationError extends RegistryError {
  constructor(message: string) {
    super(message, 401, undefined, false)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends RegistryError {
  constructor(message: string) {
    super(message, 404, undefined, false)
    this.name = 'NotFoundError'
  }
}

export class CacheError extends Error {
  public readonly cause?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'CacheError'
    this.cause = originalError
  }
}
