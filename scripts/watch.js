#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nAvailable stores:', availableStores.join(', '));
    console.log('Enter store IDs to include (comma-separated, e.g. au,us,uk):');
    rl.question('> ', (answer) => {
      rl.close();
      const selected = answer
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && availableStores.includes(s));
      if (selected.length === 0) {
        console.error('No valid stores selected. Use: ' + availableStores.join(', '));
        process.exit(1);
      }
      resolve(selected);
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
