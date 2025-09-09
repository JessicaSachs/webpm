import vue from '@vitejs/plugin-vue'
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
    include: ["buffer", "process", "stream", "module"],
      exclude: ["http", "https", "net", "tls", "child_process"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["tar-stream", "fflate"],
  },
});
