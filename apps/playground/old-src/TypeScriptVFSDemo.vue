<template>
  <div>Hello world</div>
</template>

<script setup lang="ts">
import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN, createVirtualCompilerHost } from "@typescript/vfs"
import ts from "typescript"

const fsMap = await createDefaultMapFromCDN({ target: ts.ScriptTarget.ES2022 }, "5.9.2", true, ts)
const system = createSystem(fsMap)

fsMap.set("/node_modules/leftpad/index.d.ts", 'export type MyLeftPad = number;')
fsMap.set("/node_modules/leftpad/package.json", '{"name": "leftpad", "version": "1.0.0", "types": "./index.d.ts"}')

const fileNames = ["index.ts"]
fsMap.set("package.json", '{"name": "playground", "version": "1.0.0", "dependencies": {"leftpad": "1.0.0"}}')
fsMap.set("index.ts", 'import { MyLeftPad } from "leftpad";\nconst a: MyLeftPad = "Definitely not a number";')

const compilerOpts = {}
// const env = createVirtualTypeScriptEnvironment(system, ["index.ts"], ts, compilerOpts)

const host = createVirtualCompilerHost(system, compilerOpts, ts);
const program = ts.createProgram(fileNames, compilerOpts, host.compilerHost);
const diagnostics = ts.getPreEmitDiagnostics(program);

// You can then interact with the languageService to introspect the code
console.log(diagnostics)

</script>
