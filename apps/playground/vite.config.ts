import vue from '@vitejs/plugin-vue'
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import ui from '@nuxt/ui/vite'

export default defineConfig({
  plugins: [
    vue(),
    ui(),
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
