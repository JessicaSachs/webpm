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

const result = ref<Awaited<ReturnType<typeof resolveFromNpm>> | null>(null)

const resolve = async () => {
  const ret = await resolveFromNpm({
    alias: alias.value,
    rawSpecifier: rawSpecifier.value,
  });
  debugger;
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
