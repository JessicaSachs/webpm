import { ref, computed } from 'vue'

interface Example {
  name: string
  description: string
  content: string
  language: string
  filename: string
  mainTsContent?: string
}

// Import all example JSON files
const exampleModules = import.meta.glob('../examples/*.json', {
  eager: true,
}) as Record<string, { default: Record<string, unknown> }>

// Import all main.ts files
const mainTsModules = import.meta.glob('../examples/main/*.ts', {
  eager: true,
  as: 'raw',
}) as Record<string, string>

export const useExamples = () => {
  const examples = ref<Example[]>([])

  // Load all examples
  const loadExamples = async () => {
    const exampleList: Example[] = []

    for (const [path, module] of Object.entries(exampleModules)) {
      const filename = path.split('/').pop()?.replace('.json', '') || ''
      const content = module.default

      // Extract name from package.json or use filename
      const name =
        (typeof content.name === 'string' ? content.name : null) ||
        filename.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

      // Create description based on content
      const description =
        (typeof content.description === 'string'
          ? content.description
          : null) ||
        (content.dependencies
          ? `Dependencies: ${Object.keys(content.dependencies).length}`
          : '') ||
        (content.devDependencies
          ? `Dev Dependencies: ${Object.keys(content.devDependencies).length}`
          : '') ||
        'Package configuration'

      // Look for corresponding main.ts file
      let mainTsContent = ''
      const mainTsPath = `../examples/main/${filename}.ts`
      if (mainTsModules[mainTsPath]) {
        mainTsContent = mainTsModules[mainTsPath] || ''
      }

      exampleList.push({
        name: name || 'Untitled',
        description: description || 'No description',
        content: JSON.stringify(content, null, 2),
        language: 'json',
        filename: filename || 'unknown',
        mainTsContent: mainTsContent || undefined,
      })
    }

    // Sort examples alphabetically
    exampleList.sort((a, b) => a.name.localeCompare(b.name))

    examples.value = exampleList
  }

  // Load examples on composable creation
  loadExamples()
  const selectedExample = ref<Example | null>(examples.value[0])

  const selectExample = (example: Example | null) => {
    selectedExample.value = example
  }

  const getExampleContent = computed(() => {
    return selectedExample.value?.content || ''
  })

  const getExampleLanguage = computed(() => {
    return selectedExample.value?.language || 'json'
  })

  return {
    examples: computed(() => examples.value),
    selectedExample: computed(() => selectedExample.value),
    selectExample,
    getExampleContent,
    getExampleLanguage,
  }
}
