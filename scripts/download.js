#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { build } from 'vite';
import chalk from 'chalk';
import {
  SRC, REGIONAL, STAGING,
  chooseStores, chooseOne, assembleStore,
  shopifyFlags, shopifySpawn, listThemes,
  getAllRegionalRelPaths, stripViteRenderLines, walkFiles, logAssembly, askQuestion,
} from './lib.js';

const stores = await chooseStores();

console.log(chalk.gray('\nRunning Vite build...\n'));
await build();

for (const storeId of stores) {
  const result = assembleStore(storeId);
  logAssembly(storeId, result);
}

for (const storeId of stores) {
  const themes = listThemes(storeId);
  const theme = await chooseOne(
    `Choose theme to download for ${ chalk.cyan(storeId) }`,
    themes,
    { nameNode: 'name' },
  );

  const storeStaging = path.join(STAGING, storeId);

  console.log(chalk.gray(`\n  Downloading to staging/${ storeId }...`));
  await shopifySpawn([
    'theme', 'pull',
    '--path', storeStaging,
    '--theme', String(theme.id),
    ...shopifyFlags(storeId),
  ]);

  // Reconcile: move files into regional/{store} or src
  const regionalPaths = getAllRegionalRelPaths();
  const downloaded = walkFiles(storeStaging);
  let toRegional = 0, toSrc = 0;

  for (const rel of downloaded) {
    if (rel.startsWith('assets/')) continue;
    if (rel === 'snippets/js_translations.liquid') continue;

    const srcPath = path.join(storeStaging, rel);
    let content = fs.readFileSync(srcPath);

    if (rel.endsWith('.liquid')) {
      const text = content.toString('utf8');
      const stripped = stripViteRenderLines(text);
      if (stripped !== text) content = Buffer.from(stripped);
    }

    const isRegional = regionalPaths.has(rel);
    const destBase = isRegional ? path.join(REGIONAL, storeId) : SRC;
    const destPath = path.join(destBase, rel);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content);
    isRegional ? toRegional++ : toSrc++;
  }

  console.log(
    chalk.gray(`  Reconciled: `)
    + chalk.cyan(`${ toRegional } regional`)
    + chalk.gray(', ')
    + chalk.cyan(`${ toSrc } src`),
  );

  if (stores.indexOf(storeId) < stores.length - 1) {
    await askQuestion(
      chalk.yellow(`\n  Review diffs for ${ storeId } and commit, then press Enter to continue...`),
    );
  }
}

console.log(chalk.green('\nDownload complete.\n'));
