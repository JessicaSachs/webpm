<template>
  <ClientOnly>
    <div class="filesystem-viewer h-full flex">
      <!-- File Tree Sidebar -->
      <div class="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            File System
          </h3>
        </div>
        <div class="p-2">
          <UButton
            icon="i-lucide-plus"
            variant="ghost"
            class="w-full justify-start mb-2"
            @click="addFile"
          >
            Add File
          </UButton>
          <UButton
            icon="i-lucide-folder-plus"
            variant="ghost"
            class="w-full justify-start mb-4"
            @click="addFolder"
          >
            Add Folder
          </UButton>
        </div>
        <div class="overflow-y-auto flex-1 p-2">
          <UTree
            :items="treeItems"
            @select="handleFileSelect"
          />
        </div>
      </div>

      <!-- Editor Area -->
      <div class="flex-1 flex flex-col">
        <div
          v-if="openFiles.length > 0"
          class="flex-1"
        >
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            class="h-full"
            variant="link"
            :ui="{ content: 'h-full z-50', root: 'gap-0.5', list: 'border-0' }"
            :unmount-on-hide="false"
          >
            <template #default="{ item }">
              <div class="flex items-center space-x-2">
                <span class="font-medium">{{ item.name }}</span>
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="error"
                  class="ml-2"
                  @click.stop="closeFile(item.id)"
                />
              </div>
            </template>

            <template #content="{ item }">
              <div class="h-full w-full">
                <ClientOnly>
                  <MonacoEditor
                    v-model="item.content"
                    class="w-full h-full"
                    :lang="getLanguageFromFilename(item.name)"
                    :options="{
                      theme: 'vs-dark',
                      fontSize: 14,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      folding: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true
                    }"
                    @load="onEditorLoad"
                  />
                </ClientOnly>
              </div>
            </template>
          </UTabs>
        </div>

        <div
          v-else
          class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
        >
          <div class="text-center">
            <Icon
              name="i-lucide-file-text"
              class="w-16 h-16 mx-auto mb-4 opacity-50"
            />
            <p class="text-lg">
              Select a file to start editing
            </p>
          </div>
        </div>
      </div>
    </div>
    <template #fallback>
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <Icon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto mb-4"
          />
          <p class="text-gray-500 dark:text-gray-400">
            Loading filesystem viewer...
          </p>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
  expanded?: boolean
}

// State for multiple open files and active tab
const openFiles = ref<FileNode[]>([])
const activeTab = ref<string | number | undefined>(undefined)
const fileTree = reactive<FileNode[]>([
  {
    id: '1',
    name: 'src',
    type: 'folder',
    expanded: true,
    children: [
      {
        id: '2',
        name: 'main.ts',
        type: 'file',
        content: `// Welcome to the filesystem viewer!
console.log('Hello, World!')

function greet(name: string) {
  return \`Hello, \${name}!\`
}

const message = greet('Monaco Editor')
console.log(message)`
      },
      {
        id: '3',
        name: 'utils.ts',
        type: 'file',
        content: `export function formatDate(date: Date): string {
  return date.toLocaleDateString()
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}`
      }
    ]
  },
  {
    id: '4',
    name: 'package.json',
    type: 'file',
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "src/main.ts",
  "scripts": {
    "dev": "tsx src/main.ts",
    "build": "tsc"
  },
  "dependencies": {
    "typescript": "^5.0.0"
  }
}`
  },
  {
    id: '5',
    name: 'README.md',
    type: 'file',
    content: `# My Project

This is a sample project with a filesystem viewer.

## Features

- File tree navigation
- Monaco Editor integration
- Syntax highlighting
- File management

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\``
  }
])

interface TreeItem {
  label: string
  icon?: string
  id: string
  onSelect?: () => void
  type: 'file' | 'folder'
  content?: string
  defaultExpanded?: boolean
  children?: TreeItem[]
}

