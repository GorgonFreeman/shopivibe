#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const chalk = require('chalk');

const { getStores, loadStoreCreds } = require('./lib/common');
const { runViteBuild, buildStore } = require('./build');

const ROOT = path.join(__dirname, '..');
const DIST_BASE = path.join(ROOT, 'dist');

function promptThemeName() {
  if (process.env.THEME_NAME) {
    const name = process.env.THEME_NAME.trim();
    if (name) return Promise.resolve(name);
  }
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error('Theme name required. Set THEME_NAME env var for non-interactive use.'));
  }
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Theme name for new unpublished theme: ', (answer) => {
      rl.close();
      const name = answer.trim();
      if (!name) {
        reject(new Error('Theme name cannot be empty.'));
      } else {
        resolve(name);
      }
    });
  });
}

function runThemePush(storeId, distDir, themeName) {
  return new Promise((resolve, reject) => {
    const creds = loadStoreCreds(storeId);
    const storeUrl = creds.STORE_URL || storeId;
    const env = { ...process.env };
    if (creds.SHOPIFY_API_KEY) env.SHOPIFY_API_KEY = creds.SHOPIFY_API_KEY;

    const args = [
      'theme',
      'push',
      '--path',
      distDir,
      '--store',
      storeUrl,
      '--theme',
      themeName,
      '--unpublished',
    ];

    const child = spawn('shopify', args, {
      stdio: 'inherit',
      cwd: ROOT,
      env,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`theme push exited ${ code } for ${ storeId }`))));
  });
}

async function main() {
  const themeName = await promptThemeName();
  const stores = await getStores();

  console.log(chalk.cyan('\nTheme name:'), themeName);
  console.log(chalk.cyan('Stores:'), stores.join(', '));

  console.log(chalk.gray('\nBuilding...'));
  await runViteBuild();
  for (const storeId of stores) {
    buildStore(storeId);
    console.log(chalk.gray(`  Built dist/${ storeId }`));
  }

  // Sequential: clearer output, easier to debug failures, avoids API rate-limit risk
  // when pushing to multiple stores under the same partner org.
  console.log(chalk.cyan('\nUploading new themes (sequential)...\n'));

  for (const storeId of stores) {
    const distDir = path.join(DIST_BASE, storeId);
    console.log(chalk.cyan(`--- Pushing to ${ storeId } ---`));
    try {
      await runThemePush(storeId, distDir, themeName);
      console.log(chalk.green(`Done: ${ storeId }\n`));
    } catch (e) {
      console.error(chalk.red(e.message));
      process.exit(1);
    }
  }

  console.log(chalk.green('All stores uploaded.'));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
