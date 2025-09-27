<template>
  <div class="tabbed-editor">
    <div class="tabs-container">
      <div class="tabs">
        <div
          v-for="file in files"
          :key="file.id"
          :class="[
            'tab',
            { active: file.id === activeFile, dirty: file.isDirty },
          ]"
          @click="$emit('file-select', file.id)"
        >
          <span class="file-icon">{{ getFileIcon(file.name) }}</span>
          <span class="file-name">{{ file.name }}</span>
          <button
            v-if="files.length > 1"
            class="close-button"
            @click.stop="$emit('file-close', file.id)"
            title="Close file"
          >
            ×
          </button>
        </div>
      </div>
      <button
        class="add-file-button"
        @click="$emit('file-add')"
        title="Add new file"
      >
        +
      </button>
    </div>

    <div class="editor-container">
      <div class="editor-wrapper">
        <textarea
          v-if="currentFile"
          :value="currentFile.content"
          @input="handleInput"
          @keydown="handleKeydown"
          class="code-editor"
          :placeholder="`Enter ${currentFile.language} code...`"
          spellcheck="false"
        />
        <div v-else class="no-file-selected">
          <div class="no-file-icon">📝</div>
          <p>No file selected</p>
          <button @click="$emit('file-add')" class="create-file-button">
            Create new file
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface File {
  id: string
  name: string
  content: string
  language: string
  isDirty: boolean
}

interface Props {
  files: File[]
  activeFile: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'file-change': [fileId: string, content: string]
  'file-select': [fileId: string]
  'file-close': [fileId: string]
  'file-add': []
}>()

const currentFile = computed(() => {
  return props.files.find((f) => f.id === props.activeFile)
})

const getFileIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'ts':
    case 'tsx':
      return '🔷'
    case 'js':
    case 'jsx':
      return '🟨'
    case 'json':
      return '📋'
    case 'vue':
      return '💚'
    case 'css':
      return '🎨'
    case 'html':
      return '🌐'
    case 'md':
      return '📝'
    default:
      return '📄'
  }
}

const inputValue = ref('')

watch(inputValue, (newValue) => {
  if (currentFile.value) {
    if (handleInput.debounceTimer) clearTimeout(handleInput.debounceTimer)
    handleInput.debounceTimer = setTimeout(() => {
      emit('file-change', currentFile.value?.id || '', newValue)
    }, 500)
  }
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  inputValue.value = target.value
}
handleInput.debounceTimer = null as null | ReturnType<typeof setTimeout>

const handleKeydown = (event: KeyboardEvent) => {
  // Handle common editor shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 's':
        event.preventDefault()
        // Save functionality could be added here
        break
      case 'z':
        event.preventDefault()
        // Undo functionality could be added here
        break
      case 'y':
        event.preventDefault()
        // Redo functionality could be added here
        break
    }
  }

  // Handle tab insertion
  if (event.key === 'Tab') {
    event.preventDefault()
    const target = event.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value

    target.value = value.substring(0, start) + '  ' + value.substring(end)
    target.selectionStart = target.selectionEnd = start + 2

    if (currentFile.value) {
      emit('file-change', currentFile.value.id, target.value)
    }
  }
}
</script>

<style scoped>
.tabbed-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

.tabs-container {
  display: flex;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  overflow-x: auto;
}

.tabs {
  display: flex;
  flex: 1;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #161b22;
  border-right: 1px solid #30363d;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: 120px;
  max-width: 200px;
  position: relative;
}

.tab:hover {
  background: #21262d;
}

.tab.active {
  background: #0d1117;
  color: #f0f6fc;
}

.tab.dirty::after {
  content: '';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 6px;
  height: 6px;
  background: #f85149;
  border-radius: 50%;
}

.file-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-button {
  background: none;
  border: none;
  color: #7d8590;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 3px;
  font-size: 1.2rem;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-button:hover {
  background: #30363d;
  color: #f0f6fc;
}

.add-file-button {
  background: none;
  border: none;
  color: #7d8590;
  cursor: pointer;
  padding: 0.75rem 1rem;
  font-size: 1.2rem;
  transition: all 0.2s;
  border-left: 1px solid #30363d;
}

.add-file-button:hover {
  background: #21262d;
  color: #f0f6fc;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-wrapper {
  flex: 1;
  position: relative;
}

.code-editor {
  width: 100%;
  height: 100%;
  background: #0d1117;
  color: #e6edf3;
  border: none;
  outline: none;
  padding: 1rem;
  font-family:
    'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
    monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  tab-size: 2;
}

.code-editor::placeholder {
  color: #7d8590;
}

.no-file-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #7d8590;
  text-align: center;
  padding: 2rem;
}

.no-file-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-file-selected p {
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
}

.create-file-button {
  background: #238636;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-file-button:hover {
  background: #2ea043;
}

/* Scrollbar styling */
.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-track {
  background: #161b22;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 2px;
}

.tabs-container::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
