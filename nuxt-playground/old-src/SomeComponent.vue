<template>
  <div>
    <button @click="resolve">Resolve</button>
    <pre>{{ resultToPrint }}</pre>
    <pre>{{ diagnostics }}</pre>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, ref, computed } from 'vue';
import { formatDuration, intervalToDuration } from 'date-fns';

import { webpm } from '@webpm/webpm';
import { createSystem, createDefaultMapFromCDN, createVirtualCompilerHost } from "@typescript/vfs"
import ts from "typescript"
import type { FetchedDependencyTree, FetchedPackage, ExtractedFile } from '@webpm/webpm';

const props = defineProps<{
  packageJson: string;
  files: { name: string; content: string }[];
}>();

const result = ref()

const compilerOpts = {}
// const env = createVirtualTypeScriptEnvironment(system, ["index.ts"], ts, compilerOpts)

let fsMap: Map<string, string>
let system: ReturnType<typeof createSystem>

const resultToPrint = computed(() => {
  return result.value?.map((r: FetchedDependencyTree) => {
    return {
      name: r.root.package.name,
      version: r.root.package.version,
      allFetchedPackages: Array.from(r.allFetchedPackages.values()).map((p: FetchedPackage) => {
        return {
          name: p.extractedFiles.manifest?.name,
          version: p.extractedFiles.manifest?.version,
          files: p.extractedFiles.files.length,
        }
      }),
      allFiles: r.totalFiles,
      timings: r.timings,
    }
  }) || []
})

const fileNames = props.files.map(f => f.name)
onMounted(async () => {
  fsMap = await createDefaultMapFromCDN({ target: ts.ScriptTarget.ES2022 }, "5.9.2", true, ts)
  system = createSystem(fsMap)
  fsMap.set("package.json", props.packageJson)
  props.files.forEach((file) => {
    fsMap.set(file.name, file.content)
  })
})

// You can then interact with the languageService to introspect the code
const diagnostics = ref<ts.Diagnostic[] | readonly ts.Diagnostic[]>([])

const resolve = async () => {
  const host = createVirtualCompilerHost(system, compilerOpts, ts);
  const program = ts.createProgram(fileNames, compilerOpts, host.compilerHost);
  
  result.value = await webpm.resolveAndFetchPackageJson(JSON.parse(props.packageJson), {
    // version: props.packageJson.version,
    // onResult: (dependency: FetchedPackage) => {
    //   const name = dependency.extractedFiles.manifest?.name;
    //   dependency.extractedFiles.files.forEach((file: ExtractedFile) => {
    //     fsMap.set(`/node_modules/${name}/${file.name}`, file.buffer.toString());
    //   });
    // }
  })

  result.value.forEach((r: FetchedDependencyTree) => {
    r.allFetchedPackages.forEach((p: FetchedPackage) => {
      p.extractedFiles.files.forEach((file: ExtractedFile) => {
        console.log(p.package.name, file.name)
        // fsMap.set(`/node_modules/${p.package.name}/${file.name}`, file.buffer.toString());
      });
    });
  });

  // ts.Diagnostic contains circular references, so we need to safely stringify for display
  const rawDiagnostics = ts.getPreEmitDiagnostics(program);
  diagnostics.value = rawDiagnostics.map(d => {
    return {
      fileName: d.file?.fileName,
      text: d.file?.text,
      messageText: d.messageText.toString()
    }
  });
  // result.value = JSON.stringify(resolveResult, null, 2);

  // const manifest = resolveResult
  // if (resolveResult?.timings) {
  //   const formattedTimings = formatTimings(resolveResult.timings);
  //   result.value = formattedTimings;
  // } else {
  //   result.value = 'No timings available';
  // }
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
