import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';

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

export default defineConfig({
  plugins: [tailwindcss()],
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
