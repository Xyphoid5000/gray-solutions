import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

// https://vite.dev/config/

/** Preview deployments (any branch but main) expose the Vue devtools hook
    so the Vue DevTools (v7+) browser extension can inspect them; production
    builds from main stay clean. Vue 3.5 only honors the compile-time
    __VUE_PROD_DEVTOOLS__ flag (app.config.devtools no longer exists), and
    the wrangler previews block is server-side, so the branch is read here
    at build time instead. */
function isPreviewBuild(): boolean {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim() !== 'main';
  } catch {
    return true;
  }
}

export default defineConfig({
  plugins: [vue()],
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify(isPreviewBuild()),
  },
})
