# TypeScript Playground

A comprehensive TypeScript playground application with real-time diagnostics, built with Vue 3 and TypeScript VFS.

## Features

### 🎯 **Tabbed Text Editor**
- Multi-file support with tabbed interface
- File icons based on file extensions
- Dirty file indicators
- Add/close file functionality
- Syntax highlighting for TypeScript and JSON

### 📋 **Package.json Editor**
- Built-in package.json editor with validation
- Real-time JSON syntax checking
- Dependency management interface

### 🔍 **Real-time Diagnostics**
- Live TypeScript error detection
- Categorized diagnostics (errors, warnings, suggestions)
- Detailed error messages with file locations
- Visual indicators for different diagnostic types

### 📁 **Example Files**
- **package.json**: Project configuration with dependencies
- **tsconfig.json**: TypeScript compiler configuration
- **main.ts**: Basic TypeScript examples with intentional errors
- **utils.ts**: Utility functions demonstrating type errors
- **types.ts**: Advanced TypeScript features and type definitions

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the development server:**
   ```bash
   pnpm dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3001` to see the playground in action.

## Usage

### Editing Files
- Click on any tab to switch between files
- Edit code directly in the text editor
- Changes are automatically saved and analyzed
- Use the "+" button to add new files

### Viewing Diagnostics
- The right panel shows real-time TypeScript diagnostics
- Errors are highlighted in red
- Warnings are highlighted in yellow
- Suggestions are highlighted in blue
- Click on diagnostic items for more details

### File Management
- **Add files**: Click the "+" button in the tab bar
- **Close files**: Click the "×" button on individual tabs
- **Switch files**: Click on any tab to make it active

## Example Code

The playground includes several example files with intentional TypeScript errors to demonstrate the diagnostic capabilities:

### Type Errors
```typescript
// String assigned to number
const user: User = {
  id: "1", // Error: should be number
  name: "John Doe",
  email: "john@example.com"
};
```

### Array Type Errors
```typescript
// Mixed types in typed array
export const invalidArray: number[] = [1, 2, "3", 4]; // Error: string in number array
```

### Generic Type Errors
```typescript
// Wrong type passed to generic
export const result = identity<string>(123); // Error: number passed to string generic
```

## Technical Details

### Built With
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **TypeScript VFS** - Virtual file system for TypeScript
- **Vite** - Fast build tool and dev server

### Architecture
- **TabbedEditor Component**: Handles file editing and management
- **DiagnosticsPanel Component**: Displays TypeScript diagnostics
- **TypeScript VFS Integration**: Provides real-time type checking
- **Responsive Design**: Works on desktop and mobile devices

### Key Features
- Real-time TypeScript compilation
- Virtual file system for dependency resolution
- Comprehensive error reporting
- Modern, dark-themed UI
- Responsive design

## Development

### Project Structure
```
src/
├── components/
│   ├── TabbedEditor.vue      # Main editor component
│   └── DiagnosticsPanel.vue  # Diagnostics display
├── App.vue                   # Main application
├── main.ts                   # Application entry point
└── index.css                 # Global styles
```

### Adding New Features
1. Create new components in the `components/` directory
2. Update the main `App.vue` to include new functionality
3. Add new file types by extending the file icon mapping
4. Enhance diagnostics by adding new TypeScript compiler options

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the webpm ecosystem and follows the same licensing terms.

