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
    if (path.basename(src) === '.gitkeep') return;
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
      if (entry === '.gitkeep') continue;
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyIfChanged(srcPath, destPath) {
  if (path.basename(srcPath) === '.gitkeep') return false;
  if (!fs.existsSync(srcPath)) return false;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  if (fs.existsSync(destPath)) {
    const srcBuf = fs.readFileSync(srcPath);
    const destBuf = fs.readFileSync(destPath);
    if (srcBuf.equals(destBuf)) return false;
  }
  fs.copyFileSync(srcPath, destPath);
  return true;
}

function mergeAssetsIfChanged(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      mergeAssetsIfChanged(srcPath, destPath);
    } else {
      copyIfChanged(srcPath, destPath);
    }
  }
}

function generateJsTranslations(distDir) {
  const localesDir = path.join(distDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  const translations = {};
  let defaultLocale = null;
  for (const file of fs.readdirSync(localesDir)) {
    if (!file.endsWith('.json')) continue;
    const isDefault = file.endsWith('.default.json');
    const locale = file.replace(/\.default\.json$|\.json$/i, '');
    const content = fs.readFileSync(path.join(localesDir, file), 'utf8');
    try {
      translations[locale] = JSON.parse(content);
      if (isDefault) defaultLocale = locale;
    } catch {
      // Skip invalid JSON
    }
  }

  if (Object.keys(translations).length === 0) return;

  const caseBranches = Object.entries(translations)
    .map(([ locale, data ]) => `  {% when ${ JSON.stringify(locale) } %}\n  ${ JSON.stringify(data) }`)
    .join('\n');

  const defaultData = defaultLocale ? JSON.stringify(translations[defaultLocale]) : '{}';

  const snippet = `{% comment %}
  Auto-generated: current locale translations for use in scripts.
  Include once in layout: {% render 'js_translations' %}
{% endcomment %}
<script>
  window.shopivibe = window.shopivibe || {};
  window.shopivibe.translations = {% case request.locale.iso_code %}
${ caseBranches }
  {% else %}
  ${ defaultData }
  {% endcase %};
</script>
`;

  const snippetsDir = path.join(distDir, 'snippets');
  fs.mkdirSync(snippetsDir, { recursive: true });
  fs.writeFileSync(path.join(snippetsDir, 'js_translations.liquid'), snippet);
}

function buildStore(storeId) {
  const distDir = path.join(DIST_BASE, storeId);
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
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
  injectViteRenders(distDir);

  return distDir;
}

function camelToSnake(str) {
  return str.replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase()).replace(/^_/, '');
}

function scriptNameToLiquidPath(scriptName) {
  const match = scriptName.match(/^(snippets|sections)_(.+)$/);
  if (!match) return null;
  const [ , type, name ] = match;
  const snake = camelToSnake(name).replace(/_+/g, '_');
  return `${ type }/${ snake }.liquid`;
}

function injectViteRenders(distDir) {
  const buildAssets = path.join(BUILD_DIR, 'assets');
  if (!fs.existsSync(buildAssets)) return;

  const viteRender = (entry) => `{% render 'vite' with '${ entry }' %}\n`;

  for (const file of fs.readdirSync(buildAssets)) {
    if (!file.endsWith('.js')) continue;
    const entry = file.replace(/\.js$/, '');
    const liquidPath = scriptNameToLiquidPath(entry);
    if (!liquidPath) continue;

    const fullPath = path.join(distDir, liquidPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    const renderLine = viteRender(entry);
    if (content.includes(`render 'vite' with '${ entry }'`)) continue;

    content = renderLine + content;
    fs.writeFileSync(fullPath, content);
  }
}

async function runViteBuild() {
  const configPath = path.join(ROOT, 'vite.config.js');
  await build({ configFile: configPath });
}

function getRelPath(base, fullPath) {
  const rel = path.relative(base, fullPath);
  return path.normalize(rel).replace(/\\/g, '/');
}

async function incrementalUpdate(stores, filePath, event) {
  const absPath = path.resolve(filePath);
  const scriptsDir = path.join(SRC_DIR, 'scripts');
  const stylesDir = path.join(SRC_DIR, 'styles');
  const localesDir = path.join(SRC_DIR, 'locales');
  const needsVite = absPath.startsWith(scriptsDir) || absPath.startsWith(stylesDir);
  const touchesLocales = absPath.startsWith(localesDir);

  if (needsVite) {
    await runViteBuild();
  }

  for (const storeId of stores) {
    const distDir = path.join(DIST_BASE, storeId);
    const regionalStore = path.join(REGIONAL_DIR, storeId);

    if (absPath.startsWith(regionalStore)) {
      const rel = getRelPath(regionalStore, absPath);
      const destPath = path.join(distDir, rel);
      if (event === 'unlink') {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      } else {
        copyIfChanged(absPath, destPath);
      }
    } else if (absPath.startsWith(SRC_DIR)) {
      const rel = getRelPath(SRC_DIR, absPath);
      if (!SKIP_COPY.some((d) => rel.startsWith(d + '/'))) {
        const destPath = path.join(distDir, rel);
        if (event === 'unlink') {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        } else {
          copyIfChanged(absPath, destPath);
        }
        injectViteRenders(distDir);
      }
    }

    if (needsVite) {
      const assetsDir = path.join(distDir, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      mergeAssetsIfChanged(path.join(BUILD_DIR, 'assets'), assetsDir);
      injectViteRenders(distDir);
    }
    if (touchesLocales) generateJsTranslations(distDir);
  }
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

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  module.exports = { incrementalUpdate, runViteBuild, buildStore };
}
