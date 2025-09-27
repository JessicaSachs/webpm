<template>
  <UCard v-if="packageJsonContent" color="blue" variant="outline">
    <template #header>
      <h4 class="text-base font-semibold mb-2">Install from Package.json</h4>
      <p class="text-sm text-gray-500 m-0">
        Install all dependencies from the current package.json
      </p>
    </template>

    <UCard class="mb-4">
      <div class="text-sm text-gray-600 mb-1">
        <strong>Project:</strong> {{ parsedPackageJson?.name || 'Unknown' }}
      </div>
      <div class="text-sm text-gray-600">
        <strong>Dependencies:</strong> {{ dependencyCount.dependencies }}
        <UBadge
          v-if="dependencyCount.devDependencies"
          color="warning"
          variant="soft"
          class="ml-1"
        >
          +{{ dependencyCount.devDependencies }} dev
        </UBadge>
      </div>
    </UCard>

    <UButton
      @click="installFromPackageJson"
      color="success"
      :loading="isInstalling"
      :disabled="!hasDependencies"
      size="lg"
      block
    >
      {{
        isInstalling
          ? 'Installing...'
          : `Install ${totalDependencies} Dependencies`
      }}
    </UButton>
  </UCard>
</template>

<script setup lang="ts">
import type { InstallationResult, UntarProgressEvent } from '@webpm/webpm'
import { usePackageJsonInstallation } from '../composables/usePackageJsonInstallation'

interface Props {
  packageJsonContent?: string
  onProgress?: (event: UntarProgressEvent) => void
  onInstallationResult?: (result: InstallationResult) => void
}

const props = defineProps<Props>()

const {
  isInstalling,
  parsedPackageJson,
  dependencyCount,
  totalDependencies,
  hasDependencies,
  installFromPackageJson,
} = usePackageJsonInstallation(
  props.packageJsonContent,
  props.onProgress,
  props.onInstallationResult
)
</script>
