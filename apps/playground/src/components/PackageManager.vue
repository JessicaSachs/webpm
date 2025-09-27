<template>
  <UCard class="flex flex-col overflow-hidden">
    <!-- Header -->
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="flex items-center gap-2 m-0 text-base font-semibold">
          <span class="text-lg">📦</span>
          Package Manager
        </h3>
        <div class="text-sm">
          <span v-if="isInstalling" class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            Installing...
          </span>
          <span v-else>
            {{ installedPackages.length }}
            {{
              installedPackages.length === 1 ? 'package' : 'packages'
            }}
            installed
          </span>
        </div>
      </div>
    </template>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
      <!-- Package.json Installation Section -->
      <UCard v-if="packageJsonContent" color="blue" variant="outline">
        <template #header>
          <h4 class="text-base font-semibold mb-2">
            Install from Package.json
          </h4>
          <p class="text-sm text-gray-500 m-0">
            Install all dependencies from the current package.json
          </p>
        </template>
        
        <UCard class="mb-4">
          <div class="text-sm text-gray-600 mb-1">
            <strong>Project:</strong> {{ parsedPackageJson?.name || 'Unknown' }}
          </div>
          <div class="text-sm text-gray-600">
            <strong>Dependencies:</strong> {{ dependencyCount.dependencies }} 
            <UBadge
              v-if="dependencyCount.devDependencies"
              color="warning"
              variant="soft"
              class="ml-1"
            >
              +{{ dependencyCount.devDependencies }} dev
            </UBadge>
          </div>
        </UCard>
        
        <UButton 
          @click="installFromPackageJson" 
          color="success"
          :loading="isInstalling"
          :disabled="!hasDependencies"
          size="lg"
          block
        >
          {{
            isInstalling
              ? 'Installing...'
              : `Install ${totalDependencies} Dependencies`
          }}
        </UButton>
      </UCard>

      <!-- Error Display -->
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />
        
      <!-- Installation Result -->
      <UAlert
        v-if="installResult"
        color="success"
        variant="soft"
        title="Installation Complete"
        icon="i-heroicons-check-circle"
      >
        <template #description>
          <div class="flex flex-col gap-2 mt-2">
            <div class="text-sm text-gray-600">
              <strong>Total Time:</strong>
              {{ formatTime(installResult.timings.totalTime) }}
            </div>
            <div class="text-sm text-gray-600">
              <strong>Packages:</strong> {{ installResult.totalPackages }}
            </div>
            <div class="text-sm text-gray-600">
              <strong>Files:</strong> {{ installResult.totalFiles }}
            </div>
          </div>
        </template>
      </UAlert>
      
      <!-- Installed Packages -->

      <!-- File Explorer -->
      <FileExplorer
        :packages="installResult?.allPackages || []"
        :on-file-click="handleFileClick"
      />

      <!-- File Content Display -->
      <UCard
        v-if="selectedFileContent"
        class="mt-6"
        color="neutral"
        variant="outline"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5" />
              <div>
                <h3 class="text-lg font-semibold">File Content</h3>
                <p class="text-sm opacity-70">{{ selectedFileName }}</p>
              </div>
            </div>
            <UButton
              @click="selectedFileContent = null"
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
            >
              Close
            </UButton>
          </div>
        </template>

        <div class="relative">
          <div class="absolute top-2 right-2 z-10">
            <UBadge
              :color="
                selectedFileType?.includes('javascript')
                  ? 'warning'
                  : selectedFileType?.includes('typescript')
                    ? 'primary'
                    : 'neutral'
              "
              variant="soft"
              size="sm"
            >
              {{ selectedFileType }}
            </UBadge>
          </div>
          <pre
            class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed max-h-96 overflow-y-auto"
          ><code>{{ selectedFileContent }}</code></pre>
        </div>
      </UCard>

      <!-- TypeScript VFS Integration -->
      <UCard v-if="installResult" class="mt-6" color="primary" variant="outline">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-code-bracket" class="w-5 h-5" />
              <div>
                <h3 class="text-lg font-semibold">TypeScript VFS Integration</h3>
                <p class="text-sm opacity-70">
                  Create a TypeScript Virtual File System from extracted packages
                </p>
                <p v-if="isVfsActive && props.editorContent" class="text-xs text-green-600 mt-1">
                  🔄 Live editor content loaded as main.ts
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                :color="isVfsActive ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ isVfsActive ? 'Active' : 'Inactive' }}
              </UBadge>
              <UBadge
                v-if="isVfsActive"
                color="primary"
                variant="soft"
                size="sm"
              >
                {{ vfsFiles.size }} files
              </UBadge>
              <UBadge
                v-if="isVfsActive && fsMap.size > vfsFiles.size"
                color="info"
                variant="soft"
                size="sm"
              >
                +{{ fsMap.size - vfsFiles.size }} lib files
              </UBadge>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- VFS Controls -->
          <div class="flex items-center gap-3">
            <UButton
              @click="addToTypeScriptVFS"
              color="primary"
              :loading="false"
              :disabled="!installResult?.allPackages?.length"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
              Add to TypeScript VFS
            </UButton>
            <UButton
              v-if="isVfsActive"
              @click="updateMainTsContent"
              color="primary"
              variant="outline"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
              Refresh Analysis
            </UButton>
            <UButton
              v-if="isVfsActive"
              @click="clearVFS"
              color="neutral"
              variant="outline"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4 mr-2" />
              Clear VFS
            </UButton>
          </div>

          <!-- VFS Error -->
          <UAlert
            v-if="vfsError"
            color="error"
            variant="soft"
            :title="vfsError"
            icon="i-heroicons-exclamation-triangle"
          />

          <!-- VFS Files List -->
          <UCard v-if="isVfsActive && vfsFiles.size > 0" variant="soft">
            <template #header>
              <h4 class="text-base font-semibold">
                Virtual File System ({{ vfsFiles.size }} files)
              </h4>
            </template>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div
                v-for="[path, content] of vfsFiles"
                :key="path"
                class="flex items-center justify-between p-2 bg-white rounded border"
              >
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="
                      path.endsWith('.ts')
                        ? 'i-heroicons-document-text'
                        : path.endsWith('.json')
                          ? 'i-heroicons-document'
                          : 'i-heroicons-code-bracket'
                    "
                    class="w-4 h-4"
                  />
                  <span class="text-sm font-mono">{{ path }}</span>
                </div>
                <UBadge variant="soft" size="sm">
                  {{ Math.round(content.length / 1024) }}KB
                </UBadge>
              </div>
            </div>
          </UCard>

          <!-- TypeScript Diagnostics -->
          <UCard
            v-if="isVfsActive && vfsDiagnostics.length > 0"
            color="warning"
            variant="soft"
          >
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
                <h4 class="text-base font-semibold">
                  TypeScript Diagnostics ({{ vfsDiagnostics.length }} issues)
                </h4>
              </div>
            </template>
            <div class="space-y-3">
              <div
                v-for="(diagnostic, index) in vfsDiagnostics"
                :key="index"
                class="p-3 bg-white rounded border-l-4 border-orange-400"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="text-sm font-semibold text-orange-800">
                      {{ diagnostic.file?.fileName || 'Unknown file' }}
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                      {{ 
                        typeof diagnostic.messageText === 'string' 
                          ? diagnostic.messageText 
                          : diagnostic.messageText?.messageText || 'Unknown error'
                      }}
                    </div>
                    <div v-if="diagnostic.start && diagnostic.file" class="text-xs text-gray-500 mt-1">
                      Position: {{ diagnostic.start }} ({{ diagnostic.length }} chars)
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-3">
                    <UBadge color="warning" variant="soft" size="sm">
                      TS{{ diagnostic.code }}
                    </UBadge>
                    <UBadge 
                      :color="diagnostic.category === 1 ? 'error' : diagnostic.category === 0 ? 'warning' : 'info'" 
                      variant="soft" 
                      size="sm"
                    >
                      {{ diagnostic.category === 1 ? 'Error' : diagnostic.category === 0 ? 'Warning' : 'Info' }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Success Message -->
          <UAlert
            v-if="isVfsActive && vfsDiagnostics.length === 0"
            color="success"
            variant="soft"
            title="No TypeScript Errors"
            description="All files in the VFS are type-safe!"
            icon="i-heroicons-check-circle"
          />
        </div>
      </UCard>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { webpm } from '@webpm/webpm'
import type { InstallationResult, UntarProgressEvent } from '@webpm/webpm'
import { fileContentStore } from '@webpm/store'
import { createSystem, createDefaultMapFromCDN, createVirtualTypeScriptEnvironment } from '@typescript/vfs'
import ts from 'typescript'
import FileExplorer from './FileExplorer.vue'

interface InstalledPackage {
  name: string
  version: string
  files: number
}

interface Props {
  onInstallationResult?: (result: InstallationResult) => void
  onProgress?: (event: UntarProgressEvent) => void
  packageJsonContent?: string
  editorContent?: string
}

const props = defineProps<Props>()

// Reactive state
// File content display state
const selectedFileContent = ref<string | null>(null)
const selectedFileName = ref<string | null>(null)
const selectedFileType = ref<string | null>(null)

const isInstalling = ref(false)
const error = ref('')
const installResult = ref<InstallationResult | null>(null)
const installedPackages = ref<InstalledPackage[]>([])
const fetchedPackages = ref<any[]>([])

// TypeScript VFS state
const vfsFiles = ref<Map<string, string>>(new Map())
const vfsDiagnostics = ref<ts.Diagnostic[]>([])
const isVfsActive = ref(false)
const vfsError = ref<string>('')
const tsEnvironment = ref<any>(null)
const fsMap = ref<Map<string, string>>(new Map())

// Package.json parsing and analysis
const parsedPackageJson = computed(() => {
  if (!props.packageJsonContent) return null
  try {
    return JSON.parse(props.packageJsonContent)
  } catch {
    return null
  }
})

const dependencyCount = computed(() => {
  const pkg = parsedPackageJson.value
  if (!pkg) return { dependencies: 0, devDependencies: 0 }
  
  return {
    dependencies: pkg.dependencies ? Object.keys(pkg.dependencies).length : 0,
    devDependencies: pkg.devDependencies
      ? Object.keys(pkg.devDependencies).length
      : 0,
  }
})

const totalDependencies = computed(() => {
  return (
    dependencyCount.value.dependencies + dependencyCount.value.devDependencies
  )
})

const hasDependencies = computed(() => {
  return totalDependencies.value > 0
})

const installFromPackageJson = async () => {
  if (!parsedPackageJson.value) {
    error.value = 'Invalid package.json content'
    return
  }

  if (!hasDependencies.value) {
    error.value = 'No dependencies found in package.json'
    return
  }

  // Clear previous results
  error.value = ''
  installResult.value = null
  isInstalling.value = true

  try {
    // Use the new library API with proper untar handling
    const result = await webpm.installWithUntarHandler(
      parsedPackageJson.value,
      {
        onProgress: (event: UntarProgressEvent) => {
          // Forward progress events to parent
          if (props.onProgress) {
            props.onProgress(event)
          }
        },
        onComplete: (result: InstallationResult) => {
          // Update local state with final results  
          installResult.value = result

          // Update installed packages list
          installedPackages.value = result.allPackages.map((pkg: any) => {
            const manifest =
              (pkg.extractedFiles.manifest as Record<string, any>) || {}
            return {
              name: manifest.name || pkg.package.name,
              version: manifest.version || pkg.package.version,
              files: pkg.extractedFiles.files.length,
            }
          })

          // Update fetched packages for file explorer
          fetchedPackages.value = result.allPackages

          // Notify parent with complete results
          if (props.onInstallationResult) {
            props.onInstallationResult(result)
          }
        },
        onError: (err: Error) => {
          error.value = err.message
        },
      },
      {
        // Include devDependencies by default when installing from package.json
        includeDevDependencies: true,
        includeOptionalDependencies: true,
        includePeerDependencies: false,
        autoInstallPeers: false,
      }
    )

    // The result is also returned directly, so we can use it here too
    console.log(
      `Installation completed successfully: ${result.totalPackages} packages, ${result.totalFiles} files`
    )
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isInstalling.value = false
  }
}

const formatTime = (ms: number): string => {
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

// Handle file click in FileExplorer
const handleFileClick = async (
  filePath: string,
  packageName: string,
  packageVersion: string
) => {
  try {
    const fileId = `${packageName}@${packageVersion}/${filePath}`
    console.log('Loading file content for:', fileId)

    const storedFile = await fileContentStore.getFileContent(fileId)
    
    if (storedFile) {
      selectedFileContent.value = storedFile.content
      selectedFileName.value = `${packageName}@${packageVersion}/${filePath}`
      selectedFileType.value = storedFile.contentType
      
      console.log(`Loaded file content: ${storedFile.content.length} characters`)
    } else {
      console.warn('File content not found in IndexedDB:', fileId)
      
      // Fallback: show a message that the file wasn't stored
      selectedFileContent.value = `// File: ${filePath}
// Package: ${packageName}@${packageVersion}
// 
// File content not found in IndexedDB storage.
// This could mean:
// 1. The file was too large to store (>1MB)
// 2. The file is not a text file
// 3. The file failed to store during extraction
//
// File ID: ${fileId}`
      
      selectedFileName.value = `${packageName}@${packageVersion}/${filePath}`
      selectedFileType.value = filePath.endsWith('.ts')
        ? 'application/typescript'
        : filePath.endsWith('.js')
          ? 'application/javascript'
          : filePath.endsWith('.json')
            ? 'application/json'
            : 'text/plain'
    }
  } catch (error) {
    console.error('Failed to load file content:', error)
    
    selectedFileContent.value = `// Error loading file content
// File: ${filePath}
// Package: ${packageName}@${packageVersion}
// 
// An error occurred while loading the file content from IndexedDB:
// ${error instanceof Error ? error.message : 'Unknown error'}
//
// Please check the browser console for more details.`
    
    selectedFileName.value = `${packageName}@${packageVersion}/${filePath} (Error)`
    selectedFileType.value = 'text/plain'
  }
}

// TypeScript VFS Integration
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
    const relevantFiles = allFiles.filter(file => 
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
    const mainTsContent = props.editorContent || `// Main TypeScript file with intentional type errors
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
    
    vfsFiles.value.set('/main.ts', mainTsContent)
    fsMap.value.set('/main.ts', mainTsContent)
    
    // Add a basic tsconfig.json
    const tsconfigContent = `{
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
  },

}`
    
    vfsFiles.value.set('/tsconfig.json', tsconfigContent)
    fsMap.value.set('/tsconfig.json', tsconfigContent)
    
    // Add a basic package.json
    const packageJsonContent = `{
  "name": "vfs-playground",
  "version": "1.0.0",
  "type": "module",
  "main": "main.ts"
}`
    
    vfsFiles.value.set('/package.json', packageJsonContent)
    fsMap.value.set('/package.json', packageJsonContent)
    
    console.log(`Total VFS files: ${vfsFiles.value.size}`)
    console.log(`Total fsMap files: ${fsMap.value.size}`)
    
    // Debug: Log @types packages specifically
    const typesFiles = Array.from(fsMap.value.keys()).filter(path => path.includes('@types'))
    console.log('Found @types files in VFS:', typesFiles)
  
    // Create real TypeScript environment and diagnostics
    await createTypeScriptProgram()
    
    isVfsActive.value = true
    
  } catch (err) {
    vfsError.value = err instanceof Error ? err.message : 'Failed to create TypeScript VFS'
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
    const semanticDiagnostics = languageService.getSemanticDiagnostics('/main.ts')
    allDiagnostics.push(...semanticDiagnostics)
    
    // Get syntactic diagnostics for main.ts
    const syntacticDiagnostics = languageService.getSyntacticDiagnostics('/main.ts')
    allDiagnostics.push(...syntacticDiagnostics)
    
    // Get compiler option diagnostics
    const compilerOptionsDiagnostics = languageService.getCompilerOptionsDiagnostics()
    allDiagnostics.push(...compilerOptionsDiagnostics)
    
    
    // Only analyze the main application files, let TypeScript resolve dependencies automatically
    const mainFiles = ['/main.ts', '/tsconfig.json']
    
    for (const filePath of mainFiles) {
      if (fsMap.value.has(filePath)) {
        try {
          const fileDiagnostics = languageService.getSemanticDiagnostics(filePath)
          allDiagnostics.push(...fileDiagnostics)
          console.log(`Successfully analyzed ${filePath}: ${fileDiagnostics.length} diagnostics`)
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error)
        }
      }
    }
    
    // Also try to analyze any files that were loaded from the Monaco editor
    for (const [filePath] of vfsFiles.value) {
      // Only analyze non-library files
      if (!filePath.includes('/node_modules/') && 
          (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
        try {
          const fileDiagnostics = languageService.getSemanticDiagnostics(filePath)
          allDiagnostics.push(...fileDiagnostics)
          console.log(`Successfully analyzed user file ${filePath}: ${fileDiagnostics.length} diagnostics`)
        } catch (error) {
          console.warn(`Could not analyze user file ${filePath}:`, error)
        }
      }
    }
    
    // Final deduplication after collecting all diagnostics
    const finalUniqueDiagnostics = allDiagnostics.filter((diagnostic, index, array) => {
      const key = `${diagnostic.file?.fileName || 'global'}-${diagnostic.start || 0}-${diagnostic.messageText}`
      return array.findIndex(d => 
        `${d.file?.fileName || 'global'}-${d.start || 0}-${d.messageText}` === key
      ) === index
    })
    
    // Store the diagnostics
    vfsDiagnostics.value = finalUniqueDiagnostics
    
    console.log(`Found ${finalUniqueDiagnostics.length} unique TypeScript diagnostics (${allDiagnostics.length} total before deduplication):`)
    finalUniqueDiagnostics.forEach((diagnostic, index) => {
      const message = typeof diagnostic.messageText === 'string' 
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

const clearVFS = () => {
  vfsFiles.value.clear()
  fsMap.value.clear()
  vfsDiagnostics.value = []
  isVfsActive.value = false
  vfsError.value = ''
  tsEnvironment.value = null
  console.log('Cleared TypeScript VFS')
}

// Update main.ts content in the VFS when editor content changes
const updateMainTsContent = async () => {
  if (!isVfsActive.value || !props.editorContent) return
  
  try {
    console.log('Updating main.ts content in VFS...')
    
    // Update the content in both display and fsMap
    vfsFiles.value.set('/main.ts', props.editorContent)
    fsMap.value.set('/main.ts', props.editorContent)
    
    // Recreate the TypeScript program with updated content
    await createTypeScriptProgram()
    
    console.log('Successfully updated main.ts content and re-analyzed')
  } catch (err) {
    console.error('Failed to update main.ts content:', err)
    vfsError.value = `Failed to update content: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}
</script>
