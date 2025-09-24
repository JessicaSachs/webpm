<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'

interface Props {
  modelValue?: string
  language?: string
  theme?: 'vs' | 'vs-dark' | 'hc-black'
  readOnly?: boolean
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'typescript',
  theme: 'vs-dark',
  readOnly: false,
  options: () => ({})
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'editor-mounted': [editor: monaco.editor.IStandaloneCodeEditor]
  'editor-unmounted': []
}>()

const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const editorHeight = ref<string>()

/**
 * Calculates the height from the top of the editorContainer to the bottom of the viewport.
 * Sets editorHeight.value accordingly.
 */
const calculateEditorHeight = () => {
  if (editorContainer.value) {
    const rect = editorContainer.value.getBoundingClientRect()
    // Distance from the top of the editor to the bottom of the viewport
    editorHeight.value = `calc(${window.innerHeight - rect.top}px - 1rem)`
  }
}

// Recalculate on mount and on window resize
onMounted(() => {
  calculateEditorHeight()
  window.addEventListener('resize', calculateEditorHeight)
  nextTick(() => {
    calculateEditorHeight()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateEditorHeight)
})

const initializeEditor = async () => {
  if (!editorContainer.value) return

  editorContainer.value.style.height = editorHeight.value || '400px'

  // Create the editor
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: props.theme,
    readOnly: props.readOnly,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto'
    },
    ...props.options
  })

  // Listen for content changes
  editor.onDidChangeModelContent(() => {
    if (editor) {
      const value = editor.getValue()
      emit('update:modelValue', value)
    }
  })

  // Emit editor mounted event
  emit('editor-mounted', editor)
}

const disposeEditor = () => {
  if (editor) {
    editor.dispose()
    editor = null
    emit('editor-unmounted')
  }
}

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue)
  }
})

watch(() => props.language, (newLanguage) => {
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel()!, newLanguage)
  }
})

watch(() => props.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(newTheme)
  }
})

watch(() => props.readOnly, (newReadOnly) => {
  if (editor) {
    editor.updateOptions({ readOnly: newReadOnly })
  }
})

onMounted(async () => {
  await nextTick()
  await initializeEditor()
})

onUnmounted(() => {
  disposeEditor()
})

// Expose editor instance
defineExpose({
  editor: () => editor,
  getValue: () => editor?.getValue(),
  setValue: (value: string) => editor?.setValue(value),
  focus: () => editor?.focus(),
  dispose: disposeEditor
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  border-radius: 0.375rem;
  overflow: hidden;
}

.monaco-editor-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
</style>
