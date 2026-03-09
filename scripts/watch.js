#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const chalk = require('chalk');

const SRC_DIR = path.join(__dirname, '..', 'src');
const REGIONAL_DIR = path.join(__dirname, '..', 'regional');
const CREDS_PATH = path.join(__dirname, '..', '.creds.yml');

function loadCreds() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error('.creds.yml not found');
  }
  const yaml = require('js-yaml');
  const content = fs.readFileSync(CREDS_PATH, 'utf8');
  const parsed = yaml.load(content);
  const shopify = parsed?.shopify;
  if (!shopify || typeof shopify !== 'object') {
    throw new Error('.creds.yml must have a shopify top-level key with store configs');
  }
  return Object.keys(shopify).filter((k) => typeof shopify[k] === 'object');
}

function promptStores(availableStores) {
  if (!process.stdin.isTTY) {
    return promptStoresFallback(availableStores);
  }
  return new Promise((resolve, reject) => {
    const selected = new Set();
    let resolving = false;

    function render() {
      process.stdout.write('\x1b[2J\x1b[H');
      console.log('\nSelect stores (press number to toggle, Enter to confirm):\n');
      availableStores.forEach((store, i) => {
        const num = String(i + 1);
        const line = `  [${ num }] ${ store }`;
        const styled = selected.has(store) ? chalk.cyan(line) : line;
        console.log(styled);
      });
      console.log('\n  Selected:', selected.size ? Array.from(selected).join(', ') : '(none)');
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('keypress');
    }

    function finish() {
      if (resolving) return;
      resolving = true;
      cleanup();
      const result = Array.from(selected);
      if (result.length === 0) {
        console.error('\nNo stores selected. Select at least one.');
        reject(new Error('No stores selected'));
      } else {
        resolve(result);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    readline.emitKeypressEvents(process.stdin);

    process.stdin.on('keypress', (str, key) => {
      if (!key) return;
      if (key.name === 'return' || key.name === 'enter') {
        finish();
        return;
      }
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
      }
      const n = parseInt(str, 10);
      if (n >= 1 && n <= availableStores.length) {
        const store = availableStores[n - 1];
        if (selected.has(store)) {
          selected.delete(store);
        } else {
          selected.add(store);
        }
        render();
      }
    });

    render();
  });
}

function promptStoresFallback(availableStores) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nAvailable stores:', availableStores.join(', '));
    console.log('Enter store IDs (comma-separated, e.g. au,us,uk):');
    rl.question('> ', (answer) => {
      rl.close();
      const selected = answer
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && availableStores.includes(s));
      if (selected.length === 0) {
        reject(new Error('No valid stores selected. Use: ' + availableStores.join(', ')));
      } else {
        resolve(selected);
      }
    });
  });
}

function getStores() {
  const available = loadCreds();
  const envStores = process.env.STORES;
  if (envStores) {
    const selected = envStores
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && available.includes(s));
    if (selected.length > 0) return Promise.resolve(selected);
  }
  return promptStores(available);
}

function runBuild(stores) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, 'build.js'), ...stores], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${ code }`))));
  });
}

function loadStoreCreds(storeId) {
  const yaml = require('js-yaml');
  const content = fs.readFileSync(CREDS_PATH, 'utf8');
  const parsed = yaml.load(content);
  return parsed?.shopify?.[storeId] || {};
}

function getThemeDevCommand(storeId, distDir, port) {
  const creds = loadStoreCreds(storeId);
  const storeUrl = creds.STORE_URL || storeId;
  const envPrefix = creds.SHOPIFY_API_KEY ? `SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY } ` : '';
  const cmd = `${ envPrefix }shopify theme dev --path ${ distDir } --store ${ storeUrl } --port ${ port } --live-reload hot-reload`;
  return cmd;
}

function getWatchPaths(stores) {
  const paths = [SRC_DIR];
  for (const storeId of stores) {
    const regionalStore = path.join(REGIONAL_DIR, storeId);
    if (fs.existsSync(regionalStore)) {
      paths.push(regionalStore);
    }
  }
  return paths;
}

async function main() {
  const stores = await getStores();
  console.log('Stores:', stores.join(', '));

  await runBuild(stores);

  const chokidar = require('chokidar');
  const watchPaths = getWatchPaths(stores);

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    console.log(`[watch] ${ filePath } changed, rebuilding...`);
    runBuild(stores).catch((e) => console.error('[watch] rebuild failed:', e.message));
  });

  watcher.on('add', (filePath) => {
    console.log(`[watch] ${ filePath } added, rebuilding...`);
    runBuild(stores).catch((e) => console.error('[watch] rebuild failed:', e.message));
  });

  watcher.on('unlink', (filePath) => {
    console.log(`[watch] ${ filePath } removed, rebuilding...`);
    runBuild(stores).catch((e) => console.error('[watch] rebuild failed:', e.message));
  });

  watcher.on('ready', () => {
    console.log('[watch] Watching:', watchPaths.join(', '));
  });

  const basePort = 9292;
  const concurrentArgs = ['-n', stores.join(','), '-c', 'cyan,magenta,green'];
  stores.forEach((storeId, i) => {
    const distDir = path.join(__dirname, '..', 'dist', storeId);
    const port = basePort + i;
    concurrentArgs.push(getThemeDevCommand(storeId, distDir, port));
  });

  console.log('\nStarting theme dev for', stores.join(', '), '...\n');
  const concurrent = spawn('npx', ['concurrently', ...concurrentArgs], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  process.on('SIGINT', () => {
    concurrent.kill('SIGINT');
    watcher.close();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
