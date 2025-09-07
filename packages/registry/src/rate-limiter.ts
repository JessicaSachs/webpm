/**
 * Rate limiting implementation
 */

import type { RateLimitState } from './types'
import { RateLimitError } from './errors'

export class RateLimiter {
  private state: RateLimitState
  private requestsPerMinute: number
  private burstLimit: number

  constructor(requestsPerMinute: number, burstLimit?: number) {
    this.requestsPerMinute = requestsPerMinute
    this.burstLimit = burstLimit ?? Math.max(requestsPerMinute / 10, 1)
    this.state = {
      requestCount: 0,
      windowStart: Date.now(),
      lastRequest: 0,
      burstAllowance: this.burstLimit,
    }
  }

  /**
   * Check if a request is allowed and update the rate limit state
   */
  async checkRateLimit(): Promise<void> {
    const now = Date.now()
    const windowDuration = 60 * 1000 // 1 minute

    // Reset window if it has expired
    if (now - this.state.windowStart >= windowDuration) {
      this.state.requestCount = 0
      this.state.windowStart = now
      this.state.burstAllowance = this.burstLimit
    }

    // Check if we're within the rate limit
    if (this.state.requestCount >= this.requestsPerMinute) {
      // Check if we have burst allowance
      if (this.state.burstAllowance <= 0) {
        const timeUntilReset = windowDuration - (now - this.state.windowStart)
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds`,
          Math.ceil(timeUntilReset / 1000)
        )
      }

      // Use burst allowance
      this.state.burstAllowance--
    }

    // Update state
    this.state.requestCount++
    this.state.lastRequest = now
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    requestsRemaining: number
    windowResetTime: number
    burstAllowance: number
  } {
    const now = Date.now()
    const windowDuration = 60 * 1000
    const timeUntilReset = Math.max(
      0,
      windowDuration - (now - this.state.windowStart)
    )

    return {
      requestsRemaining: Math.max(
        0,
        this.requestsPerMinute - this.state.requestCount
      ),
      windowResetTime: now + timeUntilReset,
      burstAllowance: this.state.burstAllowance,
    }
  }

  /**
   * Reset the rate limit state
   */
  reset(): void {
    const now = Date.now()
    this.state = {
      requestCount: 0,
      windowStart: now,
      lastRequest: 0,
      burstAllowance: this.burstLimit,
    }
  }
}
