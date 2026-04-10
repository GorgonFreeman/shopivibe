#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { build } from 'vite';
import chokidar from 'chokidar';
import { spawn, execSync } from 'child_process';
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

function killListenersOnPort(port) {
  try {
    execSync(
      `lsof -ti :${ port } | xargs kill -TERM 2>/dev/null; true`,
      { shell: true, stdio: 'ignore' },
    );
  } catch {}
}

function writeTabScript(storeId, port) {
  const creds = getStoreCreds(storeId);
  const mainPid = process.pid;

  // Foreground `shopify theme dev` only — no `&` / fg / PID file (those break the Ink TUI).
  // When the watch parent exits, a side loop kills whatever is bound to this tab's port.
  const script = [
    '#!/bin/bash',
    '',
    // Pass API key as env var, not --password.
    // --password expects a Theme Access token; Admin API tokens (shpat_...)
    // cannot set the _shopify_essential cookie required for theme dev.
    ...creds.SHOPIFY_API_KEY ? [`export SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY }`] : [],
    '',
    `(while kill -0 ${ mainPid } 2>/dev/null; do sleep 1; done; lsof -ti :${ port } | xargs kill -TERM 2>/dev/null; true) &`,
    'MONITOR_PID=$!',
    '',
    `trap 'kill $MONITOR_PID 2>/dev/null; kill -USR1 ${ mainPid } 2>/dev/null' EXIT INT TERM`,
    '',
    `shopify theme dev --store ${ creds.STORE_URL }.myshopify.com --port ${ port } --live-reload full-page`,
    '',
  ].join('\n') + '\n';

  const scriptPath = path.join(os.tmpdir(), `shopivibe_${ storeId }.sh`);
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  return scriptPath;
}

stores.forEach((id, i) => {
  const port = BASE_PORT + i;
  const distDir = path.join(DIST, id);
  fs.mkdirSync(distDir, { recursive: true });

  const scriptPath = writeTabScript(id, port);

  spawn('npx', [
    'ttab', '-t', `shopivibe ${ id }`,
    '-d', distDir,
    `exec bash ${ scriptPath }`,
  ], { stdio: 'inherit', cwd: ROOT });
});

console.log(chalk.gray('Theme dev launched in separate tabs.'));

// ── Cleanup ──

let exiting = false;

function cleanup() {
  if (exiting) return;
  exiting = true;

  themeWatcher.close();
  viteWatcher.close();

  stores.forEach((_, i) => {
    killListenersOnPort(BASE_PORT + i);
  });

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGUSR1', cleanup);
