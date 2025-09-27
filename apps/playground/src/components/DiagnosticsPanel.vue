<template>
  <div class="diagnostics-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <span class="title-icon">🔍</span>
        Diagnostics
      </h3>
      <div class="diagnostics-summary">
        <span v-if="isLoading" class="loading-indicator">
          <span class="spinner"></span>
          Analyzing...
        </span>
        <span v-else class="summary-text">
          {{ diagnostics.length }}
          {{ diagnostics.length === 1 ? 'issue' : 'issues' }}
        </span>
      </div>
    </div>

    <div class="diagnostics-content">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Analyzing TypeScript code...</p>
      </div>

      <div v-else-if="diagnostics.length === 0" class="no-issues">
        <div class="success-icon">✅</div>
        <h4>No issues found!</h4>
        <p>Your TypeScript code is clean and error-free.</p>
      </div>

      <div v-else class="diagnostics-list">
        <div
          v-for="(diagnostic, index) in diagnostics"
          :key="index"
          :class="['diagnostic-item', getDiagnosticClass(diagnostic.category)]"
        >
          <div class="diagnostic-header">
            <span class="diagnostic-icon">{{
              getDiagnosticIcon(diagnostic.category)
            }}</span>
            <span class="diagnostic-code">TS{{ diagnostic.code }}</span>
            <span class="diagnostic-file">{{
              getFileName(diagnostic.fileName)
            }}</span>
          </div>
          <div class="diagnostic-message">
            {{ diagnostic.messageText }}
          </div>
          <div
            v-if="diagnostic.start !== undefined"
            class="diagnostic-location"
          >
            Position: {{ getPosition(diagnostic.start) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ts from 'typescript'

interface Diagnostic {
  fileName: string
  messageText: string
  category: ts.DiagnosticCategory
  code: number
  start?: number
  length?: number
}

interface Props {
  diagnostics: Diagnostic[]
  isLoading: boolean
}

const props = defineProps<Props>()

const getDiagnosticClass = (category: ts.DiagnosticCategory): string => {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return 'error'
    case ts.DiagnosticCategory.Warning:
      return 'warning'
    case ts.DiagnosticCategory.Suggestion:
      return 'suggestion'
    case ts.DiagnosticCategory.Message:
      return 'message'
    default:
      return 'unknown'
  }
}

const getDiagnosticIcon = (category: ts.DiagnosticCategory): string => {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return '❌'
    case ts.DiagnosticCategory.Warning:
      return '⚠️'
    case ts.DiagnosticCategory.Suggestion:
      return '💡'
    case ts.DiagnosticCategory.Message:
      return 'ℹ️'
    default:
      return '❓'
  }
}

const getFileName = (fileName: string): string => {
  return fileName.split('/').pop() || fileName
}

const getPosition = (start: number): string => {
  // This is a simplified position calculation
  // In a real implementation, you'd want to calculate line and column
  return `char ${start}`
}

// Group diagnostics by category for better organization
const groupedDiagnostics = computed(() => {
  const groups = {
    errors: [] as Diagnostic[],
    warnings: [] as Diagnostic[],
    suggestions: [] as Diagnostic[],
    messages: [] as Diagnostic[],
  }

  props.diagnostics.forEach((diagnostic) => {
    switch (diagnostic.category) {
      case ts.DiagnosticCategory.Error:
        groups.errors.push(diagnostic)
        break
      case ts.DiagnosticCategory.Warning:
        groups.warnings.push(diagnostic)
        break
      case ts.DiagnosticCategory.Suggestion:
        groups.suggestions.push(diagnostic)
        break
      case ts.DiagnosticCategory.Message:
        groups.messages.push(diagnostic)
        break
    }
  })

  return groups
})
</script>

<style scoped>
.diagnostics-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f0f6fc;
}

.title-icon {
  font-size: 1.1rem;
}

.diagnostics-summary {
  font-size: 0.9rem;
  color: #7d8590;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #30363d;
  border-top: 2px solid #58a6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.diagnostics-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #7d8590;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #30363d;
  border-top: 3px solid #58a6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.no-issues {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #7d8590;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-issues h4 {
  margin: 0 0 0.5rem 0;
  color: #3fb950;
  font-size: 1.1rem;
}

.no-issues p {
  margin: 0;
  font-size: 0.9rem;
}

.diagnostics-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.diagnostic-item {
  background: #161b22;
  border-radius: 6px;
  padding: 0.75rem;
  border-left: 3px solid;
}

.diagnostic-item.error {
  border-left-color: #f85149;
  background: rgba(248, 81, 73, 0.1);
}

.diagnostic-item.warning {
  border-left-color: #d29922;
  background: rgba(210, 153, 34, 0.1);
}

.diagnostic-item.suggestion {
  border-left-color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
}

.diagnostic-item.message {
  border-left-color: #7d8590;
  background: rgba(125, 133, 144, 0.1);
}

.diagnostic-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.diagnostic-icon {
  font-size: 0.9rem;
}

.diagnostic-code {
  background: #21262d;
  color: #e6edf3;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family:
    'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
    monospace;
}

.diagnostic-file {
  color: #7d8590;
  font-size: 0.8rem;
  font-weight: 500;
}

.diagnostic-message {
  color: #e6edf3;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.diagnostic-location {
  color: #7d8590;
  font-size: 0.8rem;
  font-family:
    'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
    monospace;
}

/* Scrollbar styling */
.diagnostics-content::-webkit-scrollbar {
  width: 6px;
}

.diagnostics-content::-webkit-scrollbar-track {
  background: #0d1117;
}

.diagnostics-content::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.diagnostics-content::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
