import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { log, logger, createLogger, Logger } from '..'

// Mock consola to avoid actual console output during tests
vi.mock('consola', () => ({
  consola: {
    withTag: vi.fn(() => ({
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      time: vi.fn(),
      timeEnd: vi.fn(),
      withDefaults: vi.fn(() => ({
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        debug: vi.fn(),
        time: vi.fn(),
        timeEnd: vi.fn(),
        withDefaults: vi.fn(),
      })),
      level: 3,
    })),
  },
}))

describe('@webpm/logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('backward compatibility', () => {
    it('prints a message with legacy log function', () => {
      log('hello')
      // The legacy function should still work
      expect(log).toBeDefined()
    })
  })

  describe('Logger class', () => {
    it('creates a logger with default configuration', () => {
      const testLogger = createLogger()
      expect(testLogger).toBeInstanceOf(Logger)
    })

    it('creates a logger with custom tag', () => {
      const testLogger = createLogger({ tag: 'test-module' })
      expect(testLogger).toBeInstanceOf(Logger)
    })

    it('creates a logger with custom log level', () => {
      const testLogger = createLogger({ level: 1 })
      expect(testLogger).toBeInstanceOf(Logger)
    })

    it('creates a child logger with additional context', () => {
      const testLogger = createLogger({ tag: 'parent' })
      const childLogger = testLogger.child({ userId: '123', requestId: 'abc' })
      expect(childLogger).toBeInstanceOf(Logger)
    })

    it('creates a logger with a new tag', () => {
      const testLogger = createLogger({ tag: 'parent' })
      const taggedLogger = testLogger.withTag('child')
      expect(taggedLogger).toBeInstanceOf(Logger)
    })

    it('creates a logger with a new log level', () => {
      const testLogger = createLogger({ tag: 'test' })
      const leveledLogger = testLogger.withLevel(2)
      expect(leveledLogger).toBeInstanceOf(Logger)
    })
  })

  describe('default logger instance', () => {
    it('exports a default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger)
    })

    it('has all required logging methods', () => {
      expect(typeof logger.log).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.success).toBe('function')
      expect(typeof logger.debug).toBe('function')
    })

    it('has utility methods', () => {
      expect(typeof logger.time).toBe('function')
      expect(typeof logger.timeEnd).toBe('function')
      expect(typeof logger.withTag).toBe('function')
      expect(typeof logger.withLevel).toBe('function')
      expect(typeof logger.child).toBe('function')
    })
  })

  describe('error handling', () => {
    it('handles Error objects in error method', () => {
      const testLogger = createLogger()
      const error = new Error('Test error')

      // Should not throw
      expect(() =>
        testLogger.error('Something went wrong', error)
      ).not.toThrow()
    })

    it('handles non-Error objects in error method', () => {
      const testLogger = createLogger()

      // Should not throw
      expect(() =>
        testLogger.error('Something went wrong', 'string error')
      ).not.toThrow()
    })

    it('handles error method without error parameter', () => {
      const testLogger = createLogger()

      // Should not throw
      expect(() => testLogger.error('Something went wrong')).not.toThrow()
    })
  })
})
