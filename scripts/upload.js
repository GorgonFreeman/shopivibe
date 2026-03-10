#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const { getStores, loadStoreCreds, listThemes, promptTheme } = require('./lib/common');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_BASE = path.join(PROJECT_ROOT, 'dist');

function runBuild(stores) {
  const result = spawnSync('node', [ path.join(__dirname, 'build.js'), ...stores ], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

function runThemePush(storeId, distDir, themeId) {
  return new Promise((resolve, reject) => {
    const creds = loadStoreCreds(storeId);
    const storeUrl = creds.STORE_URL || storeId;
    const env = { ...process.env };
    if (creds.SHOPIFY_API_KEY) env.SHOPIFY_API_KEY = creds.SHOPIFY_API_KEY;

    const args = [ 'theme', 'push', '--path', distDir, '--store', storeUrl, '--theme', String(themeId) ];
    const child = require('child_process').spawn('shopify', args, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`theme push exited ${ code }`))));
  });
}

async function main() {
  const stores = await getStores();
  console.log('Stores:', stores.join(', '));

  runBuild(stores);

  for (const storeId of stores) {
    console.log(`\n--- Upload ${ storeId } ---`);
    const themes = listThemes(storeId);
    const theme = await promptTheme(storeId, themes);
    const distDir = path.join(DIST_BASE, storeId);
    await runThemePush(storeId, distDir, theme.id);
    console.log(`Done: ${ storeId } → ${ theme.name }`);
  }

  console.log('\nAll stores uploaded.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
