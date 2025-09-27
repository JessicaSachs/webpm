<template>
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
            <p
              v-if="isVfsActive && editorContent"
              class="text-xs text-green-600 mt-1"
            >
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
          <UBadge v-if="isVfsActive" color="primary" variant="soft" size="sm">
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
                <div
                  v-if="diagnostic.start && diagnostic.file"
                  class="text-xs text-gray-500 mt-1"
                >
                  Position: {{ diagnostic.start }} ({{
                    diagnostic.length
                  }}
                  chars)
                </div>
              </div>
              <div class="flex items-center gap-2 ml-3">
                <UBadge color="warning" variant="soft" size="sm">
                  TS{{ diagnostic.code }}
                </UBadge>
                <UBadge
                  :color="
                    diagnostic.category === 1
                      ? 'error'
                      : diagnostic.category === 0
                        ? 'warning'
                        : 'info'
                  "
                  variant="soft"
                  size="sm"
                >
                  {{
                    diagnostic.category === 1
                      ? 'Error'
                      : diagnostic.category === 0
                        ? 'Warning'
                        : 'Info'
                  }}
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
</template>

<script setup lang="ts">
import type { InstallationResult } from '@webpm/webpm'
import { useTypeScriptVFS } from '../composables/useTypeScriptVFS'

interface Props {
  installResult?: InstallationResult | null
  editorContent?: string
}

const props = defineProps<Props>()

const {
  vfsFiles,
  vfsDiagnostics,
  isVfsActive,
  vfsError,
  fsMap,
  addToTypeScriptVFS,
  updateMainTsContent,
  clearVFS,
} = useTypeScriptVFS(props.editorContent)
</script>
