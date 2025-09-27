import { ref, computed, watch } from 'vue'

export interface MonacoEditorOptions {
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval'
  minimap?: { enabled: boolean }
  scrollBeyondLastLine?: boolean
  automaticLayout?: boolean
  formatOnPaste?: boolean
  formatOnType?: boolean
}

export interface EditorTab {
  slot: string
  key: string
  label: string
  icon: string
}

export interface UseMonacoEditorOptions {
  defaultEditorOptions?: MonacoEditorOptions
  onSave?: (content: string, type: 'package' | 'main') => void
}

export function useMonacoEditor(options: UseMonacoEditorOptions = {}) {
  // Editor content state
  const code = ref<string>('')
  const mainTsCode = ref<string>('')
  const output = ref<string>(
    'Select an example to see the package.json content here...'
  )
  const isSaving = ref<boolean>(false)

  // Default editor options
  const defaultOptions: MonacoEditorOptions = {
    wordWrap: 'on',
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    formatOnPaste: true,
    formatOnType: true,
    ...options.defaultEditorOptions,
  }

  // Editor options
  const editorOptions = computed(() => defaultOptions)

  // Tab items for dual editor setup (package.json + main.ts)
  const tabItems = computed<EditorTab[]>(() => [
    {
      slot: 'package',
      key: 'package',
      label: 'Package.json',
      icon: 'i-heroicons-document-text',
    },
    {
      slot: 'main',
      key: 'main',
      label: 'Main.ts',
      icon: 'i-heroicons-code-bracket',
    },
  ])

  // Editor mount handlers
  const onEditorMounted = (editor: any) => {
    console.log('Monaco editor mounted:', editor)

    // Add format document keybinding (Ctrl/Cmd+S)
    editor.addCommand(1 | 2, () => {
      editor.getAction('editor.action.formatDocument')?.run()
    })
  }

  const onMainTsEditorMounted = (editor: any) => {
    console.log('Main.ts Monaco editor mounted:', editor)

    // Add format document keybinding (Ctrl/Cmd+S)
    editor.addCommand(1 | 2, () => {
      editor.getAction('editor.action.formatDocument')?.run()
    })
  }

  // Watch for code changes to update output (JSON validation)
  watch(
    code,
    (newCode) => {
      if (!newCode) return

      try {
        const parsed = JSON.parse(newCode)
        output.value = `Valid JSON Package Configuration:\n\n${JSON.stringify(parsed, null, 2)}`
      } catch (error) {
        output.value = `JSON Parse Error: ${error instanceof Error ? error.message : 'Invalid JSON'}\n\nCurrent content:\n${newCode}`
      }
    },
    { immediate: true }
  )

  // Content management methods
  const updateContent = (packageContent: string, mainTsContent?: string) => {
    code.value = packageContent
    mainTsCode.value = mainTsContent || ''
    output.value = `Loaded content\n\n${packageContent}`
  }

  const saveContent = async (type: 'package' | 'main' = 'package') => {
    if (isSaving.value) return

    isSaving.value = true

    try {
      const content = type === 'package' ? code.value : mainTsCode.value

      if (options.onSave) {
        await options.onSave(content, type)
      }

      console.log(`${type} content saved successfully`)
    } catch (error) {
      console.error('Save failed:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // Content validation
  const isValidJson = computed(() => {
    if (!code.value) return false

    try {
      JSON.parse(code.value)
      return true
    } catch {
      return false
    }
  })

  const hasMainTsContent = computed(() => {
    return mainTsCode.value.trim().length > 0
  })

  return {
    // State
    code,
    mainTsCode,
    output,
    isSaving,

    // Computed
    editorOptions,
    tabItems,
    isValidJson,
    hasMainTsContent,

    // Methods
    onEditorMounted,
    onMainTsEditorMounted,
    updateContent,
    saveContent,
  }
}
