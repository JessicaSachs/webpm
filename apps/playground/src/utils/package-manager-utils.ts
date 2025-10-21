/**
 * Formats time in milliseconds to a human-readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * Formats file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Determines the content type based on file extension
 */
export function getFileContentType(filePath: string): string {
  if (filePath.endsWith('.ts')) {
    return 'application/typescript'
  } else if (filePath.endsWith('.js')) {
    return 'application/javascript'
  } else if (filePath.endsWith('.json')) {
    return 'application/json'
  } else {
    return 'text/plain'
  }
}

/**
 * Creates a fallback error message for file content display
 */
export function createFileErrorContent(
  filePath: string,
  packageName: string,
  packageVersion: string,
  fileId: string,
  error?: Error
): string {
  if (error) {
    return `// Error loading file content
// File: ${filePath}
// Package: ${packageName}@${packageVersion}
// 
// An error occurred while loading the file content from IndexedDB:
// ${error.message}
//
// Please check the browser console for more details.`
  }

  return `// File: ${filePath}
// Package: ${packageName}@${packageVersion}
// 
// File content not found in IndexedDB storage.
// This could mean:
// 1. The file was too large to store (>1MB)
// 2. The file is not a text file
// 3. The file failed to store during extraction
//
// File ID: ${fileId}`
}

/**
 * Creates TypeScript configuration content for VFS
 */
export function createTsConfigContent(): string {
  return `{
  "rootDir": ".",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "exactOptionalPropertyTypes": true,
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "resolveJsonModule": true
  }
}`
}

/**
 * Creates package.json content for VFS
 */
export function createVfsPackageJsonContent(): string {
  return `{
  "name": "vfs-playground",
  "version": "1.0.0",
  "type": "module",
  "main": "main.ts"
}`
}

/**
 * Creates default main.ts content for VFS
 */
export function createDefaultMainTsContent(): string {
  return `// Main TypeScript file with intentional type errors
const foo: number = 'hello'; // Error: string not assignable to number
console.log(foo);

// Try to use some installed packages (if available)
try {
  // This will cause errors if the packages don't have proper types
  const bar: number = 42; // Fixed: number assigned to number (no error)
  const baz: boolean = 'not a boolean'; // Error: string not assignable to boolean
  
  console.log('Values:', bar, baz);
} catch (error) {
  console.error('Runtime error:', error);
}

// Export something to make this a module
export const testValue = 'This is a test';
`
}
