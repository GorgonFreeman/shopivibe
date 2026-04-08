#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
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

function pidFile(storeId) {
  return path.join(os.tmpdir(), `shopivibe_${ storeId }.pid`);
}

function writeTabScript(storeId, port) {
  const creds = getStoreCreds(storeId);
  const mainPid = process.pid;
  const pf = pidFile(storeId);

  // Each tab script:
  //  - captures its tty so it can close itself via AppleScript
  //  - backgrounds shopify theme dev and writes its PID for the main process
  //  - runs a monitor that kills theme dev when the main process exits
  //  - on EXIT (any cause), signals the main process and closes the tab
  const script = [
    '#!/bin/bash',
    'MY_TTY=$(tty)',
    '',
    '_close_tab() {',
    '  osascript <<CLOSESCRIPT',
    'tell application "Terminal"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    '      if tty of t is "$MY_TTY" then',
    '        set selected of t to true',
    '        set frontmost of w to true',
    '      end if',
    '    end repeat',
    '  end repeat',
    'end tell',
    'delay 0.2',
    'tell application "System Events" to keystroke "w" using {command down}',
    'CLOSESCRIPT',
    '}',
    '',
    // Pass API key as env var, not --password.
    // --password expects a Theme Access token; Admin API tokens (shpat_...)
    // cannot set the _shopify_essential cookie required for theme dev.
    ...creds.SHOPIFY_API_KEY ? [`export SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY }`] : [],
    '',
    `shopify theme dev --store ${ creds.STORE_URL }.myshopify.com --port ${ port } --live-reload full-page &`,
    'THEME_PID=$!',
    `echo $THEME_PID > ${ pf }`,
    '',
    `(while kill -0 ${ mainPid } 2>/dev/null; do sleep 1; done; kill $THEME_PID 2>/dev/null) &`,
    'MONITOR_PID=$!',
    '',
    `trap 'kill $THEME_PID $MONITOR_PID 2>/dev/null; kill -USR1 ${ mainPid } 2>/dev/null; _close_tab' EXIT`,
    '',
    'wait $THEME_PID 2>/dev/null',
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

  for (const id of stores) {
    const pf = pidFile(id);
    try {
      const pid = parseInt(fs.readFileSync(pf, 'utf8').trim());
      process.kill(pid, 'SIGTERM');
    } catch {}
    try { fs.unlinkSync(pf); } catch {}
  }

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGUSR1', cleanup);
