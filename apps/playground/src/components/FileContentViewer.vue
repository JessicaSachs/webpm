<template>
  <UCard
    v-if="selectedFileContent"
    class="mt-6"
    color="neutral"
    variant="outline"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-document-text" class="w-5 h-5" />
          <div>
            <h3 class="text-lg font-semibold">File Content</h3>
            <p class="text-sm opacity-70">{{ selectedFileName }}</p>
          </div>
        </div>
        <UButton
          @click="$emit('close')"
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark"
        >
          Close
        </UButton>
      </div>
    </template>

    <div class="relative">
      <div class="absolute top-2 right-2 z-10">
        <UBadge
          :color="
            selectedFileType?.includes('javascript')
              ? 'warning'
              : selectedFileType?.includes('typescript')
                ? 'primary'
                : 'neutral'
          "
          variant="soft"
          size="sm"
        >
          {{ selectedFileType }}
        </UBadge>
      </div>
      <pre
        class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed max-h-96 overflow-y-auto"
      ><code>{{ selectedFileContent }}</code></pre>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  selectedFileContent: string | null
  selectedFileName: string | null
  selectedFileType: string | null
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
