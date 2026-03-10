#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { build } = require('vite');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const REGIONAL_DIR = path.join(ROOT, 'regional');
const DIST_BASE = path.join(ROOT, 'dist');
const BUILD_DIR = path.join(DIST_BASE, '_build');

const SKIP_COPY = ['scripts', 'styles', 'assets'];

function copyRecursive(src, dest, skipDirs = []) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const name = path.basename(src);
    if (skipDirs.includes(name)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), skipDirs);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function mergeIntoDest(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      mergeIntoDest(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generateJsTranslations(distDir) {
  const localesDir = path.join(distDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  const translations = {};
  for (const file of fs.readdirSync(localesDir)) {
    if (!file.endsWith('.json')) continue;
    const locale = file.replace(/\.default\.json$|\.json$/i, '');
    const content = fs.readFileSync(path.join(localesDir, file), 'utf8');
    try {
      translations[locale] = JSON.parse(content);
    } catch {
      // Skip invalid JSON
    }
  }

  if (Object.keys(translations).length === 0) return;

  const snippet = `{% comment %}
  Auto-generated: all locale translations for use in scripts.
  Include once in layout: {% render 'js_translations' %}
{% endcomment %}
<script>
  window.__translations = ${ JSON.stringify(translations) };
  window.__locale = {{ request.locale.iso_code | json }};
</script>
`;

  const snippetsDir = path.join(distDir, 'snippets');
  fs.mkdirSync(snippetsDir, { recursive: true });
  fs.writeFileSync(path.join(snippetsDir, 'js_translations.liquid'), snippet);
}

function buildStore(storeId) {
  const distDir = path.join(DIST_BASE, storeId);
  fs.mkdirSync(distDir, { recursive: true });
  copyRecursive(SRC_DIR, distDir, SKIP_COPY);

  const assetsDir = path.join(distDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  const buildAssets = path.join(BUILD_DIR, 'assets');
  if (fs.existsSync(buildAssets)) {
    mergeIntoDest(buildAssets, assetsDir);
  }

  mergeIntoDest(path.join(REGIONAL_DIR, storeId), distDir);
  generateJsTranslations(distDir);

  return distDir;
}

async function runViteBuild() {
  const configPath = path.join(ROOT, 'vite.config.js');
  await build({ configFile: configPath });
}

async function main() {
  let stores = process.argv.slice(2);
  if (stores.length === 0 && process.env.STORES) {
    stores = process.env.STORES.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (stores.length === 0) {
    console.error('Usage: node build.js <store1> [store2] ...');
    console.error('Or set STORES env var, e.g. STORES=au,us,uk');
    process.exit(1);
  }

  await runViteBuild();

  for (const storeId of stores) {
    buildStore(storeId);
    console.log(`Built dist/${ storeId }`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
