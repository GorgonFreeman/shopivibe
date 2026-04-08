#!/usr/bin/env node

import path from 'path';
import { build } from 'vite';
import chalk from 'chalk';
import {
  DIST,
  chooseStores, chooseOne, assembleStore,
  shopifyFlags, shopifySpawn, listThemes, logAssembly,
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
    `Choose theme to replace on ${ chalk.cyan(storeId) }`,
    themes,
    { nameNode: 'name' },
  );

  const distDir = path.join(DIST, storeId);
  const flags = shopifyFlags(storeId);

  // Push sections + schema first to avoid reference errors during full push
  console.log(chalk.gray(`\n  Pushing sections + schema to ${ storeId }...`));
  await shopifySpawn([
    'theme', 'push',
    '--path', distDir,
    '--theme', String(theme.id),
    '--only', 'sections/',
    '--only', 'config/settings_schema.json',
    '--nodelete',
    ...flags,
  ]);

  // Full push — replaces entire theme (deletes remote-only files)
  console.log(chalk.gray(`  Pushing full theme to ${ storeId }...`));
  await shopifySpawn([
    'theme', 'push',
    '--path', distDir,
    '--theme', String(theme.id),
    ...flags,
  ]);

  console.log(chalk.green(`  Done: ${ storeId }\n`));
}

console.log(chalk.green('All stores uploaded.'));
