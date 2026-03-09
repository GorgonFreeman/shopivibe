#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const REGIONAL_DIR = path.join(__dirname, '..', 'regional');
const DIST_BASE = path.join(__dirname, '..', 'dist');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
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

function buildStore(storeId) {
  const distDir = path.join(DIST_BASE, storeId);
  fs.mkdirSync(distDir, { recursive: true });
  copyRecursive(SRC_DIR, distDir);
  const regionalStoreDir = path.join(REGIONAL_DIR, storeId);
  if (fs.existsSync(regionalStoreDir)) {
    mergeIntoDest(regionalStoreDir, distDir);
  }
  return distDir;
}

function build(stores) {
  for (const storeId of stores) {
    const distDir = buildStore(storeId);
    console.log(`Built dist/${ storeId }`);
  }
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
