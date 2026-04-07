#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SRC, VITE_OUT, getStores, assembleStore } from './lib.mjs';

// ── Entry discovery (convention: every .js in src/scripts is an entry) ──

function discoverEntries() {
  const dir = path.join(SRC, 'scripts');
  const entries = {};
  try {
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
      entries[f.replace(/\.js$/, '')] = path.join(dir, f);
    }
  } catch { /* scripts dir may not exist yet */ }
  return entries;
}

// ── Vite config (inline — no separate config file, no old sync plugin) ──

export function viteConfig({ watch = false } = {}) {
  return {
    plugins: [tailwindcss()],
    oxc: { decorators: { legacy: true } },
    build: {
      outDir: VITE_OUT,
      assetsDir: 'assets',
      emptyOutDir: true,
      ...(watch && { watch: {} }),
      rollupOptions: {
        input: discoverEntries(),
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  };
}

export async function runViteBuild() {
  return build(viteConfig());
}

// ── CLI ──

async function main() {
  const stores = await getStores();
  console.log(`Stores: ${ stores.join(', ') }`);

  await runViteBuild();

  for (const id of stores) {
    const { added, updated, removed } = assembleStore(id);
    console.log(`  ${ id }: +${ added } ~${ updated } -${ removed }`);
  }

  console.log('Done.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