// Convert FileNode structure to Nuxt UI Tree format
const treeItems = computed(() => {
  const convertToTreeItems = (nodes: FileNode[]): TreeItem[] => {
    return nodes.map((node) => {
      const item: TreeItem = {
        label: node.name,
        id: node.id,
        icon: node.type === 'file' ? getFileIcon(node.name) : undefined,
        type: node.type,
        content: node.content,
        onSelect: node.type === 'file' ? () => handleFileSelect(item) : undefined
      }

      if (node.type === 'folder') {
        item.defaultExpanded = node.expanded
        if (node.children) {
          item.children = convertToTreeItems(node.children)
        }
      }

      return item
    })
  }

  return convertToTreeItems(fileTree)
})

// Convert openFiles to UTabs format
const tabItems = computed(() => {
  return openFiles.value.map(file => ({
    label: file.name,
    value: file.id,
    icon: getFileIcon(file.name),
    name: file.name,
    id: file.id,
    content: file.content
  }))
})

let fileIdCounter = 6

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
      return 'i-vscode-icons-file-type-typescript'
    case 'tsx':
      return 'i-vscode-icons-file-type-typescript'
    case 'js':
      return 'i-vscode-icons-file-type-js'
    case 'jsx':
      return 'i-vscode-icons-file-type-js'
    case 'vue':
      return 'i-vscode-icons-file-type-vue'
    case 'json':
      return 'i-vscode-icons-file-type-json'
    case 'md':
      return 'i-vscode-icons-file-type-markdown'
    case 'css':
      return 'i-vscode-icons-file-type-css'
    case 'html':
      return 'i-vscode-icons-file-type-html'
    default:
      return undefined
  }
}

const handleFileSelect = (item: TreeItem) => {
  if (item.type === 'file') {
    const fileToOpen = {
      id: item.id,
      name: item.label,
      type: item.type,
      content: item.content
    }

    // Check if file is already open
    const existingFileIndex = openFiles.value.findIndex(file => file.id === item.id)

    if (existingFileIndex === -1) {
      // Add new file to tabs
      openFiles.value.push(fileToOpen)
    }

    // Set as active tab
    activeTab.value = item.id
  }
}

const closeFile = (fileId?: string) => {
  if (fileId) {
    // Close specific file
    const fileIndex = openFiles.value.findIndex(file => file.id === fileId)
    if (fileIndex !== -1) {
      openFiles.value.splice(fileIndex, 1)

      // If we closed the active tab, switch to another tab or clear active tab
      if (activeTab.value === fileId) {
        if (openFiles.value.length > 0) {
          // Switch to the next available tab
          const nextFile = openFiles.value[Math.min(fileIndex, openFiles.value.length - 1)]
          activeTab.value = nextFile?.id
        } else {
          activeTab.value = undefined
        }
      }
    }
  } else {
    // Close current active file
    if (activeTab.value && typeof activeTab.value === 'string') {
      closeFile(activeTab.value)
    }
  }
}

const onEditorLoad = (editor: unknown) => {
  console.log('Monaco Editor loaded:', editor)
  console.log(editor.getModel()?.id)
  // Editor is ready, you can add any additional setup here if needed
}

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'vue':
      return 'vue'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'css':
      return 'css'
    case 'html':
      return 'html'
    case 'py':
      return 'python'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'java':
      return 'java'
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp'
    case 'c':
      return 'c'
    default:
      return 'plaintext'
  }
}

const addFile = () => {
  const name = prompt('Enter file name:')
  if (name) {
    const newFile: FileNode = {
      id: String(fileIdCounter++),
      name,
      type: 'file',
      content: ''
    }
    fileTree.push(newFile)
  }
}

const addFolder = () => {
  const name = prompt('Enter folder name:')
  if (name) {
    const newFolder: FileNode = {
      id: String(fileIdCounter++),
      name,
      type: 'folder',
      expanded: false,
      children: []
    }
    fileTree.push(newFolder)
  }
}
</script>
