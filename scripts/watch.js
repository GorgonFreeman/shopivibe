#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { build } from 'vite';
import chokidar from 'chokidar';
import { spawn } from 'child_process';
import chalk from 'chalk';
import {
  ROOT, SRC, REGIONAL, DIST, VITE_OUT,
  chooseStores, assembleStore, getStoreCreds, logAssembly,
} from './lib.js';

const stores = await chooseStores();
console.log();

// ── Serialised assembly queue ──

let queue = Promise.resolve();

function enqueue(ids, label) {
  queue = queue.then(() => {
    console.log(chalk.gray(`[${ label }] assembling ${ ids.join(', ') }...`));
    for (const id of ids) logAssembly(id, assembleStore(id));
  });
}

// ── Vite watch (tracks full dependency graph including CSS @import) ──

const viteWatcher = await build({ build: { watch: {} } });

for (const id of stores) logAssembly(id, assembleStore(id));

viteWatcher.on('event', (e) => {
  if (e.code === 'BUNDLE_START') {
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
    p === scriptsDir || p.startsWith(`${ scriptsDir }/`) ||
    p === stylesDir || p.startsWith(`${ stylesDir }/`),
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

themeWatcher.on('ready', () => console.log(chalk.gray('\n[watch] Watching for changes...\n')));

// ── Launch shopify theme dev in separate tabs ──

const BASE_PORT = 9292;

function themeDevCmd(storeId, port) {
  const creds = getStoreCreds(storeId);

  // Pass API key as env var, not --password.
  // --password expects a Theme Access token; Admin API tokens (shpat_...)
  // cannot set the _shopify_essential cookie required for theme dev.
  const prefix = creds.SHOPIFY_API_KEY ? `SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY } ` : '';

  return `${ prefix }shopify theme dev`
    + ` --store ${ creds.STORE_URL }.myshopify.com`
    + ` --port ${ port }`
    + ` --live-reload full-page`
    + `; exit`;
}

stores.forEach((id, i) => {
  const port = BASE_PORT + i;
  const distDir = path.join(DIST, id);
  fs.mkdirSync(distDir, { recursive: true });

  spawn('npx', [
    'ttab', '-t', `shopivibe ${ id }`,
    '-d', distDir,
    themeDevCmd(id, port),
  ], { stdio: 'inherit', cwd: ROOT });
});

console.log(chalk.gray('Theme dev launched in separate tabs.'));

// ── Cleanup ──

process.on('SIGINT', () => {
  themeWatcher.close();
  viteWatcher.close();
  process.exit(0);
});
