import { ref } from 'vue'
import { fileContentStore } from '@webpm/store'
import {
  createSystem,
  createDefaultMapFromCDN,
  createVirtualTypeScriptEnvironment,
} from '@typescript/vfs'
import ts from 'typescript'
import {
  createTsConfigContent,
  createVfsPackageJsonContent,
  createDefaultMainTsContent,
} from '../utils/common-utils'

export function useTypeScriptVFS(editorContent?: string) {
  // State
  const vfsFiles = ref<Map<string, string>>(new Map())
  const vfsDiagnostics = ref<ts.Diagnostic[]>([])
  const isVfsActive = ref(false)
  const vfsError = ref<string>('')
  const tsEnvironment = ref<any>(null)
  const fsMap = ref<Map<string, string>>(new Map())

  // Methods
  const addToTypeScriptVFS = async () => {
    try {
      vfsError.value = ''
      console.log('Adding files to TypeScript VFS...')

      // Create the default TypeScript library files
      console.log('Creating default TypeScript library map...')
      const defaultMap = await createDefaultMapFromCDN(
        { target: ts.ScriptTarget.ES2022 },
        '5.9.2',
        true,
        ts
      )

      // Clear and populate the fsMap
      fsMap.value.clear()
      for (const [key, value] of defaultMap) {
        fsMap.value.set(key, value)
      }

      // Get all TypeScript and JavaScript files from IndexedDB
      const allFiles = await fileContentStore.getAllFiles()
      const relevantFiles = allFiles.filter(
        (file) =>
          file.filePath.endsWith('.ts') ||
          file.filePath.endsWith('.tsx') ||
          file.filePath.endsWith('.d.ts') ||
          file.filePath.endsWith('.js') ||
          file.filePath.endsWith('.jsx') ||
          file.filePath.endsWith('.json') ||
          file.filePath.endsWith('.mts') ||
          file.filePath.endsWith('.cts') ||
          file.filePath.endsWith('.mjs') ||
          file.filePath.endsWith('.cjs')
      )

      console.log(`Found ${relevantFiles.length} relevant files for VFS`)

      // Clear existing VFS files display
      vfsFiles.value.clear()

      // Add files to both VFS display and fsMap
      for (const file of relevantFiles) {
        const vfsPath = `/node_modules/${file.packageName}/${file.filePath}`
        vfsFiles.value.set(vfsPath, file.content)
        fsMap.value.set(vfsPath, file.content)
      }

      // Use content from the Monaco editor or fallback to default content
      const mainTsContent = editorContent || createDefaultMainTsContent()

      vfsFiles.value.set('/main.ts', mainTsContent)
      fsMap.value.set('/main.ts', mainTsContent)

      // Add configuration files
      const tsconfigContent = createTsConfigContent()
      vfsFiles.value.set('/tsconfig.json', tsconfigContent)
      fsMap.value.set('/tsconfig.json', tsconfigContent)

      const packageJsonContent = createVfsPackageJsonContent()
      vfsFiles.value.set('/package.json', packageJsonContent)
      fsMap.value.set('/package.json', packageJsonContent)

      console.log(`Total VFS files: ${vfsFiles.value.size}`)
      console.log(`Total fsMap files: ${fsMap.value.size}`)

      // Debug: Log @types packages specifically
      const typesFiles = Array.from(fsMap.value.keys()).filter((path) =>
        path.includes('@types')
      )
      console.log('Found @types files in VFS:', typesFiles)

      // Create real TypeScript environment and diagnostics
      await createTypeScriptProgram()

      isVfsActive.value = true
    } catch (err) {
      vfsError.value =
        err instanceof Error ? err.message : 'Failed to create TypeScript VFS'
      console.error('VFS Error:', err)
    }
  }

  const createTypeScriptProgram = async () => {
    try {
      console.log('Creating real TypeScript program...')

      // Create the TypeScript system from our fsMap
      const system = createSystem(fsMap.value)

      // Compiler options
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true, // Skip checking .d.ts files to reduce noise
        forceConsistentCasingInFileNames: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noImplicitThis: true,
        exactOptionalPropertyTypes: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true,
        // Enable resolution of .d.ts files
        declaration: true,
        // Better module resolution for types
        resolveJsonModule: true,
        // Reduce noise from missing files
        noResolve: false,
        allowJs: true,
      }

      // Create the virtual TypeScript environment
      const env = createVirtualTypeScriptEnvironment(
        system,
        ['/main.ts'], // Root files
        ts,
        compilerOptions
      )

      // Store the environment for potential future use
      tsEnvironment.value = env

      // Get the language service
      const languageService = env.languageService

      // Get diagnostics for all files
      const allDiagnostics: ts.Diagnostic[] = []

      // Get semantic diagnostics for main.ts
      const semanticDiagnostics =
        languageService.getSemanticDiagnostics('/main.ts')
      allDiagnostics.push(...semanticDiagnostics)

      // Get syntactic diagnostics for main.ts
      const syntacticDiagnostics =
        languageService.getSyntacticDiagnostics('/main.ts')
      allDiagnostics.push(...syntacticDiagnostics)

      // Get compiler option diagnostics
      const compilerOptionsDiagnostics =
        languageService.getCompilerOptionsDiagnostics()
      allDiagnostics.push(...compilerOptionsDiagnostics)

      // Only analyze the main application files, let TypeScript resolve dependencies automatically
      const mainFiles = ['/main.ts', '/tsconfig.json']

      for (const filePath of mainFiles) {
        if (fsMap.value.has(filePath)) {
          try {
            const fileDiagnostics =
              languageService.getSemanticDiagnostics(filePath)
            allDiagnostics.push(...fileDiagnostics)
            console.log(
              `Successfully analyzed ${filePath}: ${fileDiagnostics.length} diagnostics`
            )
          } catch (error) {
            console.warn(`Could not analyze ${filePath}:`, error)
          }
        }
      }

      // Also try to analyze any files that were loaded from the Monaco editor
      for (const [filePath] of vfsFiles.value) {
        // Only analyze non-library files
        if (
          !filePath.includes('/node_modules/') &&
          (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))
        ) {
          try {
            const fileDiagnostics =
              languageService.getSemanticDiagnostics(filePath)
            allDiagnostics.push(...fileDiagnostics)
            console.log(
              `Successfully analyzed user file ${filePath}: ${fileDiagnostics.length} diagnostics`
            )
          } catch (error) {
            console.warn(`Could not analyze user file ${filePath}:`, error)
          }
        }
      }

      // Final deduplication after collecting all diagnostics
      const finalUniqueDiagnostics = allDiagnostics.filter(
        (diagnostic, index, array) => {
          const key = `${diagnostic.file?.fileName || 'global'}-${diagnostic.start || 0}-${diagnostic.messageText}`
          return (
            array.findIndex(
              (d) =>
                `${d.file?.fileName || 'global'}-${d.start || 0}-${d.messageText}` ===
                key
            ) === index
          )
        }
      )

      // Store the diagnostics
      vfsDiagnostics.value = finalUniqueDiagnostics

      console.log(
        `Found ${finalUniqueDiagnostics.length} unique TypeScript diagnostics (${allDiagnostics.length} total before deduplication):`
      )
      finalUniqueDiagnostics.forEach((diagnostic, index) => {
        const message =
          typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : diagnostic.messageText.messageText
        console.log(`${index + 1}. [TS${diagnostic.code}] ${message}`)
        if (diagnostic.file) {
          console.log(`   File: ${diagnostic.file.fileName}`)
        }
      })
    } catch (err) {
      console.error('Failed to create TypeScript program:', err)
      vfsError.value = `Failed to analyze TypeScript files: ${err instanceof Error ? err.message : 'Unknown error'}`
      vfsDiagnostics.value = []
    }
  }

  const updateMainTsContent = async (newContent?: string) => {
    if (!isVfsActive.value) return

    try {
      console.log('Updating main.ts content in VFS...')

      const content =
        newContent || editorContent || createDefaultMainTsContent()

      // Update the content in both display and fsMap
      vfsFiles.value.set('/main.ts', content)
      fsMap.value.set('/main.ts', content)

      // Recreate the TypeScript program with updated content
      await createTypeScriptProgram()

      console.log('Successfully updated main.ts content and re-analyzed')
    } catch (err) {
      console.error('Failed to update main.ts content:', err)
      vfsError.value = `Failed to update content: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }

  const clearVFS = () => {
    vfsFiles.value.clear()
    fsMap.value.clear()
    vfsDiagnostics.value = []
    isVfsActive.value = false
    vfsError.value = ''
    tsEnvironment.value = null
    console.log('Cleared TypeScript VFS')
  }

  return {
    // State
    vfsFiles,
    vfsDiagnostics,
    isVfsActive,
    vfsError,
    tsEnvironment,
    fsMap,

    // Methods
    addToTypeScriptVFS,
    updateMainTsContent,
    clearVFS,
  }
}
