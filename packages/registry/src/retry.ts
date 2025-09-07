/**
 * Retry logic with exponential backoff
 */

import type { RetryOptions } from './types'
import { NetworkError, TimeoutError, RateLimitError } from './errors'

export class RetryManager {
  private options: RetryOptions

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...options,
    }
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error
    let attempt = 0

    while (attempt <= this.options.maxRetries) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        attempt++

        // Don't retry if we've exceeded max retries
        if (attempt > this.options.maxRetries) {
          break
        }

        // Don't retry if the error is not retryable
        if (!this.isRetryableError(error)) {
          break
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, error)

        if (context) {
          console.warn(
            `Retry attempt ${attempt}/${this.options.maxRetries} for ${context} after ${delay}ms:`,
            error
          )
        }

        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof NetworkError) {
      return true
    }

    if (error instanceof TimeoutError) {
      return true
    }

    if (error instanceof RateLimitError) {
      return true
    }

    // Check for network-related errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('fetch')
      )
    }

    return false
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number, error: unknown): number {
    // Special handling for rate limit errors
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000 // Convert to milliseconds
    }

    // Exponential backoff with jitter
    let delay =
      this.options.baseDelay *
      Math.pow(this.options.backoffMultiplier, attempt - 1)

    // Cap at maximum delay
    delay = Math.min(delay, this.options.maxDelay)

    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }

    return Math.floor(delay)
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Utility function to create a retry manager with default options
 */
export function createRetryManager(
  options?: Partial<RetryOptions>
): RetryManager {
  return new RetryManager(options)
}
