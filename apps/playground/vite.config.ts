import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import nodePolyfills from 'rollup-plugin-polyfill-node'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      plugins: [
        nodePolyfills({
          include: null,
        }),
      ],
    },
  },
})
