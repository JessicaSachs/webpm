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
import { formatDuration, intervalToDuration } from 'date-fns';
// import * as merp from './foo';

// merp;
import { webpm } from '@webpm/webpm';

const alias = ref('vue');
const bareSpecifier = ref('3.0.0');

const result = ref('')

const resolve = async () => {
  const resolveResult = await webpm.installAndFetch(alias.value, {
    version: bareSpecifier.value,
  })

  // const manifest = resolveResult
  if (resolveResult?.timings) {
    const formattedTimings = formatTimings(resolveResult.timings);
    result.value = formattedTimings;
  } else {
    result.value = 'No timings available';
  }
}

const formatTimings = (timings: Record<string, any>) => {
  const formatted: string[] = [];
  
  for (const [key, value] of Object.entries(timings)) {
    if (typeof value === 'number') {
      const roundedMs = Math.round(value * 10) / 10;
      const duration = intervalToDuration({ start: 0, end: roundedMs });
      const humanReadable = formatDuration(duration, { 
        format: ['hours', 'minutes', 'seconds'],
        delimiter: ' '
      });
      const ms = Math.round(roundedMs % 1000);
      const display = humanReadable ? `${humanReadable} ${ms}ms` : `${ms}ms`;
      formatted.push(`${key}: ${display}`);
    } else if (typeof value === 'object' && value !== null) {
      formatted.push(`${key}:`);
      const subTimings = formatTimings(value);
      formatted.push(...subTimings.split('\n').map(line => `  ${line}`));
    } else {
      formatted.push(`${key}: ${value}`);
    }
  }
  
  return formatted.join('\n');
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
