<template>
  <USelectMenu
    v-model="selectedExample"
    :items="exampleOptions"
    searchable
    placeholder="Select an example..."
    class="w-full"
    @update:modelValue="emitSelection($event)"
  >
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, Ref } from 'vue'

interface Example {
  name: string
  description: string
  content: string
  mainTsContent?: string
  language: string
  filename: string
}

interface Props {
  examples: Example[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [example: { label: string; value: Example }]
}>()

const selectedExample = ref()

// Transform examples into options suitable for USelectMenu
const exampleOptions = computed(() =>
  props.examples.map((example) => ({
    label: example.name,
    value: example,
    description: example.description,
  }))
)

const emitSelection = (example: { label: string; value: Example }) => {
  selectedExample.value = example.value
  emit('select', example)
}
</script>
