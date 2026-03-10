#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const https = require('https');

const { getStores, loadStoreCreds, promptThemeName } = require('./lib/common');

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

function normalizeStoreUrl(storeUrl) {
  if (!storeUrl) return null;
  const s = String(storeUrl).toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  return s.includes('.myshopify.com') ? s : `${ s }.myshopify.com`;
}

async function createThemeWithName(storeId, themeName) {
  const creds = loadStoreCreds(storeId);
  const storeUrl = normalizeStoreUrl(creds.STORE_URL || storeId);
  const token = creds.SHOPIFY_API_KEY;
  if (!storeUrl || !token) return null;

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ theme: { name: themeName } });
    const req = https.request(
      {
        hostname: storeUrl,
        path: '/admin/api/2024-01/themes.json',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data);
              resolve(json.theme?.id);
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
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

function runThemePushUnpublished(storeId, distDir) {
  return new Promise((resolve, reject) => {
    const creds = loadStoreCreds(storeId);
    const storeUrl = creds.STORE_URL || storeId;
    const env = { ...process.env };
    if (creds.SHOPIFY_API_KEY) env.SHOPIFY_API_KEY = creds.SHOPIFY_API_KEY;

    const args = [ 'theme', 'push', '--path', distDir, '--store', storeUrl, '--unpublished' ];
    const child = require('child_process').spawn('shopify', args, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`theme push exited ${ code }`))));
  });
}

async function main() {
  const themeName = await promptThemeName();
  const stores = await getStores();
  console.log('Stores:', stores.join(', '));
  console.log('Theme name:', themeName);

  runBuild(stores);

  for (const storeId of stores) {
    console.log(`\n--- Deploy ${ storeId } (new theme: ${ themeName }) ---`);
    const distDir = path.join(DIST_BASE, storeId);
    const themeId = await createThemeWithName(storeId, themeName);
    if (themeId) {
      await runThemePush(storeId, distDir, themeId);
    } else {
      await runThemePushUnpublished(storeId, distDir);
      console.log('(Created via CLI – rename in admin if needed)');
    }
    console.log(`Done: ${ storeId }`);
  }

  console.log('\nAll stores deployed.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
