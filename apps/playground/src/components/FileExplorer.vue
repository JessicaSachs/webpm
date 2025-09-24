<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h4 class="text-base font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-folder" class="w-5 h-5" />
          File Explorer
        </h4>
      </div>
      <!-- Search Input -->
      <div v-if="treeItems.length > 0" class="pt-2">
        <UInput
          v-model="searchQuery"
          placeholder="Search files and folders..."
          icon="i-heroicons-magnifying-glass"
          size="sm"
          clearable
        />
      </div>
    </template>

    <div v-if="treeItems.length === 0" class="text-sm p-4">
      <UIcon
        name="i-heroicons-folder-open"
        class="w-8 h-8 mb-2 text-gray-400"
      />
      <p class="m-0 text-gray-500">
        No files to display. Install packages to see their file structure.
      </p>
    </div>

    <div v-else class="max-h-96 overflow-y-auto">
      <UTree
        :items="filteredTreeItems"
        :expanded="expandedItems"
        @update:expanded="expandedItems = $event"
        expanded-icon="i-heroicons-folder-open"
        collapsed-icon="i-heroicons-folder"
        class="file-explorer-tree"
      >
        <template #item="{ item }">
          <div 
            class="flex gap-2 w-full text-left cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
            :class="{ 'cursor-default': item.children }"
            @click="handleFileClick(item)"
          >
            <UIcon
              :name="getFileIcon(item)"
              class="w-4 h-4 flex-shrink-0"
              :class="getFileIconColor(item)"
            />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span v-if="item.size" class="text-xs text-gray-500 ml-2">
              {{ formatFileSize(item.size) }}
            </span>
          </div>
        </template>
      </UTree>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FetchedPackage } from '@webpm/webpm'

interface FileTreeItem {
  label: string
  children?: FileTreeItem[]
  size?: number
  type?: string
  path?: string
  key?: string
  packageName?: string
  packageVersion?: string
  isFile?: boolean
  defaultExpanded?: boolean
}

interface Props {
  packages?: FetchedPackage[]
  onFileClick?: (filePath: string, packageName: string, packageVersion: string) => void
}

const props = defineProps<Props>()

const searchQuery = ref('')
const expandedItems = ref<string[]>([])

// Handle file click
const handleFileClick = (item: FileTreeItem) => {
  // Only handle clicks on files, not folders
  if (item.children || !item.isFile || !item.path || !item.packageName || !item.packageVersion) {
    return
  }
  
  console.log('File clicked:', item.path, item.packageName, item.packageVersion)
  
  if (props.onFileClick) {
    props.onFileClick(item.path, item.packageName, item.packageVersion)
  }
}

// Convert package files to tree structure
const treeItems = computed(() => {
  if (!props.packages || props.packages.length === 0) {
    return []
  }

  const rootStructure: Record<string, any> = {}

  // Process each package
  for (const pkg of props.packages) {
    if (!pkg.extractedFiles?.files) continue

    const packageName = pkg.package.name
    const packageVersion = pkg.package.version

    // Create package root node
    if (!rootStructure[packageName]) {
      rootStructure[packageName] = {
        label: `${packageName}@${packageVersion}`,
        children: {},
        type: 'package',
        defaultExpanded: true,
      }
    }

    // Process files for this package
    for (const file of pkg.extractedFiles.files) {
      const pathParts = file.name.split('/').filter((part) => part.length > 0)
      let current = rootStructure[packageName].children

      // Build nested structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (!current[part]) {
          current[part] = {
            label: part,
            children: {},
            type: 'folder',
            defaultExpanded: false,
          }
        }
        current = current[part].children
      }

      // Add file
      const fileName = pathParts[pathParts.length - 1]
      if (fileName) {
        current[fileName] = {
          label: fileName,
          size: file.size,
          type: getFileType(fileName),
          path: file.name,
          packageName,
          packageVersion,
          isFile: true,
        }
      }
    }
  }

  // Convert to array format for UTree
  return convertToTreeArray(rootStructure)
})

