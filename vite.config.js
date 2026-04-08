import { defineConfig } from 'vite';
import { dirname, resolve } from 'path';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

const root = dirname(fileURLToPath(import.meta.url));
const scriptsDir = resolve(root, 'src/scripts');
const stylesDir = resolve(root, 'src/styles');

function discoverEntries() {
  const entries = {};

  if (existsSync(scriptsDir)) {
    for (const f of readdirSync(scriptsDir)) {
      if (f.endsWith('.js')) {
        entries[f.replace(/\.js$/, '')] = resolve(scriptsDir, f);
      }
    }
  }

  // Standalone CSS entries — skipped when a JS entry already owns the name
  // (e.g. main.js imports main.css, so main.css is not a separate entry)
  if (existsSync(stylesDir)) {
    for (const f of readdirSync(stylesDir)) {
      if (!f.endsWith('.css')) continue;
      const stem = f.replace(/\.css$/, '');
      if (!entries[stem]) {
        entries[stem] = resolve(stylesDir, f);
      }
    }
  }

  return entries;
}

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: resolve(root, 'dist/_build'),
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: discoverEntries(),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/lit') || id.includes('node_modules/@lit')) {
            return 'lit';
          }
        },
      },
    },
  },
});
