<template>
  <div>
    <h1>Some Component</h1>
    <p>{{ alias }} {{ rawSpecifier }}</p>
    <input v-model="alias" />
    <input v-model="rawSpecifier" />
    <button @click="resolve">Resolve</button>
    <pre>{{ result }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { resolveFromNpm } from '@webpm/resolver';

const alias = ref('vue');
const rawSpecifier = ref('3.0.0');

const result = ref<ReturnType<typeof resolveFromNpm> | null>(null)

const resolve = () => {
  result.value = resolveFromNpm({
    alias: alias.value,
    rawSpecifier: rawSpecifier.value,
  });
}
</script>

<style scoped>
pre {
  text-align: left;
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
}
</style>