// Convert nested object to tree array format
function convertToTreeArray(
  structure: Record<string, any>,
  parentKey: string = ''
): FileTreeItem[] {
  const result: FileTreeItem[] = []

  for (const [key, value] of Object.entries(structure)) {
    const itemKey = parentKey ? `${parentKey}.${key}` : key
    const item: FileTreeItem = {
      label: value.label || key,
      size: value.size,
      type: value.type,
      path: value.path,
      packageName: value.packageName,
      packageVersion: value.packageVersion,
      isFile: value.isFile,
      defaultExpanded: value.defaultExpanded,
      key: itemKey,
    }

    if (value.children && Object.keys(value.children).length > 0) {
      item.children = convertToTreeArray(value.children, itemKey)
    }

    result.push(item)
  }

  return result.sort((a, b) => {
    // Sort folders first, then files
    if (a.children && !b.children) return -1
    if (!a.children && b.children) return 1
    return a.label.localeCompare(b.label)
  })
}

// Filter tree items based on search query
const filteredTreeItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return treeItems.value
  }

  const query = searchQuery.value.toLowerCase()

  const filterItems = (items: FileTreeItem[]): FileTreeItem[] => {
    const filtered: FileTreeItem[] = []

    for (const item of items) {
      const matchesQuery = item.label.toLowerCase().includes(query)
      let filteredChildren: FileTreeItem[] = []

      if (item.children) {
        filteredChildren = filterItems(item.children)
      }

      // Include item if it matches or has matching children
      if (matchesQuery || filteredChildren.length > 0) {
        filtered.push({
          ...item,
          children:
            filteredChildren.length > 0 ? filteredChildren : item.children,
          defaultExpanded: matchesQuery || filteredChildren.length > 0,
        })
      }
    }

    return filtered
  }

  return filterItems(treeItems.value)
})

// Get file icon based on file type
function getFileIcon(item: FileTreeItem): string {
  if (item.children) {
    return 'i-heroicons-folder'
  }

  const extension = item.label.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'i-vscode-icons-file-type-js'
    case 'ts':
    case 'tsx':
      return 'i-vscode-icons-file-type-typescript'
    case 'vue':
      return 'i-vscode-icons-file-type-vue'
    case 'json':
      return 'i-vscode-icons-file-type-json'
    case 'css':
    case 'scss':
    case 'sass':
      return 'i-vscode-icons-file-type-css'
    case 'html':
      return 'i-vscode-icons-file-type-html'
    case 'md':
      return 'i-vscode-icons-file-type-markdown'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'i-vscode-icons-file-type-image'
    case 'txt':
      return 'i-vscode-icons-file-type-text'
    case 'yml':
    case 'yaml':
      return 'i-vscode-icons-file-type-yaml'
    case 'xml':
      return 'i-vscode-icons-file-type-xml'
    default:
      return 'i-heroicons-document'
  }
}

// Get file icon color
function getFileIconColor(item: FileTreeItem): string {
  if (item.children) {
    return 'text-blue-500'
  }

  const extension = item.label.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'text-yellow-500'
    case 'ts':
    case 'tsx':
      return 'text-blue-600'
    case 'vue':
      return 'text-green-500'
    case 'json':
      return 'text-yellow-600'
    case 'css':
    case 'scss':
    case 'sass':
      return 'text-pink-500'
    case 'html':
      return 'text-orange-500'
    case 'md':
      return 'text-gray-600'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'text-purple-500'
    default:
      return 'text-gray-500'
  }
}

// Get file type
function getFileType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension || 'file'
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.file-explorer-tree {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.file-explorer-tree :deep(.tree-item) {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.file-explorer-tree :deep(.tree-item:hover) {
  background-color: rgb(249 250 251);
  border-radius: 0.375rem;
}
</style>
