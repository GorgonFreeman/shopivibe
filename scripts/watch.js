#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { getStores, loadStoreCreds } = require('./lib/common');
const { incrementalUpdate, runViteBuild, buildStore } = require('./build');
const { ROOT, SRC_DIR, REGIONAL_DIR, DIST_BASE } = require('./constants');

function runBuild(stores) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, 'build.js'), ...stores], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${ code }`))));
  });
}

function getThemeDevCommand(storeId, distDir, port) {
  const creds = loadStoreCreds(storeId);
  const storeUrl = creds.STORE_URL || storeId;
  const envPrefix = creds.SHOPIFY_API_KEY ? `SHOPIFY_API_KEY=${ creds.SHOPIFY_API_KEY } ` : '';
  return `${ envPrefix }shopify theme dev --store ${ storeUrl } --port ${ port } --live-reload full-page`;
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
    atomic: true,
  });

  let buildInProgress = false;
  let pendingPath = null;
  let pendingEvent = null;

  const runIncremental = async (event, filePath) => {
    if (buildInProgress) {
      pendingPath = filePath;
      pendingEvent = event;
      return;
    }
    buildInProgress = true;
    try {
      console.log(`[watch] ${ filePath } ${ event }, updating...`);
      await incrementalUpdate(stores, filePath, event);
    } catch (e) {
      console.error('[watch] incremental failed, running full build:', e.message);
      await runBuild(stores);
    } finally {
      buildInProgress = false;
      if (pendingPath) {
        const p = pendingPath;
        const ev = pendingEvent;
        pendingPath = null;
        pendingEvent = null;
        runIncremental(ev, p);
      }
    }
  };

  watcher.on('change', (filePath) => runIncremental('change', filePath));
  watcher.on('add', (filePath) => runIncremental('add', filePath));
  watcher.on('unlink', (filePath) => runIncremental('unlink', filePath));

  watcher.on('ready', () => {
    console.log('[watch] Watching:', watchPaths.join(', '));
  });

  const basePort = 9292;
  const isMac = process.platform === 'darwin';

  if (isMac) {
    console.log('\nOpening theme dev for', stores.join(', '), 'in separate tabs...\n');
    stores.forEach((storeId, i) => {
      const distDir = path.join(DIST_BASE, storeId);
      const port = basePort + i;
      const cmd = getThemeDevCommand(storeId, distDir, port);
      spawn('npx', ['ttab', '-t', `shopivibe ${ storeId }`, '-d', distDir, cmd], {
        stdio: 'inherit',
        cwd: ROOT,
      });
    });
    console.log('File watcher running in this tab. Theme dev processes are in the new tabs.');
  } else {
    const concurrentArgs = ['-n', stores.join(','), '-c', 'cyan,magenta,green'];
    stores.forEach((storeId, i) => {
      const distDir = path.join(DIST_BASE, storeId);
      const port = basePort + i;
      const cmd = getThemeDevCommand(storeId, distDir, port);
      concurrentArgs.push(`cd ${ path.relative(ROOT, distDir) } && ${ cmd }`);
    });
    console.log('\nStarting theme dev for', stores.join(', '), '(interactivity may be limited in one window)...\n');
    const concurrent = spawn('npx', ['concurrently', ...concurrentArgs], {
      stdio: 'inherit',
      cwd: ROOT,
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
