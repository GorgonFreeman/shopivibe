#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { getStores, loadStoreCreds } = require('./lib/common');

const SRC_DIR = path.join(__dirname, '..', 'src');
const REGIONAL_DIR = path.join(__dirname, '..', 'regional');

function runBuild(stores) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, 'build.js'), ...stores], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${ code }`))));
  });
}

function getThemeDevCommand(storeId, distDir, port) {
  const creds = loadStoreCreds(storeId);
  const storeUrl = creds.STORE_URL || storeId;
  const envPrefix = creds.SHOPIFY_API_KEY ? `SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY } ` : '';
  return `${ envPrefix }shopify theme dev --path ${ distDir } --store ${ storeUrl } --port ${ port } --live-reload hot-reload`;
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

  const projectRoot = path.join(__dirname, '..');
  const basePort = 9292;
  const isMac = process.platform === 'darwin';

  if (isMac) {
    console.log('\nOpening theme dev for', stores.join(', '), 'in separate tabs...\n');
    stores.forEach((storeId, i) => {
      const distDir = path.join(projectRoot, 'dist', storeId);
      const port = basePort + i;
      const cmd = getThemeDevCommand(storeId, distDir, port);
      spawn('npx', ['ttab', '-t', `shopivibe ${ storeId }`, '-d', projectRoot, cmd], {
        stdio: 'inherit',
        cwd: projectRoot,
      });
    });
    console.log('File watcher running in this tab. Theme dev processes are in the new tabs.');
  } else {
    const concurrentArgs = ['-n', stores.join(','), '-c', 'cyan,magenta,green'];
    stores.forEach((storeId, i) => {
      const distDir = path.join(projectRoot, 'dist', storeId);
      const port = basePort + i;
      concurrentArgs.push(getThemeDevCommand(storeId, distDir, port));
    });
    console.log('\nStarting theme dev for', stores.join(', '), '(interactivity may be limited in one window)...\n');
    const concurrent = spawn('npx', ['concurrently', ...concurrentArgs], {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    process.on('SIGINT', () => {
      concurrent.kill('SIGINT');
      watcher.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
