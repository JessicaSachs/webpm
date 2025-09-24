# Playground Components

## ExampleChooser

A searchable dropdown component built with Nuxt UI that allows users to select from various package.json examples.

### Features

- **Searchable**: Users can type to filter examples
- **Descriptive**: Shows both name and description for each example
- **Type-safe**: Full TypeScript support with proper interfaces
- **Accessible**: Built on Nuxt UI's accessible SelectMenu component

### Usage

```vue
<ExampleChooser 
  :examples="examples" 
  @select="selectExample"
/>
```

### Props

- `examples: Example[]` - Array of example objects with name, description, content, language, and filename

### Events

- `@select` - Emitted when an example is selected, passes the selected example object

## MonacoEditor

A Vue wrapper around Monaco Editor with full TypeScript support and reactive bindings.

### Features

- **Reactive**: Two-way data binding with v-model
- **Language Support**: Automatic language detection and syntax highlighting
- **Themes**: Support for VS, VS Dark, and HC Black themes
- **Customizable**: Extensive options for editor configuration
- **Type-safe**: Full TypeScript definitions

### Usage

```vue
<MonacoEditor
  v-model="code"
  language="json"
  theme="vs-dark"
  :height="500"
  :options="editorOptions"
  @editor-mounted="onEditorMounted"
/>
```

## useExamples Composable

A composable that loads and manages package.json examples from the filesystem.

### Features

- **Auto-loading**: Automatically loads all JSON files from the examples directory
- **Reactive**: Provides reactive state for examples and selection
- **Type-safe**: Full TypeScript support with proper interfaces
- **Sorted**: Examples are automatically sorted alphabetically

### Usage

```typescript
const { examples, selectedExample, selectExample, getExampleLanguage } = useExamples()
```

### Returns

- `examples` - Computed array of all loaded examples
- `selectedExample` - Computed ref of currently selected example
- `selectExample` - Function to select an example
- `getExampleLanguage` - Computed language for the selected example
