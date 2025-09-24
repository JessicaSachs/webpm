// Left-pad Example - TypeScript exercises
// A simple utility function with proper typing

function leftPad(str: string, length: number, padChar: string = ' '): string {
  if (str.length >= length) {
    return str
  }
  
  const padding = padChar.repeat(length - str.length)
  return padding + str
}

// Generic version
function leftPadGeneric<T>(value: T, length: number, padChar: string = ' '): string {
  const str = String(value)
  if (str.length >= length) {
    return str
  }
  
  const padding = padChar.repeat(length - str.length)
  return padding + str
}

// Usage examples
console.log(leftPad('42', 5))        // "   42"
console.log(leftPad('42', 5, '0'))   // "00042"
console.log(leftPadGeneric(42, 5, '0')) // "00042"

// Export for use in other modules
export { leftPad, leftPadGeneric }
