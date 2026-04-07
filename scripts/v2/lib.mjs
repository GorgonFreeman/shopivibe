import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

// ── Paths ──────────────────────────────────────────

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const SRC = path.join(ROOT, 'src');
export const REGIONAL = path.join(ROOT, 'regional');
export const DIST = path.join(ROOT, 'dist');
export const VITE_OUT = path.join(DIST, '_build');

const STAGING = path.join(DIST, '.staging');
const SKIP_SRC = new Set(['scripts', 'styles', 'assets']);

// ── Filesystem helpers ─────────────────────────────

function walkFiles(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.gitkeep' || entry.name.startsWith('.')) continue;
    const rel = base ? `${ base }/${ entry.name }` : entry.name;
    entry.isDirectory()
      ? out.push(...walkFiles(path.join(dir, entry.name), rel))
      : out.push(rel);
  }
  return out;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyTree(src, dest, skip) {
  if (!fs.existsSync(src)) return;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === '.gitkeep' || e.name.startsWith('.')) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      if (skip?.has(e.name)) continue;
      copyTree(s, d);
    } else {
      copyFile(s, d);
    }
  }
}

// ── Mirror sync ────────────────────────────────────
// Ensures dest matches src exactly: adds new, updates changed, removes stale.

function mirror(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const srcFiles = new Set(walkFiles(srcDir));
  const destFiles = walkFiles(destDir);
  let added = 0, updated = 0, removed = 0;

  for (const rel of srcFiles) {
    const s = path.join(srcDir, rel);
    const d = path.join(destDir, rel);
    if (!fs.existsSync(d)) {
      copyFile(s, d);
      added++;
    } else if (!fs.readFileSync(s).equals(fs.readFileSync(d))) {
      fs.copyFileSync(s, d);
      updated++;
    }
  }

  for (const rel of destFiles) {
    if (!srcFiles.has(rel)) {
      fs.unlinkSync(path.join(destDir, rel));
      removed++;
    }
  }

  pruneEmptyDirs(destDir, destDir);
  return { added, updated, removed };
}

function pruneEmptyDirs(dir, root) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) pruneEmptyDirs(path.join(dir, e.name), root);
  }
  if (dir !== root && !fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

// ── Assemble a canonical theme for one store ───────
// Builds the complete, correct theme in staging, then mirrors to dist.
// Mirror semantics mean stale files in dist are always cleaned up.

export function assembleStore(storeId) {
  if (fs.existsSync(STAGING)) fs.rmSync(STAGING, { recursive: true, force: true });

  // Theme files from src (Vite handles scripts/styles/assets)
  copyTree(SRC, STAGING, SKIP_SRC);

  // Vite-built assets
  const viteAssets = path.join(VITE_OUT, 'assets');
  if (fs.existsSync(viteAssets)) copyTree(viteAssets, path.join(STAGING, 'assets'));

  // Regional overrides (win on conflict)
  copyTree(path.join(REGIONAL, storeId), STAGING);

  // Generated files
  writeTranslationsSnippet(STAGING);
  injectViteRenders(STAGING, viteAssets);

  const result = mirror(STAGING, path.join(DIST, storeId));
  fs.rmSync(STAGING, { recursive: true, force: true });
  return result;
}

// ── Translations ───────────────────────────────────

function writeTranslationsSnippet(themeDir) {
  const localesDir = path.join(themeDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  const data = {};
  let defaultLocale = null;

  for (const file of fs.readdirSync(localesDir).filter(f => f.endsWith('.json'))) {
    const isDefault = file.endsWith('.default.json');
    const locale = file.replace(/\.default\.json$|\.json$/i, '');
    data[locale] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
    if (isDefault) defaultLocale = locale;
  }

  if (!Object.keys(data).length) return;

  const branches = Object.entries(data)
    .map(([loc, json]) => `  {% when ${ JSON.stringify(loc) } %}\n  ${ JSON.stringify(json) }`)
    .join('\n');

  const fallback = defaultLocale ? JSON.stringify(data[defaultLocale]) : '{}';

  const snippet = `{% comment %}Auto-generated locale translations for JS.{% endcomment %}
<script>
  window.shopivibe = window.shopivibe || {};
  window.shopivibe.translations = {% case request.locale.iso_code %}
${ branches }
  {% else %}
  ${ fallback }
  {% endcase %};
</script>
`;

  fs.mkdirSync(path.join(themeDir, 'snippets'), { recursive: true });
  fs.writeFileSync(path.join(themeDir, 'snippets', 'js_translations.liquid'), snippet);
}

// ── Vite render injection ──────────────────────────
// Convention: snippets_CartItem.js → snippets/cart_item.liquid gets a render tag.

function camelToSnake(s) {
  return s.replace(/([A-Z])/g, (_, c) => `_${ c.toLowerCase() }`).replace(/^_/, '');
}

function scriptToLiquid(name) {
  const m = name.match(/^(snippets|sections)_(.+)$/);
  if (!m) return null;
  return `${ m[1] }/${ camelToSnake(m[2]).replace(/_+/g, '_') }.liquid`;
}

function injectViteRenders(themeDir, assetsDir) {
  if (!fs.existsSync(assetsDir)) return;

  for (const file of fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'))) {
    const entry = file.replace(/\.js$/, '');
    const rel = scriptToLiquid(entry);
    if (!rel) continue;

    const fullPath = path.join(themeDir, rel);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const tag = `{% render 'vite' with '${ entry }' %}`;
    if (content.includes(tag)) continue;

    fs.writeFileSync(fullPath, `${ tag }\n${ content }`);
  }
}

// ── Store selection ────────────────────────────────

function loadCredsFile() {
  return yaml.load(fs.readFileSync(path.join(ROOT, '.creds.yml'), 'utf8'));
}

function availableStores() {
  const shopify = loadCredsFile()?.shopify;
  if (!shopify || typeof shopify !== 'object') {
    throw new Error('.creds.yml: expected a "shopify" key with store configs');
  }
  return Object.keys(shopify).filter(k => typeof shopify[k] === 'object');
}

export function loadStoreCreds(storeId) {
  return loadCredsFile()?.shopify?.[storeId] || {};
}

export async function getStores() {
  const all = availableStores();

  const args = process.argv.slice(2).filter(a => !a.startsWith('-'));
  if (args.length) return args.filter(s => all.includes(s));

  if (process.env.STORES) {
    const picked = process.env.STORES.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => all.includes(s));
    if (picked.length) return picked;
  }

  if (!process.stdin.isTTY) throw new Error('No stores. Set STORES= or pass as args.');

  console.log(`\nAvailable stores:\n${ all.map((s, i) => `  ${ i + 1 }. ${ s }`).join('\n') }\n`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(r => rl.question('Stores (names or numbers, comma-separated): ', r));
  rl.close();

  if (answer.trim().toLowerCase() === 'all') return all;

  return answer.split(',').map(s => {
    const t = s.trim().toLowerCase();
    const n = parseInt(t);
    return (n >= 1 && n <= all.length) ? all[n - 1] : all.includes(t) ? t : null;
  }).filter(Boolean);
}
