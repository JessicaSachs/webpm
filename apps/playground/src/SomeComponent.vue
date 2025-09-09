<template>
  <div>
    <h1>Demo Component</h1>
    <p>{{ alias }} {{ bareSpecifier }}</p>
    <input v-model="alias" />
    <input v-model="bareSpecifier" />
    <button @click="resolve">Resolve</button>
    <pre>{{ result }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { webpm } from '@webpm/webpm';

const alias = ref('vue');
const bareSpecifier = ref('3.0.0');

const result = ref('')

const resolve = async () => {
  const resolveResult = await webpm.install(alias.value, {
    version: bareSpecifier.value,
  })

  // const manifest = resolveResult
  result.value = JSON.stringify(resolveResult, null, 2)
}
</script>

<style scoped>
pre {
  text-align: left;
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
  white-space: pre-wrap;
  word-break: break-all;
  max-width: 70vw;
}
</style>
