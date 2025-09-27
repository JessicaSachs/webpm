// Testing Example - TypeScript exercises
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Calculator class for testing
class Calculator {
  add(a: number, b: number): number {
    return a + b
  }

  subtract(a: number, b: number): number {
    return a - b
  }

  multiply(a: number, b: number): number {
    return a * b
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero')
    }
    return a / b
  }
}

// Test suite
describe('Calculator', () => {
  let calculator: Calculator

  beforeEach(() => {
    calculator = new Calculator()
  })

  afterEach(() => {
    // Cleanup if needed
  })

  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(calculator.add(2, 3)).toBe(5)
    })

    it('should add negative numbers', () => {
      expect(calculator.add(-2, -3)).toBe(-5)
    })
  })

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(calculator.divide(10, 2)).toBe(5)
    })

    it('should throw error when dividing by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero')
    })
  })
})

// Mock example
class UserService {
  async getUser(id: string): Promise<{ id: string; name: string }> {
    // Mock implementation
    return { id, name: 'John Doe' }
  }
}

describe('UserService', () => {
  it('should return user data', async () => {
    const userService = new UserService()
    const user = await userService.getUser('1')

    expect(user).toEqual({ id: '1', name: 'John Doe' })
  })
})
