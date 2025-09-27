<template>
  <div class="space-y-6 p-4 max-h-screen overflow-y-auto relative">
    <!-- Example Chooser -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
          <div>
            <h2 class="text-xl font-bold">Package.json Examples</h2>
            <p class="text-sm opacity-70 mt-1">
              Choose from a variety of realistic package.json examples to
              explore different project configurations.
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <ExampleChooser
          :examples="examples"
          @select="selectExample($event.value)"
          class="max-w-md"
        />

        <div
          v-if="selectedExample"
          class="flex items-center gap-2 text-sm opacity-70"
        >
          <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
          <span>{{ selectedExample.description }}</span>
        </div>
      </div>
    </UCard>

    <!-- Untar Demo Section -->
    <UCard v-if="totalExtractedPackages > 0" color="success" variant="outline">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-archive-box" class="w-6 h-6" />
          <div>
            <h2 class="text-xl font-bold">Tarball Extraction Demo</h2>
            <p class="text-sm opacity-70 mt-1">
              Watch the untar functionality in action! Packages are
              automatically extracted from their tarballs.
            </p>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <UCard color="primary" variant="soft">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary-600">
              {{ totalExtractedPackages }}
            </div>
            <div class="text-sm text-primary-600">Packages Extracted</div>
          </div>
        </UCard>
        <UCard color="success" variant="soft">
          <div class="text-center">
            <div class="text-2xl font-bold text-success-600">
              {{ totalExtractedFiles }}
            </div>
            <div class="text-sm text-success-600">Files Extracted</div>
          </div>
        </UCard>
        <UCard color="info" variant="soft">
          <div class="text-center">
            <div class="text-2xl font-bold text-info-600">
              {{ formatFileSize(totalExtractedSize) }}
            </div>
            <div class="text-sm text-info-600">Total Size</div>
          </div>
        </UCard>
      </div>

      <UAlert
        color="success"
        variant="soft"
        title="Untar Process Complete"
        icon="i-heroicons-check-circle"
      >
        <template #description>
          <div class="mt-2">
            <p class="text-sm">
              All package tarballs have been successfully extracted and their
              file structures are now available in the File Explorer below.
            </p>
            <div v-if="extractionStats" class="mt-2 text-sm">
              <div>
                <strong>Average extraction time:</strong>
                {{ formatTime(extractionStats.averageExtractionTime) }}
              </div>
              <div>
                <strong>Fastest extraction:</strong>
                {{ formatTime(extractionStats.fastestExtraction) }}
              </div>
              <div>
                <strong>Slowest extraction:</strong>
                {{ formatTime(extractionStats.slowestExtraction) }}
              </div>
            </div>
          </div>
        </template>
      </UAlert>
    </UCard>

    <!-- Editor and Package Manager Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
      <div class="space-y-4">
        <!-- Header with Example Info -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-heroicons-document-text"
              class="w-5 h-5 opacity-70"
            />
            <div>
              <h3 class="text-lg font-semibold">Code Editor</h3>
              <p class="text-sm opacity-70">
                {{ selectedExample?.name || 'No example selected' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="selectedExample?.mainTsContent"
              color="primary"
              variant="soft"
              size="sm"
            >
              TypeScript Available
            </UBadge>
            <UButton
              v-if="selectedExample"
              @click="saveEditorContent('package')"
              :loading="isSaving"
              size="sm"
              color="primary"
              variant="solid"
            >
              <UIcon name="i-heroicons-check" class="w-4 h-4 mr-1" />
              Save
            </UButton>
          </div>
        </div>

        <!-- Tabs for Package.json and Main.ts -->
        <UTabs
          :items="tabItems"
          :key="`tabs-${selectedExample?.filename}`"
          class="w-full"
        >
          <template #package>
            <div class="h-96">
              <MonacoEditor
                :key="`package-${selectedExample?.filename}`"
                v-model="code"
                :language="getExampleLanguage"
                class="h-full"
                theme="vs-dark"
                :options="editorOptions"
                @editor-mounted="onEditorMounted"
              />
            </div>
          </template>

          <template #main>
            <div class="h-96">
              <MonacoEditor
                v-if="selectedExample?.mainTsContent"
                :key="`main-${selectedExample?.filename}`"
                v-model="mainTsCode"
                language="typescript"
                class="h-full"
                theme="vs-dark"
                :options="editorOptions"
                @editor-mounted="onMainTsEditorMounted"
              />
              <div
                v-else
                icon="i-heroicons-code-bracket"
                title="No TypeScript file available"
                description="This example doesn't have a corresponding main.ts file with TypeScript exercises."
                class="h-full"
              />
            </div>
          </template>
        </UTabs>
      </div>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-cube" class="w-5 h-5 opacity-70" />
            <div>
              <h3 class="text-lg font-semibold">Package Manager</h3>
              <p class="text-sm opacity-70">Install and manage dependencies</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="totalExtractedPackages > 0 ? 'success' : 'neutral'"
              variant="soft"
              size="sm"
            >
              <UIcon name="i-heroicons-check-circle" class="w-3 h-3 mr-1" />
              {{ totalExtractedPackages }} packages
            </UBadge>
          </div>
        </div>
        <UCard class="h-[calc(100%-2.75rem)]">
          <PackageManager
            :key="selectedExample?.name"
            :on-installation-result="handleInstallationResult"
            :on-progress="handleProgress"
            :package-json-content="code"
            :editor-content="mainTsCode"
          />
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import MonacoEditor from '../components/MonacoEditor.vue'
import ExampleChooser from '../components/ExampleChooser.vue'
import PackageManager from '../components/PackageManager.vue'
import { useExamples } from '../composables/useExamples'
import { useMonacoEditor } from '../composables/useMonacoEditor'
import { formatTime, formatFileSize } from '../utils/common-utils'
import type { InstallationResult, UntarProgressEvent } from '@webpm/webpm'
// Note: Import will work once the store is rebuilt
// import { fileContentStore, type StoredFileContent } from '@webpm/store'

// Toast notifications
const toast = useToast()

// Use the examples composable
const { examples, selectedExample, selectExample, getExampleLanguage } =
  useExamples()

// Use the Monaco Editor composable
const {
  code,
  mainTsCode,
  isSaving,
  editorOptions,
  tabItems,
  onEditorMounted,
  onMainTsEditorMounted,
  updateContent,
  saveContent: saveEditorContent,
} = useMonacoEditor({
  onSave: async (content: string, type: 'package' | 'main') => {
    if (!selectedExample.value) return

    try {
      if (type === 'main') {
        selectedExample.value.mainTsContent = content
        toast.add({
          title: 'TypeScript file saved',
          description: 'Main.ts content has been updated successfully',
          color: 'success',
        })
      } else {
        selectedExample.value.content = content
        toast.add({
          title: 'Package.json saved',
          description: 'Package configuration has been updated successfully',
          color: 'success',
        })
      }
    } catch (error) {
      toast.add({
        title: 'Save failed',
        description: 'An error occurred while saving the content',
        color: 'error',
      })
      throw error
    }
  },
})

// Package manager state
const installationResult = ref<InstallationResult | null>(null)

// Untar demo statistics computed from installation result
const totalExtractedPackages = computed(
  () => installationResult.value?.totalPackages || 0
)
const totalExtractedFiles = computed(
  () => installationResult.value?.totalFiles || 0
)
const totalExtractedSize = computed(
  () => installationResult.value?.totalSize || 0
)
const extractionStats = computed(
  () => installationResult.value?.statistics || null
)

// Handle installation progress
const handleProgress = (event: UntarProgressEvent) => {
  console.log('Installation progress:', event.type, event.currentProgress)
}

// Handle installation result
const handleInstallationResult = (result: InstallationResult) => {
  console.log('Installation complete:', result)
  installationResult.value = result
}

// Watch for example selection changes
watch(
  selectedExample,
  async (newExample, oldExample) => {
    if (newExample) {
      console.log('Switching to example:', newExample.name)

      // Only update content if it's a different example
      if (!oldExample || oldExample.filename !== newExample.filename) {
        updateContent(newExample.content, newExample.mainTsContent)
      }
    }
  },
  { immediate: true }
)
</script>
