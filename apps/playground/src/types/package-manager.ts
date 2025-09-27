import type { InstallationResult, UntarProgressEvent } from '@webpm/webpm'
import type ts from 'typescript'

export interface InstalledPackage {
  name: string
  version: string
  files: number
}

export interface PackageManagerProps {
  onInstallationResult?: (result: InstallationResult) => void
  onProgress?: (event: UntarProgressEvent) => void
  packageJsonContent?: string
  editorContent?: string
}

export interface DependencyCount {
  dependencies: number
  devDependencies: number
}

export interface ParsedPackageJson {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export interface FileContentState {
  content: string | null
  fileName: string | null
  fileType: string | null
}

export interface VFSState {
  files: Map<string, string>
  diagnostics: ts.Diagnostic[]
  isActive: boolean
  error: string
  environment: any
  fsMap: Map<string, string>
}

// Re-export types from webpm for convenience
export type { InstallationResult, UntarProgressEvent } from '@webpm/webpm'
