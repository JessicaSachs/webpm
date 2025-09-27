// Type Roots Example - TypeScript exercises
// Demonstrating TypeScript declaration files and type definitions

// Custom type definitions
declare global {
  interface Window {
    myCustomProperty: string
  }
}

// Module declarations
declare module 'custom-module' {
  export function customFunction(): string
  export const customConstant: number
}

// Ambient declarations
declare const process: {
  env: {
    NODE_ENV: string
    PORT?: string
  }
}

// Type augmentation
interface Array<T> {
  customMethod(): T[]
}

// Implementation
Array.prototype.customMethod = function <T>(this: T[]): T[] {
  return this.filter((item, index) => this.indexOf(item) === index)
}

// Usage
const numbers = [1, 2, 2, 3, 3, 4]
const unique = numbers.customMethod()
console.log('Unique numbers:', unique)

// Export types
export type CustomType = {
  id: number
  name: string
  optional?: boolean
}

export interface CustomInterface {
  method(): void
  property: string
}
