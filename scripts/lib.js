import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface, emitKeypressEvents } from 'readline';
import { execSync, spawn as nodeSpawn } from 'child_process';
import yaml from 'js-yaml';
import chalk from 'chalk';

// ── Paths ──

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const SRC = path.join(ROOT, 'src');
export const REGIONAL = path.join(ROOT, 'regional');
export const STAGING = path.join(ROOT, 'staging');
export const DIST = path.join(ROOT, 'dist');
export const VITE_OUT = path.join(DIST, '_build');

const SKIP_SRC_DIRS = new Set(['scripts', 'styles', 'assets']);

// ── Credentials ──

export function loadCreds() {
  const raw = fs.readFileSync(path.join(ROOT, '.creds.yml'), 'utf8');
  return yaml.load(raw);
}

export function getStoreIds() {
  return Object.keys(loadCreds()?.shopify ?? {});
}

export function getStoreCreds(storeId) {
  return loadCreds()?.shopify?.[storeId] ?? {};
}

// ── Interactive ──

export function askQuestion(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

export async function chooseMultiple(question, options) {
  if (!process.stdin.isTTY) {
    console.log(`\n${ question }:`);
    options.forEach((opt, i) => console.log(`  [${ i + 1 }] ${ opt }`));
    const answer = await askQuestion('\nEnter numbers (comma-separated): ');
    return answer.split(',')
      .map(s => parseInt(s.trim(), 10) - 1)
      .filter(i => i >= 0 && i < options.length)
      .map(i => options[i]);
  }

  return new Promise((resolve, reject) => {
    const selected = new Set();

    function render() {
      process.stdout.write('\x1b[2J\x1b[H');
      console.log(`\n${ question } (press number to toggle, Enter to confirm):\n`);
      options.forEach((opt, i) => {
        const line = `  [${ i + 1 }] ${ opt }`;
        console.log(selected.has(i) ? chalk.cyan(line) : line);
      });
      const names = [...selected].map(i => options[i]);
      console.log(`\n  Selected: ${ names.length ? names.join(', ') : chalk.gray('(none)') }`);
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('keypress');
    }

    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('keypress', (str, key) => {
      if (!key) return;

      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        const result = [...selected].sort().map(i => options[i]);
        if (!result.length) {
          reject(new Error('No items selected'));
        } else {
          console.log();
          resolve(result);
        }
        return;
      }

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
      }

      const n = parseInt(str, 10);
      if (n >= 1 && n <= options.length) {
        const idx = n - 1;
        selected.has(idx) ? selected.delete(idx) : selected.add(idx);
        render();
      }
    });

    render();
  });
}

export async function chooseOne(question, options, { nameNode } = {}) {
  const names = options.map(opt => nameNode ? opt[nameNode] : String(opt));
  console.log(`\n${ question }:\n`);
  names.forEach((name, i) => console.log(`  ${ chalk.cyan(`[${ i + 1 }]`) } ${ name }`));
  console.log();
  const answer = await askQuestion('Enter number: ');
  const index = parseInt(answer, 10) - 1;
  if (index < 0 || index >= options.length) throw new Error('Invalid selection');
  return options[index];
}

export async function chooseStores() {
  const envStores = process.env.STORES;
  if (envStores) {
    return envStores.split(',').map(s => s.trim()).filter(Boolean);
  }
  const ids = getStoreIds();
  if (!ids.length) throw new Error('No stores found in .creds.yml under shopify:');
  return chooseMultiple('Select stores', ids);
}

// ── Filesystem ──

