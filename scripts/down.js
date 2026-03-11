#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { getStores, loadStoreCreds } = require('./lib/common');
const { ROOT, SRC_DIR, REGIONAL_DIR, PULL_TEMP } = require('./constants');

function getAllFiles(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = base ? path.join(base, entry.name) : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

function isInAnyRegional(relPath, stores) {
  for (const storeId of stores) {
    const regionalPath = path.join(REGIONAL_DIR, storeId, relPath);
    if (fs.existsSync(regionalPath)) return true;
  }
  return false;
}

function routeFile(tempDir, relPath, currentStore, stores) {
  const srcPath = path.join(tempDir, relPath);
  if (!fs.existsSync(srcPath)) return;

  const inRegional = isInAnyRegional(relPath, stores);
  const destDir = inRegional ? path.join(REGIONAL_DIR, currentStore) : SRC_DIR;
  const destPath = path.join(destDir, relPath);

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}

function routePullResult(tempDir, currentStore, stores) {
  const files = getAllFiles(tempDir);
  for (const relPath of files) {
    routeFile(tempDir, relPath, currentStore, stores);
  }
}

function rmRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rmRecursive(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  fs.rmdirSync(dir);
}

function runThemePull(storeId, pullPath, useLive) {
  return new Promise((resolve, reject) => {
    const creds = loadStoreCreds(storeId);
    const storeUrl = creds.STORE_URL || storeId;
    const args = ['theme', 'pull', '--path', pullPath, '--store', storeUrl];
    if (useLive) args.push('--live');

    const env = { ...process.env };
    if (creds.SHOPIFY_API_KEY) env.SHOPIFY_API_KEY = creds.SHOPIFY_API_KEY;

    const child = spawn('shopify', args, {
      stdio: 'inherit',
      cwd: ROOT,
      env,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`theme pull exited ${ code }`))));
  });
}

async function pullStore(storeId, stores, useLive) {
  fs.mkdirSync(PULL_TEMP, { recursive: true });
  try {
    await runThemePull(storeId, PULL_TEMP, useLive);
    routePullResult(PULL_TEMP, storeId, stores);
  } finally {
    rmRecursive(PULL_TEMP);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const useLive = args.includes('--live');

  const stores = await getStores();
  console.log('Stores:', stores.join(', '));
  if (useLive) console.log('Using live theme\n');

  for (const storeId of stores) {
    console.log(`\n--- Pulling from ${ storeId } ---`);
    await pullStore(storeId, stores, useLive);
    console.log(`Done: ${ storeId }`);
  }

  console.log('\nAll stores pulled.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
