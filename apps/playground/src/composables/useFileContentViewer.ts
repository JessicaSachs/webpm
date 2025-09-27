import { ref } from 'vue'
import { fileContentStore } from '@webpm/store'
import type { FileContentState } from '../types/package-manager'
import {
  getFileContentType,
  createFileErrorContent,
} from '../utils/common-utils'

export function useFileContentViewer() {
  // State
  const selectedFileContent = ref<string | null>(null)
  const selectedFileName = ref<string | null>(null)
  const selectedFileType = ref<string | null>(null)

  // Computed
  const fileContentState = ref<FileContentState>({
    content: null,
    fileName: null,
    fileType: null,
  })

  // Methods
  const handleFileClick = async (
    filePath: string,
    packageName: string,
    packageVersion: string
  ) => {
    try {
      const fileId = `${packageName}@${packageVersion}/${filePath}`
      console.log('Loading file content for:', fileId)

      const storedFile = await fileContentStore.getFileContent(fileId)

      if (storedFile) {
        selectedFileContent.value = storedFile.content
        selectedFileName.value = `${packageName}@${packageVersion}/${filePath}`
        selectedFileType.value = storedFile.contentType

        console.log(
          `Loaded file content: ${storedFile.content.length} characters`
        )
      } else {
        console.warn('File content not found in IndexedDB:', fileId)

        // Fallback: show a message that the file wasn't stored
        selectedFileContent.value = createFileErrorContent(
          filePath,
          packageName,
          packageVersion,
          fileId
        )

        selectedFileName.value = `${packageName}@${packageVersion}/${filePath}`
        selectedFileType.value = getFileContentType(filePath)
      }
    } catch (error) {
      console.error('Failed to load file content:', error)

      selectedFileContent.value = createFileErrorContent(
        filePath,
        packageName,
        packageVersion,
        `${packageName}@${packageVersion}/${filePath}`,
        error instanceof Error ? error : undefined
      )

      selectedFileName.value = `${packageName}@${packageVersion}/${filePath} (Error)`
      selectedFileType.value = 'text/plain'
    }
  }

  const clearFileContent = () => {
    selectedFileContent.value = null
    selectedFileName.value = null
    selectedFileType.value = null
  }

  return {
    // State
    selectedFileContent,
    selectedFileName,
    selectedFileType,
    fileContentState,

    // Methods
    handleFileClick,
    clearFileContent,
  }
}