export function walkFiles(dir, base = '') {
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

// ── Translations ──

function generateTranslations(stagingDir) {
  const localesDir = path.join(stagingDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  const translations = {};
  let defaultLocale = null;

  for (const file of fs.readdirSync(localesDir)) {
    if (!file.endsWith('.json')) continue;
    const isDefault = file.endsWith('.default.json');
    const locale = file.replace(/\.default\.json$|\.json$/i, '');
    try {
      translations[locale] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
      if (isDefault) defaultLocale = locale;
    } catch { /* skip invalid */ }
  }

  if (!Object.keys(translations).length) return;

  const branches = Object.entries(translations)
    .map(([locale, data]) => `  {%- when '${ locale }' -%}\n    ${ JSON.stringify(data) }`)
    .join('\n');
  const fallback = defaultLocale ? JSON.stringify(translations[defaultLocale]) : '{}';

  const snippet = [
    '{%- comment -%}Auto-generated — do not edit{%- endcomment -%}',
    '<script>',
    '  window.shopivibe = window.shopivibe || {};',
    '  window.shopivibe.translations = {%- case request.locale.iso_code -%}',
    branches,
    '  {%- else -%}',
    `    ${ fallback }`,
    '  {%- endcase -%};',
    '</script>',
  ].join('\n');

  fs.mkdirSync(path.join(stagingDir, 'snippets'), { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'snippets', 'js_translations.liquid'), snippet);
}

// ── Vite render injection ──

function scriptStemToLiquidPath(stem) {
  const sep = stem.indexOf('_');
  if (sep === -1) return null;

  const folder = stem.slice(0, sep);
  if (folder !== 'snippets' && folder !== 'sections') return null;

  const name = stem.slice(sep + 1);
  const snaked = name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return `${ folder }/${ snaked }.liquid`;
}

function injectViteRenders(stagingDir) {
  const assetsDir = path.join(stagingDir, 'assets');
  if (!fs.existsSync(assetsDir)) return;

  for (const file of fs.readdirSync(assetsDir)) {
    if (!file.endsWith('.js')) continue;
    const stem = file.replace(/\.js$/, '');
    const liquidRel = scriptStemToLiquidPath(stem);
    if (!liquidRel) continue;

    const liquidPath = path.join(stagingDir, liquidRel);
    if (!fs.existsSync(liquidPath)) continue;

    const renderLine = `{% render 'vite' with '${ stem }' %}\n`;
    const content = fs.readFileSync(liquidPath, 'utf8');
    fs.writeFileSync(liquidPath, renderLine + content);
  }
}

// ── Assemble ──

export function assembleStore(storeId) {
  const storeStaging = path.join(STAGING, storeId);
  if (fs.existsSync(storeStaging)) fs.rmSync(storeStaging, { recursive: true, force: true });

  copyTree(SRC, storeStaging, SKIP_SRC_DIRS);

  const viteAssets = path.join(VITE_OUT, 'assets');
  if (fs.existsSync(viteAssets)) copyTree(viteAssets, path.join(storeStaging, 'assets'));

  const regionalDir = path.join(REGIONAL, storeId);
  fs.mkdirSync(regionalDir, { recursive: true });
  copyTree(regionalDir, storeStaging);

  generateTranslations(storeStaging);
  injectViteRenders(storeStaging);

  return mirror(storeStaging, path.join(DIST, storeId));
}

// ── Download helpers ──

export function getAllRegionalRelPaths() {
  const paths = new Set();
  if (!fs.existsSync(REGIONAL)) return paths;
  for (const dir of fs.readdirSync(REGIONAL, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const rel of walkFiles(path.join(REGIONAL, dir.name))) {
      paths.add(rel);
    }
  }
  return paths;
}

const VITE_RENDER_RE = /^{% render 'vite' with '[^']*' %}\n?/gm;

export function stripViteRenderLines(content) {
  return content.replace(VITE_RENDER_RE, '');
}

// ── Shopify CLI ──

export function shopifyFlags(storeId) {
  const creds = getStoreCreds(storeId);
  const flags = ['--store', `${ creds.STORE_URL }.myshopify.com`];
  if (creds.SHOPIFY_API_KEY) flags.push('--password', creds.SHOPIFY_API_KEY);
  return flags;
}

export function shopifyExec(args) {
  return execSync(['npx', 'shopify', ...args].join(' '), {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
}

export function shopifySpawn(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = nodeSpawn('npx', ['shopify', ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
      ...opts,
    });
    child.on('close', code => code === 0
      ? resolve()
      : reject(new Error(`shopify exited ${ code }`)),
    );
  });
}

export function listThemes(storeId) {
  const output = shopifyExec(['theme', 'list', '--json', ...shopifyFlags(storeId)]);
  return JSON.parse(output.trim());
}

// ── Logging ──

export function logAssembly(storeId, { added, updated, removed }) {
  console.log(
    `  ${ chalk.green(storeId) } — `
    + `${ chalk.green(`+${ added }`) } `
    + `${ chalk.yellow(`~${ updated }`) } `
    + `${ chalk.red(`-${ removed }`) }`,
  );
}
