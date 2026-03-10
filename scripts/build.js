#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');
const REGIONAL_DIR = path.join(__dirname, '..', 'regional');
const DIST_BASE = path.join(__dirname, '..', 'dist');
const PROJECT_ROOT = path.join(__dirname, '..');
const BUILD_ASSETS = path.join(PROJECT_ROOT, 'build', 'assets');
const DIST_STAGING = path.join(PROJECT_ROOT, 'build', 'dist-staging');

function runViteBuild() {
  const result = spawnSync('npx', [ 'vite', 'build' ], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

function copyRecursive(src, dest, excludeDir) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (excludeDir && path.basename(src) === excludeDir) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      if (excludeDir && entry === excludeDir) continue;
      copyRecursive(srcPath, destPath, excludeDir);
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function mergeIntoDest(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      mergeIntoDest(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildStore(storeId, outBase) {
  const outDir = path.join(outBase, storeId);
  fs.mkdirSync(outDir, { recursive: true });
  copyRecursive(SRC_DIR, outDir);
  const buildAssetsDir = path.join(BUILD_ASSETS, 'assets');
  const outAssets = path.join(outDir, 'assets');
  fs.mkdirSync(outAssets, { recursive: true });
  if (fs.existsSync(buildAssetsDir)) {
    mergeIntoDest(buildAssetsDir, outAssets);
  }
  const regionalStoreDir = path.join(REGIONAL_DIR, storeId);
  if (fs.existsSync(regionalStoreDir)) {
    mergeIntoDest(regionalStoreDir, outDir);
  }
  return outDir;
}

function build(stores) {
  runViteBuild();
  const viteBuildResult = spawnSync('node', [ path.join(__dirname, 'vite-build.js') ], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (viteBuildResult.status !== 0) {
    process.exit(viteBuildResult.status);
  }
  fs.mkdirSync(DIST_STAGING, { recursive: true });
  for (const storeId of stores) {
    buildStore(storeId, DIST_STAGING);
    console.log(`Built dist/${ storeId }`);
  }
  fs.mkdirSync(DIST_BASE, { recursive: true });
  for (const storeId of stores) {
    const stagingDir = path.join(DIST_STAGING, storeId);
    const distDir = path.join(DIST_BASE, storeId);
    const oldDir = path.join(DIST_BASE, `${ storeId }.old`);
    if (fs.existsSync(distDir)) fs.renameSync(distDir, oldDir);
    fs.renameSync(stagingDir, distDir);
    if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true });
  }
  if (fs.existsSync(DIST_STAGING)) fs.rmSync(DIST_STAGING, { recursive: true });
}

let stores = process.argv.slice(2);
if (stores.length === 0 && process.env.STORES) {
  stores = process.env.STORES.split(',').map((s) => s.trim()).filter(Boolean);
}
if (stores.length === 0) {
  console.error('Usage: node build.js <store1> [store2] ...');
  console.error('Or set STORES env var, e.g. STORES=au,us,uk');
  process.exit(1);
}

build(stores);
