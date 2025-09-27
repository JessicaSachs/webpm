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
            {{ installedPackages.length === 1 ? 'package' : 'packages' }}
            installed
          </span>
        </div>
      </div>
    </template>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
      <!-- Package.json Installation Section -->
      <PackageJsonInstallSection
        :package-json-content="packageJsonContent"
        :on-progress="onProgress"
        :on-installation-result="handleInstallationResult"
      />

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

      <!-- File Explorer -->
      <FileExplorer
        :packages="installResult?.allPackages || []"
        :on-file-click="handleFileClick"
      />

      <!-- File Content Display -->
      <FileContentViewer
        :selected-file-content="selectedFileContent"
        :selected-file-name="selectedFileName"
        :selected-file-type="selectedFileType"
        @close="clearFileContent"
      />

      <!-- TypeScript VFS Integration -->
      <TypeScriptVFS
        :install-result="installResult"
        :editor-content="editorContent"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { InstallationResult, UntarProgressEvent } from '@webpm/webpm'
import type {
  PackageManagerProps,
  InstalledPackage,
} from '../types/package-manager'
import { formatTime } from '../utils/common-utils'
import { useFileContentViewer } from '../composables/useFileContentViewer'
import FileExplorer from './FileExplorer.vue'
import PackageJsonInstallSection from './PackageJsonInstallSection.vue'
import FileContentViewer from './FileContentViewer.vue'
import TypeScriptVFS from './TypeScriptVFS.vue'

const props = defineProps<PackageManagerProps>()

// State
const error = ref('')
const installResult = ref<InstallationResult | null>(null)
const installedPackages = ref<InstalledPackage[]>([])
const isInstalling = ref(false)

// File content viewer
const {
  selectedFileContent,
  selectedFileName,
  selectedFileType,
  handleFileClick,
  clearFileContent,
} = useFileContentViewer()

// Handle installation result from PackageJsonInstallSection
const handleInstallationResult = (result: InstallationResult) => {
  installResult.value = result

  // Update installed packages list
  installedPackages.value = result.allPackages.map((pkg: any) => {
    const manifest = (pkg.extractedFiles.manifest as Record<string, any>) || {}
    return {
      name: manifest.name || pkg.package.name,
      version: manifest.version || pkg.package.version,
      files: pkg.extractedFiles.files.length,
    }
  })

  // Clear any previous errors
  error.value = ''

  // Notify parent component
  if (props.onInstallationResult) {
    props.onInstallationResult(result)
  }
}

// Forward progress events
const onProgress = (event: UntarProgressEvent) => {
  if (props.onProgress) {
    props.onProgress(event)
  }
}
</script>
