import { createRequire } from 'module';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);
const { syncViteAssetsToDistStores } = require('./scripts/build.js');

const scriptsDir = resolve(__dirname, 'src/scripts');
const entries = { main: resolve(scriptsDir, 'main.js') };

try {
  for (const name of readdirSync(scriptsDir)) {
    if (name !== 'main.js' && name.endsWith('.js')) {
      entries[name.replace(/\.js$/, '')] = resolve(scriptsDir, name);
    }
  }
} catch {
  // src/scripts may not exist yet
}

/** After `vite build`, copy dist/_build/assets → dist/<each-store>/assets (theme dev uses store folders, not _build). */
function shopivibeSyncDistAssets() {
  return {
    name: 'shopivibe-sync-dist-assets',
    closeBundle() {
      syncViteAssetsToDistStores();
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), shopivibeSyncDistAssets()],
  oxc: {
    decorators: { legacy: true },
  },
  build: {
    outDir: 'dist/_build',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: entries,
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
