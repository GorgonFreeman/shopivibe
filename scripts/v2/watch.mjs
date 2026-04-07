#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { build } from 'vite';
import chokidar from 'chokidar';
import { ROOT, SRC, REGIONAL, DIST, VITE_OUT, getStores, assembleStore, loadStoreCreds } from './lib.mjs';
import { viteConfig } from './build.mjs';

function themeDevCmd(storeId, port) {
  const creds = loadStoreCreds(storeId);
  const url = creds.STORE_URL || storeId;
  const prefix = creds.SHOPIFY_API_KEY ? `SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY } ` : '';
  return `${ prefix }shopify theme dev --store ${ url } --port ${ port } --live-reload full-page`;
}

async function main() {
  const stores = await getStores();
  console.log(`Stores: ${ stores.join(', ') }\n`);

  // ── Serialised assembly queue ──
  // All assembly runs through here — vite rebuilds and theme file changes never overlap.
  let queue = Promise.resolve();
  const enqueue = (ids, label) => {
    queue = queue.then(() => {
      console.log(`[${ label }] Assembling ${ ids.join(', ') }...`);
      for (const id of ids) {
        const r = assembleStore(id);
        console.log(`  ${ id }: +${ r.added } ~${ r.updated } -${ r.removed }`);
      }
    });
  };

  // ── Vite watch (scripts + styles, including CSS @import deps) ──
  // Using Vite's native watch instead of chokidar + manual build() calls means
  // Vite tracks the full dependency graph — @imported CSS files trigger rebuilds.
  const viteWatcher = await build(viteConfig({ watch: true }));

  for (const id of stores) {
    const r = assembleStore(id);
    console.log(`  ${ id }: +${ r.added } ~${ r.updated } -${ r.removed }`);
  }

  viteWatcher.on('event', (e) => {
    if (e.code === 'BUNDLE_START') {
      // Clear stale Vite output before each rebuild so dead chunks don't accumulate
      fs.rmSync(path.join(VITE_OUT, 'assets'), { recursive: true, force: true });
    }
    if (e.code === 'END') enqueue(stores, 'vite');
    if (e.result) e.result.close();
  });

  // ── Theme file watch (liquid, json, locales — Vite owns scripts/styles) ──
  const scriptsDir = path.join(SRC, 'scripts');
  const stylesDir = path.join(SRC, 'styles');

  const watchPaths = [SRC];
  for (const id of stores) {
    const dir = path.join(REGIONAL, id);
    if (fs.existsSync(dir)) watchPaths.push(dir);
  }

  const themeWatcher = chokidar.watch(watchPaths, {
    ignored: (p) =>
      p === scriptsDir || p.startsWith(scriptsDir + '/') ||
      p === stylesDir || p.startsWith(stylesDir + '/'),
    ignoreInitial: true,
    atomic: true,
  });

  let pending = new Set();
  let debounce;

  themeWatcher.on('all', (_, filePath) => {
    const abs = path.resolve(filePath);
    let regional = false;
    for (const id of stores) {
      if (abs.startsWith(path.join(REGIONAL, id))) {
        pending.add(id);
        regional = true;
        break;
      }
    }
    if (!regional) for (const id of stores) pending.add(id);

    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const batch = [...pending];
      pending = new Set();
      enqueue(batch, 'theme');
    }, 150);
  });

  themeWatcher.on('ready', () => console.log('\n[watch] Watching for changes...\n'));

  // ── Launch shopify theme dev ──
  const basePort = 9292;
  if (process.platform === 'darwin') {
    stores.forEach((id, i) => {
      spawn('npx', ['ttab', '-t', `shopivibe ${ id }`, '-d', path.join(DIST, id), themeDevCmd(id, basePort + i)], {
        stdio: 'inherit',
        cwd: ROOT,
      });
    });
    console.log('Theme dev launched in separate tabs.');
  } else {
    const args = ['-n', stores.join(','), '-c', 'cyan,magenta,green'];
    stores.forEach((id, i) => {
      const dir = path.join(DIST, id);
      args.push(`cd ${ path.relative(ROOT, dir) } && ${ themeDevCmd(id, basePort + i) }`);
    });
    const proc = spawn('npx', ['concurrently', ...args], { stdio: 'inherit', cwd: ROOT });
    process.on('SIGINT', () => proc.kill('SIGINT'));
  }

  process.on('SIGINT', () => {
    themeWatcher.close();
    viteWatcher.close();
    process.exit(0);
  });
}

main().catch(e => { console.error(e.message); process.exit(1); });
